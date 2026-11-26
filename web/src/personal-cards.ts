import type { Language } from './model-options'
import { matchKey } from './approved-phrases'
export const personalCardsKey = 'offline-translator-personal-cards-v1'
export const personalCardsEvent = 'offline-translator-personal-cards-changed'
export type PersonalVersion = { text: string; origin: 'ai' | 'user'; model?: { id: string; revision: string }; generatedAt?: string; editedAt?: string }
export type PersonalCard = { id: string; source: Language; original: string; translations: Partial<Record<Language, PersonalVersion>>; useInTranslate: boolean; createdAt: string; updatedAt: string }
const language = (value: unknown): value is Language => value === 'en' || value === 'vi' || value === 'zh'
export function parsePersonalCards(raw: string): PersonalCard[] {
  const parsed: unknown = JSON.parse(raw), ids = new Set<string>()
  if (!Array.isArray(parsed)) throw new Error('Personal card data is invalid.')
  for (const row of parsed) {
    if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id) || !language(row.source) || typeof row.original !== 'string' || !row.original.trim() || row.original.length > 500 || typeof row.useInTranslate !== 'boolean' || typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string' || !row.translations || typeof row.translations !== 'object' || Array.isArray(row.translations)) throw new Error('Personal card data is invalid.')
    for (const [code, version] of Object.entries(row.translations) as [string, PersonalVersion][]) {
      if (!language(code) || code === row.source || !version || typeof version.text !== 'string' || !version.text.trim() || version.text.length > 500 || !['ai', 'user'].includes(version.origin) || (version.model && (typeof version.model.id !== 'string' || typeof version.model.revision !== 'string'))) throw new Error('Personal card data is invalid.')
    }
    if (!Object.keys(row.translations).length) throw new Error('Add at least one translation.')
    ids.add(row.id)
  }
  return parsed
}
export function readPersonalCards(): PersonalCard[] { try { return parsePersonalCards(localStorage.getItem(personalCardsKey) ?? '[]') } catch { return [] } }
export function writePersonalCards(cards: PersonalCard[]) { const raw = JSON.stringify(cards); parsePersonalCards(raw); localStorage.setItem(personalCardsKey, raw); window.dispatchEvent(new Event(personalCardsEvent)) }
export function savePersonalCard(card: PersonalCard) {
  const cards = parsePersonalCards(localStorage.getItem(personalCardsKey) ?? '[]')
  writePersonalCards([card, ...cards.filter(row => row.id !== card.id)])
}
export function buildPersonalIndex(cards: readonly PersonalCard[]) {
  const entries = new Map<string, { id: string; text: string } | null>()
  for (const card of cards) {
    if (!card.useInTranslate) continue
    const versions = { ...Object.fromEntries(Object.entries(card.translations).map(([code, version]) => [code, version.text])), [card.source]: card.original } as Partial<Record<Language, string>>
    for (const [from, original] of Object.entries(versions)) for (const [to, text] of Object.entries(versions)) {
      if (from === to) continue
      const key = from + ':' + to + ':' + matchKey(original!)
      const old = entries.get(key)
      if (old === undefined) entries.set(key, { id: card.id, text: text! })
      else if (old && old.text !== text) entries.set(key, null)
    }
  }
  return (input: string, from: Language, to: Language) => {
    const entry = entries.get(from + ':' + to + ':' + matchKey(input))
    if (entry === null) return { kind: 'personal-conflict' as const, id: '', text: '' }
    return entry ? { kind: 'personal' as const, ...entry } : undefined
  }
}
export function exportPersonalCards() {
  const url = URL.createObjectURL(new Blob([localStorage.getItem(personalCardsKey) ?? '[]'], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'personal-cards.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
