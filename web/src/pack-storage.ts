import { modelFor, type Language } from './model-options'

export const modelCache = 'offline-translator-models-v1'
export const phraseCache = 'offline-translator-phrases-v1'
export const phraseUrl = new URL('/offline-phrase-package.json', location.origin).href
export const packs = [
  { key: 'en-vi', name: 'English → Vietnamese', size: 'About 107 MB', from: 'en', to: 'vi', model: modelFor('opus', 'en', 'vi')! },
  { key: 'vi-en', name: 'Vietnamese → English', size: 'About 107 MB', from: 'vi', to: 'en', model: modelFor('opus', 'vi', 'en')! },
  { key: 'multilingual', name: 'English, Vietnamese & Chinese', size: 'About 640 MB', from: 'en', to: 'vi', model: modelFor('multilingual', 'en', 'vi')! },
] satisfies { key: string; name: string; size: string; from: Language; to: Language; model: { id: string; revision: string } }[]

const files = ['config.json', 'tokenizer_config.json', 'tokenizer.json', 'generation_config.json',
  'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx']

export async function packSaved(model: { id: string; revision: string }) {
  const cache = await caches.open(modelCache)
  const prefix = `https://huggingface.co/${model.id}/resolve/${model.revision}/`
  const responses = await Promise.all(files.map(file => cache.match(prefix + file)))
  return responses.every(response => response?.ok)
}

export async function savePhrases(cards: unknown[]) {
  if (!cards.length) throw new Error('The phrase library has not loaded yet.')
  const cache = await caches.open(phraseCache)
  await cache.put(phraseUrl, new Response(JSON.stringify(cards), { headers: { 'Content-Type': 'application/json' } }))
}
