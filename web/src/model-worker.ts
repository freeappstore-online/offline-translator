import { modelCache, packSaved } from './pack-storage'
import { env, pipeline } from '@huggingface/transformers'
import type { TranslationPipeline } from '@huggingface/transformers'
import type { Language } from './model-options'

env.allowLocalModels = false
env.useBrowserCache = true
env.cacheKey = modelCache
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1

let active: { model: string; translator: TranslationPipeline } | undefined
let queue = Promise.resolve()
self.addEventListener('message', ({ data }: MessageEvent<{
  id: number; model: string; revision: string; input: string; from: Language; to: Language
}>) => {
  queue = queue.then(async () => {
    const { id, model, revision, input, from, to } = data
    try {
      if (active?.model !== model) {
        const saved = await packSaved({ id: model, revision })
        self.postMessage({ id, status: saved ? 'Preparing saved model…' : 'Downloading model…' })
        await active?.translator.dispose()
        active = undefined
        const translator = await pipeline('translation', model, {
          revision, device: 'wasm', dtype: 'q8', local_files_only: saved,
          progress_callback: event => {
            if (event.status === 'progress') {
              self.postMessage({ id, status: `Downloading ${event.file.split('/').pop()}… ${Math.round(event.progress)}%` })
            }
          },
        })
        active = { model, translator }
      }
      self.postMessage({ id, status: 'Translating…' })
      const options = model.includes('m2m100') ? { src_lang: from, tgt_lang: to } : {}
      const [result] = await active.translator(input, { ...options, max_new_tokens: 64 })
      const text = result.translation_text.trim()
      if (!text) throw new Error('Empty translation')
      self.postMessage({ id, text })
    } catch (error) {
      self.postMessage({ id, error: String(error) })
    }
  })
})
