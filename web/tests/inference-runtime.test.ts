import test from 'node:test'
import assert from 'node:assert/strict'
import { cacheInferenceRuntime } from '../src/inference-runtime-cache.ts'
test('shared runtime is downloaded once, reused offline, and failures/aborts do not create a ready entry', async () => {
  const rows = new Map<string, Response>(); let requests = 0
  Object.defineProperty(globalThis, 'caches', { value: { open: async () => ({ match: async (path: string) => rows.get(path)?.clone(), put: async (path: string, response: Response) => { rows.set(path, response) } }) }, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => { requests++; return new Response(new Uint8Array([0, 97, 115, 109])) }, configurable: true })
  assert.equal((await cacheInferenceRuntime('runtime.wasm')).byteLength, 4)
  Object.defineProperty(globalThis, 'fetch', { value: async () => { throw new Error('offline') }, configurable: true })
  assert.equal((await cacheInferenceRuntime('runtime.wasm')).byteLength, 4); assert.equal(requests, 1)
  await assert.rejects(cacheInferenceRuntime('missing.wasm'), /offline/); assert.equal(rows.has('missing.wasm'), false)
  await assert.rejects(cacheInferenceRuntime('aborted.wasm', AbortSignal.abort()), { name: 'AbortError' }); assert.equal(rows.has('aborted.wasm'), false)
})
