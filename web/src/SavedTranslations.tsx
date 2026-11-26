import { useEffect, useState } from 'react'
import { languageName, t } from './i18n'
import { ReadAloud } from './ReadAloud'
import { readSavedTranslations, savedEvent, writeSavedTranslations, type SavedTranslation } from './saved-translations'
import type { Language } from './model-options'
export function SavedTranslations({ onUse }: { onUse: (text: string, from: Language, to: Language) => void }) {
  const [entries, setEntries] = useState(readSavedTranslations), [query, setQuery] = useState(''), [removed, setRemoved] = useState<SavedTranslation>(), [error, setError] = useState('')
  useEffect(() => { const sync = () => setEntries(readSavedTranslations()); window.addEventListener(savedEvent, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(savedEvent, sync); window.removeEventListener('storage', sync) } }, [])
  const matches = entries.filter(entry => (entry.original + ' ' + entry.translation).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  return <section className="mb-6 space-y-3 rounded-3xl bg-panel p-4">
    <h2 className="text-base font-semibold">{t('Saved translations')}</h2>
    <input className="min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm" type="search" placeholder={t('Search saved translations')} aria-label={t('Search saved translations')} value={query} onChange={event => setQuery(event.target.value)} />
    {!matches.length && <p className="text-sm text-muted">{t('No saved translations yet. Save a result from Translate.')}</p>}
    {removed && <p role="status" className="text-sm">{t('Removed')} <button className="min-h-11 font-semibold text-accent underline" type="button" onClick={() => { try { writeSavedTranslations([removed, ...readSavedTranslations()]); setRemoved(undefined) } catch { setError('Could not save. Browser storage is unavailable.') } }}>{t('Undo')}</button></p>}
    {error && <p role="status" className="text-xs text-danger">{t(error)}</p>}
    {matches.map(entry => <article key={entry.id} className="rounded-2xl border border-line p-3">
      <div className="flex justify-between gap-2"><p className="text-xs text-muted">{languageName(entry.from)} → {languageName(entry.to)}</p><ReadAloud text={entry.translation} language={entry.to} /></div>
      <p className="text-sm" lang={entry.from}>{entry.original}</p><p className="mt-2 font-semibold" lang={entry.to}>{entry.translation}</p>
      <div className="mt-2 flex flex-wrap gap-3"><button type="button" className="min-h-11 text-sm font-semibold text-accent" onClick={() => onUse(entry.original, entry.from, entry.to)}>{t('Use in Translate')}</button><button type="button" className="min-h-11 text-sm text-muted" onClick={() => { try { writeSavedTranslations(entries.filter(item => item.id !== entry.id)); setRemoved(entry) } catch { setError('Could not save. Browser storage is unavailable.') } }}>{t('Remove')}</button></div>
    </article>)}
  </section>
}
