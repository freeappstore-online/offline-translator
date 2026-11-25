import { useEffect, useRef, useState } from 'react'
import { translateWithModel } from './downloaded-translation'
import { modelCache, packSaved, packs, phraseCache, phraseUrl, savePhrases } from './pack-storage'
import type { Language } from './model-options'
import type { Phrase } from './phrases'

const languageLabels = {
  en: { name: 'English', flag: '🇬🇧', lang: 'en' },
  vi: { name: 'Tiếng Việt', flag: '🇻🇳', lang: 'vi' },
  zh: { name: '简体中文', flag: '🇨🇳', lang: 'zh-Hans' },
}
const pairs: { id: string; from: Language; to: Language }[] = [
  { id: 'en-vi', from: 'en', to: 'vi' },
  { id: 'en-zh', from: 'en', to: 'zh' },
  { id: 'vi-zh', from: 'vi', to: 'zh' },
]

function LanguageLabel({ code }: { code: Language }) {
  const language = languageLabels[code]
  return <span className="inline-flex items-center gap-2">
    <span aria-hidden="true" className="text-xl">{language.flag}</span>
    <span lang={language.lang}>{language.name}</span>
  </span>
}

export function Packs({ cards }: { cards: Phrase[] }) {
  const [pairId, setPairId] = useState('en-vi')
  const pair = pairs.find(item => item.id === pairId)!
  const visibleModels = packs.filter(pack => pack.key === 'multilingual' ||
    (pack.from === pair.from && pack.to === pair.to) || (pack.from === pair.to && pack.to === pair.from))
  const pairCardCount = cards.filter(card => card[pair.from]?.trim() && card[pair.to]?.trim()).length
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
        const from = pack.key === 'multilingual' ? pair.from : pack.from
        const to = pack.key === 'multilingual' ? pair.to : pack.to
        const sample = { en: 'Hello.', vi: 'Xin chào.', zh: '你好。' }
        await translateWithModel(pack.model, sample[from],
          from, to, new AbortController().signal, setStatus)
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

  return <div className="mx-auto max-w-2xl space-y-5">
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">Choose your languages</legend>
      <div className="grid gap-2">
        {pairs.map(item => <label key={item.id} className="cursor-pointer">
          <input type="radio" name="pack-pair" value={item.id} checked={pairId === item.id}
            className="peer sr-only" disabled={Boolean(active)}
            onChange={() => { setPairId(item.id); setStatus(''); setError('') }} />
          <span className="flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-transparent bg-panel px-4 py-3 peer-checked:border-accent peer-checked:bg-accent-soft peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-disabled:opacity-60">
            <span className="flex flex-wrap items-center gap-3 text-sm font-semibold">
              <LanguageLabel code={item.from} /><span aria-hidden="true">↔</span><LanguageLabel code={item.to} />
            </span>
            <span aria-hidden="true" className={pairId === item.id ? 'text-accent' : 'invisible'}>✓</span>
          </span>
        </label>)}
      </div>
    </fieldset>

    <p className="text-sm text-muted">Download once while online. Saved resources are reused in this browser.</p>

    <section aria-label="Phrase package" className="rounded-2xl bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Travel phrases</h2>
      <p className="my-2 text-sm text-muted">{pairCardCount} cards for this pair · shared library includes all three languages</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">{saved.phrases ? 'Saved in this browser' : 'Ready to download'}</p>
        <button type="button" disabled={Boolean(active) || !cards.length}
          className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
          onClick={() => void install('phrases')}>
          {active === 'phrases' ? 'Saving…' : saved.phrases ? 'Save library again' : 'Download phrases'}
        </button>
      </div>
    </section>

    <section aria-label="Models for selected language pair" className="space-y-3">
      <h2 className="text-base font-semibold">Translation models</h2>
      {visibleModels.map(pack => <article key={pack.key} className="rounded-2xl bg-panel p-4 sm:p-5">
        <h3 className="font-semibold">{pack.key === 'multilingual' ? 'M2M100' : 'OPUS-MT'}</h3>
        <div className="my-2 flex flex-wrap items-center gap-2 text-sm">
          <LanguageLabel code={pack.key === 'multilingual' ? pair.from : pack.from} />
          <span aria-label={pack.key === 'multilingual' ? 'both directions' : 'to'}>{pack.key === 'multilingual' ? '↔' : '→'}</span>
          <LanguageLabel code={pack.key === 'multilingual' ? pair.to : pack.to} />
        </div>
        <p className="mb-3 text-sm text-muted">{pack.size}{pack.key === 'multilingual' ? ' · one download covers all three languages' : ' · this direction'}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">{saved[pack.key] ? 'Saved in this browser' : 'Ready to download'}</p>
          <button type="button" disabled={Boolean(active)}
            className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
            onClick={() => void install(pack.key)}>
            {active === pack.key ? 'Preparing…' : saved[pack.key] ? 'Check saved model' : 'Download model'}
          </button>
        </div>
      </article>)}
    </section>
    {(status || error) && <p role="status" className="text-sm">{status || error}</p>}
    <details className="text-sm text-muted">
      <summary className="min-h-11 cursor-pointer py-3">Storage & downloads</summary>
      {usage !== undefined && <p className="mb-2">App storage · {(usage / 1024 / 1024).toFixed(0)} MB</p>}
      <p>Model sizes exclude the shared runtime. Saved models take a short time to prepare after reopening. Browser storage can be cleared or evicted.</p>
    </details>
  </div>
}
