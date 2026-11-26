import { inferenceRuntimeSaved } from './inference-runtime'
import { t, languageName } from './i18n'
import { LanguagePicker } from './LanguagePicker'
import { useEffect, useRef, useState } from 'react'
import { translateWithModel, releaseTranslation } from './downloaded-translation'
import { modelCache, packSaved, packs, phraseCache, phraseUrl, savePhrases } from './pack-storage'
import { speechCache, speechModel } from './speech-model'
import { speechSaved, removeModel } from './model-resources'
import { ocrSaved, ocrRuntimeCache, ocrRuntimeFiles } from './ocr-resources'
import { prepareSpeech, releaseSpeech } from './speech-engine'
import { packagesForPair, recommendedPackages, estimateSelection, formatStorage, installSelection, translationForSelection, type PackageItem } from './package-plan'
import type { Engine, Language } from './model-options'
import type { Phrase } from './phrases'
const button = 'min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50'
export function Packs({ cards, onReady }: { cards: Phrase[]; onReady: (engine: Engine, from: Language, to: Language) => void }) {
  const [pair, setPair] = useState<{ from: Language; to: Language }>({ from: 'en', to: 'vi' })
  const [saved, setSaved] = useState<Record<string, boolean>>({}), [runtimes, setRuntimes] = useState({ onnx: false, ocr: false })
  const [active, setActive] = useState<string>(), [busy, setBusy] = useState(false), [checking, setChecking] = useState(true), [status, setStatus] = useState('')
  const [step, setStep] = useState({ current: 0, total: 0 })
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({}), [persistent, setPersistent] = useState(false)
  const [custom, setCustom] = useState(false), [selected, setSelected] = useState<string[]>(recommendedPackages('en', 'vi'))
  const [info, setInfo] = useState<{ title: string; text: string }>()
  const dialog = useRef<HTMLDialogElement>(null), request = useRef<AbortController | null>(null), alive = useRef(true)
  const items = packagesForPair(pair.from, pair.to, new TextEncoder().encode(JSON.stringify(cards)).length)
  const recommended = recommendedPackages(pair.from, pair.to), selection = custom ? selected : recommended
  const estimate = estimateSelection(items, selection, saved, runtimes)
  const ready = selection.length > 0 && estimate.additional === 0
  const translationChoice = translationForSelection(selection, pair.from, pair.to)
  const defaultModel = translationChoice?.engine === 'multilingual' ? 'M2M100' : translationChoice ? 'OPUS-MT' : undefined
  const itemName = (item: PackageItem) => item.kind === 'camera' ? t('Camera') + ' · ' + languageName(item.from!) : item.from && item.to ? item.title + ' · ' + languageName(item.from) + ' → ' + languageName(item.to) : t(item.title)
  function explain(title: string, text: string) { setInfo({ title, text }); dialog.current?.showModal() }
  function infoButton(title: string, text: string) { return <button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-full text-accent" aria-label={t('About {name}', { name: title })} onClick={() => explain(title, text)}><span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full border border-current text-xs font-bold">i</span></button> }
  async function refresh() {
    const states = await Promise.all(packs.map(async pack => [pack.key, await packSaved(pack.model)] as const))
    const cameras = await Promise.all((['en', 'vi', 'zh'] as const).map(async code => ['ocr-' + code, await ocrSaved(code)] as const))
    const phrases = await (await caches.open(phraseCache)).match(phraseUrl), speech = await speechSaved()
    const onnx = await inferenceRuntimeSaved()
    const runtime = await caches.open(ocrRuntimeCache), ocr = (await Promise.all(ocrRuntimeFiles.map(file => runtime.match(new URL(file, location.origin).href)))).every(response => response?.ok)
    const next = { ...Object.fromEntries([...states, ...cameras]), phrases: Boolean(phrases?.ok), speech }, nextRuntimes = { onnx, ocr }
    if (alive.current) { setSaved(next); setRuntimes(nextRuntimes); setStorage(await navigator.storage?.estimate() ?? {}); setPersistent(await navigator.storage?.persisted?.() ?? false) }
    return { saved: next as Record<string, boolean>, runtimes: nextRuntimes }
  }
  useEffect(() => { alive.current = true; void refresh().catch(() => setStatus('Browser storage is unavailable.')).finally(() => { if (alive.current) setChecking(false) }); return () => { alive.current = false; request.current?.abort() } }, [])
  function choose(side: 'from' | 'to', value: Language) {
    const other = side === 'from' ? 'to' : 'from', next = { ...pair, [side]: value, [other]: pair[other] === value ? pair[side] : pair[other] }
    setPair(next); setCustom(false); setSelected(recommendedPackages(next.from, next.to)); setStatus('')
  }
  async function installResource(key: string, controller: AbortController) {
    const report = (message: string, progress?: number) => { if (alive.current && !controller.signal.aborted) setStatus(t(message) + (progress === undefined ? '' : ` ${progress}%`)) }
    if (key === 'phrases') { await savePhrases(cards); report('Phrase library saved for offline use.') }
    else if (key === 'speech') { await prepareSpeech(controller.signal, report); if (!await speechSaved()) throw new Error('The model ran, but its files were not fully saved. Please retry.') }
    else if (key.startsWith('ocr-')) await (await import('./ocr-engine')).prepareOcr(key.slice(4) as Language, controller.signal, report)
    else {
      const pack = packs.find(item => item.key === key)!, from = key === 'multilingual' ? pair.from : pack.from, to = key === 'multilingual' ? pair.to : pack.to
      await translateWithModel(pack.model, { en: 'Hello.', vi: 'Xin chào.', zh: '你好。' }[from], from, to, controller.signal, report)
      if (!await packSaved(pack.model)) throw new Error('The model ran, but its files were not fully saved. Please retry.')
    }
  }
  async function install(keys: string[], activate = true, force = false) {
    if (request.current || !keys.length) return
    const controller = new AbortController(); request.current = controller; setBusy(true); setStatus('Preparing package…')
    try {
      const snapshot = await refresh(); controller.signal.throwIfAborted()
      const pending = items.filter(item => keys.includes(item.key) && (force || !snapshot.saved[item.key] || (item.runtime && !snapshot.runtimes[item.runtime]))).map(item => item.key)
      setStep({ current: 0, total: pending.length })
      await installSelection(pending, controller.signal, async key => {
        if (alive.current) setActive(key)
        await installResource(key, controller); controller.signal.throwIfAborted(); await refresh()
        if (alive.current) setStep(previous => ({ ...previous, current: previous.current + 1 }))
      })
      controller.signal.throwIfAborted()
      if (activate) {
        const choice = translationForSelection(keys, pair.from, pair.to)
        if (choice) onReady(choice.engine, choice.from, choice.to)
      }
      if (alive.current) setStatus('Selected packages are ready.')
    } catch (error) { if (alive.current) setStatus(controller.signal.aborted ? 'Download canceled. Saved files can be reused on retry.' : String(error)); await refresh().catch(() => {}) }
    finally { if (request.current === controller) request.current = null; if (alive.current) { setBusy(false); setActive(undefined) } }
  }
  function cancel() { request.current?.abort(); releaseTranslation(); releaseSpeech(); void import('./ocr-engine').then(module => module.releaseOcr()) }
  async function remove(key: string) {
    if (request.current || !window.confirm(t('Remove this downloaded resource? Your cards, saved results and logs will be kept.'))) return
    try {
      if (key === 'speech') { releaseSpeech(); await removeModel(speechCache, speechModel) }
      else if (key.startsWith('ocr-')) await (await import('./ocr-engine')).removeOcr(key.slice(4) as Language)
      else if (key === 'phrases') await (await caches.open(phraseCache)).delete(phraseUrl)
      else { releaseTranslation(); await removeModel(modelCache, packs.find(item => item.key === key)!.model) }
      await refresh(); setStatus('Removed')
    } catch (error) { setStatus(String(error)) }
  }
  function totals(live = true) { return <div className="text-sm"><output aria-live={live ? 'polite' : 'off'} aria-atomic="true" className="block font-semibold">{t('Estimated package storage')}: {formatStorage(estimate.total)}</output><p className="mt-1 text-xs text-muted">{t('Additional space needed')}: {checking ? t('Checking…') : formatStorage(estimate.additional)}</p></div> }
  function installButton() { return <button type="button" disabled={busy || checking || !selection.length || (selection.includes('phrases') && !cards.length)} className={button + ' w-full'} onClick={() => void install(selection)}>{t(ready ? 'Use installed package' : custom ? 'Install selected packages' : 'Install recommended package')}</button> }
  const policy = 'This is a provisional starter bundle for text, voice, camera and cards. M2M100 is selected to share one model across both directions. Model recommendations will be revised after further testing of capabilities, translation accuracy, speed, storage, memory and failures on real devices. This is not a proven accuracy ranking.'
  return <div className="mx-auto max-w-2xl rounded-3xl bg-panel p-4 text-ink sm:p-5">
    <div className="grid gap-3 sm:grid-cols-2"><LanguagePicker label="Translate from" value={pair.from} disabled={busy} onChange={value => choose('from', value)} /><LanguagePicker label="Translate to" value={pair.to} disabled={busy} onChange={value => choose('to', value)} /></div>
    <section className="mt-5 rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between gap-2"><h2 className="text-base font-bold">{t(custom ? 'Your package' : 'Recommended package')}</h2>{infoButton(t('Package recommendation'), policy)}</div>
      <p className="mb-4 mt-1 text-xs text-muted">{custom ? t(selection.length === 1 ? '1 package selected' : '{count} packages selected', { count: selection.length }) : t('Text · Voice · Camera · Cards')}</p>
      {totals(!custom)}
      {defaultModel && <p className="mt-3 text-xs text-muted">{t('Translation will use {model}.', { model: defaultModel })}</p>}
      {!custom && <div className="mt-4">{installButton()}</div>}
      <button type="button" disabled={busy} aria-expanded={custom} aria-controls="package-customisation" className="mt-2 min-h-11 w-full text-sm font-semibold text-accent disabled:opacity-50" onClick={() => { if (!custom) setSelected(recommended); setCustom(value => !value) }}>{t(custom ? 'Back to recommended package' : 'Customise packages')} <span aria-hidden="true">{custom ? '⌃' : '⌄'}</span></button>
    </section>
    {(status || busy) && <div className="my-4 rounded-xl bg-accent-soft p-3"><p role="status" className="text-sm">{busy && active && <span className="mb-1 block font-semibold">{t('Installing {current} of {total}', { current: Math.min(step.current + 1, step.total), total: step.total })} · {itemName(items.find(item => item.key === active)!)}</span>}{t(status)}</p>{busy && <button type="button" className="mt-2 min-h-11 font-semibold text-accent underline" onClick={cancel}>{t('Cancel')}</button>}</div>}
    {custom && <section id="package-customisation" className="mt-4" aria-label={t('Customise packages')}>
      {(['translation', 'speech', 'camera', 'phrases'] as const).map(kind => <fieldset key={kind} className="mb-4"><legend className="mb-1 text-sm font-semibold">{t({ translation: 'Translation models', speech: 'Voice input', camera: 'Camera languages', phrases: 'Travel phrases' }[kind])}</legend><div className="divide-y divide-line rounded-2xl border border-line px-3">{items.filter(item => item.kind === kind).map(item => <div key={item.key} className="flex items-center gap-2">
        <label className="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3 py-3"><input type="checkbox" className="size-5 shrink-0 accent-accent" disabled={busy} checked={selected.includes(item.key)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.key] : previous.filter(key => key !== item.key))} /><span className="min-w-0"><span className="block text-sm font-semibold">{itemName(item)}</span><span className="mt-1 block text-xs text-muted">{formatStorage(item.bytes)}{saved[item.key] ? ' · ' + t('Saved') : ''}</span></span></label>
        {infoButton(itemName(item), item.info)}
      </div>)}</div></fieldset>)}
      <p className="text-xs text-muted">{t('Unticking excludes a package from this installation. Saved packages are kept.')}</p>
      <div className="sticky bottom-28 z-20 mt-4 space-y-3 rounded-2xl border border-line bg-panel p-3 shadow-navigation">{totals()}{installButton()}</div>
    </section>}
    <div className="mt-3 flex items-center gap-2 text-xs text-muted"><span>{t('Estimates include shared runtimes once.')}</span>{infoButton(t('Storage estimate'), 'Estimates use pinned model file sizes and decompressed camera data, counting shared runtimes once. Additional space excludes complete saved packages. Browser overhead, partial downloads and temporary installation files may need more room. Storage is not runtime memory. Unticking does not delete saved packages.')}</div>
    {storage.quota && estimate.additional > storage.quota - (storage.usage ?? 0) && <p role="status" className="mt-2 text-xs text-warning">{t('Estimated free browser storage is below this selection.')}</p>}
    <details className="mt-2 border-t border-line text-sm"><summary className="min-h-12 cursor-pointer py-3 text-muted">{t('Manage saved packages')}</summary><div className="divide-y divide-line">{items.filter(item => saved[item.key]).map(item => <div key={item.key} className="py-3"><p className="text-sm font-semibold">{itemName(item)}</p><div className="flex flex-wrap gap-4"><button type="button" disabled={busy} className="min-h-11 text-xs text-accent underline" onClick={() => void install([item.key], false, true)}>{t(item.kind === 'phrases' ? 'Save library again' : 'Check saved model')}</button><button type="button" disabled={busy} className="min-h-11 text-xs text-muted underline" onClick={() => void remove(item.key)}>{t('Remove')}</button></div></div>)}</div></details>
    <details className="border-t border-line text-sm text-muted"><summary className="min-h-12 cursor-pointer py-3">{t('Storage & downloads')}</summary><p>{t('App storage ·')} {formatStorage(storage.usage ?? 0)}</p>{storage.quota && <p>{t('Estimated free browser storage')}: {formatStorage(Math.max(0, storage.quota - (storage.usage ?? 0)))}</p>}<p className="mt-3 text-xs">{t('Saved models still need session preparation after reopening.')}</p><button type="button" className="mt-2 min-h-11 underline" onClick={async () => { const granted = await navigator.storage?.persist?.(); setPersistent(Boolean(granted)); setStatus(granted ? 'Storage protection enabled.' : 'The browser did not grant storage protection.') }}>{t(persistent ? 'Storage protection enabled.' : 'Protect offline downloads')}</button><button type="button" className="mt-2 block min-h-11 underline" onClick={() => { releaseTranslation(); releaseSpeech(); void import('./ocr-engine').then(module => module.releaseOcr()); setStatus('Active models released. Downloaded files are kept.') }}>{t('Release active model memory')}</button></details>
    <dialog ref={dialog} onClose={() => setInfo(undefined)} aria-labelledby="package-info-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-line bg-popover p-5 text-ink backdrop:bg-scrim"><h2 id="package-info-title" className="text-lg font-bold">{info?.title}</h2><p className="mt-3 text-sm leading-relaxed">{t(info?.text ?? '')}</p><form method="dialog" className="mt-4"><button className={button}>{t('Close')}</button></form></dialog>
  </div>
}
