import type { Language } from './model-options'
export const ocrCache = 'offline-translator-ocr-data-v1'
export const ocrRuntimeCache = 'offline-translator-ocr-runtime-v1'
export const ocrRuntimeFiles = ['/ocr-runtime/worker.min.js', '/ocr-runtime/tesseract-core-lstm.wasm.js', '/ocr-runtime/tesseract-core-lstm.wasm']
export const ocrLanguages = { en: 'eng', vi: 'vie', zh: 'chi_sim' } as const
export const ocrUrl = (code: string) => `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${code}/4.0.0_best_int/${code}.traineddata.gz`
export async function ocrSaved(language: Language) {
  const ready = await (await caches.open(ocrCache)).match(new URL('/ocr-ready/' + ocrLanguages[language], location.origin).href)
  const runtime = await caches.open(ocrRuntimeCache)
  if (!ready?.ok) return false
  const languageSaved = await new Promise<boolean>(resolve => {
    const request = indexedDB.open('keyval-store')
    request.onerror = () => resolve(false)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('keyval')) request.result.createObjectStore('keyval') }
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('keyval')) { db.close(); resolve(false); return }
      const read = db.transaction('keyval', 'readonly').objectStore('keyval').get('offline-translator-ocr-v1/' + ocrLanguages[language] + '.traineddata')
      read.onsuccess = () => { db.close(); resolve(Boolean(read.result)) }; read.onerror = () => { db.close(); resolve(false) }
    }
  })
  return languageSaved && (await Promise.all(ocrRuntimeFiles.map(file => runtime.match(new URL(file, location.origin).href)))).every(response => response?.ok)
}
