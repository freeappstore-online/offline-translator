#!/usr/bin/env node
import { appendLog, readPhrases, readQueue, writePhrases, writeQueue } from './lib.mjs'

const args = process.argv.slice(2)
const action = args[0]
function flag(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const id = flag('--id')
const notes = flag('--notes') || ''

if (!['approve', 'reject', 'revise'].includes(action) || !id) {
  console.error('Usage: node dataset/agents/human.mjs approve|reject|revise --id <queueOrCardId> [--notes "..."]')
  process.exit(1)
}

const queue = readQueue()
const item = queue.find(entry => entry.id === id || entry.card?.id === id)
if (!item) {
  console.error(`Queue item not found: ${id}`)
  process.exit(1)
}

const phrases = readPhrases()
const at = new Date().toISOString()

if (action === 'approve') {
  item.state = 'approved'
  item.card.review = {
    ...item.card.review,
    status: 'approved',
    notes: notes || item.card.review?.notes,
  }
  item.human = { at, action: 'approve', notes }
  const index = phrases.findIndex(card => card.id === item.card.id)
  if (index >= 0) phrases[index] = item.card
  else phrases.push(item.card)
  writePhrases(phrases)
} else if (action === 'reject') {
  item.state = 'rejected'
  item.card.review = {
    ...item.card.review,
    status: 'rejected',
    notes: notes || item.card.review?.notes,
  }
  item.human = { at, action: 'reject', notes }
  const index = phrases.findIndex(card => card.id === item.card.id)
  if (index >= 0) {
    phrases[index] = { ...phrases[index], review: item.card.review }
    writePhrases(phrases)
  }
} else {
  item.state = 'needs_human'
  item.card.review = {
    ...item.card.review,
    status: 'pending',
    notes: notes || item.card.review?.notes,
  }
  item.human = { at, action: 'revise', notes }
}

writeQueue(queue)
appendLog({ worker: 'human', action, queueId: item.id, cardId: item.card.id, notes })
console.log(JSON.stringify(item, null, 2))
