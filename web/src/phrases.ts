export const languages = { vi: 'Vietnamese', zh: 'Chinese (Simplified)' }
export type TargetLanguage = keyof typeof languages

export const categories = {
  essentials: 'Essentials',
  directions: 'Directions',
  food: 'Food & allergies',
  help: 'Getting help',
}

export interface Phrase {
  id: string
  category: keyof typeof categories
  en: string
  vi: string
  zh: string
}

export const datasetId = (import.meta.env.VITE_HF_DATASET_ID ?? '').trim()

export async function loadPhrases(): Promise<Phrase[]> {
  if (!datasetId && import.meta.env.DEV) {
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
      ids.has(card.id)) {
      throw new Error('The dataset contains an invalid or duplicate card.')
    }
    ids.add(card.id)
  }
  return cards
}

export function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[’']/g, '')
    .replace(/\p{P}/gu, ' ').trim().replace(/\s+/g, ' ')
}
