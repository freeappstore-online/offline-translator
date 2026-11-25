export const languages = { vi: 'Vietnamese', zh: 'Chinese (Simplified)' }
export type TargetLanguage = keyof typeof languages

export const categories = {
  essentials: 'Essentials',
  directions: 'Directions',
  food: 'Food & allergies',
  help: 'Getting help',
}

export const reviewStatuses = ['pending', 'approved', 'rejected'] as const
export const riskLevels = ['low', 'medium', 'high'] as const
export const reviewFlags = [
  'disease_scientific_name',
  'legal_term',
  'medical',
  'allergy',
  'emergency',
  'currency',
  'number',
  'negation',
  'identifier',
  'proper_name',
  'time_date',
  'register',
  'uncertain_translation',
] as const
export const reviewSources = ['seed', 'wikivoyage', 'tatoeba', 'llm', 'pattern', 'other'] as const

export type ReviewStatus = (typeof reviewStatuses)[number]
export type RiskLevel = (typeof riskLevels)[number]
export type ReviewFlag = (typeof reviewFlags)[number]
export type ReviewSource = (typeof reviewSources)[number]

export interface PhraseReview {
  status: ReviewStatus
  risk: RiskLevel
  flags?: ReviewFlag[]
  source?: ReviewSource
  notes?: string
}

export interface Phrase {
  id: string
  category: keyof typeof categories
  en: string
  vi: string
  zh: string
  review?: PhraseReview
}

export const datasetId = (import.meta.env.VITE_HF_DATASET_ID ?? '').trim()

function isReview(value: unknown): value is PhraseReview {
  if (!value || typeof value !== 'object') return false
  const review = value as PhraseReview
  if (!reviewStatuses.includes(review.status) || !riskLevels.includes(review.risk)) return false
  if (review.flags !== undefined && (!Array.isArray(review.flags) ||
    review.flags.some(flag => !reviewFlags.includes(flag)))) return false
  if (review.source !== undefined && !reviewSources.includes(review.source)) return false
  if (review.notes !== undefined && typeof review.notes !== 'string') return false
  return true
}

export function needsHumanReviewWarning(card: Phrase) {
  return card.review?.risk === 'high' && card.review.status === 'pending'
}

export async function loadPhrases(): Promise<Phrase[]> {
  if (import.meta.env.VITE_USE_BUNDLED_DECK === 'true' || (!datasetId && import.meta.env.DEV)) {
    return (await import('../../dataset/phrases.json')).default as Phrase[]
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(datasetId)) throw new Error('Dataset repository is missing or invalid.')
  const response = await fetch(`https://huggingface.co/datasets/${datasetId}/resolve/main/phrases.json`, {
    cache: 'no-store',
    credentials: 'omit',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Dataset request failed (${response.status}).`)

  const cards = await response.json()
  const ids = new Set<string>()
  if (!Array.isArray(cards) || !cards.length) throw new Error('The dataset has no cards.')
  for (const card of cards) {
    if (!card || !Object.hasOwn(categories, card.category) ||
      !['id', 'en', ...Object.keys(languages)].every(key => typeof card[key] === 'string' && card[key].trim()) ||
      ids.has(card.id) ||
      (card.review !== undefined && !isReview(card.review))) {
      throw new Error('The dataset contains an invalid or duplicate card.')
    }
    ids.add(card.id)
  }
  return cards.filter(card => card.review?.status !== 'rejected')
}

export function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[’']/g, '')
    .replace(/\p{P}/gu, ' ').trim().replace(/\s+/g, ' ')
}
