import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPersonalIndex, parsePersonalCards, readPersonalCards, savePersonalCard, writePersonalCards, personalCardsKey, type PersonalCard } from '../src/personal-cards.ts'
import { buildTranslationLookup } from '../src/translation-lookup.ts'
const own = (enabled = false): PersonalCard => ({ id: 'personal-1', source: 'en', original: 'I need my blue folder.', translations: { vi: { text: 'Tôi cần tập hồ sơ màu xanh của tôi.', origin: 'ai', model: { id: 'test/model', revision: 'fixed' }, generatedAt: '2026-11-27T00:00:00Z' } }, useInTranslate: enabled, createdAt: '2026-11-27T00:00:00Z', updatedAt: '2026-11-27T00:00:00Z' })
test('personal cards require explicit opt-in and match complete phrases in either direction', () => {
  assert.equal(buildPersonalIndex([own()])(own().original, 'en', 'vi'), undefined)
  const lookup = buildPersonalIndex([own(true)])
  assert.equal(lookup(' I NEED my blue folder! ', 'en', 'vi')?.kind, 'personal')
  assert.equal(lookup(own().translations.vi!.text, 'vi', 'en')?.text, own().original)
  assert.equal(lookup('I need my blue folder tomorrow.', 'en', 'vi'), undefined)
  assert.equal(lookup('Toi can tap ho so mau xanh cua toi.', 'vi', 'en'), undefined)
})
test('enabled personal wording overrides shared exact matches; personal conflicts are marked for AI fallback', () => {
  const shared = { id: 'shared', category: 'help' as const, en: own().original, vi: 'Shared version', zh: '共享版本' }
  assert.equal(buildTranslationLookup([shared], [own()])(shared.en, 'en', 'vi')?.text, 'Shared version')
  assert.equal(buildTranslationLookup([shared], [own(true)])(shared.en, 'en', 'vi')?.text, own().translations.vi!.text)
  const conflict = { ...own(true), id: 'other', translations: { vi: { text: 'A different version', origin: 'user' as const } } }
  assert.equal(buildTranslationLookup([shared], [own(true), conflict])(shared.en, 'en', 'vi')?.kind, 'personal-conflict')
})
const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) }, configurable: true })
Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true })
test('save/edit/remove/undo preserves stable IDs and AI provenance without review promotion', () => {
  store.clear(); savePersonalCard(own()); savePersonalCard({ ...own(true), translations: { vi: { ...own().translations.vi!, text: 'Edited wording', editedAt: '2026-11-27T01:00:00Z' } } })
  const cards = readPersonalCards(); assert.equal(cards.length, 1); assert.equal(cards[0].translations.vi?.origin, 'ai'); assert.equal(cards[0].translations.vi?.model?.revision, 'fixed')
  assert.equal((cards[0] as unknown as Record<string, unknown>).approved, undefined)
  writePersonalCards([]); assert.equal(readPersonalCards().length, 0); savePersonalCard(cards[0]); assert.equal(readPersonalCards()[0].id, own().id)
})
test('invalid personal data cannot overwrite existing storage', () => {
  assert.throws(() => parsePersonalCards(JSON.stringify([{ ...own(), translations: {} }])))
  assert.throws(() => parsePersonalCards(JSON.stringify([own(), own()])))
  store.set(personalCardsKey, '{broken'); assert.deepEqual(readPersonalCards(), [])
  assert.throws(() => savePersonalCard(own())); assert.equal(store.get(personalCardsKey), '{broken')
})
