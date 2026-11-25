#!/usr/bin/env node
import { appendLog, chatJson, normalizeCritique, readQueue, writeQueue } from './lib.mjs'
import { criticSystem, criticUser, promptVersion } from './prompts.mjs'

const args = process.argv.slice(2)
function flag(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const queueId = flag('--id')
const all = args.includes('--all')
const queue = readQueue()
const targets = all
  ? queue.filter(item => item.state === 'drafted' || item.state === 'needs_human' || item.state === 'critiqued')
  : queue.filter(item => item.id === queueId || item.card?.id === queueId)

if (!targets.length) {
  console.error('Usage: node dataset/agents/critic.mjs --id <queueOrCardId> | --all')
  process.exit(1)
}

for (const item of targets) {
  const { model, data } = await chatJson({
    system: criticSystem,
    user: criticUser(item.card),
  })
  const critique = {
    ...normalizeCritique(data),
    model,
    at: new Date().toISOString(),
    promptVersion,
  }
  item.critiques = [...(item.critiques || []), critique]
  item.card.review = {
    ...item.card.review,
    status: 'pending',
    risk: critique.risk,
    flags: critique.flags,
    source: item.card.review?.source || 'llm',
    notes: critique.notes,
  }
  item.state = critique.risk === 'high' || critique.verdict !== 'approve' ? 'needs_human' : 'critiqued'
  appendLog({ worker: 'critic', model, promptVersion, queueId: item.id, cardId: item.card.id, critique })
  console.log(JSON.stringify({ id: item.id, state: item.state, critique }, null, 2))
}

writeQueue(queue)
