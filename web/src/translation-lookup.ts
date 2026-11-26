import { buildApprovedIndex } from './approved-phrases'
import { buildPersonalIndex, type PersonalCard } from './personal-cards'
import type { Phrase } from './phrases'
export function buildTranslationLookup(cards: readonly Phrase[], personal: readonly PersonalCard[]) {
  const shared = buildApprovedIndex(cards), own = buildPersonalIndex(personal)
  return (...args: Parameters<typeof shared>) => own(...args) ?? shared(...args)
}
