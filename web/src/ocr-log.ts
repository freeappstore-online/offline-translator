import { buildFingerprint } from './translation-log'
import { buildChanges } from './build-changes'
import type { Language } from './model-options'
const key = 'offline-translator-ocr-history-v1'
export function logOcr(entry: { from: Language; text?: string; confidence?: number; preparationMs?: number; inferenceMs?: number; error?: string }) {
  try { const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]'); localStorage.setItem(key, JSON.stringify([{ id: crypto.randomUUID(), at: new Date().toISOString(), model: 'Tesseract.js 6.0.1 LSTM', build: buildFingerprint, changes: buildChanges, ...entry }, ...(Array.isArray(parsed) ? parsed : [])])) } catch { /* Keep OCR usable when storage is unavailable. */ }
}
export function exportOcrLog() { const url = URL.createObjectURL(new Blob([localStorage.getItem(key) ?? '[]'], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'camera-history.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
