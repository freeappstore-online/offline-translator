import { belongings, leftBelonging } from './shared-vocabulary'
import type { Language } from './model-options'
import type { Phrase } from './phrases'

type Localized<T> = Record<Language, T>

const vocabulary = {
  ...belongings,
  luggage: { en: 'luggage', vi: 'hành lý', zh: '行李' },
  ticket: { en: 'ticket', vi: 'vé', zh: '票' },
}

type Pattern = {
  id: string
  wording: Localized<string>
  options: ReadonlyArray<{
    vocabularyId: keyof typeof vocabulary
    accepted: Localized<readonly string[]>
    result: Localized<string>
  }>
}

const patterns: readonly Pattern[] = [{
  id: 'need_help_with',
  wording: { en: 'I need help with {thing}', vi: 'Tôi cần giúp đỡ về {thing}', zh: '我的{thing}需要帮忙' },
  options: [{
    vocabularyId: 'luggage',
    accepted: { en: ['my luggage', 'my bags'], vi: ['hành lý của tôi'], zh: ['行李'] },
    result: {
      en: 'I need help with my luggage.',
      vi: 'Tôi cần được giúp đỡ về hành lý của mình.',
      zh: '我的行李需要帮忙处理。',
    },
  }, {
    vocabularyId: 'ticket',
    accepted: { en: ['my ticket'], vi: ['vé của tôi'], zh: ['票'] },
    result: {
      en: 'I need help with my ticket.',
      vi: 'Tôi cần được giúp đỡ về vé của mình.',
      zh: '我的票需要帮忙处理。',
    },
  }],
}]

export type ApprovedMatch = {
  kind: 'card' | 'vocabulary' | 'pattern'
  id: string
  vocabularyId?: string
  text: string
}

export const approvedLabels = { card: 'Phrase card', vocabulary: 'Vocabulary', pattern: 'Phrase pattern' } as const

const languageCodes: readonly Language[] = ['en', 'vi', 'zh']

function matchKey(text: string) {
  return text.normalize('NFC').trim().toLowerCase().replace(/[‘’]/g, "'")
    .replace(/[.!?。！？]+$/, '').trimEnd().replace(/\s+/g, ' ')
}

export function buildApprovedIndex(cards: readonly Phrase[]) {
  const index = new Map<string, ApprovedMatch | null>()
  function add(from: Language, to: Language, input: string, match: ApprovedMatch) {
    const key = from + ':' + to + ':' + matchKey(input)
    const previous = index.get(key)
    if (previous === undefined) index.set(key, match)
    else if (previous && previous.text !== match.text) index.set(key, null)
  }

  for (const from of languageCodes) {
    for (const to of languageCodes) {
      if (from === to) continue
      for (const card of cards) add(from, to, card[from], { kind: 'card', id: card.id, text: card[to] })
      for (const [id, words] of Object.entries(vocabulary)) {
        add(from, to, words[from], { kind: 'vocabulary', id, text: words[to] })
      }
      for (const [vocabularyId, words] of Object.entries(belongings)) {
        const sentence = leftBelonging(words)
        add(from, to, sentence[from], {
          kind: 'pattern', id: 'left_belonging_here', vocabularyId, text: sentence[to],
        })
      }
      for (const pattern of patterns) {
        for (const option of pattern.options) {
          const match = { kind: 'pattern', id: pattern.id, vocabularyId: option.vocabularyId, text: option.result[to] } as const
          add(from, to, option.result[from], match)
          for (const value of option.accepted[from]) {
            add(from, to, pattern.wording[from].replace('{thing}', value), match)
          }
        }
      }
    }
  }

  return (input: string, from: Language, to: Language) => index.get(from + ':' + to + ':' + matchKey(input)) ?? undefined
}
