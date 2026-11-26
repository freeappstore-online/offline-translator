import type { Language } from './model-options'
import type { Phrase } from './phrases'
import { normalize } from './text-normalize'

export type PhraseSuggestion = {
  card: Phrase
  score: number
}

const DEFAULT_LIMIT = 5
const DEFAULT_MIN_SCORE = 0.38

function fold(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd')
}

function prepared(text: string) {
  return fold(normalize(text))
}

function isCjk(lang: Language, text: string) {
  return lang === 'zh' || /[\u3400-\u9fff]/u.test(text)
}

function tokens(text: string, lang: Language) {
  if (isCjk(lang, text)) return [...text.replace(/\s+/g, '')]
  return text.split(' ').filter(Boolean)
}

function bigrams(chars: readonly string[]) {
  if (chars.length < 2) return new Set(chars)
  const grams = new Set<string>()
  for (let index = 0; index < chars.length - 1; index++) grams.add(chars[index]! + chars[index + 1]!)
  return grams
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  if (!a.size || !b.size) return 0
  let overlap = 0
  for (const item of a) if (b.has(item)) overlap++
  return overlap / (a.size + b.size - overlap)
}

function coverage(query: ReadonlySet<string>, candidate: ReadonlySet<string>) {
  if (!query.size) return 0
  let overlap = 0
  for (const item of query) if (candidate.has(item)) overlap++
  return overlap / query.size
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    current[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost)
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j]!
  }
  return previous[b.length]!
}

type Features = { text: string; words: ReadonlySet<string>; grams: ReadonlySet<string>; cjk: boolean }
const features = (value: string, lang: Language): Features => {
  const text = prepared(value)
  return { text, words: new Set(tokens(text, lang)), grams: bigrams([...text.replace(/\s+/g, '')]), cjk: isCjk(lang, text) }
}
const featureCache = new WeakMap<Phrase, Partial<Record<Language, { source: string; value: Features }>>>()
function candidateFeatures(card: Phrase, lang: Language) {
  const entries = featureCache.get(card) ?? {}
  if (entries[lang]?.source !== card[lang]) entries[lang] = { source: card[lang], value: features(card[lang], lang) }
  featureCache.set(card, entries)
  return entries[lang]!.value
}
function scorePrepared(query: Features, candidate: Features) {
  const q = query.text, c = candidate.text
  if (!q || !c) return 0
  if (q === c) return 1
  let score = 0
  if (c.startsWith(q)) score = Math.max(score, 0.9 + Math.min(0.09, (q.length / c.length) * 0.09))
  else if (c.includes(q)) score = Math.max(score, 0.72 + Math.min(0.12, (q.length / c.length) * 0.12))
  const tokenScore = Math.max(jaccard(query.words, candidate.words), coverage(query.words, candidate.words) * 0.95)
  score = Math.max(score, tokenScore * 0.82)
  if (query.cjk || candidate.cjk) score = Math.max(score, jaccard(query.grams, candidate.grams) * 0.88)
  if (q.length <= 16 && c.length <= 48) {
    const distance = levenshtein(q, c), similarity = 1 - distance / Math.max(q.length, c.length)
    if (similarity >= 0.68) score = Math.max(score, similarity * 0.84)
  }
  return score
}
export function scorePhrase(query: string, candidate: string, lang: Language) { return scorePrepared(features(query, lang), features(candidate, lang)) }

export function rankSuggestions(
  query: string,
  cards: readonly Phrase[],
  from: Language,
  options: { limit?: number; minScore?: number } = {},
): PhraseSuggestion[] {
  const trimmed = query.trim()
  const minLength = from === 'zh' || /[\u3400-\u9fff]/u.test(trimmed) ? 1 : 2
  if (trimmed.length < minLength) return []

  const limit = options.limit ?? DEFAULT_LIMIT
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE
  const ranked: PhraseSuggestion[] = []
  const queryFeatures = features(trimmed, from)

  for (const card of cards) {
    const score = scorePrepared(queryFeatures, candidateFeatures(card, from))
    if (score < minScore) continue
    ranked.push({ card, score })
  }

  ranked.sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
  return ranked.slice(0, limit)
}
