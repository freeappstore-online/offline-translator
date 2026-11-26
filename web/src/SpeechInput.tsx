import { useEffect, useRef, useState } from 'react'
import type { Language } from './model-options'
import { t } from './i18n'
import { prepareSpeech, transcribeSpeech } from './speech-engine'
import { SpeechAudio, hasSpeech } from './speech-audio'
import { ProgressiveSpeech } from './progressive-speech'
import { logSpeech } from './speech-log'

type Phase = 'idle' | 'permission' | 'recording' | 'processing'
type Session = { id: number; mounted: boolean; controller?: AbortController; cleanup?: () => void; stop?: () => Promise<void> }
export function SpeechInput({ language, onText, onPreview, onBusyChange, completionMessage = 'Check the recognized text, then tap Translate.', disabled = false }: {
  language: Language; onText: (text: string) => void; onPreview?: (text: string | null) => void
  onBusyChange: (busy: boolean) => void; completionMessage?: string; disabled?: boolean
}) {
  const [phase, setPhase] = useState<Phase>('idle'), [status, setStatus] = useState(''), [progress, setProgress] = useState<number>()
  const [preview, setPreview] = useState('')
  const session = useRef<Session>({ id: 0, mounted: true })
  useEffect(() => { onBusyChange(phase !== 'idle'); return () => onBusyChange(false) }, [phase, onBusyChange])
  useEffect(() => { const state = session.current; state.mounted = true; return () => { state.mounted = false; state.id++; state.controller?.abort(); state.cleanup?.() } }, [])
  useEffect(() => { const hidden = () => { if (document.hidden) void session.current.stop?.() }; document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden) }, [])
  function publish(text: string | null) { setPreview(text ?? ''); onPreview?.(text === null ? null : text.slice(0, 500)) }
  function cancel() {
    const state = session.current; state.id++; state.controller?.abort(); state.cleanup?.(); state.cleanup = undefined; state.stop = undefined; state.controller = undefined
    publish(null); setPhase('idle'); setProgress(undefined); setStatus('Speech input canceled.'); logSpeech({ language, error: 'Speech input canceled' })
  }
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') { setStatus('Live microphone input is not supported in this browser. You can still type.'); return }
    const state = session.current, id = ++state.id, controller = new AbortController(); state.controller = controller
    const current = () => state.mounted && state.id === id && !controller.signal.aborted
    let context: AudioContext | undefined, stream: MediaStream | undefined, source: MediaStreamAudioSourceNode | undefined, node: AudioWorkletNode | undefined
    let interval = 0, timer = 0, audio: SpeechAudio | undefined, live: ProgressiveSpeech | undefined, recording = false, stopping = false
    let firstPreviewMs: number | undefined, started = 0, flush: (() => void) | undefined
    const cleanup = () => { clearInterval(interval); clearTimeout(timer); recording = false; live?.cancel(); stream?.getTracks().forEach(track => track.stop()); source?.disconnect(); node?.disconnect(); node?.port.close(); void context?.close().catch(() => {}); audio?.clear(); if (state.id === id) state.stop = undefined }
    state.cleanup = cleanup
    setPhase('permission'); setStatus('Preparing speech model…'); setProgress(undefined); publish('')
    try {
      // Resume in the tap handler; prepare before recording so first-time downloads do not consume the clip.
      context = new AudioContext(); await context.resume()
      if (!context.audioWorklet) throw new Error('Live microphone input is not supported in this browser. You can still type.')
      await context.audioWorklet.addModule('/speech-capture-worklet.js')
      const prepared = await prepareSpeech(controller.signal, (message, value) => { if (current()) { setStatus(message); setProgress(value) } })
      if (!current()) return
      setStatus('Allow microphone access to start.'); setProgress(undefined)
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      if (!current()) { stream.getTracks().forEach(track => track.stop()); return }
      audio = new SpeechAudio(context.sampleRate)
      const report = (message: string, value?: number) => { if (current() && !recording) { setStatus(message); setProgress(value) } }
      live = new ProgressiveSpeech((samples, partial) => transcribeSpeech(samples, language, controller.signal, report, partial), text => {
        if (!current()) return
        firstPreviewMs ??= performance.now() - started
        publish(text)
      })
      node = new AudioWorkletNode(context, 'speech-capture'); source = context.createMediaStreamSource(stream)
      node.port.onmessage = ({ data }: MessageEvent<Float32Array | { flushed: true }>) => {
        if (data instanceof Float32Array) audio?.append(data)
        else if (data.flushed) flush?.()
      }
      source.connect(node); node.connect(context.destination) // Worklet outputs silence, never microphone playback.
      started = performance.now(); recording = true
      const stop = async () => {
        if (stopping || !current()) return
        stopping = true; recording = false; state.stop = undefined; clearInterval(interval); clearTimeout(timer)
        stream?.getTracks().forEach(track => track.stop()); source?.disconnect()
        setPhase('processing'); setStatus('Finalizing speech…'); setProgress(undefined)
        const durationMs = performance.now() - started
        let finalStarted: number | undefined
        try {
          await new Promise<void>(resolve => { const timeout = window.setTimeout(resolve, 250); flush = () => { clearTimeout(timeout); resolve() }; node?.port.postMessage('flush') })
          if (!current()) return
          const samples = audio!.samples(); node?.disconnect(); node?.port.close(); await context?.close()
          if (!hasSpeech(samples)) throw new Error('No speech recognized. Try again in a quiet place.')
          finalStarted = performance.now()
          const result = await live!.finish(samples)
          if (!current()) return
          if (!result.text) throw new Error('No speech recognized. Try again in a quiet place.')
          const metrics = { ...live!.metrics, firstPreviewMs, finalizationMs: performance.now() - finalStarted }
          onText(result.text.slice(0, 500)); publish(null); setStatus(completionMessage)
          logSpeech({ language, text: result.text, durationMs, preparationMs: prepared.preparationMs, inferenceMs: result.inferenceMs, live: metrics })
        } catch (error) { if (current()) { publish(null); setStatus(error instanceof Error ? error.message : String(error)); logSpeech({ language, durationMs, error: String(error), live: { ...live!.metrics, firstPreviewMs, finalizationMs: finalStarted === undefined ? 0 : performance.now() - finalStarted } }) } }
        finally { cleanup(); if (current()) { state.cleanup = undefined; state.controller = undefined; setPhase('idle'); setProgress(undefined) } }
      }
      state.stop = stop
      interval = window.setInterval(() => { if (recording && current() && audio!.duration >= 1) { const samples = audio!.samples(); if (hasSpeech(samples)) live!.update(samples) } }, 700)
      timer = window.setTimeout(() => void stop(), 20000)
      setPhase('recording'); setStatus('Listening… Words may change until you stop. Maximum 20 seconds.')
    } catch (error) {
      cleanup()
      if (!current()) return
      state.cleanup = undefined; state.controller = undefined; publish(null); setPhase('idle'); setProgress(undefined)
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      setStatus(denied ? 'Microphone permission was denied. You can still type.' : error instanceof Error ? error.message : String(error)); logSpeech({ language, error: String(error) })
    }
  }
  return <div className="flex max-w-64 flex-col items-end gap-2">
    <button type="button" disabled={disabled && phase === 'idle'} aria-label={t(phase === 'recording' ? 'Stop recording' : phase !== 'idle' ? 'Cancel speech input' : 'Voice input')} aria-pressed={phase === 'recording'}
      onClick={() => { if (phase === 'recording') void session.current.stop?.(); else if (phase !== 'idle') cancel(); else void start() }}
      className={`flex size-14 items-center justify-center rounded-full text-on-accent disabled:opacity-50 ${phase === 'recording' ? 'bg-danger' : 'bg-accent'}`}>
      {phase !== 'idle' ? <span aria-hidden="true" className="text-xl">■</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-7"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg>}
    </button>
    {!onPreview && preview && <p className="text-sm text-interim" lang={language} aria-live="polite">{preview}</p>}
    {status && <p role="status" className="max-w-64 text-right text-xs text-muted">{t(status)}{progress !== undefined ? ` ${progress}%` : ''}</p>}
  </div>
}
