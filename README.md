# Offline Translator

A mobile-first FreeAppStore translator for English, Vietnamese and Simplified Chinese. The interface supports all three languages, with native language names and localized secondary labels. Purple controls, orange accents and reader-facing conversation panels follow the maintainer's design decisions.

## Current features

- **Translate:** editable text or progressive local multilingual voice input; approved complete card/word/pattern lookup runs before OPUS-MT or M2M100. Basic microphone input stays in the same screen. Grey provisional words appear while speaking and may be revised; stopping runs a final full-clip pass and commits normal dark text (light in dark mode). Check the final transcript, then translate.
- **Conversation:** a dedicated `/conversation` route in the bottom menu (short label **Talk**), with **Chat** and **Face to face** styles. Chat shows the original above a larger translation in alternating bubbles, local playback, and one microphone per language. Face to face rotates the upper reader panel and puts each translation on the opposite reader's side, with playback/copy and a microphone in each half. Long translations scroll within their panel. Both styles share the current session turns, progressive grey recognition, final-only automatic translation and speech-marked JSON logs. No reversed keyboard. Settings remains accessible from the top menu.
- **Camera:** take/select a photo, recognize English/Vietnamese/Simplified Chinese locally, edit the text, and send it to Translate with the selected direction. Recognition is Tesseract.js 6.0.1; images are not uploaded or retained in history.
- **Cards:** scenario/task navigation, search, card favorites and separately saved translation results. Saved results support reuse, removal and undo. Device speech playback uses installed local voices only.
- **Packs:** searchable language-pair selection and one translation-model package at a time. The selected direction offers OPUS-MT where supported plus M2M100; the reverse OPUS package is accessed by reversing the pair. Travel phrases stay compact; Voice and Camera expand on demand. Saved resources put checks/removal under Manage, with storage tools and JSON exports collapsed separately. Downloads, cancellation, preparation and shared caches remain available. No accuracy recommendation is inferred from download size.
- **Settings:** interface language, theme and translation model choice. Both OPUS-MT directions and M2M100 remain available. No account/sign-in is required.

## Offline operation and preparation

Open the app online once and prepare the resources you need from Packs. The service worker caches the app shell. Translation and speech use separate revision-pinned browser caches; camera language data also uses Tesseract's IndexedDB cache. Camera runtime assets are served by this app and cached on demand, rather than added to every initial installation.

Speech prepares the model before opening the microphone; hiding the page during preparation cancels it. During recording, snapshots of up to 20 seconds are re-recognized, with Whisper token callbacks updating the grey draft. This is an incremental adapter around a clip-based model, not a native streaming recognizer. Only one inference runs at a time; snapshots do not queue up, and a final pass may revise earlier words. Slower devices show less frequent updates.

Reopening still creates a WASM runtime, reads/decompresses weights, allocates memory and prepares inference sessions. Saved files avoid the network download, not initialization. A shared live worker reuses its active session between attempts. Switching translation model/direction or OCR language can require another preparation. No large background model download or automatic architecture switch is performed.

Storage quota, memory and eviction depend on the browser/device. Saved status checks required files; OCR also needs a successfully prepared language. Clearing site data removes resources and local records. Cached English OCR passed a worker-network-blocked test; a full cold airplane-mode launch and physical Safari microphone/camera behavior still need device validation.

## Phrase library and approval

Production currently uses `VITE_USE_BUNDLED_DECK=true`: the bundled development deck has **1,024 cards**, including pending drafts. Pending high-risk translations carry a warning in Cards and translation results. The development deck remains usable for testing while review is pending; stored matching does not imply human approval. No automatic match is a guarantee of linguistic accuracy. Independent review remains required, especially medical/allergy content.

The public Hugging Face dataset is `van-nguyen/offline-translator-phrases`; it is separate from the bundled development deck and has not received these pending additions. Set `VITE_HF_DATASET_ID=owner/repository` to choose a public repository. With bundled mode disabled, loading prefers a saved phrase package, then the configured remote dataset, and reports a retryable error if that remote deck is unavailable. No token belongs in the client.

Lookup accepts normalized exact complete phrases, words and explicitly approved pattern variants. Patterns reference stable vocabulary IDs and materialize approved full sentences. Unknown slots, conflicting matches and extended sentences fall through to the selected model. Ranked suggestions are optional user choices and never silently treated as exact matches. See [DATASET_REVIEW.md](DATASET_REVIEW.md) for AI drafting, critic and human-review workflows; generated content does not acquire approval automatically.

## Models and local processing

- OPUS-MT: separate `Xenova/opus-mt-en-vi` and `Xenova/opus-mt-vi-en`, q8.
- M2M100: `Xenova/m2m100_418M`, q8; shared multilingual model.
- Voice: multilingual `Xenova/whisper-tiny`, q8, selected spoken source language, 20-second recording maximum. AudioWorklet captures mono PCM, resampled locally to 16 kHz; raw audio discarded. AudioWorklet support is required for this live input path.
- Camera: Tesseract LSTM with eng/vie/chi_sim trained data. Images up to 20 MB are resized to a maximum 2,400-pixel dimension before recognition.

Transformers.js 4.3.2 runs model inference in single-thread WASM workers. First preparation downloads public weights, not user inputs. Microphone/camera access follows a user action. Permission errors, cancellation, timeouts and interrupted work have recoverable states.

Whisper Tiny made Vietnamese and Chinese errors in synthetic fixture tests. Both translation families made meaning errors, including lost times and an incorrect bill/account translation. They remain experimental choices, not validated quality tiers. See [MODEL_EXPERIMENTS.md](MODEL_EXPERIMENTS.md) and [docs/experiments/2026-11-26.json](docs/experiments/2026-11-26.json).

## Records and evaluation

Packs exports **translation-history.json**, **speech-history.json** and **camera-history.json** separately. Records stay on this browser until explicitly exported; full translation history is not displayed in the product. Saved results are a separate user action.

Translation attempts include UTC timestamp, original/result or error, direction, exact model revision, input method, total time, lookup path, build fingerprint and developer-maintained changes-before-run note. Model preparation and inference timings are separate. Speech/OCR records include their own timings and outcomes; speech also records first-preview delay, preview passes/inference/errors and finalization time. No raw audio/images are logged. Automatic checks flag recognizable time/AM-PM, currency, identifier and negation changes. They are limited checks, not a semantic judge. Agent/native-speaker review of exported batches remains necessary for meaning accuracy.

Update `web/src/build-changes.ts` whenever the pipeline changes. The fingerprint hashes app source, build plugin/config and dependency lock; restart the dev server before comparing builds. Old entries retain their metadata. SDK automatic capture/upload is disabled by the existing SDK logger patch.

## Develop and verify

Use Node 22+ and the pinned pnpm 10.30.3:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
fas check
```

`web/tests/` contains deterministic regression tests and opt-in browser smoke pages. Microphone harnesses feed public/synthetic audio and must not be mistaken for physical device recording tests. Test pages/fixtures are not production build inputs. Local review lives at `/review` in Vite development only, passphrase-gated; it is not a public route.

Output is `web/dist/`. Completed, validated updates are pushed to the existing main branch and deployed through the FreeAppStore reusable GitHub workflow, per maintainer preference. Credentials, environment files and user history are excluded from commits. A new-version notice lets the user reload after their current task.

Sources/licenses: [Transformers.js](https://github.com/huggingface/transformers.js) Apache-2.0, [Whisper conversion](https://huggingface.co/Xenova/whisper-tiny) Apache-2.0 model card, [upstream Whisper](https://github.com/openai/whisper) MIT, [Tesseract.js](https://github.com/naptha/tesseract.js) Apache-2.0. Model weights are downloaded from their public source rather than committed here. Platform setup follows [FreeAppStore](https://freeappstore.online/skills.md).
