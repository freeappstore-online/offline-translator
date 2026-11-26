export const inferenceCache = 'offline-translator-wasm'
export async function cacheInferenceRuntime(path: string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const cache = await caches.open(inferenceCache)
  let response = await cache.match(path)
  if (!response?.ok) {
    response = await fetch(path, { signal })
    if (!response.ok) throw new Error('Could not download the shared model runtime. Please retry.')
    await cache.put(path, response.clone())
  }
  signal?.throwIfAborted()
  return response.arrayBuffer()
}
