import { t, languageName, useLocale, setLocale, type Locale } from './i18n'
import { Packs } from './Packs'
import { scenarios, tasks, cardScenarios, cardTask } from './card-scenarios'
import { approvedLabels, buildApprovedIndex, type ApprovedMatch } from './approved-phrases'
import { buildChanges } from './build-changes'
import { buildFingerprint, checkMeaning, exportLog, readLog, writeLog, type LogEntry } from './translation-log'
import { translateWithModel } from './downloaded-translation'
import { engines, modelFor, type Engine } from './model-options'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { initApp } from '@freeappstore/sdk'
import { PageHeader, Shell, type NavItem } from '@freeappstore/sdk/ui'
import { categories, datasetId, languages, loadPhrases, needsHumanReviewWarning, normalize, type Phrase, type TargetLanguage } from './phrases'
import { rankSuggestions } from './suggest-phrases'
import ReviewWorkstation from './ReviewWorkstation'

const fas = initApp({ appId: 'offline-translator' })
const nav: NavItem[] = [
  { label: 'Cards', href: '/', title: 'Offline Translator' },
  { label: 'Translate', href: '/translate', title: 'Translate · Offline Translator' },
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
      : kind === 'cards' ? <><rect x="5" y="3" width="15" height="17" rx="2"/><path d="M2 7v14h14M8 8h9M8 12h7"/></>
      : kind === 'packs' ? <><path d="M4 15v6h16v-6M12 3v12m-5-5 5 5 5-5"/></>
      : kind === 'settings' ? <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M3 4h18v13H9l-5 4v-4H3zM7 8h10M7 12h7"/></>}
  </svg>
}

function openTranslationMode(mode: 'one-way' | 'voice') {
  window.dispatchEvent(new CustomEvent('translator-input-mode', { detail: mode }))
}

export default function App() {
  const uiLocale = useLocale()
  useEffect(() => { document.documentElement.lang = uiLocale === 'zh' ? 'zh-Hans' : uiLocale }, [uiLocale])
  const [path, setPath] = useState(currentPath)
  const [language, setLanguage] = useState<TargetLanguage>('vi')
  const [engine, setEngine] = useState<Engine>('opus')
  const [pair, setPair] = useState<'en' | 'vi'>('en')
  const [cards, setCards] = useState<Phrase[]>([])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [saved, setSaved] = useState(readFavorites)
  const [translateMode, setTranslateMode] = useState<'one-way' | 'chat' | 'voice'>('one-way')
  const [history, setHistory] = useState(readLog)
  const logRef = useRef(history)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    const switchMode = (event: Event) => {
      const mode = (event as CustomEvent<string>).detail
      if (mode === 'one-way' || mode === 'voice') setTranslateMode(mode)
    }
    window.addEventListener('translator-input-mode', switchMode)
    return () => window.removeEventListener('translator-input-mode', switchMode)
  }, [])


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

  const configured = Boolean(datasetId || import.meta.env.DEV)

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

  const title = path === '/translate' ? t("Translate") : path === '/packs' ? t("Language Packs") : path === '/review' ? 'Review workstation' : t("Quick Cards")
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
      <div className="app-workspace mx-auto min-h-screen w-full max-w-2xl px-4 pb-32 pt-4 sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <button type="button" className={control} aria-label={t('Settings')} onClick={openSettings}>☰</button>
          <h1 className="text-center font-sans text-xl font-bold">🌐 Offline <span className="text-accent">Translator</span></h1>
          <span aria-hidden="true" className="size-11" />
        </header>
        <details id="app-preferences" className="mb-4 rounded-2xl bg-panel p-4">
          <summary className="cursor-pointer text-sm font-semibold">{t('Settings')}</summary>
        <label className="mb-4 flex flex-wrap items-center justify-end gap-2 text-sm">
          {t('App language')}
          <select aria-label={t('App language')} value={uiLocale} className={control + ' max-w-full'}
            onChange={event => setLocale(event.target.value as Locale)}>
            {(['en', 'vi', 'zh'] as const).map(code => <option key={code} value={code}>{languageName(code)}</option>)}
          </select>
        </label>
        </details>
        <nav aria-label={t('Main')} className="bottom-navigation">
          {[
            { href: '/translate', label: 'Translate', icon: 'translate' },
            { href: '/', label: 'Cards', icon: 'cards' },
            { href: '/camera', label: 'Camera', icon: 'camera' },
            { href: '/packs', label: 'Packs', icon: 'packs' },
          ].map(item => <a key={item.href} href={item.href} aria-current={path === item.href ? 'page' : undefined}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] font-semibold ${path === item.href ? 'bg-accent-soft text-accent' : 'text-muted'}`}
            onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(item.href) } }}>
            <NavigationIcon kind={item.icon} />{t(item.label)}</a>)}
          <button type="button" className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] font-semibold text-muted"
            onClick={openSettings}><NavigationIcon kind="settings" />{t('Settings')}</button>
        </nav>
        {path !== '/translate' && path !== '/camera' && <PageHeader title={title} />}
        {path !== '/packs' && path !== '/translate' && path !== '/camera' && (
          <label className="mb-4 flex flex-wrap items-center gap-2">{t("Language")}<select className={control} value={language} onChange={event => setLanguage(event.target.value as TargetLanguage)}>
              {Object.keys(languages).map(id => <option key={id} value={id}>{languageName(id as Locale)}</option>)}
            </select>
          </label>
        )}
        {!cards.length && path !== '/translate' && path !== '/packs' && path !== '/camera' && (
          <div className={panel}>
            <p role="status">{!configured ? t("The phrase deck is being set up.") : failed ? t("Couldn’t load phrases. Check your connection and try again.") : t("Loading phrases…")}</p>
            {failed && <button className={control + ' mt-3'} onClick={() => { setFailed(false); setAttempt(attempt + 1) }}>{t("Try again")}</button>}
          </div>
        )}
        {path === '/translate' && (
          <>
            <div className="mx-auto mb-4 grid max-w-xl grid-cols-2 gap-1 rounded-2xl bg-panel p-1" role="tablist" aria-label={t('Translation layout')}>
              {([['one-way', 'Translate'], ['voice', 'Conversation']] as const).map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={translateMode === mode}
                className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${translateMode === mode ? 'bg-accent text-on-accent' : 'text-muted'}`}
                onClick={() => setTranslateMode(mode)}>{t(label)}</button>)}
            </div>
            <details id="translator-menu" className="mx-auto mb-3 max-w-xl rounded-2xl bg-panel px-4 py-2">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold"><span>{t('Translation settings')}</span><span aria-hidden="true">≡</span></summary>
              <div className="pt-2">            <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-paper-deep p-1 sm:max-w-lg" role="tablist" aria-label="Translate mode">
              {([
                ['one-way', t("One way")],
                ['chat', t("Chat")],
              ] as const).map(([id, label]) => {
                const active = translateMode === id
                return (
                  <button key={id} type="button" role="tab" aria-selected={active}
                    className={`flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-semibold ${active ? 'bg-panel text-accent' : 'text-muted hover:text-ink'}`}
                    onClick={() => setTranslateMode(id)}>{label}</button>
                )
              })}
            </div>
            <p className="mb-4 text-sm text-muted">
              {translateMode === 'one-way'
                ? t("Translate in one direction. Swap languages to go the other way.")
                : translateMode === 'chat'
                  ? t("Message-style conversation. English on one side, the other language on the other.")
                  : t('Place the phone between you. Each person uses the microphone facing them.')}
            </p>
            <label className="mb-4 grid min-w-0 gap-1 text-sm font-semibold sm:max-w-md">{t("Languages")}<select className={control + ' w-full bg-panel'} value={engine === 'opus' ? 'en-vi' : pair + '-' + language}
                onChange={event => {
                  const [first, second] = event.target.value.split('-')
                  setPair(first as 'en' | 'vi')
                  setLanguage(second as TargetLanguage)
                }}>
                <option value="en-vi">{languageName('en')} ↔ {languageName('vi')}</option>
                {engine !== 'opus' && <option value="en-zh">{languageName('en')} ↔ {languageName('zh')}</option>}
                {engine === 'multilingual' && <option value="vi-zh">{languageName('vi')} ↔ {languageName('zh')}</option>}
              </select>
            </label>
              </div>
            </details>
            {translateMode !== 'one-way' && <button type="button" className={control + ' mb-3'} onClick={() => { const menu = document.getElementById('translator-menu') as HTMLDetailsElement; menu.open = !menu.open }}>{t('Translation settings')} ≡</button>}
            <Translate mode={translateMode} key={engine + pair + language + translateMode} cards={cards} engine={engine}
              from={engine === 'multilingual' ? pair : 'en'} to={engine === 'opus' ? 'vi' : language} log={logTranslation} />
            <details className="mt-5 rounded-2xl bg-panel px-4 py-1">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
                <span>{t("Translation settings")}</span>
                <span className="text-right text-muted">{engines[engine].split(' · ')[0]} <span aria-hidden="true">⌄</span></span>
              </summary>
              <div className="space-y-3 pb-3">
              <label className="grid min-w-0 gap-1 text-sm font-semibold">{t("Translation model")}<select className={control + ' w-full'} value={engine} onChange={event => {
                  const next = event.target.value as Engine
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
        {path === '/camera' && <section className="rounded-3xl bg-panel p-6 text-center">
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-accent-soft text-accent"><NavigationIcon kind="camera" /></div>
          <h2 className="text-xl font-bold">{t('Camera translation')}</h2>
          <p className="mt-3 text-muted">{t('Coming soon')}</p>
          <p className="mt-3 text-sm text-muted">{t('Camera translation is not connected yet. Your camera is off.')}</p>
        </section>}
        {path === '/packs' && <>
          <Packs cards={cards} />
          <button type="button" className={control + ' mt-4'} disabled={!history.length}
            onClick={() => exportLog(history)}>{t("Export translation JSON")}</button>
        </>}
        {storageError && <p role="status" className="mt-3 text-sm text-muted">{t("Browser storage is full or unavailable. Export translation JSON from Packs before closing this page.")}</p>}
        {!!cards.length && path !== '/translate' && path !== '/packs' && path !== '/camera' &&
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
  const matches = cards.filter(card =>
    (searching || scenario === 'all' || (scenario === 'saved' ? saved.has(card.id) : cardScenarios(card).includes(scenario as keyof typeof scenarios))) &&
    [card.en, card[language]].some(text => normalize(text).includes(normalize(query))),
  )
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
      {searching && <p className="mb-2 text-sm text-muted">{t("Searching all scenarios")}</p>}
      <p className="mb-3 text-sm text-muted" role="status">{matches.length ? t('{count} cards', { count: matches.length }) : t("No matching cards.")}</p>
      <div id="scenario-cards" role="tabpanel" aria-labelledby={'scenario-' + scenario}>
      {groups.map(group => <section key={group.task} className="mb-6">
        <h2 className="mb-3 text-base font-semibold">{t(group.task)}</h2>
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
          className="mt-3 min-h-11 text-sm font-semibold text-accent"
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

function Translate({ cards, engine, from, to, log, mode }: {
  cards: Phrase[]
  engine: Engine
  from: PhraseLanguage
  to: PhraseLanguage
  log: (entry: LogEntry) => void
  mode: 'one-way' | 'chat' | 'voice'
}) {
  const lookup = useMemo(() => buildApprovedIndex(cards), [cards])
  const [outgoing, setOutgoing] = useState<TranslationResult>()
  const [swapped, setSwapped] = useState(false)
  const source = swapped ? to : from
  const target = swapped ? from : to

  if (mode === 'chat') {
    return <ConversationChat cards={cards} engine={engine} near={from} far={to} log={log} lookup={lookup} />
  }
  if (mode === 'voice') {
    return <VoiceConversation near={from} far={to} />
  }

  return (
    <div className="mx-auto grid max-w-xl gap-3">
      <TranslationPanel cards={cards} engine={engine} log={log} lookup={lookup}
        from={source} to={target} onSwap={() => { setSwapped(value => !value); setOutgoing(undefined) }} showTitle={false} result={outgoing} onResult={setOutgoing} />
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
}): Promise<TranslationResult> {
  const { input, from, to, engine, lookup, log, cards, signal, onStatus } = options
  const start = performance.now()
  const at = new Date().toISOString()
  const id = crypto.randomUUID()
  const model = modelFor(engine, from, to)
  const modelName = model?.id ?? engines[engine]
  const lookupStart = performance.now()
  const match = lookup(input, from, to)
  const lookupMs = performance.now() - lookupStart

  function record(translation: string | null, label: string, error?: string, matched?: ApprovedMatch) {
    log({
      id, at, original: input, translation, from, to, model: label, error,
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
    const text = await translateWithModel(model, input, from, to, signal ?? new AbortController().signal, message => onStatus?.(message))
    signal?.throwIfAborted()
    record(text, modelName)
    return { text, source: engine === 'opus' ? 'OPUS-MT' : 'M2M100' }
  } catch (error) {
    const canceled = signal?.aborted
    record(null, modelName, canceled ? t("Translation canceled.") : String(error))
    throw error
  }
}

function useTurnSender(options: {
  cards: Phrase[]
  engine: Engine
  near: PhraseLanguage
  far: PhraseLanguage
  log: (entry: LogEntry) => void
  lookup: ReturnType<typeof buildApprovedIndex>
  onTurn: (turn: ChatTurn) => void
}) {
  const { cards, engine, near, far, log, lookup, onTurn } = options
  const [speaker, setSpeaker] = useState<'near' | 'far'>('near')
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeSuggest, setActiveSuggest] = useState(0)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  const from = speaker === 'near' ? near : far
  const to = speaker === 'near' ? far : near
  const suggestions = useMemo(() => {
    const ranked = rankSuggestions(draft, cards, from)
    const current = draft.trim()
    return ranked.filter(({ card }) => card[from] !== current)
  }, [draft, cards, from])
  const showSuggestions = suggestOpen && suggestions.length > 0

  useEffect(() => {
    setActiveSuggest(0)
  }, [draft, from])

  async function send(override?: string) {
    const input = (override ?? draft).trim()
    if (!input || request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setSuggestOpen(false)
    setStatus(t("Preparing translation…"))
    try {
      const result = await runPhraseTranslation({
        input, from, to, engine, lookup, log, cards, signal: controller.signal,
        onStatus: message => { if (!controller.signal.aborted) setStatus(message) },
      })
      controller.signal.throwIfAborted()
      onTurn({
        id: crypto.randomUUID(),
        speaker,
        from,
        to,
        original: input,
        translation: result.text,
        source: result.source,
        reviewWarning: result.reviewWarning,
      })
      setDraft('')
      setStatus('')
      setSpeaker(speaker === 'near' ? 'far' : 'near')
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
    setStatus('')
    void send(text)
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showSuggestions) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void send()
      }
      return
    }
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

  function toggleSpeaker() {
    setSpeaker(value => value === 'near' ? 'far' : 'near')
    setDraft('')
    setStatus('')
    setSuggestOpen(false)
  }

  function onDraftChange(value: string) {
    request.current?.abort()
    request.current = null
    setBusy(false)
    setDraft(value)
    setSuggestOpen(true)
    setStatus('')
  }

  return {
    speaker, from, to, draft, status, busy, suggestions, showSuggestions, activeSuggest,
    setSuggestOpen, setActiveSuggest, send, acceptSuggestion, onDraftKeyDown, toggleSpeaker, onDraftChange,
  }
}

function ComposerSuggestions({ id, from, to, suggestions, activeSuggest, showSuggestions, onHover, onPick }: {
  id: string
  from: PhraseLanguage
  to: PhraseLanguage
  suggestions: ReturnType<typeof rankSuggestions>
  activeSuggest: number
  showSuggestions: boolean
  onHover: (index: number) => void
  onPick: (card: Phrase) => void
}) {
  if (!showSuggestions) return null
  return (
    <div className="border-t border-line bg-panel">
      <p className="px-3 pt-2 text-[0.7rem] font-semibold tracking-wide text-muted uppercase">{t("Suggested cards · tap to use")}</p>
      <ul id={id} role="listbox" aria-label={t("Suggested phrases")} className="max-h-40 overflow-auto py-1">
        {suggestions.map(({ card }, index) => {
          const optionId = `${id}-option-${card.id}`
          const active = index === activeSuggest
          return (
            <li key={card.id} id={optionId} role="option" aria-selected={active}>
              <button type="button"
                className={`flex w-full items-start gap-2 px-3 py-2 text-left ${active ? 'bg-paper-deep' : 'hover:bg-paper'}`}
                onMouseDown={event => event.preventDefault()}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(card)}>
                <span className="min-w-0 flex-1">
                  <span className="block wrap-anywhere text-sm font-medium" lang={from}>{card[from]}</span>
                  <span className="mt-0.5 block wrap-anywhere text-xs text-muted" lang={to}>{card[to]}</span>
                </span>
                <span className="shrink-0 pt-0.5 text-xs font-semibold text-accent">{t("Use")}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function InputToolbar({ inputId }: { inputId: string }) {
  return <div className="flex items-stretch gap-1 border-t border-line bg-panel p-2" role="group" aria-label={t('Input method')}>
    <button type="button" aria-pressed="true"
      onMouseDown={event => event.preventDefault()}
      onClick={() => document.getElementById(inputId)?.focus()}
      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent-soft px-3 text-sm font-semibold text-accent">
      <span aria-hidden="true" className="text-xl font-bold">T</span>{t('Text')}
    </button>
    {(['Voice'] as string[]).map(method => <button key={method} type="button" disabled={method === 'Camera'} onClick={() => openTranslationMode('voice')}
      className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-muted disabled:cursor-default"
      aria-label={method === 'Voice' ? t('Voice translation') : t(method) + ' · ' + t('Coming soon')}>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5">
          {method === 'Voice' ? <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></>
            : <><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="3"/></>}
        </svg>{t(method)}
      </span>
      <span className="text-[0.6rem]">{method === 'Voice' ? t('Preview') : t('Coming soon')}</span>
    </button>)}
  </div>
}

function ConversationChat({ cards, engine, near, far, log, lookup }: {
  cards: Phrase[]
  engine: Engine
  near: PhraseLanguage
  far: PhraseLanguage
  log: (entry: LogEntry) => void
  lookup: ReturnType<typeof buildApprovedIndex>
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const threadEnd = useRef<HTMLDivElement>(null)
  const composer = useTurnSender({
    cards, engine, near, far, log, lookup,
    onTurn: turn => setTurns(entries => [...entries, turn]),
  })
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'end' })
  }, [turns])

  const inputId = 'chat-draft'
  const suggestionsId = 'chat-suggestions'
  const activeOptionId = composer.showSuggestions
    ? `${suggestionsId}-option-${composer.suggestions[composer.activeSuggest]?.card.id}`
    : undefined

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <section className="flex min-h-72 flex-col gap-2 overflow-y-auto rounded-[1.25rem] border border-line bg-panel p-3 sm:min-h-80" aria-label={t("Chat")}>
        {!turns.length && <p className="m-auto text-center text-sm text-muted">{t("Start the conversation below.")}</p>}
        {turns.map(turn => {
          const nearSide = turn.speaker === 'near'
          return (
            <article key={turn.id} className={`flex max-w-[85%] flex-col gap-1 ${nearSide ? 'self-end items-end' : 'self-start items-start'}`}>
              <p className="text-[0.7rem] font-semibold text-muted">{languageName(turn.from)}</p>
              <div className={`rounded-2xl px-3 py-2 ${nearSide ? 'rounded-br-md bg-accent text-on-accent' : 'rounded-bl-md bg-paper text-ink'}`}>
                <p className="wrap-anywhere text-sm leading-snug" lang={turn.from}>{turn.original}</p>
              </div>
              <div className={`rounded-2xl px-3 py-2 ${nearSide ? 'rounded-br-md bg-secondary-soft text-ink' : 'rounded-bl-md border border-line bg-panel text-ink'}`}>
                <p className="wrap-anywhere text-sm font-semibold leading-snug" lang={turn.to}>{turn.translation}</p>
                <p className="mt-1 text-[0.65rem] text-muted">{turn.source}</p>
                {turn.reviewWarning && (
                  <p className="mt-1 text-[0.65rem] font-semibold text-warning">{t("High risk · pending human review")}</p>
                )}
              </div>
            </article>
          )
        })}
        <div ref={threadEnd} />
      </section>

      <form className="rounded-[1.25rem] bg-panel p-4 sm:p-5" onSubmit={event => {
        event.preventDefault()
        void composer.send()
      }}>
        <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2" aria-label={t("Translation direction")}>
          <label className="min-w-0 text-xs font-semibold text-muted">{t("From")}<select aria-label={t("Chat source language")} value={composer.from} disabled={composer.busy}
              className={control + ' mt-1 w-full min-w-0 px-2 text-sm font-semibold'}
              onChange={event => { if (event.target.value !== composer.from) composer.toggleSpeaker() }}>
              {[near, far].map(code => <option key={code} value={code}>{languageName(code)}</option>)}
            </select>
          </label>
          <div className="relative flex flex-col items-center">
            <button type="button" disabled={composer.busy}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-secondary bg-secondary-soft text-secondary-ink disabled:opacity-50"
              aria-label={t("Reverse translation direction") + `: ${languageName(composer.from)} → ${languageName(composer.to)}`}
              aria-describedby="chat-swap-hint"
              title={t("Reverse translation direction")} onClick={composer.toggleSpeaker}>
              <span aria-hidden="true" className="text-2xl leading-none">→</span>
            </button>
            <span id="chat-swap-hint" className="absolute top-full mt-1 whitespace-nowrap text-[0.65rem] text-muted">{t('Tap to swap')}</span>
          </div>
          <label className="min-w-0 text-xs font-semibold text-muted">{t("To")}<select aria-label={t("Chat target language")} value={composer.to} disabled={composer.busy}
              className={control + ' mt-1 w-full min-w-0 px-2 text-sm font-semibold'}
              onChange={event => { if (event.target.value !== composer.to) composer.toggleSpeaker() }}>
              {[near, far].map(code => <option key={code} value={code}>{languageName(code)}</option>)}
            </select>
          </label>
        </div>
        <label htmlFor={inputId} className="mb-2 block text-sm font-semibold" lang={composer.from}>{typePrompt(composer.from)}</label>
        <div className={`mb-3 overflow-hidden rounded-xl border bg-accent-soft ${composer.showSuggestions ? 'border-line-strong' : 'border-line'}`}>
          <textarea id={inputId} lang={composer.from} className="block w-full resize-y border-0 bg-transparent p-3 text-base text-ink outline-none" rows={2}
            required maxLength={500} placeholder={typePrompt(composer.from)} value={composer.draft}
            role="combobox" aria-autocomplete="list" aria-expanded={composer.showSuggestions} aria-controls={suggestionsId}
            aria-activedescendant={activeOptionId}
            onFocus={() => composer.setSuggestOpen(true)}
            onBlur={() => composer.setSuggestOpen(false)}
            onKeyDown={event => composer.onDraftKeyDown(event)}
            onChange={event => composer.onDraftChange(event.target.value)} />
          <InputToolbar inputId={inputId} />
          <ComposerSuggestions id={suggestionsId} from={composer.from} to={composer.to}
            suggestions={composer.suggestions} activeSuggest={composer.activeSuggest}
            showSuggestions={composer.showSuggestions}
            onHover={composer.setActiveSuggest} onPick={composer.acceptSuggestion} />
        </div>
        <button disabled={composer.busy} className="min-h-11 w-full rounded-full bg-accent px-5 py-2 sm:w-auto font-bold text-on-accent disabled:opacity-60">{t("Send")}</button>
        {composer.status && <p role="status" className="mt-2 text-sm text-muted">{t(composer.status)}</p>}
      </form>
    </div>
  )
}

function VoiceConversation({ near, far }: { near: PhraseLanguage; far: PhraseLanguage }) {
  const [selected, setSelected] = useState<PhraseLanguage>()
  return <div className="mx-auto max-w-xl">
    <div className="mb-4 flex items-center justify-between gap-3">
      <button type="button" className={control + ' text-sm'} onClick={() => openTranslationMode('one-way')}>← {t('Text')}</button>
      <h2 className="text-base font-semibold">{t('Conversation')}</h2>
    </div>
    <p className="mb-1 text-center text-sm text-muted">{t('Face-to-face layout')}</p><p className="mb-3 text-center text-xs text-muted">{t('Voice preview · microphone is off')}</p>
    <div className="overflow-hidden rounded-[1.75rem] border border-line bg-panel">
      {([far, near] as const).map((code, index) => <section key={index}
        className={`flex min-h-64 flex-col items-center justify-between gap-4 px-5 py-6 ${index === 0 ? 'rotate-180 bg-accent text-on-accent' : 'bg-panel text-ink'}`}
        aria-label={languageName(code)}>
        <p className="text-sm font-semibold">{languageName(code)}</p>
        <div className="flex min-h-16 flex-col items-center justify-center gap-2 text-center">
          <p className="text-xl font-semibold">{t('Translation will appear here')}</p>
          <p className={`text-xs ${index === 0 ? 'text-on-accent/75' : 'text-muted'}`}>{t('For you to read')}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button type="button" aria-label={t('Speak in {language}', { language: languageName(code) })}
            aria-describedby={`voice-preview-${index}`}
            onClick={() => setSelected(code)}
            className={`flex size-16 items-center justify-center rounded-full border-2 ${index === 0 ? 'border-on-accent/40 bg-on-accent text-accent' : 'border-secondary bg-secondary-soft text-secondary-ink'}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-7"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg>
          </button>
          <p className="text-xs font-semibold">{t('Tap to speak')}</p>
          <p id={`voice-preview-${index}`} className={`text-[0.65rem] ${index === 0 ? 'text-on-accent/75' : 'text-muted'}`}>{t('Coming soon')}</p>
          {selected === code && <p role="status" className="max-w-64 text-center text-xs">{t('Voice translation is not connected yet. No audio is being recorded.')}</p>}
        </div>
      </section>)}
    </div>
    <p className="mt-3 text-center text-xs text-muted">{t('Place the phone between you. Each person uses the microphone facing them.')}</p>
  </div>
}

function TranslationPanel({ cards, engine, from, to, log, lookup, showTitle = true, result, onResult, onSwap }: {
  cards: Phrase[]
  engine: Engine
  from: PhraseLanguage
  to: PhraseLanguage
  log: (entry: LogEntry) => void
  onSwap?: () => void
  showTitle?: boolean
  result?: TranslationResult
  onResult: (result: TranslationResult | undefined) => void
  lookup: ReturnType<typeof buildApprovedIndex>
}) {
  const [draft, setDraft] = useState('')
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
        input, from, to, engine, lookup, log, cards, signal: controller.signal,
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
      setSuggestOpen(false)
      void findTranslation()
    }}>
      <div className="rounded-[1.5rem] bg-panel p-4 sm:p-5">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <label className="min-w-0 text-xs font-semibold text-accent">{t('Translate from')}
          <select aria-label={t('From')} value={from} disabled={busy} onChange={event => { if (event.target.value !== from) onSwap?.() }} className={control + ' mt-2 w-full min-w-0 bg-panel px-2 text-sm'}>
            {[from, ...(onSwap ? [to] : [])].map(code => <option key={code} value={code}>{code === 'en' ? '🇬🇧' : code === 'vi' ? '🇻🇳' : '🇨🇳'} {languageName(code)}</option>)}
          </select>
        </label>
        <button type="button" disabled={!onSwap || busy} onClick={onSwap} aria-label={t('Swap languages')} className="flex size-12 items-center justify-center rounded-full bg-accent text-2xl text-on-accent disabled:opacity-50">⇄</button>
        <label className="min-w-0 text-xs font-semibold text-accent">{t('Translate to')}
          <select aria-label={t('To')} value={to} disabled={busy} onChange={event => { if (event.target.value !== to) onSwap?.() }} className={control + ' mt-2 w-full min-w-0 bg-panel px-2 text-sm'}>
            {[to, ...(onSwap ? [from] : [])].map(code => <option key={code} value={code}>{code === 'en' ? '🇬🇧' : code === 'vi' ? '🇻🇳' : '🇨🇳'} {languageName(code)}</option>)}
          </select>
        </label>
      </div>
      <h2 id={headingId} className="sr-only">{languageName(from)} → {languageName(to)}</h2>
      {showTitle && <p className="sr-only">{languageName(from)} → {languageName(to)}</p>}
      <label htmlFor={inputId} className="sr-only">{t('Write in {language}', { language: languageName(from) })}</label>
      <div className="rounded-2xl border border-line bg-panel p-3 shadow-sm">
        <textarea id={inputId} lang={from} className="block min-h-36 w-full resize-none border-0 bg-transparent py-2 text-lg text-ink outline-none placeholder:text-muted" rows={4}
          required maxLength={500} placeholder={typePrompt(from)} value={draft}
          role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={suggestionsId}
          aria-activedescendant={activeOptionId}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => setSuggestOpen(false)}
          onKeyDown={onDraftKeyDown}
          onChange={event => {
            request.current?.abort()
            request.current = null
            setBusy(false)
            setDraft(event.target.value)
            setSuggestOpen(true)
            onResult(undefined)
            setStatus('')
          }} />
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="text-xs text-muted" aria-live="off">{draft.length} / 500</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => document.getElementById(inputId)?.focus()} className={control} aria-label={t('Text')}><span aria-hidden="true">⌨</span></button>
              <button type="button" onClick={() => setStatus(t('Voice input is coming soon. Your microphone is off. Type here to translate for now.'))} aria-label={t('Voice translation')} className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-7"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg>
              </button>
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
      <div className="relative flex min-h-48 flex-1 flex-col rounded-[1.5rem] bg-panel p-5 text-ink" role="status">
        <p className="text-sm font-semibold text-accent">{t('{language} translation', { language: languageName(to) })}</p>
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
              const key = 'offline-translator-saved-results-v1'
              const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
              const saved = Array.isArray(parsed) ? parsed : []
              localStorage.setItem(key, JSON.stringify([{ original: draft, translation: result.text, from, to, timestamp: new Date().toISOString() }, ...saved].slice(0, 500)))
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
        <div className="mt-auto pt-6">
          <button disabled={busy} onMouseDown={event => event.preventDefault()} className="mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 py-2 text-sm font-bold text-on-accent disabled:opacity-60"><span aria-hidden="true">→</span>{t('Translate')}</button>
          {status && <p role="status" className="mt-3 text-center text-xs text-muted">{t(status)}</p>}
        </div>
      </div>
    </form>
  )
}
