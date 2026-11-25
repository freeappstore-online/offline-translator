# Phrase deck: LLM review loop & safety

How Offline Translator expands travel cards beyond languages a single maintainer can validate, with safety flags for later performance review and in-app warnings.

## Goal

Grow `phrases.json` (and the public Hugging Face dataset) with everyday travel phrases—not literary MT corpora—while keeping **human native review** required for high-stakes wording.

## How to manage workers + human review

### Recommended now (solo / low volume): local Review Workstation

| Piece | What it is |
|-------|------------|
| **Draft worker** | LLM that proposes a card from a seed sentence |
| **Critic worker** | Separate LLM pass that scores risk/flags (cannot approve for publish) |
| **Human review** | You (or a native reviewer) edit / approve / reject in a dedicated UI |
| **Queue** | `dataset/review/queue.json` |
| **Audit log** | `dataset/review/log.jsonl` (gitignored) |

**Workstation UI:** open local app at [http://127.0.0.1:5173/review](http://127.0.0.1:5173/review) (dev only; not in public nav). Passphrase defaults to `local-review` (`REVIEW_PASSPHRASE` in `.env.local`).

**Why this shape:** API keys stay on the machine (Vite dev middleware + CLI), queue lives in git-friendly JSON, and you do not need a hosted annotation product until volume grows.

```sh
# optional CLI (same workers as the UI)
corepack pnpm review:sync
corepack pnpm review:draft -- --seed "Where is the pharmacy?" --category directions
corepack pnpm review:critic -- --id pharmacy   # or --all
corepack pnpm review:human -- approve --id pharmacy --notes "Checked with native speaker"
```

Env (see `dataset/agents/.env.example`):

- `REVIEW_PASSPHRASE` — workstation unlock  
- `REVIEW_API_KEY` or `OPENAI_API_KEY` — OpenAI-compatible chat API  
- `REVIEW_API_BASE`, `REVIEW_MODEL` — optional overrides  

**Access control:** passphrase + local-only middleware is enough for “only I use this laptop.” It is **not** production auth—do not enable the review UI in FreeAppStore production builds.

### When volume grows: market tools

| Tool | Use when |
|------|----------|
| **[Argilla](https://argilla.io/)** | Nice datasets + LLM feedback loops; good if reviewers are remote |
| **[Label Studio](https://labelstud.io/)** | Heavier annotation UI, many export formats |
| **Hugging Face dataset PRs + Discussions** | Card-by-card community review without a custom app |
| **Google Sheet / Airtable** | Non-technical native reviewers; sync with a small script later |

Pattern: keep **draft + critic scripts** as the workers; export `needs_human` rows to Argilla/Label Studio; write approved rows back into `phrases.json`.

## Combining datasets with agents

External phrase sources **supply seeds**; agents **normalize and risk-check**; humans **publish**.

```
Wikivoyage / Tatoeba / patterns / manual
        ↓  filter + map (EN + optional VI/ZH + category + attribution)
   dataset/review/seeds/*.json
        ↓  pnpm review:import [--llm]
   review queue (drafted / critiqued / needs_human)
        ↓  /review workstation (edit, approve, reject)
   dataset/phrases.json  →  Hugging Face deck
```

| Source | Import role | Agent role |
|--------|-------------|------------|
| **Wikivoyage** | Travel EN (+ often VI), CC BY-SA — keep attribution in `review.notes` | Draft fills/aligns ZH, tightens register; critic flags risk |
| **Tatoeba** | Short everyday pairs after length/quality filters | Same; drop odd/Tom-ism lines before import |
| **Patterns** | Slot expansions as seeds | Draft materializes full cards; critic checks slots/numbers |
| **Manual** | Type a seed in `/review` or CLI `--seed` | Same draft → critic path |

```sh
# Stage seeds into the queue (no API key required)
corepack pnpm review:import -- dataset/review/seeds/wikivoyage-batch1.json

# Full LLM pass on the same file (needs REVIEW_API_KEY or OPENAI_API_KEY)
corepack pnpm review:import -- dataset/review/seeds/wikivoyage-batch1.json --llm --limit 10
```

Then open `/review`, edit if needed, **Approve → phrases.json**.

## Pipeline

```
seed / need → draft worker → critic worker(s)
    → flags + risk → queue (needs_human)
        → human approve/reject in /review
        → phrases.json (approved)
```

| Stage | Role |
|-------|------|
| **Draft worker** | Propose card rows (`id`, `category`, `en` / `vi` / `zh`) from a seed. |
| **Critic worker** | Score meaning, register, safety flags. Output `approve \| revise \| reject`, `risk`, `flags[]`, notes, back-translation. High-risk never auto-publishes. |
| **Risk gate** | High-risk flags/categories always `needs_human`. |
| **Human** | Edit texts, set notes, **Approve → phrases.json** or **Reject**. |
| **App** | Shows **High risk · pending human review** when `risk=high` and `status=pending`. Rejected cards are hidden from the app loader. |

### Agent rules

- Draft must **not** mark output approved.  
- Critic is a separate prompt/worker.  
- Prefer pivot English → localize → critic back-translates to English.  
- Two models disagree → human (run critic twice with different `REVIEW_MODEL` later if needed).  

## Safety constraints (critic checklist)

| Flag | Guidance |
|------|----------|
| `disease_scientific_name` | Prefer plain language; flag for review |
| `legal_term` | Do not invent local legal wording |
| `medical` / `allergy` / `emergency` | Always high-risk until human review |
| `currency` | **Keep original number + currency**; flag conversions |
| `number` / `identifier` / `proper_name` | Prefer preserving tokens |
| `negation` / `time_date` / `register` / `uncertain_translation` | Raise risk as needed |

| Risk | Publish rule |
|------|----------------|
| `low` | Staging / sample audit |
| `medium` | Prefer human pass |
| `high` | Human required; app may show with warning while pending |

## Card schema (`review` object)

```json
{
  "id": "peanuts",
  "category": "food",
  "en": "I’m allergic to peanuts.",
  "vi": "…",
  "zh": "…",
  "review": {
    "status": "pending",
    "risk": "high",
    "flags": ["allergy"],
    "source": "seed",
    "notes": "Awaiting independent native-speaker review."
  }
}
```

## Repo layout

```
dataset/
  phrases.json              # production deck
  review/queue.json         # worker + human queue
  review/log.jsonl          # audit trail (gitignored)
  agents/
    draft.mjs / critic.mjs / human.mjs / sync-pending.mjs
    lib.mjs / prompts.mjs
    .env.example
web/
  review-dev-plugin.mjs     # /__review/* only in Vite dev
  src/ReviewWorkstation.tsx # UI at /review
```

## Preferred data sources (cards)

1. Wikivoyage phrasebooks (respect CC BY-SA).  
2. Filtered Tatoeba.  
3. Pattern/slot expansion.  
4. LLM drafts only through this loop.

## Experiment log

### 2026-11-24 — Wikivoyage batch 1 (10 cards)

- **Source:** [Vietnamese phrasebook (Wikivoyage)](https://en.wikivoyage.org/wiki/Vietnamese_phrasebook), CC BY-SA 4.0  
- **Seeds file:** `dataset/review/seeds/wikivoyage-batch1.json`  
- **Import:** `pnpm review:import -- dataset/review/seeds/wikivoyage-batch1.json` → **10 created**, queue size **14** (includes prior pending seeds).  
- **IDs:** `speak-english`, `dont-understand`, `im-sorry`, `show-map`, `atm`, `rooms-available`, `how-much`, `see-menu`, `no-pork`, `need-doctor`  
- **State:** all `needs_human`; `need-doctor` = **high** + `medical`; others medium. Source `wikivoyage` in `review`.  
- **LLM:** Skipped (no key). Re-import with `--llm` skips existing ids — delete those queue rows or draft/critic by id after setting `REVIEW_API_KEY` / `OPENAI_API_KEY`.  
- **Next:** Open `/review`, edit ZH/VI, approve low-risk travel cards; keep `need-doctor` pending until native review.

## Implementation status

| Step | Status |
|------|--------|
| Pipeline + safety documented | Done |
| Optional `review` on phrase cards | Done |
| In-app high-risk pending banners | Done |
| Draft + critic workers (CLI + dev API) | Done |
| Human approve/reject (CLI + /review UI) | Done |
| Passphrase-gated local workstation | Done |
| Seed import (`review:import`) + Wikivoyage batch 1 | Done |
| Argilla/Label Studio export bridge | Pending |
| Multi-critic disagreement automation | Pending |

## 2026-11-25 — English–Vietnamese expansion to 1,000 candidates

Reviewed the current mode and suggestion decisions in PHRASE_SUGGESTIONS.md and the draft → critic → human workflow here. The expansion uses original AI-assisted pattern families materialized into complete sentences. Each row includes Chinese for compatibility with the existing review workstation and card schema.

- Candidate collection: `dataset/review/travel-en-vi-1000-v1.json` contains exactly 1,000 rows, combining the 12 existing cards and 988 new pending drafts.
- Seed batch: `dataset/review/seeds/travel-en-vi-1000-v1.json` contains the 988 new rows and source notes.
- Queue: those 988 drafts were appended in `needs_human` state. The 14 prior rows are preserved, so the queue contains 1,002 entries.
- Coverage among new drafts: directions and intercity travel 427, food 187, belongings and services 374.
- Checks: unique IDs and normalized English; nonempty English, Vietnamese and Chinese; no duplicate Vietnamese or Chinese sentences; existing category and review enum compatibility.
- Generator: `node dataset/agents/expand-travel-1000.mjs`. Existing batch edits cause it to stop rather than replace edited queue cards.
- Validation record: `dataset/review/travel-en-vi-1000-v1-validation.json`.
- Quality status: assistant-authored drafts. A separate critic pass and independent native-speaker review remain pending. Pattern expansion covers recurring constructions; count alone does not establish broad conversational coverage.
- Review locally at `/review`, edit wording, run the critic and approve accepted rows into `dataset/phrases.json`. Human approval and Hugging Face publication remain outstanding. The production deck retains its 12 original rows.

High-stakes medical, allergy, emergency and legal material was excluded from the new draft batch. The original 12 cards retain their existing review metadata.

## 2026-11-25 — Authorized development publication

The maintainer authorized publishing the app to continue development and testing. The 1,000-row candidate collection is now the local deck in `dataset/phrases.json`. All new cards retain pending status and remain in the review queue. Deployment selects the bundled deck with `VITE_USE_BUNDLED_DECK=true`. Hugging Face still hosts the earlier deck. Independent critic and native review remain pending.

## 2026-11-25 — Scenario gap batch

Added 24 AI-authored pending cards with explicit scenario/task metadata in `dataset/review/seeds/scenario-gaps-v1.json`. They cover restaurant, hotel, shopping, belongings and transport tasks. Queue rows retain needs_human state; no human approval is inferred. The local bundled deck includes these for development testing, bringing its count to 1,024.
