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
