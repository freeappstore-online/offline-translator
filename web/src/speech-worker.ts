import { prepareInferenceRuntime } from './inference-runtime'
import { env, pipeline, WhisperTextStreamer, type WhisperTokenizer, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import { speechCache, speechModel } from './speech-model'
import { speechSaved } from './model-resources'
import type { Language } from './model-options'

env.allowLocalModels = false
env.useBrowserCache = true
env.cacheKey = speechCache
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1
let recognizer: AutomaticSpeechRecognitionPipeline | undefined
let queue = Promise.resolve()
self.onmessage = ({ data }: MessageEvent<{ id: number; samples?: Float32Array; language: Language; stream?: boolean }>) => {
  queue = queue.then(async () => {
  const started = performance.now()
  try {
    if (!recognizer) {
      self.postMessage({ id: data.id, status: 'Preparing speech model…' })
      if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmBinary = await prepareInferenceRuntime()
      const saved = await speechSaved()
      env.allowLocalModels = saved
      recognizer = await pipeline('automatic-speech-recognition', speechModel.id, {
        revision: speechModel.revision, device: 'wasm', dtype: 'q8', local_files_only: saved,
        progress_callback: event => {
          if (event.status === 'progress') self.postMessage({ id: data.id, status: saved ? 'Preparing saved model…' : 'Downloading speech model…', progress: Math.round(event.progress) })
        },
      })
    }
    const prepared = performance.now()
    if (!data.samples) { self.postMessage({ id: data.id, preparationMs: prepared - started }); return }
    self.postMessage({ id: data.id, status: 'Recognizing speech…' })
    let partial = ''
    const streamer = data.stream ? new WhisperTextStreamer(recognizer.tokenizer as WhisperTokenizer, { skip_prompt: true, callback_function: text => { partial += text; self.postMessage({ id: data.id, partial: partial.trim() }) } }) : undefined
    const result = await recognizer(data.samples, {
      language: { en: 'english', vi: 'vietnamese', zh: 'chinese' }[data.language], task: 'transcribe',
      return_timestamps: false, max_new_tokens: 128, streamer,
    })
    const output = Array.isArray(result) ? result[0] : result
    const text = output.text.trim()
    if (!text) throw new Error('No speech recognized. Try again in a quiet place.')
    self.postMessage({ id: data.id, text, preparationMs: prepared - started, inferenceMs: performance.now() - prepared })
  } catch (error) { self.postMessage({ id: data.id, error: String(error) }) }
  })
}
