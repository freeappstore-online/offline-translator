import runtimeUrl from '@app-inference-wasm?url'
import { inferenceCache, cacheInferenceRuntime } from './inference-runtime-cache'
const url = () => new URL(runtimeUrl, location.origin).href
export async function inferenceRuntimeSaved() { return Boolean((await (await caches.open(inferenceCache)).match(url()))?.ok) }
/** Shared persistent runtime, including in browsers without an active service worker. */
export const prepareInferenceRuntime = (signal?: AbortSignal) => cacheInferenceRuntime(url(), signal)
