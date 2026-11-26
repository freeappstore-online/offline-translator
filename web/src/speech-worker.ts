import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import { speechCache, speechModel } from './speech-model'
import type { Language } from './model-options'

env.allowLocalModels = false
env.useBrowserCache = true
env.cacheKey = speechCache
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1
let recognizer: AutomaticSpeechRecognitionPipeline | undefined
self.onmessage = async ({ data }: MessageEvent<{ id: number; samples: Float32Array; language: Language }>) => {
  const started = performance.now()
  try {
    if (!recognizer) {
      self.postMessage({ id: data.id, status: 'Preparing speech model…' })
      const cache = await caches.open(speechCache)
      const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'preprocessor_config.json', 'generation_config.json', 'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx']
      const prefix = `https://huggingface.co/${speechModel.id}/resolve/${speechModel.revision}/`
      const saved = (await Promise.all(files.map(file => cache.match(prefix + file)))).every(response => response?.ok)
      env.allowLocalModels = saved
      recognizer = await pipeline('automatic-speech-recognition', speechModel.id, {
        revision: speechModel.revision, device: 'wasm', dtype: 'q8', local_files_only: saved,
        progress_callback: event => {
          if (event.status === 'progress') self.postMessage({ id: data.id, status: 'Downloading speech model…', progress: Math.round(event.progress) })
        },
      })
    }
    const prepared = performance.now()
    self.postMessage({ id: data.id, status: 'Recognizing speech…' })
    const result = await recognizer(data.samples, {
      language: { en: 'english', vi: 'vietnamese', zh: 'chinese' }[data.language], task: 'transcribe',
      return_timestamps: false, max_new_tokens: 128,
    })
    const output = Array.isArray(result) ? result[0] : result
    const text = output.text.trim()
    if (!text) throw new Error('No speech recognized. Try again in a quiet place.')
    self.postMessage({ id: data.id, text, preparationMs: prepared - started, inferenceMs: performance.now() - prepared })
  } catch (error) { self.postMessage({ id: data.id, error: String(error) }) }
}
