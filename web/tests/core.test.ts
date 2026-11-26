import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApprovedIndex } from '../src/approved-phrases.ts'
import { rankSuggestions } from '../src/suggest-phrases.ts'
import { modelFor } from '../src/model-options.ts'
import { readSavedTranslations, saveTranslation, writeSavedTranslations } from '../src/saved-translations.ts'
import { filesSaved, removeModel } from '../src/model-resources.ts'
const card = { id: 'station', category: 'directions' as const, en: 'Where is the train station?', vi: 'Ga tàu ở đâu?', zh: '火车站在哪里？' }
test('exact normalization preserves meaning boundaries and Vietnamese accents', () => {
  const lookup = buildApprovedIndex([card])
  assert.equal(lookup('  WHERE is the train station! ', 'en', 'vi')?.text, card.vi)
  assert.equal(lookup('Ga tàu ở đâu?', 'vi', 'en')?.text, card.en)
  assert.equal(lookup('I do not need help with my luggage', 'en', 'vi'), undefined)
  assert.equal(lookup('I need help with my passport', 'en', 'vi'), undefined)
  assert.equal(lookup('Ga tau o dau', 'vi', 'en'), undefined)
})
test('conflicting stored translations fall through instead of choosing arbitrarily', () => {
  const lookup = buildApprovedIndex([card, { ...card, id: 'conflict', vi: 'A different intent' }])
  assert.equal(lookup(card.en, 'en', 'vi'), undefined)
})
test('approved slots share vocabulary and never compose arbitrary words', () => {
  const lookup = buildApprovedIndex([])
  assert.equal(lookup('I need help with my luggage', 'en', 'vi')?.vocabularyId, 'luggage')
  assert.equal(lookup('luggage', 'en', 'vi')?.kind, 'vocabulary')
  assert.equal(lookup('I left my elephant here', 'en', 'vi'), undefined)
})
test('suggestions rank accent-folded Vietnamese without altering the selected text', () => {
  const matches = rankSuggestions('ga tau', [card], 'vi')
  assert.equal(matches[0]?.card.vi, card.vi)
})
test('OPUS directions use distinct models and Chinese requires multilingual', () => {
  assert.equal(modelFor('opus', 'en', 'vi')?.id, 'Xenova/opus-mt-en-vi')
  assert.equal(modelFor('opus', 'vi', 'en')?.id, 'Xenova/opus-mt-vi-en')
  assert.equal(modelFor('opus', 'zh', 'en'), undefined)
  assert.equal(modelFor('multilingual', 'zh', 'vi')?.id, 'Xenova/m2m100_418M')
})
const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) }, configurable: true })
Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true })
test('saved results migrate old records, deduplicate and keep languages when reused', () => {
  store.clear(); store.set('offline-translator-saved-results-v1', JSON.stringify([{ original: 'Xin chào', translation: 'Hello', from: 'vi', to: 'en', timestamp: '2026-11-26T00:00:00Z' }]))
  const old = readSavedTranslations(); assert.equal(old.length, 1); assert.ok(old[0].id)
  saveTranslation({ original: 'Xin chào', translation: 'Hello', from: 'vi', to: 'en' })
  assert.equal(readSavedTranslations().length, 1)
  writeSavedTranslations([]); assert.equal(readSavedTranslations().length, 0)
  writeSavedTranslations(old); assert.equal(readSavedTranslations()[0].from, 'vi')
  store.set('offline-translator-saved-results-v1', '{broken'); assert.deepEqual(readSavedTranslations(), [])
})
test('saved status requires every pinned file and removal leaves unrelated packs alone', async () => {
  const entries = new Map<string, Response>(), cache = { match: async (url: string) => entries.get(url), keys: async () => [...entries.keys()].map(url => new Request(url)), delete: async (request: Request | string) => entries.delete(typeof request === 'string' ? request : request.url) }
  Object.defineProperty(globalThis, 'caches', { value: { open: async () => cache }, configurable: true })
  const model = { id: 'owner/model', revision: 'fixed' }, prefix = 'https://huggingface.co/owner/model/resolve/fixed/'
  entries.set(prefix + 'config', new Response('{}')); assert.equal(await filesSaved('cache', model, ['config', 'weights']), false)
  entries.set(prefix + 'weights', new Response('data')); entries.set('https://example.org/other', new Response('keep'))
  assert.equal(await filesSaved('cache', model, ['config', 'weights']), true)
  await removeModel('cache', model); assert.ok(entries.has('https://example.org/other')); assert.equal(await filesSaved('cache', model, ['config', 'weights']), false)
})
