---
language:
  - en
  - zh
  - vi
task_categories:
  - translation
---

# Offline Translator travel phrases

This starter deck contains 12 aligned travel phrases for FreeAppStore’s Offline Translator. Each row has a stable card ID, a category, and text in English (`en`), Simplified Chinese (`zh`), and Vietnamese (`vi`). A card can be read in either direction. Categories cover essentials, directions, food and allergies, and getting help.

The translations are prototype samples. Medical, allergy, and emergency wording awaits independent native-speaker review before production use.

Optional `review` metadata (`status`, `risk`, `flags`, `source`, `notes`) supports the LLM draft/critic loop and in-app high-risk warnings. See [DATASET_REVIEW.md](../DATASET_REVIEW.md).

**Seed → queue:** curated batches live under `dataset/review/seeds/` (e.g. Wikivoyage batch 1). Import with `pnpm review:import -- <seeds.json>` (add `--llm` when an API key is set), then approve in `/review` before publishing into this deck.

## Pending expansion — 25 November 2026

The English–Vietnamese candidate collection in `review/travel-en-vi-1000-v1.json` has 1,000 aligned rows, including the 12 starter cards and 988 new AI-assisted drafts. The drafts include Chinese to match the existing schema and are staged in the local review queue. Separate critic review, native review and approval precede adding them to this production deck. See `../DATASET_REVIEW.md` for the batch details and validation record.
