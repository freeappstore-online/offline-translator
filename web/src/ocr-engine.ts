import { createWorker, OEM, type Worker } from 'tesseract.js'
import type { Language } from './model-options'
import { ocrCache, ocrRuntimeCache, ocrRuntimeFiles, ocrLanguages, ocrUrl as urlFor } from './ocr-resources'
let worker: Worker | undefined
let activeLanguage: Language | undefined
let generation = 0
export async function releaseOcr() { generation++; const old = worker; worker = undefined; activeLanguage = undefined; await old?.terminate() }
export async function removeOcr(language: Language) {
  await releaseOcr()
  const cache = await caches.open(ocrCache)
  await cache.delete(urlFor(ocrLanguages[language])); await cache.delete(new URL('/ocr-ready/' + ocrLanguages[language], location.origin).href)
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('keyval-store')
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('keyval')) request.result.createObjectStore('keyval') }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result; const transaction = db.transaction('keyval', 'readwrite'); transaction.objectStore('keyval').delete('offline-translator-ocr-v1/' + ocrLanguages[language] + '.traineddata'); transaction.oncomplete = () => { db.close(); resolve() }; transaction.onerror = () => { db.close(); reject(transaction.error) } }
  })
}
export async function prepareOcr(language: Language, signal: AbortSignal, report: (status: string, progress?: number) => void) {
  signal.throwIfAborted()
  if (worker && activeLanguage === language) return worker
  await releaseOcr()
  const run = generation
  const runtime = await caches.open(ocrRuntimeCache)
  report('Preparing camera recognition…')
  for (const file of ocrRuntimeFiles) {
    const url = new URL(file, location.origin).href
    if (!(await runtime.match(url))?.ok) { const response = await fetch(url, { signal }); if (!response.ok) throw new Error('Could not prepare the image.'); await runtime.put(url, response) }
  }
  // Tesseract downloads each language once and persists its decompressed data in IndexedDB.
  // Prefetching the gzip here would duplicate that first download without serving the worker.
  const cache = await caches.open(ocrCache)
  signal.throwIfAborted()
  report('Preparing camera recognition…')
  let rejectAbort: (error: Error) => void = () => {}
  const canceled = new Promise<never>((_, reject) => { rejectAbort = reject })
  const abort = () => { void releaseOcr(); rejectAbort(new DOMException('Camera recognition canceled.', 'AbortError')) }
  signal.addEventListener('abort', abort, { once: true })
  try {
    const creation = createWorker(ocrLanguages[language], OEM.LSTM_ONLY, {
      workerPath: '/ocr-runtime/worker.min.js', corePath: '/ocr-runtime/tesseract-core-lstm.wasm.js',
      workerBlobURL: false, langPath: `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${ocrLanguages[language]}/4.0.0_best_int`, cachePath: 'offline-translator-ocr-v1', cacheMethod: 'write', errorHandler: () => {}, logger: event => report(event.status === 'recognizing text' ? 'Recognizing image…' : 'Preparing camera recognition…', Math.round(event.progress * 100)),
    })
    void creation.then(late => { if (signal.aborted || generation !== run) void late.terminate() }).catch(() => {})
    const created = await Promise.race([creation, canceled])
    if (signal.aborted || generation !== run) { await created.terminate(); throw new DOMException('Canceled', 'AbortError') }
    await cache.put(new URL('/ocr-ready/' + ocrLanguages[language], location.origin).href, new Response('ready'))
    worker = created; activeLanguage = language; return created
  } finally { signal.removeEventListener('abort', abort) }
}
export async function recognizeImage(image: string, language: Language, signal: AbortSignal, report: (status: string, progress?: number) => void) {
  const started = performance.now(), connection = await prepareOcr(language, signal, report), prepared = performance.now()
  let rejectAbort: (error: Error) => void = () => {}
  const canceled = new Promise<never>((_, reject) => { rejectAbort = reject })
  const abort = () => { void releaseOcr(); rejectAbort(new DOMException('Camera recognition canceled.', 'AbortError')) }; signal.addEventListener('abort', abort, { once: true })
  try {
    report('Recognizing image…')
    const result = await Promise.race([connection.recognize(image), canceled]); signal.throwIfAborted()
    const text = result.data.text.trim()
    if (!text) throw new Error('No text found. Try a clearer image.')
    return { text, confidence: result.data.confidence, preparationMs: prepared - started, inferenceMs: performance.now() - prepared }
  } finally { signal.removeEventListener('abort', abort) }
}
