import { useEffect, useRef, useState } from 'react'
import type { Language } from './model-options'
import { t } from './i18n'
import { logSpeech } from './speech-log'

type Phase = 'idle' | 'permission' | 'recording' | 'processing'
export function SpeechInput({ language, onText, onBusyChange, disabled = false }: { language: Language; onText: (text: string) => void; onBusyChange: (busy: boolean) => void; disabled?: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle')
  useEffect(() => { onBusyChange(phase !== 'idle'); return () => onBusyChange(false) }, [phase, onBusyChange])
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState<number>()
  const session = useRef({ id: 0, mounted: true, recorder: null as MediaRecorder | null, stream: null as MediaStream | null, context: null as AudioContext | null, worker: null as Worker | null, timer: 0 })
  function release() {
    clearTimeout(session.current.timer)
    session.current.stream?.getTracks().forEach(track => track.stop())
    session.current.stream = null
    if (session.current.context) void session.current.context.close().catch(() => {})
    session.current.context = null
  }
  useEffect(() => {
    const state = session.current; state.mounted = true
    return () => { state.mounted = false; state.id++; if (state.recorder?.state === 'recording') state.recorder.stop(); release(); state.worker?.terminate(); state.worker = null }
  }, [])
  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden && session.current.recorder?.state === 'recording') session.current.recorder.stop() }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => document.removeEventListener('visibilitychange', stopWhenHidden)
  }, [])
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setStatus('Microphone recording is not supported in this browser.'); return }
    const state = session.current
    const id = ++state.id
    const current = () => state.mounted && state.id === id
    setPhase('permission'); setStatus('Allow microphone access to start.'); setProgress(undefined)
    try {
      const context = new AudioContext(); state.context = context
      await context.resume()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      if (!current()) { stream.getTracks().forEach(track => track.stop()); return }
      state.stream = stream
      const recorder = new MediaRecorder(stream)
      state.recorder = recorder
      const chunks: Blob[] = []
      const started = performance.now()
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onerror = () => { if (!current()) return; state.id++; release(); setPhase('idle'); setStatus('Recording failed. Please try again.'); logSpeech({ language, error: 'MediaRecorder error' }) }
      recorder.onstop = async () => {
        clearTimeout(state.timer)
        stream.getTracks().forEach(track => track.stop()); state.stream = null
        if (!current()) return
        const durationMs = performance.now() - started
        setPhase('processing'); setStatus('Preparing speech model…')
        try {
          const audio = await context.decodeAudioData(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer())
          const offline = new OfflineAudioContext(1, Math.ceil(audio.duration * 16000), 16000)
          const source = offline.createBufferSource(); source.buffer = audio; source.connect(offline.destination); source.start()
          const resampled = await offline.startRendering()
          const samples = resampled.getChannelData(0).slice()
          if (!current()) return
          let peak = 0
          for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
          if (peak < 0.003 || audio.duration < 0.25) throw new Error('No speech recognized. Try again in a quiet place.')
          await context.close(); state.context = null
          const worker = state.worker ??= new Worker(new URL('./speech-worker.ts', import.meta.url), { type: 'module' })
          worker.onerror = event => {
            if (!current()) return
            clearTimeout(state.timer); worker.terminate(); state.worker = null; setPhase('idle'); setStatus('Speech recognition failed. Please try again.')
            logSpeech({ language, durationMs, error: event.message || 'Speech worker failed' })
          }
          worker.onmessage = ({ data }: MessageEvent<{ id: number; text?: string; error?: string; status?: string; progress?: number; preparationMs?: number; inferenceMs?: number }>) => {
            if (!current() || data.id !== id) return
            if (data.status) { setStatus(data.status); setProgress(data.progress); return }
            clearTimeout(state.timer); setPhase('idle'); setProgress(undefined)
            if (data.text) {
              onText(data.text.slice(0, 500)); setStatus('Check the recognized text, then tap Translate.')
              logSpeech({ language, text: data.text, durationMs, preparationMs: data.preparationMs, inferenceMs: data.inferenceMs })
            } else { setStatus(data.error || 'Speech recognition failed. Please try again.'); logSpeech({ language, durationMs, error: data.error }) }
          }
          state.timer = window.setTimeout(() => {
            if (!current()) return
            state.id++; worker.terminate(); state.worker = null; setPhase('idle'); setStatus('Speech recognition timed out. Try a shorter recording.')
            logSpeech({ language, durationMs, error: 'Speech recognition timed out after 180 seconds' })
          }, 180000)
          worker.postMessage({ id, samples, language }, [samples.buffer])
        } catch (error) {
          if (!current()) return
          release(); setPhase('idle'); setStatus(error instanceof Error ? error.message : String(error)); logSpeech({ language, durationMs, error: String(error) })
        }
      }
      recorder.start(); setPhase('recording'); setStatus('Recording… Tap to stop. Maximum 20 seconds.')
      state.timer = window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 20000)
    } catch (error) {
      if (!current()) return
      release(); setPhase('idle')
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      setStatus(denied ? 'Microphone permission was denied. You can still type.' : 'Could not open the microphone. Check your device and try again.')
      logSpeech({ language, error: String(error) })
    }
  }
  function activate() {
    if (phase === 'recording') { session.current.recorder?.stop(); return }
    if (phase !== 'idle') {
      session.current.id++; session.current.worker?.terminate(); session.current.worker = null; release(); setPhase('idle'); setStatus('Speech input canceled.'); logSpeech({ language, error: 'Speech input canceled' }); return
    }
    void start()
  }
  return <div className="flex max-w-64 flex-col items-end gap-2">
    <button type="button" disabled={disabled && phase === 'idle'} aria-label={t(phase === 'recording' ? 'Stop recording' : phase !== 'idle' ? 'Cancel speech input' : 'Voice input')}
      aria-pressed={phase === 'recording'} onClick={activate}
      className={`flex size-14 items-center justify-center rounded-full text-on-accent disabled:opacity-50 ${phase === 'recording' ? 'bg-danger' : 'bg-accent'}`}>
      {phase !== 'idle' ? <span aria-hidden="true" className="text-xl">■</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-7"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg>}
    </button>
    {status && <p role="status" className="max-w-64 text-right text-xs text-muted">{t(status)}{progress !== undefined ? ` ${progress}%` : ''}</p>}
  </div>
}
