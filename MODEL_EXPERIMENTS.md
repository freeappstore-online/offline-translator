# Model experiments and architecture decisions

## 2026-11-25 — User observation: OPUS-MT versus M2M100

The user reports that OPUS-MT performed worse than M2M100 on many tested examples, specifically English → Vietnamese. This is a preliminary qualitative observation from app testing, not a scored benchmark. The examples, exported run IDs, exact outputs and measured error rates have not yet been attached or independently reviewed. Do not infer Vietnamese → English performance from this observation.

### Verified implementation

- English → Vietnamese selects `Xenova/opus-mt-en-vi`, revision `30bcd461c0d7338ad106b36314d3eedc2d4e998c`.
- Vietnamese → English selects a separate `Xenova/opus-mt-vi-en`, revision `541dfd72ec07e8f1563795e0224408ad8d729e80`.
- Selection is by source language in `web/src/model-options.ts`; the worker receives the selected checkpoint. OPUS is not one reverse-only model used for both directions.
- Multilingual alternative: `Xenova/m2m100_418M`, revision `9c374f0b7aca709787cea97b047bfbbd1559d177`, with explicit source and target codes.
- Current worker: WASM, q8, one thread, max_new_tokens=64. Check truncation and generation configuration alongside meaning errors; do not attribute all errors to model architecture without testing.

### Future options — deferred, not implemented

Keep both model families available for now. Consider M2M100 as the main model if matched app tests support its quality and resource costs. Additional optional models could cover languages outside its supported set, improve a particular direction, or provide smaller downloads. Enabling an already-supported M2M100 language does not require separate weights for that pair; the app currently exposes only English, Vietnamese and Simplified Chinese. A language outside the model cannot be added by downloading vocabulary alone.

Keep direction-specific models as optional storage-saving alternatives only where measured quality is acceptable. Current UI estimates are roughly 107 MB per OPUS direction versus 640 MB for M2M100; download size is not runtime memory consumption. Both OPUS directions require separate resources.

Consider a local capability recommendation in Packs: combine selected pair, existing downloaded models, approximate storage quota, supported runtime features, optional coarse hardware hints, and actual model preparation/translation success and timings. Missing memory APIs must mean unknown, not incapable. Do not automatically download a large benchmark model or silently replace the user's choice. Make recommendations explainable and overridable. Hardware capability cannot establish translation accuracy; use reviewed pair-and-direction evaluations as a separate input. Browser storage estimates do not guarantee available RAM or successful execution.

### Next evidence needed

Review exported JSON with matched inputs in both directions, separate card hits from model outputs, check resolved checkpoint IDs, and record meaning errors, omissions, fluency, truncation, cold/warm latency, download size, preparation failures and available resource measurements. Do not invent scores or automatically promote one model based only on this report.

Sources: https://huggingface.co/facebook/m2m100_418M and https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory (checked 2026-11-25).

## 2026-11-26 — Browser Whisper Tiny smoke tests

Actual app worker, Transformers.js 4.3.2, WASM q8, pinned multilingual Whisper Tiny revision `5332fcc35e32a33b86612b9a57a89be7906102b1`. Fixture: https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav . Public audio was decoded locally to 16 kHz Float32 samples and passed to the speech worker with English selected and `task: transcribe`.

- First observed run: preparation 9613.3 ms, inference 2051.2 ms. Returned the expected English sentence. This timing includes initialization/download activity; it is not a controlled cold-cache benchmark.
- Fresh worker, model-network requests blocked after caching: preparation 934.8 ms, inference 1656.4 ms. Returned the same expected sentence. The fixture was fetched before blocking model traffic; this verifies model reuse, not an entirely disconnected browser session.
- TypeScript and production build passed. Test harnesses were temporary development files and are not shipped.
- Not measured yet: Vietnamese and Chinese recognition accuracy, actual microphone capture on Safari/mobile, noisy speech, full offline app reload and competing ASR/translation memory costs. No accuracy scores are inferred from the English smoke tests.

## 26 November 2026 — actual app worker smoke batch

Raw inputs, outputs, preparation/inference timings and agent meaning reviews are in `docs/experiments/2026-11-26.json`. Five travel sentences were run directly through each available English/Vietnamese model direction, bypassing cards. Other OCR/speech jobs ran concurrently, so these timings are not a controlled architecture comparison.

OPUS English→Vietnamese omitted `6:30` entirely in a time sentence. M2M100 retained the clock but lost the evening qualifier and translated restaurant “bill” as “account”. OPUS Vietnamese→English changed a card-payment question into “Can I get my cards?”. Both remain available; the earlier user observation that OPUS often performed worse remains an observation rather than a settled model-selection rule. Regression tests now flag missing clock/period information. Automatic checks still cannot detect every semantic error.

Actual browser Whisper Tiny tests recognized the public English JFK fixture, but changed words in synthetic Vietnamese and Chinese samples. Chinese also used Traditional characters despite Simplified input. These are recorded failures, not silently corrected transcripts. Full MediaRecorder flow was exercised using a synthetic stream; this is not a physical microphone/Safari quality test.

Tesseract recognized the synthetic EN/VI/ZH image fixtures. Cached English recognition also completed with external worker fetch blocked. The initial supplied-buffer language initialization failed; switching to the library's standard string-language/IndexedDB path fixed it. Empty system-generated audio fixtures were regenerated and excluded from quality results.

Validated flows: exact-card result, save/reuse/remove/undo, same-screen voice transcription, automatic opposing-reader Conversation translation, microphone-denied recovery, camera recognition/editable handoff, persisted model preference, and 320/375-pixel mobile layouts without horizontal overflow. Remaining device validation: physical Safari microphone/camera, noisy photos, real speaker accents, memory pressure/eviction, and full cold airplane-mode launch.
