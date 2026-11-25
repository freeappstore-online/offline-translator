import { useEffect, useRef, useState } from 'react'
import { translateWithModel } from './downloaded-translation'
import { modelCache, packSaved, packs, phraseCache, phraseUrl, savePhrases } from './pack-storage'
import type { Phrase } from './phrases'

export function Packs({ cards }: { cards: Phrase[] }) {
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [active, setActive] = useState<string>()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<number>()
  const busy = useRef(false)

  async function refresh() {
    const states = await Promise.all(packs.map(async pack => [pack.key, await packSaved(pack.model)] as const))
    const phrases = await (await caches.open(phraseCache)).match(phraseUrl)
    setSaved({ ...Object.fromEntries(states), phrases: Boolean(phrases) })
    setUsage((await navigator.storage?.estimate())?.usage)
  }

  useEffect(() => { void refresh().catch(() => setError('Browser storage is unavailable.')) }, [])

  async function install(key: string) {
    if (busy.current) return
    busy.current = true
    setActive(key)
    setError('')
    setStatus('Preparing package…')
    try {
      await caches.open(modelCache)
      if (key === 'phrases') {
        await savePhrases(cards)
        setStatus('Phrase library saved for offline use.')
      } else {
        const pack = packs.find(pack => pack.key === key)!
        const installed = await packSaved(pack.model)
        setStatus(installed ? 'Preparing saved model…' : 'Downloading model…')
        await translateWithModel(pack.model, pack.from === 'en' ? 'Hello.' : 'Xin chào.',
          pack.from, pack.to, new AbortController().signal, setStatus)
        if (!await packSaved(pack.model)) throw new Error('The model ran, but its files were not fully saved. Please retry.')
        setStatus('Model saved and ready.')
      }
      await refresh()
    } catch (cause) {
      setError(String(cause))
      setStatus('')
    } finally {
      busy.current = false
      setActive(undefined)
    }
  }

  return <div className="space-y-4">
    <p className="text-sm text-muted">Download while online. Saved files are reused in this browser. A saved model still needs a short preparation after reopening the app.</p>
    {usage !== undefined && <p className="text-sm text-muted">App storage · {(usage / 1024 / 1024).toFixed(0)} MB</p>}
    {[{ key: 'phrases', name: 'Travel phrase library', size: `${cards.length} cards · English, Vietnamese & Chinese` }, ...packs].map(pack =>
      <section key={pack.key} className="rounded-2xl bg-panel p-4">
        <h2 className="text-base font-semibold">{pack.name}</h2>
        <p className="my-2 text-sm text-muted">{pack.size}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">{saved[pack.key] ? 'Saved in this browser' : 'Download needed'}</p>
          <button type="button" disabled={Boolean(active) || (pack.key === 'phrases' && !cards.length)}
            className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
            onClick={() => void install(pack.key)}>
            {active === pack.key ? 'Preparing…' : saved[pack.key] ? pack.key === 'phrases' ? 'Save library again' : 'Prepare model' : 'Download'}
          </button>
        </div>
      </section>)}
    <p role="status" className="text-sm">{status || error}</p>
    <p className="text-xs text-muted">Model sizes exclude the shared runtime. Browser storage can be cleared or evicted. Use Prepare model to check a saved download.</p>
  </div>
}
