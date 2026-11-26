# Personal cards

Cards → My cards → New card lets users enter an original phrase, select target languages and generate drafts using the selected local translation model. English, Vietnamese and Simplified Chinese are supported; Chinese uses M2M100. Users can edit drafts or enter their own versions before saving. First use may download model files; prepare them in Packs for offline use.

Personal cards stay in this browser, separate from the shared deck and Hugging Face. JSON export provides a backup; clearing site data removes the collection. Remove supports Undo while this collection remains mounted. There is no community upload or model training in this feature.

AI versions retain model ID, revision and generation timestamp after edits, plus an edit timestamp. Both AI and user-written versions are labelled unreviewed. Saving, editing and enabling lookup do not grant human approval.

“Use this card in Translate” is off by default. Enabling it adds available directions, including reverse lookup, to the exact index used by Translate and Conversation. Normalization handles case, whitespace, Unicode composition and terminal punctuation; it preserves Vietnamese accents. An enabled personal match takes precedence over shared wording. Conflicting personal outputs fall through to the selected AI model. Personal cards do not enter fuzzy suggestions and do not compose arbitrary vocabulary slots.

Draft generation bypasses the card index and actually invokes the selected model. Each attempt, including failures and cancellation, enters the existing local translation JSON log with purpose `personal-card-draft`, timestamp, checkpoint, build changes and runtime metrics. Meaning checks remain experimental; they do not verify a card. Raw audio and images are not part of a personal card.

## Validation — 2026-11-27

Automated tests cover opt-in exact/reverse lookup, conflict handling, shared precedence, stable edits, provenance and corrupt-storage protection. Browser checks generated an M2M100 English→Vietnamese draft, edited it, saved and enabled it, reused its exact wording in Translate, removed/restored it and confirmed persistence after reload. The generated folder translation was inaccurate; editing remains essential and no quality approval is inferred from this test.

## Templates and saved instances — 2026-11-27

New card offers Write your own and Use a template. Template definitions are versioned separately in `card-templates.ts`; reusable field definitions carry identifiers, labels and semantic kinds (name, identifier, date or text). Each source language has its own sentence skeleton. User-entered values create only the original-language sentence. Target versions use the existing whole-sentence AI draft/manual-edit flow, never concatenated translated vocabulary. Names/numbers are literal in the original preview, but model outputs still require checking. Medical templates remain explicitly unreviewed.

A saved instance stores the complete original and target versions plus optional `template` metadata: ID, revision, source and field values. Existing free-form cards need no migration. Editing an original detaches its reference and clears target drafts to avoid stale translations. Future template edits cannot silently alter saved wording. Changing the builder source language clears field values so translated vocabulary is not silently reused as another source language.

The initial template set covers destinations, accommodation/booking numbers, hotel check-in, check-out date, restaurant reservations, meeting a named person and allergy communication. Dates use explicit text with a month-word hint. This is not the deferred broader shared-library variation redesign or a Trip Info profile store.
