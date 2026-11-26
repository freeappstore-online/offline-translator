import { buildFingerprint } from './translation-log'
import { buildChanges } from './build-changes'
import { speechModel } from './speech-model'
import type { Language } from './model-options'
const key = 'offline-translator-speech-history-v1'
export type SpeechRun = { language: Language; text?: string; durationMs?: number; preparationMs?: number; inferenceMs?: number; error?: string; live?: { previewPasses: number; updates: number; firstPreviewMs?: number; previewInferenceMs: number; previewErrors: string[]; finalizationMs: number } }
export function logSpeech(run: SpeechRun) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    const entries = Array.isArray(parsed) ? parsed : []
    localStorage.setItem(key, JSON.stringify([{ id: crypto.randomUUID(), at: new Date().toISOString(), model: speechModel, build: buildFingerprint, changes: buildChanges, ...run }, ...entries]))
  } catch { /* Speech input remains usable if browser storage is full. */ }
}
export function exportSpeechLog() {
  const url = URL.createObjectURL(new Blob([localStorage.getItem(key) ?? '[]'], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'speech-history.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
