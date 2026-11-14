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

In Translate, select OPUS-MT for English ↔ Vietnamese or M2M100 for any pair among English, Vietnamese and Simplified Chinese. Each model downloads on its first free-text translation and runs locally. OPUS-MT downloads each direction independently. The browser may evict cached assets. The built-in browser translator is the default.
