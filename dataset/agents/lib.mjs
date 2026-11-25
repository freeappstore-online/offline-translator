import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
export const paths = {
  root,
  phrases: join(root, 'dataset/phrases.json'),
  queue: join(root, 'dataset/review/queue.json'),
  log: join(root, 'dataset/review/log.jsonl'),
}

export const categories = ['essentials', 'directions', 'food', 'help']
export const flags = [
  'disease_scientific_name', 'legal_term', 'medical', 'allergy', 'emergency',
  'currency', 'number', 'negation', 'identifier', 'proper_name', 'time_date',
  'register', 'uncertain_translation',
]
export const risks = ['low', 'medium', 'high']
export const verdicts = ['approve', 'revise', 'reject']

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

export function appendLog(entry) {
  mkdirSync(dirname(paths.log), { recursive: true })
  appendFileSync(paths.log, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n')
}

export function readPhrases() {
  return readJson(paths.phrases, [])
}

export function writePhrases(phrases) {
  writeJson(paths.phrases, phrases)
}

export function readQueue() {
  return readJson(paths.queue, [])
}

export function writeQueue(queue) {
  writeJson(paths.queue, queue)
}

export function slugify(text) {
  return text.normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || `card-${Date.now()}`
}

export function ensureUniqueId(id, phrases, queue) {
  const used = new Set([
    ...phrases.map(card => card.id),
    ...queue.map(item => item.card?.id).filter(Boolean),
  ])
  if (!used.has(id)) return id
  let index = 2
  while (used.has(`${id}-${index}`)) index++
  return `${id}-${index}`
}

export function loadEnvFiles() {
  for (const file of [join(root, '.env.local'), join(root, 'dataset/agents/.env')]) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const cut = trimmed.indexOf('=')
      if (cut < 1) continue
      const key = trimmed.slice(0, cut).trim()
      let value = trimmed.slice(cut + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  }
}

export async function chatJson({ system, user, model }) {
  loadEnvFiles()
  const key = process.env.REVIEW_API_KEY || process.env.OPENAI_API_KEY
  const base = (process.env.REVIEW_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '')
  const chosen = model || process.env.REVIEW_MODEL || 'gpt-4.1-mini'
  if (!key) {
    throw new Error('Set REVIEW_API_KEY or OPENAI_API_KEY in .env.local (or dataset/agents/.env).')
  }
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: chosen,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!response.ok) {
    throw new Error(`LLM request failed (${response.status}): ${await response.text()}`)
  }
  const payload = await response.json()
  const text = payload.choices?.[0]?.message?.content
  if (!text) throw new Error('LLM returned an empty response.')
  return { model: chosen, data: JSON.parse(text) }
}

export function normalizeCard(raw, fallbackId) {
  const category = categories.includes(raw.category) ? raw.category : 'essentials'
  const id = String(raw.id || fallbackId || 'card').trim()
  const card = {
    id,
    category,
    en: String(raw.en || '').trim(),
    vi: String(raw.vi || '').trim(),
    zh: String(raw.zh || '').trim(),
    review: {
      status: 'pending',
      risk: risks.includes(raw.review?.risk) ? raw.review.risk : 'medium',
      flags: Array.isArray(raw.review?.flags)
        ? raw.review.flags.filter(flag => flags.includes(flag))
        : [],
      source: 'llm',
      notes: String(raw.review?.notes || '').trim() || undefined,
    },
  }
  if (!card.en || !card.vi || !card.zh) throw new Error('Draft card is missing en, vi, or zh.')
  return card
}

export function normalizeCritique(raw) {
  const verdict = verdicts.includes(raw.verdict) ? raw.verdict : 'revise'
  let risk = risks.includes(raw.risk) ? raw.risk : 'medium'
  const foundFlags = Array.isArray(raw.flags) ? raw.flags.filter(flag => flags.includes(flag)) : []
  if (foundFlags.some(flag => ['medical', 'allergy', 'emergency', 'legal_term', 'disease_scientific_name'].includes(flag))) {
    risk = 'high'
  }
  if (foundFlags.includes('uncertain_translation') && risk === 'low') risk = 'medium'
  return {
    verdict,
    risk,
    flags: foundFlags,
    notes: String(raw.notes || '').trim(),
    backTranslationEn: String(raw.backTranslationEn || '').trim() || undefined,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
  }
}

export function upsertQueueItem(queue, item) {
  const index = queue.findIndex(entry => entry.id === item.id || entry.card?.id === item.card?.id)
  if (index >= 0) queue[index] = item
  else queue.unshift(item)
  return queue
}

export function syncPendingFromPhrases() {
  const phrases = readPhrases()
  const queue = readQueue()
  const existing = new Set(queue.map(item => item.card?.id))
  let added = 0
  for (const card of phrases) {
    if (card.review?.status !== 'pending' || existing.has(card.id)) continue
    queue.unshift({
      id: `phrase-${card.id}`,
      state: 'needs_human',
      card,
      critiques: [],
      draft: { model: 'seed', at: new Date().toISOString(), promptVersion: 'seed' },
    })
    added++
  }
  writeQueue(queue)
  return { added, total: queue.length }
}
