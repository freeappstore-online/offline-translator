import type { Language } from './model-options'
export type TranslationMetrics = { preparationMs: number; inferenceMs: number }
let worker: Worker | undefined
let nextId = 0
const pending = new Map<number, (error: Error) => void>()
export function releaseTranslation() {
  worker?.terminate(); worker = undefined
  for (const reject of [...pending.values()]) reject(new DOMException('Translation canceled.', 'AbortError'))
  pending.clear()
}
export function translateWithModel(model: { id: string; revision: string }, input: string, from: Language, to: Language, signal: AbortSignal, report: (status: string) => void, metrics?: (value: TranslationMetrics) => void): Promise<string> {
  signal.throwIfAborted()
  const connection = worker ??= new Worker(new URL('./model-worker.ts', import.meta.url), { type: 'module' })
  const id = ++nextId
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { fail(new Error('Translation timed out. Try a shorter phrase.')); releaseTranslation() }, 180000)
    function cleanup() { clearTimeout(timer); pending.delete(id); connection.removeEventListener('message', receive); connection.removeEventListener('error', failed); signal.removeEventListener('abort', abort) }
    function fail(error: Error) { cleanup(); reject(error) }
    function abort() { releaseTranslation() }
    function failed(event: ErrorEvent) { const error = new Error(event.message || 'Translation worker failed'); connection.terminate(); if (worker === connection) worker = undefined; for (const cancel of [...pending.values()]) cancel(error) }
    function receive({ data }: MessageEvent<{ id: number; text?: string; error?: string; status?: string; metrics?: TranslationMetrics }>) {
      if (data.id !== id) return
      if (data.status) { report(data.status); return }
      cleanup(); if (data.metrics) metrics?.(data.metrics)
      if (data.text) resolve(data.text); else reject(new Error(data.error || 'Empty translation'))
    }
    pending.set(id, fail); connection.addEventListener('message', receive); connection.addEventListener('error', failed); signal.addEventListener('abort', abort, { once: true })
    connection.postMessage({ id, model: model.id, revision: model.revision, input, from, to })
  })
}
