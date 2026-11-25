# Offline Translator

Read https://freeappstore.online/skills.md before changing platform integration.
The app is a standalone FreeAppStore web app. The public Hugging Face dataset supplies the phrase deck.
Phrase expansion, LLM workers, and human review: see DATASET_REVIEW.md.
Local review UI is `/review` in Vite dev only (passphrase-gated); do not ship it as a public FreeAppStore surface.

Maintainer deployment preference (2026-11-25): publish completed app changes after validation without waiting for another push request. Follow .cursor/rules/deploy-completed-changes.mdc and honor explicit local-only or deferred work.
