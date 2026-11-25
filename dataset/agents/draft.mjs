#!/usr/bin/env node
import { chatJson, ensureUniqueId, normalizeCard, readPhrases, readQueue, slugify, upsertQueueItem, writeQueue, appendLog } from './lib.mjs'
import { draftSystem, draftUser, promptVersion } from './prompts.mjs'

const args = process.argv.slice(2)
function flag(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const seed = flag('--seed') || args.find(arg => !arg.startsWith('--'))
const category = flag('--category')
const idHint = flag('--id')

if (!seed) {
  console.error('Usage: node dataset/agents/draft.mjs --seed "Where is the pharmacy?" [--category directions] [--id pharmacy]')
  process.exit(1)
}

const { model, data } = await chatJson({
  system: draftSystem,
  user: draftUser({ seed, category, idHint }),
})

const phrases = readPhrases()
const queue = readQueue()
const id = ensureUniqueId(idHint || data.id || slugify(data.en || seed), phrases, queue)
const card = normalizeCard({ ...data, id, category: category || data.category }, id)
if (['help', 'food'].includes(card.category) && card.review.flags.some(flag => ['medical', 'allergy', 'emergency'].includes(flag))) {
  card.review.risk = 'high'
}

const item = {
  id: `draft-${card.id}-${Date.now()}`,
  state: 'drafted',
  card,
  draft: { model, at: new Date().toISOString(), promptVersion, seed },
  critiques: [],
}

writeQueue(upsertQueueItem(queue, item))
appendLog({ worker: 'draft', model, promptVersion, queueId: item.id, cardId: card.id, seed })
console.log(JSON.stringify(item, null, 2))
