# Hugging Face evaluation for Offline Translator

## First candidate

Prototype English → Vietnamese with Transformers.js and Xenova’s ONNX conversion of Helsinki-NLP’s OPUS-MT. Add the reverse model as a separate optional download. The upstream Helsinki models list Apache-2.0. Verify the exact conversion artifacts and include the applicable license and notices before distribution. [English → Vietnamese upstream](https://huggingface.co/Helsinki-NLP/opus-mt-en-vi) · [Vietnamese → English upstream](https://huggingface.co/Helsinki-NLP/opus-mt-vi-en)

The INT8 encoder and merged decoder total roughly **101 MB per direction in weights alone**. Tokenizer, configuration and the inference runtime add to that. Measure the actual network payload before displaying a size in Packs. [English → Vietnamese ONNX files](https://huggingface.co/Xenova/opus-mt-en-vi/tree/main/onnx) · [Vietnamese → English ONNX files](https://huggingface.co/Xenova/opus-mt-vi-en/tree/main/onnx)

For Japanese, compare a direction-specific Marian checkpoint against M2M100 418M. M2M100’s upstream model card lists MIT and the browser conversion has ONNX weights. Measure the actual Japanese download and memory costs before choosing a model. Keep NLLB out of the default shortlist given its noncommercial license. [M2M100 upstream](https://huggingface.co/facebook/m2m100_418M) · [M2M100 ONNX](https://huggingface.co/Xenova/m2m100_418M) · [NLLB model card](https://huggingface.co/facebook/nllb-200-distilled-600M)

## How to integrate it

1. Keep exact phrase lookup first when the deck has loaded from Hugging Face. Display any model-generated result with its own label.
2. Pin the Transformers.js version and Hugging Face revision. Host the selected weights, tokenizer, JavaScript and WASM assets under the app’s origin. Set the library’s local asset paths and disable remote model loading. Run the translation pipeline in a Web Worker with WASM as the initial backend. Only the asset install requires a network connection. Phrase text stays in the browser. [Transformers.js custom model and WASM settings](https://huggingface.co/docs/transformers.js/en/custom_usage) · [Pipeline API](https://huggingface.co/docs/transformers.js/en/pipelines)
3. Install each model on demand from Packs. Track model assets separately from the hosted phrase deck. Mark a pack ready after the full asset set is cached and a short test inference succeeds. Support removal and reinstallation after interrupted downloads or storage eviction.
4. Measure cold and warm latency, peak memory, and download size on iOS Safari and lower-memory Android Chrome. Retest after closing and reopening in airplane mode. Ask native speakers to score travel phrases for meaning, register, names, numbers and negation. Have native speakers independently review the medical and allergy cards before a public launch.

This is a documentation and model-file review. No model was downloaded, run, or benchmarked in the current build.
