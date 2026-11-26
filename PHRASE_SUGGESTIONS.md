# Phrase suggestions (Translate)

Decision log for recommending stored phrase cards while the user types in Translate.

## Decision (2026-11-23)

**Goal:** Suggest highly matching pretranslated cards as the user types (autocomplete-style). The user can pick a stored sentence or keep their own wording and run free-text / model translation.

**Why:** Exact lookup and substring search miss close paraphrases and partial typing, so users fall through to the model when a trusted card already exists.

**Approach:**

1. Rank phrase cards against the **source-language** draft while typing.
2. Show top 3–5 suggestions in a **live dropdown** anchored under the Translate textarea as the user keeps typing.
3. **On tap: fill the exact stored source text and auto-translate** (trusted Phrase card path).
4. Without a pick, Translate keeps today’s path: exact approved lookup → model.
5. Do **not** auto-substitute a near-match without confirmation (especially medical / allergy wording).
6. Ranking stays lightweight and offline (token / character overlap, prefix, substring, short edit distance). No embedding model for search.
7. Vietnamese diacritic folding is for **ranking only**; displayed text keeps accents.
8. Chinese scoring uses characters / bigrams, not Latin word splits.
9. Cards page can reuse the same scorer later; Translate is the first surface.

**Out of scope for v1:** semantic embeddings, Cards-page re-rank, suggestion-accept analytics fields in the export log.

## Implementation status

| Step | Status |
|------|--------|
| Decision recorded | Done |
| `web/src/suggest-phrases.ts` ranking module | Done |
| Translate UI (listbox + fill & auto-translate) | Done |
| Live suggestions (opens while typing, closes on blur / accept / Escape) | Done |
| Clarify layout vs result panel (attached input group, not accent-soft) | Done |
| Keyboard: ↑↓ highlight, Enter accept, Escape dismiss | Done |
| Wire into `TranslationPanel` | Done |
| Update `build-changes.ts` | Done |

## Shipped behavior (v1)

- Module: `web/src/suggest-phrases.ts` (`scorePhrase`, `rankSuggestions`).
- Min query length: **2** for Latin scripts, **1** for CJK.
- Cap: **5** suggestions; default min score **0.38**.
- UI: suggestions attach **inside the input group** (same border as the textarea), with a “Suggested cards · tap to use” label and compact rows + **Use**. Paper/panel colors only — not `accent-soft`, so they don’t look like the translation result panel. Translate stays visible below.
- Keyboard: ArrowUp/ArrowDown move highlight, Enter accepts while open, Escape closes.
- Accept: replaces draft with the card’s exact `from` wording and runs translate immediately (Phrase card / stored match when lookup hits).
- Exact draft equal to a card is omitted from the list (no redundant chip).
- Skipping suggestions still uses Translate as before.

## Translate modes (2026-11-23)

**Problem:** Showing two opposite-direction panels on one screen makes the result under each input look like it belongs in the other panel (Google Translate–style expectation).

**Decision:** Split Translate into modes via tabs (not a Face-to-face checkbox on a dual layout). Later refined to three modes — see below.

Default: **One way**.

### Conversation modes split (2026-11-23)

**Problem:** Mixing a chat thread with a flipped “read card” is still confusing.

**Decision:** Three Translate modes:

| Mode | UI |
|------|----|
| **One way** | Single panel + swap (unchanged). |
| **Chat** | Messaging-style thread. Upright only. Near language = right bubbles, other language = left. Labels use language names, not you/they. Composer prompt is language-explicit (`Type in English` / `Nhập câu tiếng Việt` / `用简体中文输入`). |
| **Face to face** | Split reversed view. Top half rotated 180° (other language). Bottom half upright (near language). Center ↕ switches active language. **Entry field moves to the active side** (including onto the flipped top) so the person typing sees the box upright. |

Do **not** combine chat history with a flipped card in one screen. Avoid you/they copy.

## Implementation status (modes)

| Step | Status |
|------|--------|
| One way | Done |
| Chat (messaging bubbles) | Done |
| Face to face (split reversed) | Done |

## Next candidates

- Reuse `rankSuggestions` on the Cards search grid.
- Log `suggestionAccepted` on export entries if eval needs it.
- Tune min score once a larger Hugging Face deck is in use.

## Current implementation override — 26 November 2026

Basic microphone input now transcribes into the current editable field. Conversation uses two opposing voice panels with automatic translation onto the other reader's side. Camera is a separate bottom tab with local OCR and editable handoff. Earlier preview/coming-soon descriptions are superseded. Both model families, approval-gated exact matching, explicit pattern variants and hidden JSON history remain. No arbitrary slot composition or automatic review approval was added.
