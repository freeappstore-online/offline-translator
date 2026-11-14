import { translateWithModel } from './downloaded-translation'
import { engines, modelFor, type Engine } from './model-options'
import { translateOnDevice } from './machine-translation'
import { useEffect, useRef, useState } from 'react'
import { initApp } from '@freeappstore/sdk'
import { PageHeader, Shell, type NavItem } from '@freeappstore/sdk/ui'
import { categories, datasetId, languages, loadPhrases, normalize, type Phrase, type TargetLanguage } from './phrases'

const fas = initApp({ appId: 'offline-translator' })
const nav: NavItem[] = [
  { label: 'Cards', href: '/', title: 'Offline Translator' },
  { label: 'Translate', href: '/translate', title: 'Translate · Offline Translator' },
  { label: 'Packs', href: '/packs', title: 'Packs · Offline Translator' },
]
const storageKey = 'wayword-saved-v1'
const control = 'rounded-xl border border-line bg-panel px-3 py-2 text-ink'
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

export default function App() {
  const [path, setPath] = useState(currentPath)
  const [language, setLanguage] = useState<TargetLanguage>('vi')
  const [engine, setEngine] = useState<Engine>('browser')
  const [pair, setPair] = useState<'en' | 'vi'>('en')
  const [cards, setCards] = useState<Phrase[]>([])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [saved, setSaved] = useState(readFavorites)
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
    history.pushState(null, '', href)
    setPath(href)
  }

  const title = path === '/translate' ? 'Translate' : path === '/packs' ? 'Language Packs' : 'Quick Cards'
  return (
    <Shell app={fas} appName="Offline Translator" nav={nav} onNavigate={navigate}>
      <div className="mx-auto max-w-5xl px-3 pb-8 sm:px-6">
        <PageHeader title={title} />
        {path !== '/packs' && path !== '/translate' && (
          <label className="mb-4 flex flex-wrap items-center gap-2">
            Language
            <select className={control} value={language} onChange={event => setLanguage(event.target.value as TargetLanguage)}>
              {Object.entries(languages).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
        )}
        {!cards.length && path !== '/translate' && path !== '/packs' && (
          <div className={panel}>
            <p role="status">{!configured ? 'The phrase deck is being set up.' : failed ? 'Couldn’t load phrases. Check your connection and try again.' : 'Loading phrases…'}</p>
            {failed && <button className={control + ' mt-3'} onClick={() => { setFailed(false); setAttempt(attempt + 1) }}>Try again</button>}
          </div>
        )}
        {path === '/translate' && (
          <>
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="grid gap-1">
                Translation model
                <select className={control} value={engine} onChange={event => {
                  const next = event.target.value as Engine
                  setEngine(next)
                  if (next !== 'multilingual') setPair('en')
                }}>
                  {Object.entries(engines).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                Conversation languages
                <select className={control} value={engine === 'opus' ? 'en-vi' : pair + '-' + language}
                  onChange={event => {
                    const [first, second] = event.target.value.split('-')
                    setPair(first as 'en' | 'vi')
                    setLanguage(second as TargetLanguage)
                  }}>
                  <option value="en-vi">English ↔ Vietnamese</option>
                  {engine !== 'opus' && <option value="en-zh">English ↔ Simplified Chinese</option>}
                  {engine === 'multilingual' && <option value="vi-zh">Vietnamese ↔ Simplified Chinese</option>}
                </select>
              </label>
            </div>
            {engine !== 'browser' && <p className="mb-4 text-sm text-muted">
              Experimental model. First use downloads {engine === 'opus' ? 'about 107 MB per direction' : 'about 640 MB for all directions'} plus the shared runtime.
              Your text is translated on this device. Exact phrase matches use the loaded deck first.
            </p>}
            <Translate key={engine + pair + language} cards={cards} engine={engine}
              from={engine === 'multilingual' ? pair : 'en'} to={engine === 'opus' ? 'vi' : language} />
          </>
        )}
        {path === '/packs' && (
          <section className={panel}>
            <p>The phrase deck loads over the internet when you open the app.</p>
            <p className="mt-3">To download a model, choose it in Translate and translate a phrase outside the deck while online.</p>
            <p className="mt-2">OPUS-MT downloads each direction separately. M2M100 shares one model across all six directions.</p>
            <ul className="mt-3 space-y-2">
              {Object.values(languages).map(name => <li key={name}>English ↔ {name} · {cards.length} cards</li>)}
            </ul>
          </section>
        )}
        {!!cards.length && path !== '/translate' && path !== '/packs' &&
          <Cards cards={cards} language={language} saved={saved} onFavorite={toggleFavorite} />}
        <a className="mt-8 inline-block text-sm text-muted underline" href="https://freeappstore.online/">FreeAppStore</a>
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
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<Phrase | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const matches = cards.filter(card =>
    (category === 'all' || category === card.category || (category === 'saved' && saved.has(card.id))) &&
    [card.en, card[language]].some(text => normalize(text).includes(normalize(query))),
  )

  return (
    <>
      <label className="sr-only" htmlFor="search">Search phrases</label>
      <input id="search" type="search" className={control + ' w-full'} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search in either language" />
      <fieldset className="my-4 flex flex-wrap gap-2">
        <legend className="sr-only">Category</legend>
        {[['all', 'All phrases'], ...Object.entries(categories), ['saved', 'Saved']].map(([id, name]) => (
          <label key={id} className="cursor-pointer">
            <input className="peer sr-only" type="radio" name="category" checked={category === id} onChange={() => setCategory(id)} />
            <span className="inline-block rounded-full border border-line bg-panel px-3 py-2 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-focus-visible:outline-2">{name}</span>
          </label>
        ))}
      </fieldset>
      <p className="mb-3 text-sm text-muted" role="status">{matches.length ? `${matches.length} ${matches.length === 1 ? 'card' : 'cards'}` : 'No matching cards.'}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map(card => (
          <article key={card.id} className={panel}>
            <div className="mb-3 flex items-center justify-between gap-2 text-sm text-muted">
              {categories[card.category]}
              <button className={control} type="button" aria-label={`Save card: ${card.en}`} aria-pressed={saved.has(card.id)} onClick={() => onFavorite(card.id)}>
                {saved.has(card.id) ? '★' : '☆'}
              </button>
            </div>
            <button type="button" className="w-full text-left hover:underline" onClick={() => { setSelected(card); dialog.current?.showModal() }}>
              <strong className="block">{card.en}</strong>
              <span className="mt-1 block text-muted" lang={language}>{card[language]}</span>
            </button>
          </article>
        ))}
      </div>
      <dialog ref={dialog} aria-labelledby="card-text" onClose={() => setSelected(null)} className="m-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-[1.25rem] bg-popover p-5 text-ink backdrop:bg-scrim sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{languages[language]} · Show this to someone</p>
          <form method="dialog"><button className={control} aria-label="Close card">✕</button></form>
        </div>
        <h2 id="card-text" lang={language} className="my-5 text-3xl font-bold wrap-anywhere sm:text-5xl">{selected?.[language]}</h2>
        <p>{selected?.en}</p>
      </dialog>
    </>
  )
}

function Translate({ cards, engine, from, to }: { cards: Phrase[]; engine: Engine; from: PhraseLanguage; to: PhraseLanguage }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TranslationPanel cards={cards} engine={engine} from={from} to={to} />
      <TranslationPanel cards={cards} engine={engine} from={to} to={from} />
    </div>
  )
}

const languageNames = { en: 'English', ...languages }
type PhraseLanguage = keyof typeof languageNames

function TranslationPanel({ cards, engine, from, to }: {
  cards: Phrase[]
  engine: Engine
  from: PhraseLanguage
  to: PhraseLanguage
}) {
  const [draft, setDraft] = useState('')
  const [result, setResult] = useState<{ text: string; source: string }>()
  const [status, setStatus] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const example = cards.find(card => card.id === 'train') ?? cards[0]
  const headingId = `direction-${from}`
  const inputId = `draft-${from}`

  async function findTranslation() {
    const input = draft.trim()
    if (!input || request.current) return

    const matchKey = (value: string) => value.normalize('NFC').trim().toLowerCase().replace(/[‘’]/g, "'")
      .replace(/[.!?。！？]+$/, '').trimEnd()
    const card = cards.find(card => matchKey(card[from]) === matchKey(input))
    if (card) {
      setResult({ text: card[to], source: 'Phrase card' })
      setStatus('')
      return
    }

    const controller = new AbortController()
    request.current = controller
    setResult(undefined)
    setStatus('Preparing translation…')
    try {
      const report = (message: string) => {
        if (!controller.signal.aborted) setStatus(message)
      }
      const model = modelFor(engine, from, to)
      const text = model
        ? await translateWithModel(model, input, from, to, controller.signal, report)
        : await translateOnDevice(input, { sourceLanguage: from, targetLanguage: to }, controller.signal, report)
      if (controller.signal.aborted) return
      if (text) setResult({ text, source: engine === 'browser' ? 'Browser translation' : engine === 'opus' ? 'OPUS-MT translation' : 'M2M100 translation' })
      setStatus(text ? '' : 'No exact card match. On-device translation is unavailable for this browser or language pair.')
    } catch {
      if (!controller.signal.aborted) setStatus('Couldn’t translate. Connect to the internet if the language pack needs downloading, then try again.')
    } finally {
      if (request.current === controller) request.current = null
    }
  }

  return (
    <form className={panel + ' flex min-w-0 flex-col'} aria-labelledby={headingId} onSubmit={event => {
      event.preventDefault()
      findTranslation()
    }}>
      <h2 id={headingId} className="mb-3 text-lg font-bold">{languageNames[from]} → {languageNames[to]}</h2>
      <label htmlFor={inputId} className="text-sm font-semibold">Type in {languageNames[from]}</label>
      <textarea id={inputId} lang={from} className={control + ' mb-3 mt-1 block w-full resize-y'} rows={3}
        required maxLength={500} placeholder={example?.[from]} value={draft}
        onChange={event => {
          request.current?.abort()
          request.current = null
          setDraft(event.target.value)
          setResult(undefined)
          setStatus('')
        }} />
      <button disabled={Boolean(request.current)} className="self-start rounded-xl bg-accent px-4 py-2 font-bold text-on-accent disabled:opacity-60">Translate</button>
      <div className="mt-4 flex-1 rounded-xl bg-accent-soft p-3">
        <p className="text-sm font-semibold">{result?.source ?? `${languageNames[to]} translation`}</p>
        <p className={`mt-1 min-h-7 wrap-anywhere ${result ? 'text-lg font-semibold' : 'text-sm text-muted'}`}
          role="status" lang={result ? to : 'en'}>
          {result?.text || status || 'Your translation will appear here.'}
        </p>
      </div>
    </form>
  )
}
