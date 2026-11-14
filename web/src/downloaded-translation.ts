import type { Language } from './model-options'

let worker: Worker | undefined
let nextId = 0

export function translateWithModel(
  model: { id: string; revision: string }, input: string, from: Language, to: Language,
  signal: AbortSignal, report: (status: string) => void,
): Promise<string> {
  signal.throwIfAborted()
  const connection = worker ??= new Worker(new URL('./model-worker.ts', import.meta.url), { type: 'module' })
  const id = ++nextId
  return new Promise((resolve, reject) => {
    function cleanup() {
      connection.removeEventListener('message', receive)
      connection.removeEventListener('error', failed)
      signal.removeEventListener('abort', abort)
    }
    function abort() {
      cleanup()
      reject(signal.reason)
    }
    function failed(event: ErrorEvent) {
      cleanup()
      connection.terminate()
      if (worker === connection) worker = undefined
      reject(new Error(event.message || 'Translation worker failed'))
    }
    function receive({ data }: MessageEvent<{ id: number; text?: string; error?: string; status?: string }>) {
      if (data.id !== id) return
      if (data.status) {
        report(data.status)
        return
      }
      cleanup()
      if (data.text) resolve(data.text)
      else reject(new Error(data.error || 'Empty translation'))
    }
    connection.addEventListener('message', receive)
    connection.addEventListener('error', failed)
    signal.addEventListener('abort', abort, { once: true })
    connection.postMessage({ id, model: model.id, revision: model.revision, input, from, to })
  })
}
