import { usePreference } from './preferences'
import { UpdateNotice } from './UpdateNotice'
import { lazy, Suspense } from 'react'
import { SavedTranslations } from './SavedTranslations'
import { saveTranslation } from './saved-translations'
import { exportOcrLog } from './ocr-log'
import { ReadAloud } from './ReadAloud'
import { SpeechInput } from './SpeechInput'
import { exportSpeechLog } from './speech-log'
import { t, languageName, useLocale, setLocale, type Locale } from './i18n'
import { Packs } from './Packs'
import { scenarios, tasks, cardScenarios, cardTask } from './card-scenarios'
import { approvedLabels, buildApprovedIndex, type ApprovedMatch } from './approved-phrases'
import { buildChanges } from './build-changes'
import { buildFingerprint, checkMeaning, exportLog, readLog, writeLog, type LogEntry } from './translation-log'
import { translateWithModel, type TranslationMetrics } from './downloaded-translation'
import { engines, modelFor, type Engine } from './model-options'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { initApp } from '@freeappstore/sdk'
import { PageHeader, Shell, type NavItem } from '@freeappstore/sdk/ui'
import { categories, datasetId, languages, loadPhrases, needsHumanReviewWarning, normalize, type Phrase, type TargetLanguage } from './phrases'
import { rankSuggestions } from './suggest-phrases'
import ReviewWorkstation from './ReviewWorkstation'

const CameraTranslation = lazy(() => import('./CameraTranslation').then(module => ({ default: module.CameraTranslation })))

const fas = initApp({ appId: 'offline-translator' })
const nav: NavItem[] = [
  { label: 'Cards', href: '/', title: 'Offline Translator' },
  { label: 'Translate', href: '/translate', title: 'Translate · Offline Translator' },
  { label: 'Conversation', href: '/conversation', title: 'Conversation · Offline Translator' },
  { label: 'Packs', href: '/packs', title: 'Packs · Offline Translator' },
]
const storageKey = 'wayword-saved-v1'
const control = 'min-h-11 rounded-xl border border-line bg-paper px-3 py-2 text-base text-ink'
const panel = 'rounded-[1.25rem] border border-line bg-panel p-4'

function readFavorites(): Set<string> {
  try {
    const values = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return new Set(Array.isArray(values) ? values.filter(value => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

function currentPath() {
  if (location.pathname === '/') {
    if (location.hash === '#translate') return '/translate'
    if (location.hash === '#packs') return '/packs'
  }
  return location.pathname
}

function NavigationIcon({ kind }: { kind: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-6">
    {kind === 'camera' ? <><path d="M3 7h5l2-3h4l2 3h5v13H3z"/><circle cx="12" cy="13" r="3"/></>
      : kind === 'conversation' ? <><path d="M3 4h13v10H8l-4 4v-4H3zM18 8h3v12l-4-3h-5"/></>
      : kind === 'cards' ? <><rect x="5" y="3" width="15" height="17" rx="2"/><path d="M2 7v14h14M8 8h9M8 12h7"/></>
      : kind === 'packs' ? <><path d="M4 15v6h16v-6M12 3v12m-5-5 5 5 5-5"/></>
      : kind === 'settings' ? <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M3 4h18v13H9l-5 4v-4H3zM7 8h10M7 12h7"/></>}
  </svg>
}

export default function App() {
  const uiLocale = useLocale()
  useEffect(() => { document.documentElement.lang = uiLocale === 'zh' ? 'zh-Hans' : uiLocale }, [uiLocale])
  const [path, setPath] = useState(currentPath)
  const [language, setLanguage] = usePreference<TargetLanguage>('translator-target', 'vi', (value): value is TargetLanguage => value === 'vi' || value === 'zh')
  const [engine, setEngine] = usePreference<Engine>('translator-engine', 'opus', (value): value is Engine => value === 'opus' || value === 'multilingual')
  const [pair, setPair] = usePreference<'en' | 'vi'>('translator-pair', 'en', (value): value is 'en' | 'vi' => value === 'en' || value === 'vi')
  const [cards, setCards] = useState<Phrase[]>([])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [saved, setSaved] = useState(readFavorites)
  const [history, setHistory] = useState(readLog)
  const logRef = useRef(history)
  const [storageError, setStorageError] = useState(false)
  const [incoming, setIncoming] = useState<{ id: number; text: string; from: Locale; to: Locale; method: 'text' | 'camera' }>()
  function useRecognizedText(text: string, from: Locale, to: Locale, method: 'text' | 'camera' = 'camera') {
    if (from === to) return
    setIncoming({ id: Date.now(), text: text.slice(0, 500), from, to, method })
    if (from === 'zh' || to === 'zh') { setEngine('multilingual'); setPair(from === 'zh' ? to as 'en' | 'vi' : from); setLanguage('zh') }
    else { setPair('en'); setLanguage('vi') }
    navigate('/translate')
  }



  function updateLog(update: (entries: LogEntry[]) => LogEntry[]) {
    const entries = update(logRef.current)
    logRef.current = entries
    setHistory(entries)
    try {
      writeLog(entries)
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  function logTranslation(entry: LogEntry) {
    const checked = entry.check.status === 'pending' ? { ...entry, check: checkMeaning(entry) } : entry
    updateLog(entries => [checked, ...entries])
  }

  const configured = Boolean(datasetId || import.meta.env.DEV || import.meta.env.VITE_USE_BUNDLED_DECK === 'true')

  useEffect(() => {
    const sync = () => setPath(currentPath())
    addEventListener('popstate', sync)
    return () => removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    if (!configured) return
    let active = true
    loadPhrases().then(phrases => {
      if (active) setCards(phrases)
    }, () => {
      if (active) setFailed(true)
    })
    return () => { active = false }
  }, [attempt, configured])

  function toggleFavorite(id: string) {
    const next = new Set(saved)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSaved(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]))
    } catch {
      // Favorites stay available until the page closes.
    }
  }

  function navigate(href: string) {
    window.history.pushState(null, '', href)
    setPath(href)
    window.scrollTo({ top: 0 })
  }

  function openSettings() {
    const preferences = document.getElementById('app-preferences') as HTMLDetailsElement | null
    const menu = document.getElementById('translator-menu') as HTMLDetailsElement | null
    if (!preferences) return
    const open = !preferences.open
    preferences.open = open
    if (menu) menu.open = open
    preferences.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const title = path === '/camera' ? t('Camera translation') : path === '/conversation' ? t('Conversation') : path === '/translate' ? t("Translate") : path === '/packs' ? t("Language Packs") : path === '/review' ? 'Review workstation' : t("Quick Cards")
  useEffect(() => { document.title = title + ' · Offline Translator' }, [title])
  if (path === '/review') {
    return (
      <Shell app={fas} appName="Offline Translator" nav={nav} renderNav={() => null} onNavigate={navigate}>
        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6">
          <a href="/" className="mb-4 inline-block text-sm text-muted underline" onClick={event => {
            event.preventDefault()
            navigate('/')
          }}>← Back to app</a>
          {import.meta.env.DEV
            ? <ReviewWorkstation />
            : <p className="rounded-[1.25rem] border border-line bg-panel p-6 text-sm text-muted">Review workstation runs only in local development.</p>}
        </div>
      </Shell>
    )
  }
  return (
    <Shell app={fas} appName="Offline Translator" nav={nav} renderNav={() => null} onNavigate={navigate}>
      <div className="bg-canvas bg-canvas-art mx-auto min-h-svh w-full max-w-2xl px-4 pb-32 pt-4 sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-3 text-canvas-ink">
          <button type="button" className="flex size-11 items-center justify-center text-2xl text-canvas-ink" aria-label={t('Settings')} onClick={openSettings}>☰</button>
          <h1 className="text-center font-sans text-base font-bold sm:text-xl">🌐 Offline <span className="text-secondary">Translator</span></h1>
          <span aria-hidden="true" className="size-11" />
        </header>
        <UpdateNotice />
        <details id="app-preferences" className="not-open:hidden mb-4 rounded-2xl bg-panel p-4">
          <summary className="cursor-pointer text-sm font-semibold">{t('Settings')}</summary>
        <label className="mb-4 flex flex-wrap items-center justify-end gap-2 text-sm">
          {t('App language')}
          <select aria-label={t('App language')} value={uiLocale} className={control + ' max-w-full'}
            onChange={event => setLocale(event.target.value as Locale)}>
            {(['en', 'vi', 'zh'] as const).map(code => <option key={code} value={code}>{languageName(code)}</option>)}
          </select>
        </label>
        </details>
        <nav aria-label={t('Main')} className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 grid w-[min(calc(100%-1.5rem),40rem)] -translate-x-1/2 grid-cols-5 gap-0.5 rounded-3xl border border-line bg-panel px-1 py-2 text-ink shadow-navigation">
          {[
            { href: '/translate', label: 'Translate', icon: 'translate' },
            { href: '/conversation', label: 'Conversation', icon: 'conversation' },
            { href: '/', label: 'Cards', icon: 'cards' },
            { href: '/camera', label: 'Camera', icon: 'camera' },
            { href: '/packs', label: 'Packs', icon: 'packs' },
          ].map(item => <a key={item.href} href={item.href} aria-label={t(item.label)} aria-current={path === item.href ? 'page' : undefined}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] font-semibold ${path === item.href ? 'bg-accent-soft text-accent' : 'text-muted'}`}
            onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(item.href) } }}>
            <NavigationIcon kind={item.icon} /><span className="max-w-full text-center text-[0.65rem] leading-tight">{t(item.icon === 'conversation' ? 'Talk' : item.label)}</span></a>)}
        </nav>
        {path !== '/translate' && path !== '/camera' && path !== '/conversation' && <div className="text-canvas-ink [&_h1]:text-canvas-ink"><PageHeader title={title} /></div>}
        {path !== '/packs' && path !== '/translate' && path !== '/camera' && path !== '/conversation' && (
          <label className="mb-4 flex flex-wrap items-center gap-2 text-canvas-ink">{t("Language")}<select className={control} value={language} onChange={event => setLanguage(event.target.value as TargetLanguage)}>
              {Object.keys(languages).map(id => <option key={id} value={id}>{languageName(id as Locale)}</option>)}
            </select>
          </label>
        )}
        {!cards.length && path !== '/translate' && path !== '/packs' && path !== '/camera' && path !== '/conversation' && (
          <div className={panel}>
            <p role="status">{!configured ? t("The phrase deck is being set up.") : failed ? t("Couldn’t load phrases. Check your connection and try again.") : t("Loading phrases…")}</p>
            {failed && <button className={control + ' mt-3'} onClick={() => { setFailed(false); setAttempt(attempt + 1) }}>{t("Try again")}</button>}
          </div>
        )}
        {(path === '/translate' || path === '/conversation') && (
          <>
            {path === '/translate'
              ? <Translate key={engine + pair + language + (incoming?.id ?? 0)} cards={cards} engine={engine} incoming={incoming}
                  from={engine === 'multilingual' ? pair : 'en'} to={engine === 'opus' ? 'vi' : language} log={logTranslation} />
              : <VoiceConversation key={engine + pair + language} cards={cards} engine={engine}
                  near={engine === 'multilingual' ? pair : 'en'} far={engine === 'opus' ? 'vi' : language}
                  log={logTranslation} />}
            <details className="mt-5 rounded-2xl bg-panel px-4 py-1">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
                <span>{t("Translation settings")}</span>
                <span className="text-right text-muted">{engines[engine].split(' · ')[0]} <span aria-hidden="true">⌄</span></span>
              </summary>
              <div className="space-y-3 pb-3">
              <label className="grid gap-1 text-sm font-semibold">{t('Languages')}<select className={control} value={engine === 'opus' ? 'en-vi' : pair + '-' + language} onChange={event => {
                const [first, second] = event.target.value.split('-'); setIncoming(undefined); setPair(first as 'en' | 'vi'); setLanguage(second as TargetLanguage)
              }}>
                <option value="en-vi">{languageName('en')} ↔ {languageName('vi')}</option>
                {engine === 'multilingual' && <><option value="en-zh">{languageName('en')} ↔ {languageName('zh')}</option><option value="vi-zh">{languageName('vi')} ↔ {languageName('zh')}</option></>}
              </select></label>
              <label className="grid min-w-0 gap-1 text-sm font-semibold">{t("Translation model")}<select className={control + ' w-full'} value={engine} onChange={event => {
                  const next = event.target.value as Engine
                  setIncoming(undefined)
                  setEngine(next)
                  if (next !== 'multilingual') setPair('en')
                }}>
                  {Object.entries(engines).map(([id, name]) => <option key={id} value={id}>{name.split(' · ')[0]}</option>)}
                </select>
              </label>
                <p className="text-sm text-muted">
                  {t('First use downloads {size} plus the runtime. Your text stays on this device.', { size: t(engine === 'opus' ? 'about 107 MB per direction' : 'about 640 MB for all directions') })}
                </p>
              </div>
            </details>

          </>
        )}
        {path === '/camera' && <Suspense fallback={<p className="rounded-2xl bg-panel p-4">{t('Loading camera…')}</p>}><CameraTranslation onUse={useRecognizedText} /></Suspense>}
        {path === '/' && <SavedTranslations onUse={(text, from, to) => useRecognizedText(text, from, to, 'text')} />}
        {path === '/packs' && <>
          <Packs cards={cards} onReady={(nextEngine, from, to) => {
            setEngine(nextEngine)
            if (from === 'zh' || to === 'zh') { setPair((from === 'zh' ? to : from) as 'en' | 'vi'); setLanguage('zh') }
            else { setPair('en'); setLanguage('vi') }
            setIncoming({ id: Date.now(), text: '', from, to, method: 'text' })
          }} />
          <details className="mx-auto mt-3 max-w-2xl rounded-2xl bg-panel px-4 text-sm"><summary className="min-h-11 cursor-pointer py-3 text-muted">{t('Export test records')}</summary><div className="flex flex-wrap gap-2 pb-4">
          <button type="button" className={control} disabled={!history.length}
            onClick={() => exportLog(history)}>{t("Export translation JSON")}</button>
          <button type="button" className={control} onClick={exportSpeechLog}>{t('Export speech JSON')}</button>
          <button type="button" className={control} onClick={exportOcrLog}>{t('Export camera JSON')}</button>
          </div></details>
        </>}
        {storageError && <p role="status" className="mt-3 text-sm text-muted">{t("Browser storage is full or unavailable. Export translation JSON from Packs before closing this page.")}</p>}
        {!!cards.length && path !== '/translate' && path !== '/packs' && path !== '/camera' && path !== '/conversation' &&
          <Cards cards={cards} language={language} saved={saved} onFavorite={toggleFavorite} />}
      </div>
    </Shell>
  )
}

function Cards({ cards, language, saved, onFavorite }: {
  cards: Phrase[]
  language: TargetLanguage
  saved: Set<string>
  onFavorite: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [scenario, setScenario] = useState('essentials')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => new Set())
  const [selected, setSelected] = useState<Phrase | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const searching = Boolean(query.trim())
  const matches = useMemo(() => {
    const ranked = searching ? [...rankSuggestions(query, cards, 'en', { limit: 150, minScore: 0.52 }), ...rankSuggestions(query, cards, language, { limit: 150, minScore: 0.52 })] : []
    const scores = new Map<string, number>()
    for (const result of ranked) scores.set(result.card.id, Math.max(scores.get(result.card.id) ?? 0, result.score))
    return cards.filter(card =>
      (searching || scenario === 'all' || (scenario === 'saved' ? saved.has(card.id) : cardScenarios(card).includes(scenario as keyof typeof scenarios))) &&
      (!searching || scores.has(card.id) || [card.en, card[language]].some(text => normalize(text).includes(normalize(query)))))
      .sort((a, b) => searching ? (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) : 0)
  }, [cards, language, query, saved, scenario, searching])
  const groups = tasks.map(task => ({
    task, cards: matches.filter(card => cardTask(card, scenario) === task),
  })).filter(group => group.cards.length)


  return (
    <>
      <label className="sr-only" htmlFor="search">{t("Search phrases")}</label>
      <input id="search" type="search" className={control + ' w-full'} value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Search all scenarios")} />
      <div className="my-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t("Scenarios")}>
        {[...Object.entries(scenarios), ['saved', t("Saved")], ['all', t("All phrases")]].map(([id, name]) => (
          <button key={id} type="button" role="tab" id={'scenario-' + id}
            aria-selected={scenario === id} aria-controls="scenario-cards"
            tabIndex={scenario === id ? 0 : -1}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${scenario === id ? 'bg-accent text-on-accent' : 'bg-panel text-ink'}`}
            onClick={() => { setScenario(id); setQuery(''); setExpandedTasks(new Set()) }}
            onKeyDown={event => {
              const list = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role=tab]'))
              const index = list.indexOf(event.currentTarget)
              const next = event.key === 'ArrowRight' ? (index + 1) % list.length
                : event.key === 'ArrowLeft' ? (index - 1 + list.length) % list.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : undefined
              if (next === undefined) return
              event.preventDefault()
              list[next].click()
              list[next].focus()
              list[next].scrollIntoView({ block: 'nearest', inline: 'nearest' })
            }}>{t(name)}</button>
        ))}
      </div>
      {searching && <p className="mb-2 text-sm text-canvas-ink">{t("Searching all scenarios")}</p>}
      <p className="mb-3 text-sm text-canvas-ink" role="status">{matches.length ? t('{count} cards', { count: matches.length }) : t("No matching cards.")}</p>
      <div id="scenario-cards" role="tabpanel" aria-labelledby={'scenario-' + scenario}>
      {groups.map(group => <section key={group.task} className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-canvas-ink">{t(group.task)}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(searching || expandedTasks.has(group.task) ? group.cards : group.cards.slice(0, 6)).map(card => (
          <article key={card.id} className={panel}>
            <div className="mb-3 flex items-center justify-between gap-2 text-sm text-muted">
              {t(categories[card.category])}
              <button className={control} type="button" aria-label={`Save card: ${card.en}`} aria-pressed={saved.has(card.id)} onClick={() => onFavorite(card.id)}>
                {saved.has(card.id) ? '★' : '☆'}
              </button>
            </div>
            {needsHumanReviewWarning(card) && (
              <p className="mb-2 rounded-lg bg-warning/15 px-2 py-1 text-xs font-semibold text-warning" role="status">{t("High risk · pending human review")}</p>
            )}
            <button type="button" className="w-full text-left hover:underline" onClick={() => { setSelected(card); dialog.current?.showModal() }}>
              <strong className="block">{card.en}</strong>
              <span className="mt-1 block text-muted" lang={language}>{card[language]}</span>
            </button>
          </article>
        ))}
        </div>
        {!searching && group.cards.length > 6 && <button type="button"
          className="mt-3 min-h-11 text-sm font-semibold text-canvas-ink"
          aria-expanded={expandedTasks.has(group.task)}
          onClick={() => setExpandedTasks(previous => {
            const next = new Set(previous)
            if (next.has(group.task)) next.delete(group.task)
            else next.add(group.task)
            return next
          })}>{expandedTasks.has(group.task) ? t("Show fewer") : t('Show all {count} phrases', { count: group.cards.length })}</button>}
      </section>)}
      </div>
      <dialog ref={dialog} aria-labelledby="card-text" onClose={() => setSelected(null)} className="m-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-[1.25rem] bg-popover p-5 text-ink backdrop:bg-scrim sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{languageName(language)} · {t('Show this to someone')}</p>
          <form method="dialog"><button className={control} aria-label={t("Close card")}>✕</button></form>
        </div>
        {selected && needsHumanReviewWarning(selected) && (
          <p className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-warning" role="status">{t("High risk · pending human review. Confirm wording with a native speaker before relying on this in an emergency.")}</p>
        )}
        <h2 id="card-text" lang={language} className="my-5 text-3xl font-bold wrap-anywhere sm:text-5xl">{selected?.[language]}</h2>
        <p>{selected?.en}</p>
      </dialog>
    </>
  )
}

function Translate({ cards, engine, from, to, log, incoming }: {
  cards: Phrase[]
  engine: Engine
  from: PhraseLanguage
  to: PhraseLanguage
  log: (entry: LogEntry) => void
  incoming?: { text: string; from: Locale; to: Locale; method: 'text' | 'camera' }
}) {
  const lookup = useMemo(() => buildApprovedIndex(cards), [cards])
  const [outgoing, setOutgoing] = useState<TranslationResult>()
  const [swapped, setSwapped] = useState(incoming?.from === to)
  const source = swapped ? to : from
  const target = swapped ? from : to

  return (
    <div className="mx-auto grid max-w-xl gap-3">
      <TranslationPanel cards={cards} engine={engine} log={log} lookup={lookup}
        initialText={incoming?.text} initialMethod={incoming?.method} from={source} to={target} onSwap={() => { setSwapped(value => !value); setOutgoing(undefined) }} showTitle={false} result={outgoing} onResult={setOutgoing} />
    </div>
  )
}

type PhraseLanguage = Locale

function typePrompt(language: PhraseLanguage) {
  return t({ en: 'Type in English', vi: 'Type in Vietnamese', zh: 'Type in Simplified Chinese' }[language])
}

type TranslationResult = { text: string; source: string; reviewWarning?: boolean }

type ChatTurn = {
  id: string
  speaker: 'near' | 'far'
  from: PhraseLanguage
  to: PhraseLanguage
  original: string
  translation: string
  source: string
  reviewWarning?: boolean
}

async function runPhraseTranslation(options: {
  input: string
  from: PhraseLanguage
  to: PhraseLanguage
  engine: Engine
  lookup: ReturnType<typeof buildApprovedIndex>
  log: (entry: LogEntry) => void
  cards?: readonly Phrase[]
  signal?: AbortSignal
  onStatus?: (message: string) => void
  inputMethod?: 'text' | 'speech' | 'camera'
}): Promise<TranslationResult> {
  const { input, from, to, engine, lookup, log, cards, signal, onStatus } = options
  const start = performance.now()
  const at = new Date().toISOString()
  const id = crypto.randomUUID()
  const model = modelFor(engine, from, to)
  const modelName = model?.id ?? engines[engine]
  let runtime: TranslationMetrics | undefined
  const lookupStart = performance.now()
  const match = lookup(input, from, to)
  const lookupMs = performance.now() - lookupStart

  function record(translation: string | null, label: string, error?: string, matched?: ApprovedMatch) {
    log({
      id, at, runtime, inputMethod: options.inputMethod ?? 'text', original: input, translation, from, to, model: label, error,
      experiment: {
        build: buildFingerprint,
        mode: import.meta.env.DEV ? 'development' : 'production',
        selectedEngine: engine,
        modelRevision: matched ? undefined : model?.revision,
        execution: matched ? approvedLabels[matched.kind] : 'WASM worker',
        changes: buildChanges,
      },
      elapsedMs: Math.round(performance.now() - start),
      lookup: { elapsedMs: lookupMs, kind: matched?.kind ?? 'miss', id: matched?.id, vocabularyId: matched?.vocabularyId },
      check: { status: matched ? 'stored match' : translation ? 'pending' : 'unavailable', errors: [] },
    })
  }

  if (match) {
    const source = approvedLabels[match.kind]
    record(match.text, source, undefined, match)
    const card = match.kind === 'card' ? cards?.find(entry => entry.id === match.id) : undefined
    return { text: match.text, source, reviewWarning: card ? needsHumanReviewWarning(card) : false }
  }

  onStatus?.(t("Preparing translation…"))
  if (!model) {
    record(null, modelName, t("This model does not support the selected language pair."))
    throw new Error(t("This model does not support the selected language pair."))
  }
  try {
    const text = await translateWithModel(model, input, from, to, signal ?? new AbortController().signal, message => onStatus?.(message), value => { runtime = value })
    signal?.throwIfAborted()
    record(text, modelName)
    return { text, source: engine === 'opus' ? 'OPUS-MT' : 'M2M100' }
  } catch (error) {
    const canceled = signal?.aborted
    record(null, modelName, canceled ? t("Translation canceled.") : String(error))
    throw error
  }
}

function VoiceConversation({ near, far, cards, engine, log }: {
  near: PhraseLanguage; far: PhraseLanguage; cards: Phrase[]; engine: Engine; log: (entry: LogEntry) => void
}) {
  const lookup = useMemo(() => buildApprovedIndex(cards), [cards])
  const [style, setStyle] = usePreference<'chat' | 'face'>('conversation-style', 'chat', (value): value is 'chat' | 'face' => value === 'chat' || value === 'face')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [flipped, setFlipped] = useState(false)
  const leftCode = flipped ? near : far, rightCode = flipped ? far : near
  const [pendingFrom, setPendingFrom] = useState<PhraseLanguage>(near)
  const [heard, setHeard] = useState<Partial<Record<PhraseLanguage, string>>>({})
  const [previews, setPreviews] = useState<Partial<Record<PhraseLanguage, string | null>>>({})
  const [voiceBusy, setVoiceBusy] = useState(false), [translating, setTranslating] = useState(false)
  const [status, setStatus] = useState('')
  const request = useRef<AbortController | null>(null), thread = useRef<HTMLDivElement>(null)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { if (style === 'chat' && thread.current) thread.current.scrollTop = thread.current.scrollHeight }, [turns, previews, status, style])
  async function translateTurn(text: string, from: PhraseLanguage) {
    const to = from === near ? far : near
    const controller = new AbortController(); request.current?.abort(); request.current = controller
    setHeard(previous => ({ ...previous, [from]: text })); setPendingFrom(from); setTranslating(true); setStatus('Preparing translation…')
    try {
      const result = await runPhraseTranslation({ input: text, from, to, engine, lookup, log, cards, signal: controller.signal, onStatus: message => { if (!controller.signal.aborted) setStatus(message) }, inputMethod: 'speech' })
      if (controller.signal.aborted) return
      setTurns(previous => [...previous, { id: crypto.randomUUID(), speaker: from === near ? 'near' : 'far', from, to, original: text, translation: result.text, source: result.source, reviewWarning: result.reviewWarning }]); setStatus('')
    } catch (error) { if (!controller.signal.aborted) setStatus(String(error)) }
    finally { if (request.current === controller) { request.current = null; setTranslating(false) } }
  }
  function microphone(code: PhraseLanguage) {
    return <SpeechInput language={code} compact completionMessage="" onPreview={text => setPreviews(previous => ({ ...previous, [code]: text }))}
      disabled={voiceBusy || translating} onBusyChange={setVoiceBusy} onText={text => void translateTurn(text, code)} />
  }
  function copy(text: string) { void navigator.clipboard.writeText(text).then(() => setStatus('Copied'), () => setStatus('Could not copy. Select the translation to copy it.')) }
  return <div className="mx-auto max-w-xl space-y-3">
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-panel p-1" role="tablist" aria-label={t('Conversation style')}>
      {([['chat', 'Chat'], ['face', 'Face to face']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={style === id} disabled={voiceBusy || translating}
        className={`min-h-11 rounded-xl px-3 text-sm font-semibold disabled:opacity-50 ${style === id ? 'bg-accent text-on-accent' : 'text-muted'}`} onClick={() => setStyle(id)}>{t(label)}</button>)}
    </div>
    {style === 'chat' ? <section className="overflow-hidden rounded-3xl bg-paper" aria-label={t('Chat conversation')}>
      <div ref={thread} className="flex h-[min(48svh,28rem)] min-h-56 flex-col gap-4 overflow-y-auto p-3 sm:p-4" aria-label={t('Conversation messages')}>
        {!turns.length && !voiceBusy && !translating && <p className="m-auto px-4 text-center text-sm text-muted">{t('Tap either microphone to start a conversation.')}</p>}
        {turns.map(turn => <article key={turn.id} className={`w-fit max-w-[92%] rounded-3xl p-4 ${turn.from === rightCode ? 'self-end rounded-br-md bg-accent-soft text-ink' : 'self-start rounded-bl-md bg-panel text-ink'}`}>
          <div className="flex items-start justify-between gap-3"><p className="pt-2 text-xs text-muted" lang={turn.from}>{turn.original}</p><ReadAloud text={turn.translation} language={turn.to} /></div>
          <p className="mt-1 wrap-anywhere text-xl font-semibold leading-snug" lang={turn.to}>{turn.translation}</p>
          <p className="mt-2 text-[0.65rem] text-muted">{languageName(turn.from)} → {languageName(turn.to)}</p>
          {turn.reviewWarning && <p className="mt-2 text-xs text-warning">{t('High risk · pending human review')}</p>}
        </article>)}
        {([leftCode, rightCode] as const).map(code => previews[code] != null && <p key={code} className={`max-w-[92%] rounded-2xl bg-panel p-3 text-base text-interim ${code === rightCode ? 'self-end' : 'self-start'}`} lang={code} aria-live="polite">{previews[code] || t('Listening…')}</p>)}
        {translating && <p className="rounded-2xl bg-panel p-3 text-sm text-ink">{heard[pendingFrom]}<span className="mt-1 block text-xs text-muted">{t(status)}</span></p>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 border-t border-line bg-panel p-3">
        {([leftCode, rightCode] as const).map((code, index) => <div key={code} className={index === 0 ? 'col-start-1 row-start-1' : 'col-start-3 row-start-1'}>
          <div className="flex min-w-0 flex-col items-center gap-2 [&>div]:w-full [&>div]:min-w-0 [&>div]:items-center" aria-label={t('Speak in {language}', { language: languageName(code) })}>
            <p className="min-h-8 text-center text-xs font-semibold">{languageName(code)}</p>{microphone(code)}
          </div>
        </div>)}
        <button type="button" aria-label={t('Swap languages')} disabled={voiceBusy || translating} onClick={() => setFlipped(value => !value)} className="col-start-2 row-start-1 mt-10 flex size-11 items-center justify-center rounded-full border border-line bg-paper text-xl text-accent disabled:opacity-50">⇄</button>
      </div>
    </section> : <section className="flex h-[calc(100svh-20rem)] min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-line" aria-label={t('Face-to-face conversation')}>
      {([leftCode, rightCode] as const).map((code, index) => {
        const output = turns.findLast(turn => turn.to === code)
        return <section key={code} className={`flex min-h-0 flex-1 flex-col justify-between gap-2 p-4 ${index === 0 ? 'rotate-180 bg-panel text-ink' : 'bg-accent-soft text-ink'}`} aria-label={languageName(code)}>
          <div className="flex items-center justify-between gap-2"><p className="min-w-0 text-sm font-semibold">{languageName(code)}</p><div className="flex shrink-0 items-center">{output && <><ReadAloud text={output.translation} language={code} /><button type="button" className="min-h-11 px-2 text-xs text-accent" onClick={() => copy(output.translation)}>{t('Copy')}</button></>}</div></div>
          <p className="min-h-0 flex-1 overflow-y-auto wrap-anywhere text-2xl font-semibold leading-snug sm:text-3xl" lang={code}>{output?.translation || t('Translation will appear here')}</p>
          {output?.reviewWarning && <p className="text-xs text-warning">{t('High risk · pending human review')}</p>}
          <div className="flex items-end justify-between gap-3"><p className={`max-h-16 min-w-0 flex-1 overflow-y-auto wrap-anywhere text-sm ${previews[code] != null ? 'text-interim' : 'text-ink'}`} lang={code} aria-live="polite">{previews[code] ?? heard[code] ?? t('Tap to speak')}</p><div className="max-w-36">{microphone(code)}</div></div>
        </section>
      })}
    </section>}
    {status && <p role="status" className="rounded-xl bg-panel p-3 text-center text-xs text-muted">{t(status)}</p>}
    {translating && <button type="button" className={control} onClick={() => { request.current?.abort(); request.current = null; setTranslating(false); setStatus('Translation canceled.') }}>{t('Cancel')}</button>}
  </div>
}

function TranslationPanel({ cards, engine, from, to, log, lookup, showTitle = true, result, onResult, onSwap, initialText, initialMethod }: {
  cards: Phrase[]
  engine: Engine
  from: PhraseLanguage
  to: PhraseLanguage
  log: (entry: LogEntry) => void
  initialText?: string
  initialMethod?: 'text' | 'camera'
  onSwap?: () => void
  showTitle?: boolean
  result?: TranslationResult
  onResult: (result: TranslationResult | undefined) => void
  lookup: ReturnType<typeof buildApprovedIndex>
}) {
  const [draft, setDraft] = useState(initialText ?? '')
  const [inputMethod, setInputMethod] = useState<'text' | 'speech' | 'camera'>(initialMethod ?? 'text')
  const [speechBusy, setSpeechBusy] = useState(false)
  const [speechPreview, setSpeechPreview] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeSuggest, setActiveSuggest] = useState(0)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const headingId = `direction-${from}`
  const inputId = `draft-${from}`
  const suggestionsId = `suggestions-${from}`
  const suggestions = useMemo(() => {
    const ranked = rankSuggestions(draft, cards, from)
    const current = draft.trim()
    return ranked.filter(({ card }) => card[from] !== current)
  }, [draft, cards, from])
  const showSuggestions = suggestOpen && suggestions.length > 0

  useEffect(() => {
    setActiveSuggest(0)
  }, [draft, from])

  async function findTranslation(override?: string) {
    const input = (override ?? draft).trim()
    if (!input || request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    onResult(undefined)
    setStatus(t("Preparing translation…"))
    try {
      const translation = await runPhraseTranslation({
        input, from, to, engine, lookup, log, cards, inputMethod, signal: controller.signal,
        onStatus: message => { if (!controller.signal.aborted) setStatus(message) },
      })
      controller.signal.throwIfAborted()
      onResult(translation)
      setStatus('')
    } catch {
      if (!controller.signal.aborted) setStatus(t("Couldn’t translate. Connect to the internet if the language pack needs downloading, then try again."))
    } finally {
      if (request.current === controller) request.current = null
      setBusy(false)
    }
  }

  function acceptSuggestion(card: Phrase) {
    const text = card[from]
    request.current?.abort()
    request.current = null
    setSuggestOpen(false)
    setDraft(text)
    onResult(undefined)
    setStatus('')
    void findTranslation(text)
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showSuggestions) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggest(index => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggest(index => (index - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const pick = suggestions[activeSuggest]
      if (pick) acceptSuggestion(pick.card)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setSuggestOpen(false)
    }
  }

  const activeOptionId = showSuggestions ? `${suggestionsId}-option-${suggestions[activeSuggest]?.card.id}` : undefined

  return (
    <form className="reference-translator flex min-w-0 flex-col gap-4 text-ink" aria-labelledby={headingId} onSubmit={event => {
      event.preventDefault()
      if (speechBusy) return
      setSuggestOpen(false)
      void findTranslation()
    }}>
      <div className="rounded-[1.5rem] bg-panel p-4 sm:p-5">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <label className="min-w-0 text-xs font-semibold text-accent">{t('Translate from')}
          <select aria-label={t('From')} value={from} disabled={busy || speechBusy} onChange={event => { if (event.target.value !== from) onSwap?.() }} className={control + ' mt-2 w-full min-w-0 bg-panel px-2 text-sm'}>
            {[from, ...(onSwap ? [to] : [])].map(code => <option key={code} value={code}>{code === 'en' ? '🇬🇧' : code === 'vi' ? '🇻🇳' : '🇨🇳'} {languageName(code)}</option>)}
          </select>
        </label>
        <button type="button" disabled={!onSwap || busy || speechBusy} onClick={onSwap} aria-label={t('Swap languages')} className="flex size-12 items-center justify-center rounded-full bg-accent text-2xl text-on-accent disabled:opacity-50">⇄</button>
        <label className="min-w-0 text-xs font-semibold text-accent">{t('Translate to')}
          <select aria-label={t('To')} value={to} disabled={busy || speechBusy} onChange={event => { if (event.target.value !== to) onSwap?.() }} className={control + ' mt-2 w-full min-w-0 bg-panel px-2 text-sm'}>
            {[to, ...(onSwap ? [from] : [])].map(code => <option key={code} value={code}>{code === 'en' ? '🇬🇧' : code === 'vi' ? '🇻🇳' : '🇨🇳'} {languageName(code)}</option>)}
          </select>
        </label>
      </div>
      <h2 id={headingId} className="sr-only">{languageName(from)} → {languageName(to)}</h2>
      {showTitle && <p className="sr-only">{languageName(from)} → {languageName(to)}</p>}
      <label htmlFor={inputId} className="sr-only">{t('Write in {language}', { language: languageName(from) })}</label>
      <div className="rounded-2xl border border-line bg-panel p-3 shadow-sm">
        <textarea id={inputId} lang={from} className={`block min-h-24 w-full resize-none border-0 bg-transparent py-2 text-lg outline-none placeholder:text-muted ${speechPreview !== null ? 'text-interim' : 'text-ink'}`} rows={3}
          disabled={speechBusy} required maxLength={500} placeholder={typePrompt(from)} value={speechPreview ?? draft}
          role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={suggestionsId}
          aria-activedescendant={activeOptionId}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => setSuggestOpen(false)}
          onKeyDown={onDraftKeyDown}
          onChange={event => {
            request.current?.abort()
            request.current = null
            setBusy(false)
            setInputMethod('text')
            setDraft(event.target.value)
            setSuggestOpen(true)
            onResult(undefined)
            setStatus('')
          }} />
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="text-xs text-muted" aria-live="off">{(speechPreview ?? draft).length} / 500</span>
            <div className="flex items-center gap-3">
              <SpeechInput key={from} language={from} onPreview={setSpeechPreview} disabled={busy} onBusyChange={setSpeechBusy} onText={text => {
                setInputMethod('speech'); setDraft(text); onResult(undefined); setStatus(''); setSuggestOpen(false)
              }} />
            </div>
          </div>
        {showSuggestions && (
          <div className="rounded-xl border-t border-line bg-panel text-ink">
            <p className="px-3 pt-2 text-[0.7rem] font-semibold tracking-wide text-muted uppercase">{t("Suggested cards · tap to use")}</p>
            <ul id={suggestionsId} role="listbox" aria-label={t("Suggested phrases")} className="max-h-40 overflow-auto py-1">
              {suggestions.map(({ card }, index) => {
                const optionId = `${suggestionsId}-option-${card.id}`
                const active = index === activeSuggest
                return (
                  <li key={card.id} id={optionId} role="option" aria-selected={active}>
                    <button type="button"
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left ${active ? 'bg-paper-deep' : 'hover:bg-paper'}`}
                      onMouseDown={event => event.preventDefault()}
                      onMouseEnter={() => setActiveSuggest(index)}
                      onClick={() => acceptSuggestion(card)}>
                      <span className="min-w-0 flex-1">
                        <span className="block wrap-anywhere text-sm font-medium" lang={from}>{card[from]}</span>
                        <span className="mt-0.5 block wrap-anywhere text-xs text-muted" lang={to}>{card[to]}</span>
                        {needsHumanReviewWarning(card) && (
                          <span className="mt-1 block text-xs font-semibold text-warning">{t("High risk · pending human review")}</span>
                        )}
                      </span>
                      <span className="shrink-0 pt-0.5 text-xs font-semibold text-accent">{t("Use")}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      </div>
      <div className="relative flex min-h-40 flex-1 flex-col rounded-[1.5rem] bg-panel p-5 text-ink" role="status">
        <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-accent">{t('{language} translation', { language: languageName(to) })}</p>{result && <ReadAloud text={result.text} language={to} />}</div>
        {result ? <>
          <p className="mt-1 wrap-anywhere text-xl font-semibold leading-snug sm:text-2xl" lang={to}>{result.text}</p>
          <p className="mt-2 text-sm text-muted" lang={from}>{draft}</p><p className="mt-1 text-xs text-muted">{result.source}</p>
          {result.reviewWarning && (
            <p className="mt-2 text-xs font-semibold text-warning">{t("High risk · pending human review")}</p>
          )}
        </> : <p className="mt-1 text-sm text-muted">{t("Your translation will appear here.")}</p>}
        {result && <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <button type="button" className="flex min-h-11 items-center justify-center gap-2 text-sm" onClick={() => {
            try {
              saveTranslation({ original: draft, translation: result.text, from, to })
              setStatus(t('Saved'))
            } catch { setStatus(t('Could not save. Browser storage is unavailable.')) }
          }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5"><path d="M6 3h12v19l-6-4-6 4z"/></svg>{t('Save')}</button>
          <button type="button" className="flex min-h-11 items-center justify-center gap-2 text-sm" onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ text: result.text })
              else { await navigator.clipboard.writeText(result.text); setStatus(t('Copied')) }
            } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus(t('Could not share. Try Copy instead.')) }
          }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5"><circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="m8 11 8-5M8 13l8 5"/></svg>{t('Share')}</button>
          <button type="button" className="flex min-h-11 items-center justify-center gap-2 text-sm" onClick={async () => { try { await navigator.clipboard.writeText(result.text); setStatus(t('Copied')) } catch { setStatus(t('Could not copy. Select the translation to copy it.')) } }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5"><rect x="8" y="7" width="12" height="15" rx="2"/><path d="M16 7V2H3v15h5"/></svg>{t('Copy')}</button>
        </div>}
        <div className="mt-auto pt-4">
          <button disabled={busy || speechBusy} onMouseDown={event => event.preventDefault()} className="mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 py-2 text-sm font-bold text-on-accent disabled:opacity-60"><span aria-hidden="true">→</span>{t('Translate')}</button>
          {status && <p role="status" className="mt-3 text-center text-xs text-muted">{t(status)}</p>}

        </div>
      </div>
    </form>
  )
}
