import { t, languageName } from './i18n'
import { LanguagePicker } from './LanguagePicker'
import { useEffect, useRef, useState } from 'react'
import { translateWithModel, releaseTranslation } from './downloaded-translation'
import { modelCache, packSaved, packs, phraseCache, phraseUrl, savePhrases } from './pack-storage'
import { speechCache, speechModel } from './speech-model'
import { speechSaved, removeModel } from './model-resources'
import { prepareSpeech, releaseSpeech } from './speech-engine'
import { ocrSaved } from './ocr-resources'
import { readLog } from './translation-log'
import type { Language } from './model-options'
import type { Phrase } from './phrases'
const button = 'min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50'
export function Packs({ cards }: { cards: Phrase[] }) {
  const [pair, setPair] = useState<{ from: Language; to: Language }>({ from: 'en', to: 'vi' })
  const [saved, setSaved] = useState<Record<string, boolean>>({}), [active, setActive] = useState<string>(), [status, setStatus] = useState('')
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({}), [persistent, setPersistent] = useState(false)
  const request = useRef<AbortController | null>(null), alive = useRef(true)
  const visible = packs.filter(pack => pack.key === 'multilingual' || (pack.from === pair.from && pack.to === pair.to) || (pack.from === pair.to && pack.to === pair.from))
  async function refresh() {
    const states = await Promise.all(packs.map(async pack => [pack.key, await packSaved(pack.model)] as const))
    const ocr = await Promise.all((['en', 'vi', 'zh'] as const).map(async code => ['ocr-' + code, await ocrSaved(code)] as const))
    const phrases = await (await caches.open(phraseCache)).match(phraseUrl), speech = await speechSaved()
    if (!alive.current) return
    setSaved({ ...Object.fromEntries([...states, ...ocr]), phrases: Boolean(phrases?.ok), speech })
    setStorage(await navigator.storage?.estimate() ?? {}); setPersistent(await navigator.storage?.persisted?.() ?? false)
  }
  useEffect(() => { alive.current = true; void refresh().catch(() => setStatus('Browser storage is unavailable.')); return () => { alive.current = false; request.current?.abort() } }, [])
  function choose(side: 'from' | 'to', value: Language) { setPair(previous => { const other = side === 'from' ? 'to' : 'from'; return { ...previous, [side]: value, [other]: previous[other] === value ? previous[side] : previous[other] } }); setStatus('') }
  async function install(key: string) {
    if (request.current) return
    const controller = new AbortController(); request.current = controller; setActive(key); setStatus('Preparing package…')
    const report = (message: string, progress?: number) => { if (alive.current && !controller.signal.aborted) setStatus(t(message) + (progress === undefined ? '' : ` ${progress}%`)) }
    try {
      if (key === 'phrases') { await savePhrases(cards); report('Phrase library saved for offline use.') }
      else if (key === 'speech') { await prepareSpeech(controller.signal, report); if (!await speechSaved()) throw new Error('The model ran, but its files were not fully saved. Please retry.'); report('Model saved and ready.') }
      else if (key.startsWith('ocr-')) { await (await import('./ocr-engine')).prepareOcr(key.slice(4) as Language, controller.signal, report); report('Camera language saved and ready.') }
      else {
        const pack = packs.find(item => item.key === key)!, from = pack.key === 'multilingual' ? pair.from : pack.from, to = pack.key === 'multilingual' ? pair.to : pack.to
        await translateWithModel(pack.model, { en: 'Hello.', vi: 'Xin chào.', zh: '你好。' }[from], from, to, controller.signal, report)
        if (!await packSaved(pack.model)) throw new Error('The model ran, but its files were not fully saved. Please retry.')
        report('Model saved and ready.')
      }
      await refresh()
    } catch (error) { if (alive.current) setStatus(controller.signal.aborted ? 'Download canceled. Saved files can be reused on retry.' : String(error)) }
    finally { if (request.current === controller) request.current = null; if (alive.current) setActive(undefined) }
  }
  async function remove(key: string) {
    if (request.current || !window.confirm(t('Remove this downloaded resource? Your cards, saved results and logs will be kept.'))) return
    try {
      if (key === 'speech') { releaseSpeech(); await removeModel(speechCache, speechModel) }
      else if (key.startsWith('ocr-')) await (await import('./ocr-engine')).removeOcr(key.slice(4) as Language)
      else if (key === 'phrases') await (await caches.open(phraseCache)).delete(phraseUrl)
      else { releaseTranslation(); const pack = packs.find(item => item.key === key)!; await removeModel(modelCache, pack.model) }
      await refresh(); setStatus('Removed')
    } catch (error) { setStatus(String(error)) }
  }
  function actions(key: string) { return <div className="mt-3 flex flex-wrap items-center gap-2"><p className="mr-auto text-xs text-muted">{t(saved[key] ? 'Saved in this browser' : 'Ready to download')}</p><button type="button" disabled={Boolean(active)} className={button} onClick={() => void install(key)}>{t(active === key ? 'Preparing…' : key === 'phrases' ? (saved[key] ? 'Save library again' : 'Download phrases') : saved[key] ? 'Check saved model' : 'Download model')}</button>{saved[key] && <button type="button" disabled={Boolean(active)} className="min-h-11 px-2 text-xs text-muted underline" onClick={() => void remove(key)}>{t('Remove')}</button>}</div> }
  return <div className="mx-auto max-w-2xl space-y-5 rounded-3xl bg-panel p-4 text-ink sm:p-5">
    <div className="grid gap-4 sm:grid-cols-2"><LanguagePicker label="First language" value={pair.from} disabled={Boolean(active)} onChange={value => choose('from', value)} /><LanguagePicker label="Second language" value={pair.to} disabled={Boolean(active)} onChange={value => choose('to', value)} /></div>
    <p className="text-sm text-muted">{t('Download once while online. Saved resources are reused in this browser.')}</p>
    <section className="rounded-2xl border border-line p-4"><h2 className="font-semibold">{t('Travel phrases')}</h2><p className="mt-2 text-sm text-muted">{cards.filter(card => card[pair.from]?.trim() && card[pair.to]?.trim()).length} {t('cards for this pair · shared library includes all three languages')}</p>{actions('phrases')}</section>
    <section className="space-y-3"><h2 className="font-semibold">{t('Translation models')}</h2>{visible.map(pack => {
      const latest = readLog().find(entry => entry.model === pack.model.id && entry.translation && !entry.error)
      return <article key={pack.key} className="rounded-2xl border border-line p-4"><h3 className="font-semibold">{pack.key === 'multilingual' ? 'M2M100' : 'OPUS-MT'}</h3><p className="mt-2 text-sm">{languageName(pack.key === 'multilingual' ? pair.from : pack.from)} {pack.key === 'multilingual' ? '↔' : '→'} {languageName(pack.key === 'multilingual' ? pair.to : pack.to)}</p><p className="mt-1 text-xs text-muted">{t(pack.size)} · {t(pack.key === 'multilingual' ? 'one download covers all three languages' : 'this direction')}</p>{latest && <p className="mt-2 text-xs text-muted">{t('Last successful translation on this browser')}: {Math.round(latest.elapsedMs)} ms</p>}{actions(pack.key)}</article>
    })}</section>
    <section className="rounded-2xl border border-line p-4"><h2 className="font-semibold">{t('Voice input')} · Whisper Tiny</h2><p className="mt-2 text-xs text-muted">{t('Shared by all three languages. Recognition stays on this device.')}</p>{actions('speech')}</section>
    <section className="space-y-3"><h2 className="font-semibold">{t('Camera languages')}</h2>{[pair.from, pair.to].map(code => <article key={code} className="rounded-2xl border border-line p-4"><h3 className="text-sm font-semibold">{languageName(code)}</h3>{actions('ocr-' + code)}</article>)}</section>
    {active && <button type="button" className="min-h-11 rounded-xl border border-line px-4 text-sm" onClick={() => { request.current?.abort(); releaseTranslation(); releaseSpeech(); void import('./ocr-engine').then(module => module.releaseOcr()) }}>{t('Cancel')}</button>}
    {status && <p role="status" className="text-sm">{t(status)}</p>}
    <details className="text-sm text-muted"><summary className="min-h-11 cursor-pointer py-3">{t('Storage & downloads')}</summary>
      <p>{t('App storage ·')} {((storage.usage ?? 0) / 1024 / 1024).toFixed(0)} MB</p>
      {storage.quota && <p>{t('Estimated free browser storage')}: {Math.max(0, (storage.quota - (storage.usage ?? 0)) / 1024 / 1024).toFixed(0)} MB</p>}
      <p className="mt-2">{t('Download size is not runtime memory. Both translation models remain available; compare quality on your device.')}</p>
      <p className="mt-2">{t('Saved models still need session preparation after reopening.')}</p>
      <button type="button" className="mt-2 min-h-11 underline" onClick={async () => { const granted = await navigator.storage?.persist?.(); setPersistent(Boolean(granted)); setStatus(granted ? 'Storage protection enabled.' : 'The browser did not grant storage protection.') }}>{t(persistent ? 'Storage protection enabled.' : 'Protect offline downloads')}</button>
      <button type="button" className="mt-2 block min-h-11 underline" onClick={() => { releaseTranslation(); releaseSpeech(); void import('./ocr-engine').then(module => module.releaseOcr()); setStatus('Active models released. Downloaded files are kept.') }}>{t('Release active model memory')}</button>
    </details>
  </div>
}
