import test from 'node:test'
import assert from 'node:assert/strict'
class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = []
  messages: { id: number; [key: string]: unknown }[] = []
  terminated = false
  constructor() { super(); FakeWorker.instances.push(this) }
  postMessage(data: { id: number; [key: string]: unknown }) { this.messages.push(data) }
  terminate() { this.terminated = true }
  respond(data: unknown) { this.dispatchEvent(new MessageEvent('message', { data })) }
}
Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true })
Object.defineProperty(globalThis, 'window', { value: { setTimeout: globalThis.setTimeout }, configurable: true })
const { transcribeSpeech, prepareSpeech, releaseSpeech } = await import('../src/speech-engine.ts')
const { translateWithModel, releaseTranslation } = await import('../src/downloaded-translation.ts')
test('speech preparation and later transcription reuse one worker; cancel terminates real work', async () => {
  FakeWorker.instances.length = 0; const controller = new AbortController()
  const prepare = prepareSpeech(controller.signal, () => {}), first = FakeWorker.instances[0]
  first.respond({ id: first.messages[0].id, preparationMs: 2 }); await prepare
  const transcribe = transcribeSpeech(new Float32Array([0.1]), 'vi', controller.signal, () => {})
  assert.equal(FakeWorker.instances.length, 1)
  first.respond({ id: first.messages[1].id, text: 'Xin chào', preparationMs: 0, inferenceMs: 10 })
  assert.equal((await transcribe).text, 'Xin chào')
  const canceled = prepareSpeech(controller.signal, () => {}); controller.abort()
  await assert.rejects(canceled, { name: 'AbortError' }); assert.ok(first.terminated)
  const retry = prepareSpeech(new AbortController().signal, () => {}), second = FakeWorker.instances[1]
  assert.notEqual(first, second); second.respond({ id: second.messages[0].id, preparationMs: 1 }); await retry; releaseSpeech()
})
test('translation reports preparation separately and abort resets the runtime', async () => {
  FakeWorker.instances.length = 0
  const model = { id: 'test/model', revision: 'pinned' }, controller = new AbortController(); let metrics: unknown
  const result = translateWithModel(model, 'hello', 'en', 'vi', controller.signal, () => {}, value => { metrics = value })
  const worker = FakeWorker.instances[0]; worker.respond({ id: worker.messages[0].id, text: 'xin chào', metrics: { preparationMs: 25, inferenceMs: 6 } })
  assert.equal(await result, 'xin chào'); assert.deepEqual(metrics, { preparationMs: 25, inferenceMs: 6 })
  const pending = translateWithModel(model, 'bye', 'en', 'vi', controller.signal, () => {}); controller.abort()
  await assert.rejects(pending, { name: 'AbortError' }); assert.ok(worker.terminated); releaseTranslation()
})
