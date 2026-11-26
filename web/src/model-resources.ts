import { speechCache, speechModel } from './speech-model'
export const speechFiles = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'preprocessor_config.json', 'generation_config.json', 'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx']
export async function filesSaved(cacheName: string, model: { id: string; revision: string }, files: string[]) {
  if (!globalThis.caches) return false
  const cache = await caches.open(cacheName)
  const prefix = `https://huggingface.co/${model.id}/resolve/${model.revision}/`
  return (await Promise.all(files.map(file => cache.match(prefix + file)))).every(response => response?.ok)
}
export const speechSaved = () => filesSaved(speechCache, speechModel, speechFiles)
export async function removeModel(cacheName: string, model: { id: string; revision: string }) {
  const cache = await caches.open(cacheName)
  const prefix = `https://huggingface.co/${model.id}/resolve/${model.revision}/`
  await Promise.all((await cache.keys()).filter(request => request.url.startsWith(prefix)).map(request => cache.delete(request)))
}
