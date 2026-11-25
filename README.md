# Offline Translator

Offline Translator is a FreeAppStore travel phrasebook for English, Simplified Chinese, and Vietnamese. It uses the platform SDK Shell with Cards, Translate, and Packs. The first build follows the card interaction in the [original mockup](https://wayword-pack-demo.thanhvanktm2006.chatgpt.site/).

## Develop locally

Use Node 22 or newer and the pnpm version pinned in package.json.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The dev server shows the checked-in 12-card sample when no dataset is configured. Favorites store stable card IDs in the browser. Translate looks up phrases in the loaded deck in either direction. The sample medical and allergy translations await independent native-speaker review.

## Connect Hugging Face

Create a public Hugging Face dataset repository and upload the contents of `dataset/` to the root of its `main` branch. Set `VITE_HF_DATASET_ID=owner/repository` in `web/.env.local` for local testing. For the FreeAppStore deployment, set the same public ID as a GitHub Actions repository variable. Only the dataset ID belongs in this setting.

Production downloads the deck when the app opens. The service worker caches the app shell. Cards and lookup require an internet connection to load the deck. Once it loads, both features work for the rest of that visit.

## Build and check

```sh
corepack pnpm build
fas check
```

The static output is `web/dist/`. The project follows the [FreeAppStore guide](https://freeappstore.online/skills.md) and uses the same SDK logger patch as Symptom Journal to disable log capture and upload. The inherited deployment workflow requires FreeAppStore provisioning before it can deploy. See [HUGGING_FACE.md](HUGGING_FACE.md) for the free-text translation research.

## Downloadable translation models

In Translate, select OPUS-MT for English ↔ Vietnamese or M2M100 for any pair among English, Vietnamese and Simplified Chinese. Each model downloads on its first free-text translation and runs locally. OPUS-MT downloads each direction independently. The browser may evict cached assets. OPUS-MT is selected by default. In Face to face mode, the lower panel stays upright and the upper panel faces the other person. Each translation appears in the panel of the person who will read it.

## Translation log

Use **Packs → Export translation JSON** to download the browser’s saved translation records. The export includes source, result or runtime error, language direction, timestamp, model or stored match, elapsed time, and quality flags. The log is stored locally until exported, subject to browser storage limits.

The app checks identifiers, currency, negation, and recognizable times locally. These checks identify possible errors for later review. They do not perform back-translation. Historical exports can still include earlier browser translator results.

### Comparing implementations

Each attempt automatically records the developer-maintained change note in `web/src/build-changes.ts`, alongside its UTC submission timestamp, selected engine, execution path, and pinned model revision when available. Update this note when changing the translation or evaluation pipeline. The build fingerprint hashes the app source, Vite config and dependency lock. Restart the local dev server after source edits when comparing builds so it recomputes the fingerprint. Earlier log entries retain their original metadata.

### Stored words and sentence patterns

Translate builds a local lookup index from the loaded phrase cards and the bundled vocabulary and patterns. Vocabulary entries have stable IDs. A pattern references those IDs and stores its own accepted slot wording and complete translation for each supported language. For example, try `luggage`, `I need help with my luggage`, and `I need help with my bags`. The starter data covers luggage and tickets in English, Vietnamese and Simplified Chinese. The bundled entries work whenever the app shell is available. The Hugging Face deck still loads separately.

Only complete phrases, words and explicitly listed pattern variants match. Conflicting translations for the same input and direction fall through to the selected model, as do unknown slot values. The log records lookup time, the matched entry ID and the vocabulary ID for pattern matches.

## Development deck deployment — 25 November 2026

The app can load the bundled 1,000-card development deck with `VITE_USE_BUNDLED_DECK=true`. The 988 new entries retain pending review metadata. Hugging Face publication and independent review remain outstanding.

## Scenario navigation and shared vocabulary — 25 November 2026

Cards uses scenario tabs and task groups. Search spans all scenarios. Existing rows are assigned compatible scenarios by `card-scenarios.ts`; explicit `scenarios` and `task` metadata override these defaults. Lost belongings can appear in restaurant, hotel and transport scenarios. Saved remains a separate view.

The deck includes 24 new pending drafts covering missing tasks such as waiting for a table, splitting the bill, room problems, shopping and transfers. These also enter the review queue. The bundled deck now has 1,024 cards; the Hugging Face deck requires a separate update.

The belongings pilot shares typed vocabulary between standalone lookup and the complete `I left my {belonging} here` frame. The index materializes each allowed full sentence per language. Existing stored cards take precedence when their translations agree. Conflicting matches fall through to the model. Unknown vocabulary and extended sentences fall through. The pilot includes eight belongings; arbitrary slot input remains unsupported. These prototype translations require independent review.

Scenario task groups initially show six cards with a Show all control. Search displays all matching results. Contextual lost-belongings cards are limited to relevant loss, left-behind and seen-item phrases.

## Packs download manager — 25 November 2026

Packs downloads the current phrase library, either OPUS-MT direction, or M2M100. A smoke translation prepares a model; saved status requires all six revision-pinned configuration, tokenizer and ONNX files in the app's model cache. Translation uses that cache and enables local-files-only loading for complete packs. A live worker retains its active model; switching model families or OPUS-MT directions prepares another session.

Phrase packages use their own browser cache and load before the remote deck. Browser eviction or clearing site data can remove packs. The production service worker caches the app shell and fetched WASM binary; model-file status alone does not certify a cold airplane-mode launch. Model downloads currently run to completion or fail with a retryable error. The manager shows browser storage usage and keeps translation JSON export available below the packages.

### Saved-model reload correction — 25 November 2026

Cache-only loading requires `env.allowLocalModels=true` in Transformers.js. The worker now enables it when a complete saved pack is detected. Saved packs still require initialization after a page reload, which happens automatically on translation. The Check saved model action is an optional verification.

### Language pairs in Packs

Packs uses English, Tiếng Việt and 简体中文 labels with flag icons. English uses the UK flag as a visual cue. Selecting a pair filters the model list. English–Vietnamese offers both OPUS-MT directions and M2M100; pairs with Chinese offer M2M100. The phrase library and multilingual model are shared downloads; selecting another pair reuses their saved status. Pair selection is disabled during a download to keep its progress associated with the selected resources.

### Searchable language selection

Packs has two keyboard-accessible language comboboxes. Native names appear with English secondary names because the current app interface is English. Search accepts either name, language code, or unaccented Vietnamese. Choosing the language already selected in the other field swaps the pair. Resources remain shared across reversed pairs.

Model observations and deferred architecture options: see [MODEL_EXPERIMENTS.md](MODEL_EXPERIMENTS.md).
