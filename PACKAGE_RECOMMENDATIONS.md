# Package setup and recommendation policy

## Current setup — 26 November 2026

Packs preserves both searchable language fields. The initial card offers a one-tap **Install recommended package** action with estimated total package storage and additional space needed in this browser. **Customise packages** expands grouped checkboxes and info buttons. Every entry into customisation starts from the displayed recommendation; changing the language pair resets the preset. Checkbox changes update both the top estimate and the sticky install summary immediately. An empty selection cannot be installed. Unticking never deletes an existing package.

The current preset (`starter-v1-provisional`) includes:

- Shared M2M100 translation, covering both directions of the selected pair.
- Multilingual Whisper Tiny voice input.
- Camera recognition data for each selected language.
- The shared travel-card library.

For English–Vietnamese, both directional OPUS-MT models remain unchecked alternatives in Customise. Users may install multiple models for comparison. M2M100 is a provisional starting choice for shared coverage, **not a validated accuracy winner or device-specific recommendation**. Previous failures and pending card reviews remain relevant.

The card states which translation model will be used after success. A completed installation selects that model and language pair for subsequent translation, while keeping the user on Packs. If both families are selected, M2M100 is the displayed default. If only OPUS is selected, the selected pair's direction is preferred when available. A cards/voice/camera-only selection leaves the translation model unchanged. Failure or cancellation does not activate an incomplete bundle.

Installation is sequential, skips complete saved resources, prepares missing shared runtimes and stops on cancellation/failure. Retries reuse completed packages and cached partial model files. Existing check/remove actions remain under Manage saved packages. No download starts merely from choosing languages or ticking boxes.

## Recommendations will be based on further capability testing

**Future model recommendations must be revised using actual app experiments**, per pair and direction, rather than marketing claims, download size alone, or an assumed universal winner. Evaluate:

- Reviewed meaning accuracy, omissions, negation, numbers, time, names and register, using matched inputs that bypass card hits.
- Cold preparation, warm inference, voice first-preview delay, finalization, real accents and noisy input.
- Actual storage, available browser quota, memory pressure and simultaneous speech/translation behavior.
- Runtime/browser support, cold offline reload, eviction, cancellation and technical failures on real devices.

Keep quality evidence separate from device capability. Unknown memory/hardware information means unknown, not incapable. Recommendations should explain their basis and remain overridable. Do not silently switch existing users' preferences after policy updates, automatically download benchmark models, infer human card approval, or claim tiny synthetic batches establish aggregate accuracy. Update the preset version and decision log when evidence changes the selection.

## Storage calculation

Estimates are decimal MB, based on pinned model files (including tokenizers/config), current runtime assets and decompressed OCR language data. The card library uses its actual UTF-8 serialized size. Each selected resource is counted once. ONNX WASM is shared by translation and speech; OCR runtime is shared by camera languages. Complete saved resources/runtimes are subtracted only from **additional** space, not total package size.

The shared ONNX runtime is explicitly cached and passed to both inference workers as a cached binary. This avoids relying solely on a service worker or transient HTTP cache. Package size does not describe runtime RAM. Browser bookkeeping, incomplete files and temporary installation data may require extra room, so the number is an estimate rather than a quota guarantee. No full cold airplane-mode certification is inferred from cache presence.

Source size snapshot: `docs/package-storage-estimates-2026-11-26.json`. Recheck sizes when checkpoints, runtimes, or OCR data versions change.

## Validation

Browser checks passed: recommended defaults, live checkbox totals, fresh customisation reset, info dialogs, Chinese-pair filtering, cards-only install, full recommended install using saved model files, model/pair activation, reload readiness and 320/375-pixel horizontal fit. Cached M2M100 and Whisper inference ran successfully with the explicitly cached shared runtime. The small written runtime probe exposed another M2M100 meaning error (bakery → kitchen), reinforcing that the preset is provisional. Physical device capacity/quality testing remains ongoing.
