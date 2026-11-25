import type { Language } from './model-options'
import { normalize, type Phrase } from './phrases'

export type PhraseSuggestion = {
  card: Phrase
  score: number
}

const DEFAULT_LIMIT = 5
const DEFAULT_MIN_SCORE = 0.38

function fold(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '')
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

export function scorePhrase(query: string, candidate: string, lang: Language) {
  const q = prepared(query)
  const c = prepared(candidate)
  if (!q || !c) return 0
  if (q === c) return 1

  let score = 0
  if (c.startsWith(q)) score = Math.max(score, 0.9 + Math.min(0.09, (q.length / c.length) * 0.09))
  else if (c.includes(q)) score = Math.max(score, 0.72 + Math.min(0.12, (q.length / c.length) * 0.12))

  const queryTokens = new Set(tokens(q, lang))
  const candidateTokens = new Set(tokens(c, lang))
  const tokenScore = Math.max(
    jaccard(queryTokens, candidateTokens),
    coverage(queryTokens, candidateTokens) * 0.95,
  )
  score = Math.max(score, tokenScore * 0.82)

  if (isCjk(lang, q + c)) {
    const gramScore = jaccard(bigrams([...q.replace(/\s+/g, '')]), bigrams([...c.replace(/\s+/g, '')]))
    score = Math.max(score, gramScore * 0.88)
  }

  if (q.length <= 16 && c.length <= 48) {
    const distance = levenshtein(q, c)
    const similarity = 1 - distance / Math.max(q.length, c.length)
    if (similarity >= 0.68) score = Math.max(score, similarity * 0.84)
  }

  return score
}

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

  for (const card of cards) {
    const score = scorePhrase(trimmed, card[from], from)
    if (score < minScore) continue
    ranked.push({ card, score })
  }

  ranked.sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
  return ranked.slice(0, limit)
}
