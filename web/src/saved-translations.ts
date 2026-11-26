import type { Language } from './model-options'
const key = 'offline-translator-saved-results-v1'
export const savedEvent = 'offline-translator-saved-results-changed'
export type SavedTranslation = { id: string; original: string; translation: string; from: Language; to: Language; timestamp: string }
const validLanguage = (code: unknown): code is Language => code === 'en' || code === 'vi' || code === 'zh'
export function readSavedTranslations(): SavedTranslation[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is SavedTranslation => entry && typeof entry.original === 'string' && typeof entry.translation === 'string' && validLanguage(entry.from) && validLanguage(entry.to) && typeof entry.timestamp === 'string').map((entry, index) => ({ ...entry, id: typeof entry.id === 'string' ? entry.id : `${entry.timestamp}-${index}` }))
  } catch { return [] }
}
export function writeSavedTranslations(entries: SavedTranslation[]) { localStorage.setItem(key, JSON.stringify(entries)); window.dispatchEvent(new Event(savedEvent)) }
export function saveTranslation(entry: Omit<SavedTranslation, 'id' | 'timestamp'>) {
  const entries = readSavedTranslations(), duplicate = entries.find(item => item.from === entry.from && item.to === entry.to && item.original === entry.original && item.translation === entry.translation)
  const saved = { ...entry, id: duplicate?.id ?? crypto.randomUUID(), timestamp: new Date().toISOString() }
  writeSavedTranslations([saved, ...entries.filter(item => item.id !== saved.id)])
}
