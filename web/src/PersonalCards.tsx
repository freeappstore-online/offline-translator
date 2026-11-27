import { useEffect, useRef, useState } from 'react'
import { CollectionPicker } from './CollectionPicker'
import { TemplateBuilder } from './TemplateBuilder'
import type { TemplateReference } from './card-templates'
import { LanguagePicker } from './LanguagePicker'
import { ReadAloud } from './ReadAloud'
import { t, languageName } from './i18n'
import { engines, modelFor, type Engine, type Language } from './model-options'
import { translateWithModel, type TranslationMetrics } from './downloaded-translation'
import { buildFingerprint, type LogEntry } from './translation-log'
import { buildChanges } from './build-changes'
import { readPersonalCards, savePersonalCard, writePersonalCards, exportPersonalCards, type PersonalCard, type PersonalVersion } from './personal-cards'
const field = 'min-h-11 w-full rounded-xl border border-line bg-paper p-3 text-base text-ink'
const button = 'min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50'
const codes: Language[] = ['en', 'vi', 'zh']
export function PersonalCards({ cards, engine, target, onUse, onLog, initialText = '', initialCollection, editorOnly = false, onDone, editCard }: { editCard?: PersonalCard; initialText?: string; initialCollection?: string; editorOnly?: boolean; onDone?: () => void; cards: PersonalCard[]; engine: Engine; target: Language; onUse: (text: string, from: Language, to: Language) => void; onLog: (entry: LogEntry) => void }) {
  const [createMode, setCreateMode] = useState<'template' | null>(editorOnly ? 'template' : null), [template, setTemplate] = useState<TemplateReference>()
  const [editing, setEditing] = useState(false), [id, setId] = useState<string>(), [source, setSource] = useState<Language>('en'), [original, setOriginal] = useState('')
  const [targets, setTargets] = useState<Language[]>([target]), [versions, setVersions] = useState<Partial<Record<Language, PersonalVersion>>>({}), [enabled, setEnabled] = useState(false)
  const [modelChoice, setModelChoice] = useState<Engine>(engine), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [query, setQuery] = useState(initialText)
  const [collectionIds, setCollectionIds] = useState<string[]>(initialCollection ? [initialCollection] : [])
  const [removed, setRemoved] = useState<PersonalCard>()
  const request = useRef<AbortController | null>(null), alive = useRef(true), editor = useRef<HTMLDivElement>(null)
  const resolvedEngine = source === 'zh' || targets.includes('zh') ? 'multilingual' : modelChoice
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort() } }, [])
  const valid = Boolean(original.trim() && original.length <= 500 && targets.length && targets.every(code => versions[code]?.text.trim() && versions[code]!.text.length <= 500))
  function open(card?: PersonalCard) {
    setCreateMode(null); setTemplate(card?.template); setCollectionIds(card?.collectionIds ?? (initialCollection ? [initialCollection] : [])); setId(card?.id); setSource(card?.source ?? 'en'); setOriginal(card?.original ?? ''); setTargets(card ? Object.keys(card.translations) as Language[] : [target]); setVersions(card?.translations ?? {}); setEnabled(card?.useInTranslate ?? false); setModelChoice(engine); setStatus(''); setEditing(true)
    window.setTimeout(() => editor.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0)
  }
  useEffect(() => { if (editCard) open(editCard) }, [])
  function changeSource(text: string, code = source) {
    setTemplate(undefined); setOriginal(text); setSource(code); setVersions({}); setEnabled(false)
    if (targets.includes(code)) setTargets([codes.find(item => item !== code)!])
    setStatus('Source changed. Generate or enter translations again.')
  }
  async function generate() {
    if (request.current || !original.trim() || !targets.length) return
    const controller = new AbortController(); request.current = controller; setBusy(true); setStatus('Preparing translation…')
    try {
      for (const to of targets) {
        controller.signal.throwIfAborted()
        const model = modelFor(resolvedEngine, source, to)!, started = performance.now(), at = new Date().toISOString()
        let runtime: TranslationMetrics | undefined
        try {
          const text = await translateWithModel(model, original.trim(), source, to, controller.signal, message => { if (alive.current) setStatus(message) }, value => { runtime = value })
          controller.signal.throwIfAborted()
          onLog({ id: crypto.randomUUID(), at, original: original.trim(), translation: text, from: source, to, model: model.id, elapsedMs: Math.round(performance.now() - started), runtime, inputMethod: 'text', purpose: 'personal-card-draft', experiment: { build: buildFingerprint, mode: import.meta.env.DEV ? 'development' : 'production', selectedEngine: resolvedEngine, modelRevision: model.revision, execution: 'WASM worker', changes: buildChanges }, check: { status: 'pending', errors: [], note: 'Personal card draft; unreviewed.' } })
          if (alive.current) setVersions(previous => ({ ...previous, [to]: { text, origin: 'ai', model, generatedAt: new Date().toISOString() } }))
        } catch (error) {
          onLog({ id: crypto.randomUUID(), at, original: original.trim(), translation: null, from: source, to, model: model.id, elapsedMs: Math.round(performance.now() - started), runtime, inputMethod: 'text', purpose: 'personal-card-draft', error: String(error), experiment: { build: buildFingerprint, mode: import.meta.env.DEV ? 'development' : 'production', selectedEngine: resolvedEngine, modelRevision: model.revision, execution: 'WASM worker', changes: buildChanges }, check: { status: 'unavailable', errors: [] } })
          throw error
        }
      }
      if (alive.current) setStatus('Review and edit the drafts before saving.')
    } catch (error) { if (alive.current) setStatus(controller.signal.aborted ? 'Translation canceled.' : String(error)) }
    finally { if (request.current === controller) request.current = null; if (alive.current) setBusy(false) }
  }
  function save() {
    const previous = cards.find(card => card.id === id), now = new Date().toISOString()
    const translations = Object.fromEntries(targets.map(code => [code, { ...versions[code]!, text: versions[code]!.text.trim() }]))
    try { savePersonalCard({ collectionIds, template, id: id ?? crypto.randomUUID(), source, original: original.trim(), translations, useInTranslate: enabled, createdAt: previous?.createdAt ?? now, updatedAt: now }); setEditing(false); setStatus('Personal card saved.'); onDone?.() } catch { setStatus('Could not save personal cards. Browser storage is full, unavailable or contains invalid data. Export a backup before clearing site data.') }
  }
  const matches = cards.filter(card => !query.trim() || [card.original, ...Object.values(card.translations).map(version => version.text)].some(text => text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
  return <section className="space-y-4 rounded-3xl bg-panel p-4 text-ink sm:p-5" aria-label={t('My cards')}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{t(editorOnly ? 'Add card' : 'My cards')}</h2>{!editorOnly && <button type="button" className={button} disabled={busy} onClick={() => { setEditing(false); setCreateMode('template'); setStatus('') }}>{t('New card')}</button>}</div>
    <p className="text-xs text-muted">{t('Personal cards stay in this browser. AI drafts are unreviewed; saving or editing does not verify their accuracy.')}</p>
    {createMode === 'template' && <TemplateBuilder initialTarget={target} initialText={query} onCancel={() => { setCreateMode(null); onDone?.() }} onApply={(text, code, reference, destination) => { open(); setSource(code); setOriginal(text); setTargets([destination ?? (code === target ? (code === 'en' ? 'vi' : 'en') : target)]); setTemplate(reference); setQuery('') }} />}
    {editing && <div ref={editor} className="scroll-mt-16 rounded-2xl border border-line p-3 sm:p-4">
      {template && <p className="mb-3 text-xs text-muted">{t('Created from a template. Editing the original detaches it from the template.')}</p>}
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (valid && !busy) save() }}>
        <div className="grid grid-cols-2 items-end gap-3"><LanguagePicker label="Original language" value={source} disabled={busy} onChange={code => changeSource(original, code)} /><LanguagePicker label="Translate to" value={targets[0] ?? (source === 'en' ? 'vi' : 'en')} disabled={busy} onChange={code => { if (code === source) changeSource(original, targets[0] ?? (source === 'en' ? 'vi' : 'en')); setTargets(previous => [code, ...previous.slice(1).filter(item => item !== code && item !== source)]) }} /></div>
        <label className="block text-sm font-semibold">{t('Original phrase')}<textarea className={field + ' mt-1 min-h-24'} lang={source} value={original} maxLength={500} disabled={busy} required onChange={event => changeSource(event.target.value)} /></label>
        <details><summary className="min-h-11 cursor-pointer py-3 text-sm text-muted">{t('Additional translations')}</summary><fieldset disabled={busy}><legend className="sr-only">{t('Translate into')}</legend><div className="mt-1 flex flex-wrap gap-x-4">{codes.filter(code => code !== source && code !== targets[0]).map(code => <label key={code} className="flex min-h-11 items-center gap-2 text-sm"><input className="size-5 accent-accent" type="checkbox" checked={targets.includes(code)} onChange={event => setTargets(previous => event.target.checked ? [...previous, code] : previous.filter(item => item !== code))} />{languageName(code)}</label>)}</div></fieldset></details>
        <label className="block text-sm font-semibold">{t('Translation model')}<select className={field + ' mt-1'} disabled={busy} value={resolvedEngine} onChange={event => setModelChoice(event.target.value as Engine)}>{Object.keys(engines).filter(key => key === 'multilingual' || (source !== 'zh' && !targets.includes('zh'))).map(key => <option key={key} value={key}>{key === 'opus' ? 'OPUS-MT' : 'M2M100'}</option>)}</select></label>
        <p className="text-xs text-muted">{t('Drafts are generated on this device. First use may download the selected model; prepare it in Packs for offline use. You can also enter translations yourself.')}</p>
        <button type="button" className={button} disabled={busy || !original.trim() || !targets.length} onClick={() => void generate()}>{t('Generate translations')}</button>
        {busy && <button type="button" className="ml-3 min-h-11 text-sm text-muted underline" onClick={() => request.current?.abort()}>{t('Cancel')}</button>}
        {targets.map(code => <label key={code} className="block text-sm font-semibold">{languageName(code)}<textarea className={field + ' mt-1 min-h-24'} lang={code} disabled={busy} value={versions[code]?.text ?? ''} onChange={event => setVersions(previous => ({ ...previous, [code]: { ...(previous[code] ?? { origin: 'user' as const }), text: event.target.value, editedAt: new Date().toISOString() } }))} /><span className="mt-1 block text-xs font-normal text-muted">{t(versions[code]?.origin === 'ai' ? 'AI translated · unreviewed' : 'User written · unreviewed')}{versions[code]?.origin === 'ai' && versions[code]?.editedAt ? ' · ' + t('Edited by you') : ''}</span></label>)}
        {targets.some(code => (versions[code]?.text.length ?? 0) > 500) && <p className="text-xs text-warning">{t('Keep each version within 500 characters.')}</p>}
        <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-semibold">{t('Collections')} ({collectionIds.length})</summary><fieldset disabled={busy} className="mt-3"><CollectionPicker selected={collectionIds} onChange={setCollectionIds} /></fieldset></details>
        <label className="flex items-start gap-3 rounded-xl bg-paper p-3 text-sm"><input className="mt-0.5 size-5 shrink-0 accent-accent" type="checkbox" checked={enabled} disabled={busy} onChange={event => setEnabled(event.target.checked)} /><span><span className="block font-semibold">{t('Use this card in Translate')}</span><span className="mt-1 block text-xs text-muted">{t('Only exact matches use your saved wording. This does not mark the translation as reviewed.')}</span></span></label>
        <div className="flex flex-wrap gap-3"><button type="submit" className={button} disabled={!valid || busy}>{t('Save personal card')}</button><button type="button" disabled={busy} className="min-h-11 px-3 text-sm text-muted" onClick={() => { setEditing(false); setStatus(''); onDone?.() }}>{t('Close')}</button></div>
      </form>
    </div>}
    {status && <p role="status" className="text-sm text-muted">{t(status)}</p>}
    {!editorOnly && !createMode && !editing && <>
    <label className="sr-only" htmlFor="personal-card-search">{t('Search my cards')}</label><input id="personal-card-search" type="search" className={field} placeholder={t('Search my cards')} value={query} onChange={event => setQuery(event.target.value)} />
    {!matches.length && <p className="py-4 text-sm text-muted">{t(cards.length ? 'No matching cards.' : 'Create a personal card for a phrase you often need.')}</p>}
    <div className="space-y-3">{matches.map(card => <article key={card.id} className="rounded-2xl border border-line p-3">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted">{languageName(card.source)}</p><h3 className="mt-1 wrap-anywhere font-semibold" lang={card.source}>{card.original}</h3></div><ReadAloud text={card.original} language={card.source} /></div>
      {Object.entries(card.translations).map(([code, version]) => <div key={code} className="mt-3 rounded-xl bg-paper p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs text-muted">{languageName(code as Language)}</p><p className="mt-1 wrap-anywhere text-lg" lang={code}>{version.text}</p></div><ReadAloud text={version.text} language={code as Language} /></div><p className="mt-2 text-xs text-muted">{t(version.origin === 'ai' ? 'AI translated · unreviewed' : 'User written · unreviewed')}{version.editedAt && version.origin === 'ai' ? ' · ' + t('Edited by you') : ''}</p><button type="button" className="mt-1 min-h-11 text-xs font-semibold text-accent underline" onClick={() => onUse(card.original, card.source, code as Language)}>{t('Use in Translate')}</button></div>)}
      <p className="mt-3 text-xs text-muted">{t(card.useInTranslate ? 'Exact matching enabled' : 'Not used for automatic matching')}</p>
      <div className="mt-1 flex flex-wrap gap-4"><button type="button" disabled={busy} className="min-h-11 text-sm text-accent underline" onClick={() => open(card)}>{t('Edit')}</button><button type="button" disabled={busy} className="min-h-11 text-sm text-muted underline" onClick={() => { try { writePersonalCards(readPersonalCards().filter(row => row.id !== card.id)); setRemoved(card); setStatus('Personal card removed.') } catch { setStatus('Could not save personal cards. Browser storage is full, unavailable or contains invalid data. Export a backup before clearing site data.') } }}>{t('Remove')}</button></div>
    </article>)}</div>
    {removed && <button type="button" className="min-h-11 text-sm text-accent underline" onClick={() => { try { savePersonalCard(removed); setRemoved(undefined); setStatus('Personal card restored.') } catch { setStatus('Could not save personal cards. Browser storage is full, unavailable or contains invalid data. Export a backup before clearing site data.') } }}>{t('Undo remove')}</button>}
    <button type="button" className="min-h-11 text-sm text-muted underline" onClick={() => { try { exportPersonalCards() } catch { setStatus('Could not export personal cards.') } }}>{t('Export personal cards JSON')}</button>
    </>}
  </section>
}
