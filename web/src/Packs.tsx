import { t, languageName } from './i18n'
import { LanguagePicker, languageLabels } from './LanguagePicker'
import { useEffect, useRef, useState } from 'react'
import { translateWithModel } from './downloaded-translation'
import { modelCache, packSaved, packs, phraseCache, phraseUrl, savePhrases } from './pack-storage'
import type { Language } from './model-options'
import type { Phrase } from './phrases'

function LanguageLabel({ code }: { code: Language }) {
  const language = languageLabels[code]
  return <span className="inline-flex items-center gap-2">
    <span aria-hidden="true" className="text-xl">{language.flag}</span>
    <span lang={language.lang}>{languageName(code)}</span>
  </span>
}

export function Packs({ cards }: { cards: Phrase[] }) {
  const [pair, setPair] = useState<{ from: Language; to: Language }>({ from: 'en', to: 'vi' })
  function chooseLanguage(side: 'from' | 'to', value: Language) {
    setPair(previous => {
      const other = side === 'from' ? 'to' : 'from'
      return { ...previous, [side]: value, [other]: previous[other] === value ? previous[side] : previous[other] }
    })
    setStatus('')
    setError('')
  }
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

  useEffect(() => { void refresh().catch(() => setError(t("Browser storage is unavailable."))) }, [])

  async function install(key: string) {
    if (busy.current) return
    busy.current = true
    setActive(key)
    setError('')
    setStatus(t("Preparing package…"))
    try {
      await caches.open(modelCache)
      if (key === 'phrases') {
        await savePhrases(cards)
        setStatus(t("Phrase library saved for offline use."))
      } else {
        const pack = packs.find(pack => pack.key === key)!
        const installed = await packSaved(pack.model)
        setStatus(installed ? t("Preparing saved model…") : t("Downloading model…"))
        const from = pack.key === 'multilingual' ? pair.from : pack.from
        const to = pack.key === 'multilingual' ? pair.to : pack.to
        const sample = { en: 'Hello.', vi: 'Xin chào.', zh: '你好。' }
        await translateWithModel(pack.model, sample[from],
          from, to, new AbortController().signal, setStatus)
        if (!await packSaved(pack.model)) throw new Error(t("The model ran, but its files were not fully saved. Please retry."))
        setStatus(t("Model saved and ready."))
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
    <div className="grid gap-4 sm:grid-cols-2">
      <LanguagePicker label={t("First language")} value={pair.from} disabled={Boolean(active)}
        onChange={value => chooseLanguage('from', value)} />
      <LanguagePicker label={t("Second language")} value={pair.to} disabled={Boolean(active)}
        onChange={value => chooseLanguage('to', value)} />
    </div>

    <p className="text-sm text-muted">{t("Download once while online. Saved resources are reused in this browser.")}</p>

    <section aria-label={t("Phrase package")} className="rounded-2xl bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">{t("Travel phrases")}</h2>
      <p className="my-2 text-sm text-muted">{pairCardCount}{t("cards for this pair · shared library includes all three languages")}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">{saved.phrases ? t("Saved in this browser") : t("Ready to download")}</p>
        <button type="button" disabled={Boolean(active) || !cards.length}
          className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
          onClick={() => void install('phrases')}>
          {active === 'phrases' ? t("Saving…") : saved.phrases ? t("Save library again") : t("Download phrases")}
        </button>
      </div>
    </section>

    <section aria-label={t("Models for selected language pair")} className="space-y-3">
      <h2 className="text-base font-semibold">{t("Translation models")}</h2>
      {visibleModels.map(pack => <article key={pack.key} className="rounded-2xl bg-panel p-4 sm:p-5">
        <h3 className="font-semibold">{pack.key === 'multilingual' ? 'M2M100' : 'OPUS-MT'}</h3>
        <div className="my-2 flex flex-wrap items-center gap-2 text-sm">
          <LanguageLabel code={pack.key === 'multilingual' ? pair.from : pack.from} />
          <span aria-label={t(pack.key === 'multilingual' ? 'both directions' : 'to')}>{pack.key === 'multilingual' ? '↔' : '→'}</span>
          <LanguageLabel code={pack.key === 'multilingual' ? pair.to : pack.to} />
        </div>
        <p className="mb-3 text-sm text-muted">{t(pack.size)}{pack.key === 'multilingual' ? ' · ' + t('one download covers all three languages') : ' · ' + t('this direction')}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">{saved[pack.key] ? t("Saved in this browser") : t("Ready to download")}</p>
          <button type="button" disabled={Boolean(active)}
            className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
            onClick={() => void install(pack.key)}>
            {active === pack.key ? t("Preparing…") : saved[pack.key] ? t("Check saved model") : t("Download model")}
          </button>
        </div>
      </article>)}
    </section>
    {(status || error) && <p role="status" className="text-sm">{t(status || error)}</p>}
    <details className="text-sm text-muted">
      <summary className="min-h-11 cursor-pointer py-3">{t("Storage & downloads")}</summary>
      {usage !== undefined && <p className="mb-2">{t("App storage ·")}{(usage / 1024 / 1024).toFixed(0)} MB</p>}
      <p>{t("Model sizes exclude the shared runtime. Saved models take a short time to prepare after reopening. Browser storage can be cleared or evicted.")}</p>
    </details>
  </div>
}
