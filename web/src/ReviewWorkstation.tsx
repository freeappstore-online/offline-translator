import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { categories, type Phrase } from './phrases'

type Critique = {
  verdict: string
  risk: string
  flags: string[]
  notes: string
  backTranslationEn?: string
  confidence?: number
  model?: string
  at?: string
}

type QueueItem = {
  id: string
  state: string
  card: Phrase
  draft?: { model?: string; at?: string; seed?: string }
  critiques?: Critique[]
  human?: { at?: string; action?: string; notes?: string }
}

const passKey = 'offline-translator-review-pass'

async function reviewFetch(path: string, init: RequestInit = {}) {
  const passphrase = sessionStorage.getItem(passKey) || ''
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-review-passphrase': passphrase,
      ...(init.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body
}

export default function ReviewWorkstation() {
  const [passphrase, setPassphrase] = useState(() => sessionStorage.getItem(passKey) || '')
  const [authed, setAuthed] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [seed, setSeed] = useState('')
  const [category, setCategory] = useState<keyof typeof categories | ''>('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [apiReady, setApiReady] = useState(false)

  const selected = useMemo(() => queue.find(item => item.id === selectedId), [queue, selectedId])
  const openItems = queue.filter(item => !['approved', 'rejected'].includes(item.state))

  async function refresh() {
    const data = await reviewFetch('/__review/queue')
    setQueue(data.queue || [])
    if (!selectedId && data.queue?.[0]) setSelectedId(data.queue[0].id)
  }

  async function unlock(event: FormEvent) {
    event.preventDefault()
    sessionStorage.setItem(passKey, passphrase)
    setBusy(true)
    setError('')
    try {
      const info = await reviewFetch('/__review/status')
      setAuthed(true)
      setApiReady(Boolean(info.hasApiKey))
      await reviewFetch('/__review/sync', { method: 'POST', body: '{}' })
      await refresh()
      setStatus(info.hasApiKey ? 'Workstation unlocked.' : 'Unlocked. Add REVIEW_API_KEY to run draft/critic LLM calls.')
    } catch (err) {
      setAuthed(false)
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!authed || !selected) return
    setNotes(selected.card.review?.notes || '')
  }, [authed, selected, selectedId])

  async function run(label: string, work: () => Promise<void>) {
    setBusy(true)
    setError('')
    setStatus(label)
    try {
      await work()
      await refresh()
      setStatus('Done.')
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <form className="mx-auto mt-10 max-w-md rounded-[1.25rem] border border-line bg-panel p-6" onSubmit={unlock}>
        <h1 className="font-display text-3xl">Review workstation</h1>
        <p className="mt-2 text-sm text-muted">Local-only deck review. Not shown in the public app nav. Default passphrase is <code>local-review</code> unless you set <code>REVIEW_PASSPHRASE</code>.</p>
        <label className="mt-4 block text-sm font-semibold">Passphrase
          <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3 py-2" type="password" value={passphrase}
            onChange={event => setPassphrase(event.target.value)} required />
        </label>
        <button disabled={busy} className="mt-4 min-h-11 rounded-full bg-accent px-5 font-bold text-on-accent disabled:opacity-60">Unlock</button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </form>
    )
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="rounded-[1.25rem] border border-line bg-panel p-4">
        <h1 className="font-display text-2xl">Review workstation</h1>
        <p className="mt-1 text-xs text-muted">{apiReady ? 'LLM key detected' : 'No LLM key — human review only'} · {openItems.length} open</p>
        <div className="mt-4 grid gap-2">
          <textarea className="min-h-24 rounded-xl border border-line bg-paper p-3 text-sm" placeholder="Seed English (or any pivot) for draft worker"
            value={seed} onChange={event => setSeed(event.target.value)} />
          <select className="min-h-11 rounded-xl border border-line bg-paper px-3" value={category}
            onChange={event => setCategory(event.target.value as typeof category)}>
            <option value="">Category (optional)</option>
            {Object.entries(categories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <button disabled={busy || !seed.trim()} className="min-h-11 rounded-full bg-accent font-bold text-on-accent disabled:opacity-60"
            onClick={() => run('Drafting…', async () => {
              const result = await reviewFetch('/__review/draft', {
                method: 'POST',
                body: JSON.stringify({ seed, category: category || undefined }),
              })
              setSelectedId(result.item.id)
              setSeed('')
            })}>Run draft worker</button>
          <button disabled={busy} className="min-h-11 rounded-full border border-line font-semibold disabled:opacity-60"
            onClick={() => run('Syncing pending phrases…', async () => {
              await reviewFetch('/__review/sync', { method: 'POST', body: '{}' })
            })}>Sync pending from phrases.json</button>
        </div>
        <ul className="mt-4 max-h-[28rem] space-y-2 overflow-auto">
          {queue.map(item => (
            <li key={item.id}>
              <button type="button" className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selectedId === item.id ? 'border-accent bg-accent-soft' : 'border-line'}`}
                onClick={() => setSelectedId(item.id)}>
                <span className="block font-semibold">{item.card.en}</span>
                <span className="text-xs text-muted">{item.state} · {item.card.review?.risk || 'n/a'}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="rounded-[1.25rem] border border-line bg-panel p-4 sm:p-6">
        {!selected ? <p className="text-sm text-muted">Select a queue item.</p> : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">{selected.state} · {selected.card.id}</p>
                <h2 className="text-xl font-bold">{selected.card.en}</h2>
              </div>
              <button disabled={busy} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-60"
                onClick={() => run('Running critic…', async () => {
                  await reviewFetch('/__review/critic', { method: 'POST', body: JSON.stringify({ id: selected.id }) })
                })}>Run critic worker</button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(['en', 'vi', 'zh'] as const).map(lang => (
                <label key={lang} className="grid gap-1 text-sm font-semibold">{lang}
                  <textarea className="min-h-28 rounded-xl border border-line bg-paper p-3 font-normal" lang={lang}
                    value={selected.card[lang]}
                    onChange={event => {
                      const value = event.target.value
                      setQueue(items => items.map(item => item.id === selected.id
                        ? { ...item, card: { ...item.card, [lang]: value } }
                        : item))
                    }} />
                </label>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">Category
                <select className="min-h-11 rounded-xl border border-line bg-paper px-3 font-normal" value={selected.card.category}
                  onChange={event => {
                    const value = event.target.value as Phrase['category']
                    setQueue(items => items.map(item => item.id === selected.id
                      ? { ...item, card: { ...item.card, category: value } }
                      : item))
                  }}>
                  {Object.entries(categories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">Risk
                <select className="min-h-11 rounded-xl border border-line bg-paper px-3 font-normal" value={selected.card.review?.risk || 'medium'}
                  onChange={event => {
                    const risk = event.target.value as NonNullable<Phrase['review']>['risk']
                    setQueue(items => items.map(item => item.id === selected.id
                      ? { ...item, card: { ...item.card, review: { status: 'pending', ...item.card.review, risk } } }
                      : item))
                  }}>
                  {['low', 'medium', 'high'].map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
            </div>

            <label className="mt-3 grid gap-1 text-sm font-semibold">Reviewer notes
              <textarea className="min-h-20 rounded-xl border border-line bg-paper p-3 font-normal" value={notes} onChange={event => setNotes(event.target.value)} />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy} className="min-h-11 rounded-full border border-line px-4 font-semibold disabled:opacity-60"
                onClick={() => run('Saving edits…', async () => {
                  await reviewFetch('/__review/save', {
                    method: 'POST',
                    body: JSON.stringify({
                      id: selected.id,
                      card: {
                        ...selected.card,
                        review: { status: 'pending', risk: 'medium', ...selected.card.review, notes },
                      },
                    }),
                  })
                })}>Save edits</button>
              <button disabled={busy} className="min-h-11 rounded-full bg-accent px-4 font-bold text-on-accent disabled:opacity-60"
                onClick={() => run('Approving…', async () => {
                  await reviewFetch('/__review/human', {
                    method: 'POST',
                    body: JSON.stringify({ id: selected.id, action: 'approve', notes }),
                  })
                })}>Approve → phrases.json</button>
              <button disabled={busy} className="min-h-11 rounded-full border border-danger px-4 font-semibold text-danger disabled:opacity-60"
                onClick={() => run('Rejecting…', async () => {
                  await reviewFetch('/__review/human', {
                    method: 'POST',
                    body: JSON.stringify({ id: selected.id, action: 'reject', notes }),
                  })
                })}>Reject</button>
            </div>

            {!!selected.critiques?.length && (
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Critic history</h3>
                {selected.critiques.map((critique, index) => (
                  <article key={`${critique.at}-${index}`} className="rounded-xl border border-line bg-paper p-3 text-sm">
                    <p className="font-semibold">{critique.verdict} · {critique.risk} · {critique.model}</p>
                    <p className="mt-1 text-muted">{critique.notes}</p>
                    {!!critique.flags?.length && <p className="mt-1">Flags: {critique.flags.join(', ')}</p>}
                    {critique.backTranslationEn && <p className="mt-1">Back-EN: {critique.backTranslationEn}</p>}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
        {status && <p className="mt-4 text-sm text-muted" role="status">{status}</p>}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </section>
    </div>
  )
}
