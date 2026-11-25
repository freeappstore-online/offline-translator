import {
  appendLog,
  chatJson,
  ensureUniqueId,
  loadEnvFiles,
  normalizeCard,
  normalizeCritique,
  readPhrases,
  readQueue,
  slugify,
  syncPendingFromPhrases,
  upsertQueueItem,
  writePhrases,
  writeQueue,
} from '../dataset/agents/lib.mjs'
import { criticSystem, criticUser, draftSystem, draftUser, promptVersion } from '../dataset/agents/prompts.mjs'

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

function authorized(req) {
  loadEnvFiles()
  const expected = process.env.REVIEW_PASSPHRASE || 'local-review'
  return req.headers['x-review-passphrase'] === expected
}

export function reviewDevPlugin() {
  return {
    name: 'offline-translator-review-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__review')) return next()
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          return res.end()
        }
        if (!authorized(req)) return send(res, 401, { error: 'Unauthorized review workstation.' })

        try {
          const url = new URL(req.url, 'http://127.0.0.1')
          const path = url.pathname

          if (req.method === 'GET' && path === '/__review/status') {
            loadEnvFiles()
            return send(res, 200, {
              ok: true,
              hasApiKey: Boolean(process.env.REVIEW_API_KEY || process.env.OPENAI_API_KEY),
              model: process.env.REVIEW_MODEL || 'gpt-4.1-mini',
              promptVersion,
            })
          }

          if (req.method === 'GET' && path === '/__review/queue') {
            syncPendingFromPhrases()
            return send(res, 200, { queue: readQueue(), phrases: readPhrases() })
          }

          if (req.method === 'POST' && path === '/__review/sync') {
            return send(res, 200, syncPendingFromPhrases())
          }

          const body = req.method === 'POST' ? await readBody(req) : {}

          if (req.method === 'POST' && path === '/__review/draft') {
            const seed = String(body.seed || '').trim()
            if (!seed) return send(res, 400, { error: 'seed is required' })
            const { model, data } = await chatJson({
              system: draftSystem,
              user: draftUser({ seed, category: body.category, idHint: body.id }),
            })
            const phrases = readPhrases()
            const queue = readQueue()
            const id = ensureUniqueId(body.id || data.id || slugify(data.en || seed), phrases, queue)
            const card = normalizeCard({ ...data, id, category: body.category || data.category }, id)
            const item = {
              id: `draft-${card.id}-${Date.now()}`,
              state: 'drafted',
              card,
              draft: { model, at: new Date().toISOString(), promptVersion, seed },
              critiques: [],
            }
            writeQueue(upsertQueueItem(queue, item))
            appendLog({ worker: 'draft', model, promptVersion, queueId: item.id, cardId: card.id, seed })
            return send(res, 200, { item })
          }

          if (req.method === 'POST' && path === '/__review/critic') {
            const queue = readQueue()
            const item = queue.find(entry => entry.id === body.id || entry.card?.id === body.id)
            if (!item) return send(res, 404, { error: 'Queue item not found' })
            const { model, data } = await chatJson({ system: criticSystem, user: criticUser(item.card) })
            const critique = { ...normalizeCritique(data), model, at: new Date().toISOString(), promptVersion }
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
            writeQueue(queue)
            appendLog({ worker: 'critic', model, promptVersion, queueId: item.id, cardId: item.card.id, critique })
            return send(res, 200, { item })
          }

          if (req.method === 'POST' && path === '/__review/save') {
            const queue = readQueue()
            const item = queue.find(entry => entry.id === body.id)
            if (!item) return send(res, 404, { error: 'Queue item not found' })
            if (body.card) item.card = normalizeCard(body.card, item.card.id)
            writeQueue(queue)
            return send(res, 200, { item })
          }

          if (req.method === 'POST' && path === '/__review/human') {
            const queue = readQueue()
            const item = queue.find(entry => entry.id === body.id || entry.card?.id === body.id)
            if (!item) return send(res, 404, { error: 'Queue item not found' })
            const action = body.action
            const notes = String(body.notes || '')
            const at = new Date().toISOString()
            const phrases = readPhrases()
            if (action === 'approve') {
              item.state = 'approved'
              item.card.review = { ...item.card.review, status: 'approved', notes: notes || item.card.review?.notes }
              item.human = { at, action, notes }
              const index = phrases.findIndex(card => card.id === item.card.id)
              if (index >= 0) phrases[index] = item.card
              else phrases.push(item.card)
              writePhrases(phrases)
            } else if (action === 'reject') {
              item.state = 'rejected'
              item.card.review = { ...item.card.review, status: 'rejected', notes: notes || item.card.review?.notes }
              item.human = { at, action, notes }
              const index = phrases.findIndex(card => card.id === item.card.id)
              if (index >= 0) {
                phrases[index] = { ...phrases[index], review: item.card.review }
                writePhrases(phrases)
              }
            } else if (action === 'revise') {
              item.state = 'needs_human'
              item.card.review = { ...item.card.review, status: 'pending', notes: notes || item.card.review?.notes }
              item.human = { at, action, notes }
            } else {
              return send(res, 400, { error: 'action must be approve, reject, or revise' })
            }
            writeQueue(queue)
            appendLog({ worker: 'human', action, queueId: item.id, cardId: item.card.id, notes })
            return send(res, 200, { item })
          }

          return send(res, 404, { error: 'Unknown review route' })
        } catch (error) {
          return send(res, 500, { error: String(error?.message || error) })
        }
      })
    },
  }
}
