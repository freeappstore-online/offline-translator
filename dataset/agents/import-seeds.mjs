#!/usr/bin/env node
/**
 * Import dataset seeds into the review queue, optionally running draft + critic LLM workers.
 *
 * Usage:
 *   node dataset/agents/import-seeds.mjs dataset/review/seeds/wikivoyage-batch1.json
 *   node dataset/agents/import-seeds.mjs dataset/review/seeds/wikivoyage-batch1.json --llm
 *   node dataset/agents/import-seeds.mjs dataset/review/seeds/wikivoyage-batch1.json --llm --limit 10
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  appendLog, chatJson, ensureUniqueId, normalizeCard, normalizeCritique,
  readPhrases, readQueue, upsertQueueItem, writeQueue,
} from './lib.mjs'
import { criticSystem, criticUser, draftSystem, draftUser, promptVersion } from './prompts.mjs'

const args = process.argv.slice(2)
const file = args.find(arg => !arg.startsWith('--'))
const useLlm = args.includes('--llm')
const limitArg = args.indexOf('--limit')
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : undefined

if (!file) {
  console.error('Usage: node dataset/agents/import-seeds.mjs <seeds.json> [--llm] [--limit N]')
  process.exit(1)
}

const batch = JSON.parse(readFileSync(resolve(file), 'utf8'))
const seeds = (batch.seeds || []).slice(0, limit || batch.seeds?.length || 0)
if (!seeds.length) {
  console.error('No seeds found in file.')
  process.exit(1)
}

const attribution = batch.attribution || batch.source || ''
const source = batch.source || 'other'
const phrases = readPhrases()
let queue = readQueue()
const existingIds = new Set([
  ...phrases.map(card => card.id),
  ...queue.map(item => item.card?.id).filter(Boolean),
])

const zhFallback = {
  'speak-english': '你会说英语吗？',
  'dont-understand': '我听不懂。',
  'im-sorry': '对不起。',
  'show-map': '您能在地图上指给我看吗？',
  'atm': '自动取款机在哪里？',
  'rooms-available': '还有空房间吗？',
  'how-much': '这个多少钱？',
  'see-menu': '请让我看一下菜单好吗？',
  'no-pork': '我不吃猪肉。',
  'need-doctor': '我需要看医生。',
}

const created = []

for (const seed of seeds) {
  if (existingIds.has(seed.id)) {
    console.log(`skip existing id: ${seed.id}`)
    continue
  }

  let card
  let draftMeta
  let critiques = []
  let state = 'needs_human'

  if (useLlm) {
    const { model, data } = await chatJson({
      system: draftSystem,
      user: draftUser({
        seed: seed.en,
        category: seed.category,
        idHint: seed.id,
        vi: seed.vi,
        zh: seed.zh,
        attribution,
      }),
    })
    const id = ensureUniqueId(seed.id || data.id, phrases, queue)
    card = normalizeCard({ ...data, id, category: seed.category || data.category }, id)
    card.review.source = source
    card.review.notes = [attribution, card.review.notes].filter(Boolean).join(' · ')
    draftMeta = { model, at: new Date().toISOString(), promptVersion, seed: seed.en, source }
    appendLog({ worker: 'draft', model, promptVersion, cardId: id, seed: seed.en, source })

    const critiqueResult = await chatJson({
      system: criticSystem,
      user: criticUser(card),
    })
    const critique = {
      ...normalizeCritique(critiqueResult.data),
      model: critiqueResult.model,
      at: new Date().toISOString(),
      promptVersion,
    }
    critiques = [critique]
    card.review = {
      ...card.review,
      status: 'pending',
      risk: critique.risk,
      flags: critique.flags,
      notes: [card.review.notes, critique.notes].filter(Boolean).join(' · '),
    }
    state = critique.risk === 'high' || critique.verdict !== 'approve' ? 'needs_human' : 'critiqued'
    appendLog({ worker: 'critic', model: critique.model, promptVersion, cardId: card.id, critique })
  } else {
    const id = ensureUniqueId(seed.id, phrases, queue)
    card = normalizeCard({
      id,
      category: seed.category || 'essentials',
      en: seed.en,
      vi: seed.vi,
      zh: seed.zh || zhFallback[seed.id] || seed.en,
      review: {
        risk: seed.category === 'help' || seed.id === 'need-doctor' ? 'high' : 'medium',
        flags: seed.id === 'need-doctor' ? ['medical'] : [],
        notes: `${attribution} · Imported without LLM; add REVIEW_API_KEY and re-run with --llm for draft/critic.`,
      },
    }, id)
    card.review.source = source
    if (card.review.flags.includes('medical') || card.review.flags.includes('allergy') || card.review.flags.includes('emergency')) {
      card.review.risk = 'high'
    }
    draftMeta = {
      model: 'import-only',
      at: new Date().toISOString(),
      promptVersion,
      seed: seed.en,
      source,
    }
  }

  const item = {
    id: `seed-${card.id}-${Date.now()}`,
    state,
    card,
    draft: draftMeta,
    critiques,
  }
  queue = upsertQueueItem(queue, item)
  existingIds.add(card.id)
  created.push({ id: card.id, state: item.state, risk: card.review.risk })
  // ensure unique timestamps in id
  await new Promise(resolve => setTimeout(resolve, 2))
}

writeQueue(queue)
console.log(JSON.stringify({ imported: created.length, useLlm, created }, null, 2))
