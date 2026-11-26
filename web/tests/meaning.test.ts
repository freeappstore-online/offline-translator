import test from 'node:test'
import assert from 'node:assert/strict'
Object.defineProperty(globalThis, '__TRANSLATOR_BUILD__', { value: 'test-build' })
const { checkMeaning } = await import('../src/translation-log.ts')
const entry = (translation: string) => ({ id: 'test', at: '2026-11-26T00:00:00Z', original: 'The bus leaves at 6:30 p.m.', translation, from: 'en' as const, to: 'vi' as const, model: 'test', elapsedMs: 1, check: { status: 'pending' as const, errors: [] } })
test('meaning checks flag the observed OPUS missing clock and M2M missing evening', () => {
  assert.ok(checkMeaning(entry('Xe buýt rời bến lúc p.m.')).errors.includes('Time may be missing or changed.'))
  assert.ok(checkMeaning(entry('Xe buýt rời đi lúc 6:30')).errors.includes('Time of day may be missing.'))
})
test('equivalent 24-hour time is accepted and negation still gets checked', () => {
  assert.deepEqual(checkMeaning(entry('Xe buýt khởi hành lúc 18:30.')).errors, [])
  const e = { ...entry('Tôi ăn thịt lợn.'), original: 'I do not eat pork.' }
  assert.ok(checkMeaning(e).errors.some(error => error.includes('Negation')))
})
