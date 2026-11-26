import test from 'node:test'
import assert from 'node:assert/strict'
import { SpeechAudio, hasSpeech } from '../src/speech-audio.ts'
import { ProgressiveSpeech } from '../src/progressive-speech.ts'
import type { SpeechResult } from '../src/speech-engine.ts'
test('PCM snapshots preserve sample order, downsample to 16k and bound recording memory', () => {
  const audio = new SpeechAudio(48000, 1)
  audio.append(new Float32Array(24000).fill(0.25)); audio.append(new Float32Array(48000).fill(0.75))
  const samples = audio.samples(); assert.equal(audio.duration, 1); assert.equal(samples.length, 16000)
  assert.equal(samples[0], 0.25); assert.equal(samples.at(-1), 0.75); assert.ok(hasSpeech(samples))
  audio.clear(); assert.equal(audio.duration, 0); assert.equal(hasSpeech(audio.samples()), false)
})
test('live passes never queue old snapshots; final pass waits and can revise the provisional text', async () => {
  const calls: { samples: Float32Array; partial: (text: string) => void; resolve: (result: SpeechResult) => void }[] = [], previews: string[] = []
  const live = new ProgressiveSpeech((samples, partial) => new Promise(resolve => calls.push({ samples, partial, resolve })), text => previews.push(text))
  live.update(new Float32Array([1])); live.update(new Float32Array([2])); assert.equal(calls.length, 1)
  calls[0].partial('I want a coat')
  const final = live.finish(new Float32Array([3])); assert.equal(calls.length, 1)
  calls[0].resolve({ text: 'I want a coat', preparationMs: 0, inferenceMs: 5 })
  await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(calls.length, 2); assert.equal(calls[1].samples[0], 3)
  calls[1].partial('I want a boat'); calls[1].resolve({ text: 'I want a boat.', preparationMs: 0, inferenceMs: 6 })
  assert.equal((await final).text, 'I want a boat.'); assert.ok(previews.includes('I want a coat')); assert.ok(previews.includes('I want a boat'))
  assert.equal(live.metrics.previewPasses, 1)
})
test('cancelled live passes cannot publish or start a final pass', async () => {
  let partial: ((text: string) => void) | undefined, done: ((result: SpeechResult) => void) | undefined
  const previews: string[] = [], live = new ProgressiveSpeech((_samples, callback) => new Promise(resolve => { partial = callback; done = resolve }), text => previews.push(text))
  live.update(new Float32Array([1])); live.cancel(); partial!('stale'); done!({ text: 'stale', preparationMs: 0 })
  await assert.rejects(live.finish(new Float32Array([2])), { name: 'AbortError' }); assert.deepEqual(previews, [])
})
test('re-decoding from word one does not erase a longer visible draft', async () => {
  const calls: { partial: (text: string) => void; resolve: (result: SpeechResult) => void }[] = [], previews: string[] = []
  const live = new ProgressiveSpeech((_samples, partial) => new Promise(resolve => calls.push({ partial, resolve })), text => previews.push(text))
  live.update(new Float32Array([1])); calls[0].partial('I would like a ticket'); calls[0].resolve({ text: 'I would like a ticket', preparationMs: 0 })
  await new Promise(resolve => setTimeout(resolve, 0)); live.update(new Float32Array([2])); calls[1].partial('I would')
  assert.deepEqual(previews, ['I would like a ticket'])
  calls[1].resolve({ text: 'I need a ticket.', preparationMs: 0 }); await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(previews.at(-1), 'I need a ticket.')
})
