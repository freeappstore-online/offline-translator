import test from 'node:test'
import assert from 'node:assert/strict'
import { packagesForPair, recommendedPackages, estimateSelection, sharedRuntimeBytes, installSelection, translationForSelection } from '../src/package-plan.ts'
test('recommended presets cover both directions once and change OCR languages with the pair', () => {
  assert.deepEqual(recommendedPackages('en', 'vi'), ['phrases', 'multilingual', 'speech', 'ocr-en', 'ocr-vi'])
  const chinese = packagesForPair('vi', 'zh', 500000)
  assert.ok(chinese.some(row => row.key === 'ocr-zh')); assert.ok(!chinese.some(row => row.key === 'ocr-en' || row.key === 'en-vi'))
  assert.deepEqual(new Set(recommendedPackages('en', 'vi')), new Set(recommendedPackages('vi', 'en')))
})
test('checkbox changes recalculate totals; shared runtimes and already-saved files are not double counted', () => {
  const items = packagesForPair('en', 'vi', 500000), keys = recommendedPackages('en', 'vi')
  const all = estimateSelection(items, keys, {})
  assert.equal(all.total, items.filter(row => keys.includes(row.key)).reduce((sum, row) => sum + row.bytes, 0) + sharedRuntimeBytes.onnx + sharedRuntimeBytes.ocr)
  const noSpeech = estimateSelection(items, keys.filter(key => key !== 'speech'), {})
  assert.equal(all.total - noSpeech.total, 43622127)
  const onlySpeech = estimateSelection(items, ['speech', 'speech'], { speech: true }, { onnx: true })
  assert.equal(onlySpeech.additional, 0); assert.equal(onlySpeech.total, 43622127 + sharedRuntimeBytes.onnx)
  assert.deepEqual(estimateSelection(items, [], {}), { total: 0, additional: 0 })
  const ready = estimateSelection(items, keys, Object.fromEntries(keys.map(key => [key, true])), { onnx: true, ocr: true })
  assert.equal(ready.additional, 0)
})
test('batch installer runs sequentially once per resource and stops on failures and cancellation', async () => {
  const seen: string[] = [], controller = new AbortController()
  await installSelection(['one', 'one', 'two'], controller.signal, async key => { seen.push(key) }); assert.deepEqual(seen, ['one', 'two'])
  await assert.rejects(installSelection(['fail', 'later'], controller.signal, async key => { seen.push(key); throw new Error('download failed') }), /download failed/)
  assert.ok(!seen.includes('later'))
  await assert.rejects(installSelection(['cancel', 'later'], controller.signal, async () => { controller.abort() }), { name: 'AbortError' })
})

test('installed translation choice matches its displayed default and respects an OPUS reverse direction', () => {
  assert.deepEqual(translationForSelection(['multilingual', 'vi-en'], 'vi', 'en'), { engine: 'multilingual', from: 'vi', to: 'en' })
  assert.deepEqual(translationForSelection(['en-vi', 'vi-en'], 'vi', 'en'), { engine: 'opus', from: 'vi', to: 'en' })
  assert.equal(translationForSelection(['phrases', 'speech'], 'en', 'vi'), undefined)
})
