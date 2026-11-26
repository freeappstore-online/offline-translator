import type { Language } from './model-options'
export type SpeechResult = { text?: string; preparationMs: number; inferenceMs?: number }
let worker: Worker | undefined
let sequence = 0
const pending = new Map<number, (error: Error) => void>()
export function releaseSpeech(error: Error = new DOMException('Speech input canceled.', 'AbortError')) {
  worker?.terminate(); worker = undefined
  for (const reject of [...pending.values()]) reject(error)
  pending.clear()
}
function request(samples: Float32Array | undefined, language: Language, signal: AbortSignal, report: (status: string, progress?: number) => void, onPartial?: (text: string) => void) {
  signal.throwIfAborted()
  const connection = worker ??= new Worker(new URL('./speech-worker.ts', import.meta.url), { type: 'module' })
  const id = ++sequence
  return new Promise<SpeechResult>((resolve, reject) => {
    const timer = window.setTimeout(() => releaseSpeech(new Error('Speech recognition timed out. Try a shorter recording.')), 180000)
    function cleanup() { clearTimeout(timer); pending.delete(id); connection.removeEventListener('message', receive); connection.removeEventListener('error', failed); signal.removeEventListener('abort', abort) }
    function fail(error: Error) { cleanup(); reject(error) }
    function abort() { releaseSpeech() }
    function failed(event: ErrorEvent) { const error = new Error(event.message || 'Speech worker failed'); connection.terminate(); if (worker === connection) worker = undefined; for (const cancel of [...pending.values()]) cancel(error) }
    function receive({ data }: MessageEvent<{ id: number; status?: string; progress?: number; error?: string; partial?: string } & SpeechResult>) {
      if (data.id !== id) return
      if (data.partial !== undefined) { onPartial?.(data.partial); return }
      if (data.status) { report(data.status, data.progress); return }
      cleanup(); if (data.error) reject(new Error(data.error)); else resolve(data)
    }
    pending.set(id, fail)
    connection.addEventListener('message', receive); connection.addEventListener('error', failed); signal.addEventListener('abort', abort, { once: true })
    connection.postMessage({ id, samples, language, stream: Boolean(onPartial) }, samples ? [samples.buffer] : [])
  })
}
export const prepareSpeech = (signal: AbortSignal, report: (status: string, progress?: number) => void) => request(undefined, 'en', signal, report)
export const transcribeSpeech = (samples: Float32Array, language: Language, signal: AbortSignal, report: (status: string, progress?: number) => void, onPartial?: (text: string) => void) => request(samples, language, signal, report, onPartial)
