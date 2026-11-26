import { t, languageName } from './i18n'
import { LanguagePicker } from './LanguagePicker'
import { useEffect, useRef, useState } from 'react'
import { translateWithModel, releaseTranslation } from './downloaded-translation'
import { modelCache, packSaved, packs, phraseCache, phraseUrl, savePhrases } from './pack-storage'
import { speechCache, speechModel } from './speech-model'
import { speechSaved, removeModel } from './model-resources'
import { prepareSpeech, releaseSpeech } from './speech-engine'
import { ocrSaved } from './ocr-resources'
import type { Language } from './model-options'
import type { Phrase } from './phrases'
const button = 'min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50'
export function Packs({ cards }: { cards: Phrase[] }) {
  const [pair, setPair] = useState<{ from: Language; to: Language }>({ from: 'en', to: 'vi' })
  const [saved, setSaved] = useState<Record<string, boolean>>({}), [active, setActive] = useState<string>(), [status, setStatus] = useState('')
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({}), [persistent, setPersistent] = useState(false)
  const request = useRef<AbortController | null>(null), alive = useRef(true)
  const [modelChoice, setModelChoice] = useState('opus')
  const choices = packs.filter(pack => pack.key === 'multilingual' || (pack.from === pair.from && pack.to === pair.to))
  const selected = choices.find(pack => modelChoice === 'opus' ? pack.key !== 'multilingual' : pack.key === 'multilingual') ?? choices[0]
  const cameraSaved = [pair.from, pair.to].filter(code => saved['ocr-' + code]).length
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
  function actions(key: string) {
    const label = active === key ? 'Preparing…' : key === 'phrases' ? 'Download phrases' : 'Download'
    return saved[key] ? <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-3 text-muted">{t('Manage')}</summary>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={Boolean(active)} className="min-h-11 text-sm text-accent underline disabled:opacity-50" onClick={() => void install(key)}>{t(key === 'phrases' ? 'Save library again' : 'Check saved model')}</button>
      <button type="button" disabled={Boolean(active)} className="min-h-11 text-sm text-muted underline disabled:opacity-50" onClick={() => void remove(key)}>{t('Remove')}</button></div>
    </details> : <button type="button" disabled={Boolean(active) || (key === 'phrases' && !cards.length)} className={button} onClick={() => void install(key)}>{t(label)}</button>
  }
  const badge = (key: string) => <span className="shrink-0 text-xs text-muted">{t(active === key ? 'Preparing…' : saved[key] ? 'Saved' : 'Not downloaded')}</span>
  return <div className="mx-auto max-w-2xl rounded-3xl bg-panel p-4 text-ink sm:p-5">
    <div className="grid gap-3 sm:grid-cols-2"><LanguagePicker label="Translate from" value={pair.from} disabled={Boolean(active)} onChange={value => choose('from', value)} /><LanguagePicker label="Translate to" value={pair.to} disabled={Boolean(active)} onChange={value => choose('to', value)} /></div>
    <p className="mb-5 mt-3 text-xs text-muted">{t('Download once. Use offline in this browser.')}</p>
    {(status || active) && <div className="mb-4 rounded-xl bg-accent-soft p-3"><p role="status" className="text-sm">{t(status)}</p>{active && <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-accent underline" onClick={() => { request.current?.abort(); releaseTranslation(); releaseSpeech(); void import('./ocr-engine').then(module => module.releaseOcr()) }}>{t('Cancel')}</button>}</div>}
    <section className="space-y-3" aria-labelledby="translation-download-title">
      <h2 id="translation-download-title" className="font-semibold">{t('Text translation')}</h2>
      <label className="block text-xs text-muted" htmlFor="pack-model">{t('Translation model')}</label>
      <select id="pack-model" value={selected.key} disabled={Boolean(active)} onChange={event => setModelChoice(event.target.value === 'multilingual' ? 'multilingual' : 'opus')} className="min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink">
        {choices.map(pack => <option key={pack.key} value={pack.key}>{pack.key === 'multilingual' ? 'M2M100' : 'OPUS-MT'} · {t(pack.size)}</option>)}
      </select>
      <div className="rounded-2xl bg-paper p-3">
        <div className="flex items-center justify-between gap-3"><p className="text-sm">{t(selected.key === 'multilingual' ? 'Shared multilingual model' : 'Smaller download · one direction')}</p>{badge(selected.key)}</div>
        <div className="mt-2">{actions(selected.key)}</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 pt-1">
        <div><h3 className="text-sm font-semibold">{t('Travel phrases')}</h3><p className="mt-1 text-xs text-muted">{t('{count} cards', { count: cards.filter(card => card[pair.from]?.trim() && card[pair.to]?.trim()).length })} · {t(saved.phrases ? 'Saved' : 'Not downloaded')}</p></div>
        {actions('phrases')}
      </div>
    </section>
    <details className="border-b border-line py-1">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3"><span className="text-sm font-semibold">{t('Voice input')}</span><span className="text-xs text-muted">{t(saved.speech ? 'Saved' : 'Not downloaded')} <span aria-hidden="true">⌄</span></span></summary>
      <div className="pb-4"><p className="mb-3 text-xs text-muted">Whisper Tiny · {t('Shared by all three languages.')}</p>{actions('speech')}</div>
    </details>
    <details className="border-b border-line py-1">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3"><span className="text-sm font-semibold">{t('Camera')}</span><span className="text-xs text-muted">{t('{count} of {total} saved', { count: cameraSaved, total: 2 })} <span aria-hidden="true">⌄</span></span></summary>
      <div className="divide-y divide-line">{[pair.from, pair.to].map(code => <article key={code} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><h3 className="text-sm">{languageName(code)}</h3>{badge('ocr-' + code)}</div>{actions('ocr-' + code)}</article>)}</div>
    </details>
    <details className="pt-1 text-sm text-muted"><summary className="min-h-14 cursor-pointer py-4">{t('Storage & downloads')}</summary>
      <p>{t('App storage ·')} {((storage.usage ?? 0) / 1024 / 1024).toFixed(0)} MB</p>
      {storage.quota && <p>{t('Estimated free browser storage')}: {Math.max(0, (storage.quota - (storage.usage ?? 0)) / 1024 / 1024).toFixed(0)} MB</p>}
      <p className="mt-3 text-xs">{t('Saved models still need session preparation after reopening.')}</p>
      <button type="button" className="mt-2 min-h-11 underline" onClick={async () => { const granted = await navigator.storage?.persist?.(); setPersistent(Boolean(granted)); setStatus(granted ? 'Storage protection enabled.' : 'The browser did not grant storage protection.') }}>{t(persistent ? 'Storage protection enabled.' : 'Protect offline downloads')}</button>
      <button type="button" className="mt-2 block min-h-11 underline" onClick={() => { releaseTranslation(); releaseSpeech(); void import('./ocr-engine').then(module => module.releaseOcr()); setStatus('Active models released. Downloaded files are kept.') }}>{t('Release active model memory')}</button>
    </details>
  </div>
}
