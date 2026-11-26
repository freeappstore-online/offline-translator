import { useState } from 'react'
import { LanguagePicker } from './LanguagePicker'
import { recommendTemplates, templateFields, renderTemplate, type CardTemplate, type TemplateReference } from './card-templates'
import type { Language } from './model-options'
import { t } from './i18n'
export function TemplateBuilder({ onApply, onCancel, initialText = '' }: { initialText?: string; onApply: (text: string, source: Language, reference?: TemplateReference) => void; onCancel: () => void }) {
  const [query, setQuery] = useState(initialText)
  const [source, setSource] = useState<Language>('en'), [selected, setSelected] = useState<CardTemplate>(), [values, setValues] = useState<Record<string, string>>({})
  let preview = '', error = ''
  if (selected) { try { preview = renderTemplate(selected, source, values) } catch (issue) { error = (issue as Error).message } }
  const button = 'min-h-11 rounded-full px-4 py-2 text-sm font-semibold'
  return <section className="space-y-4 rounded-2xl border border-line p-3 sm:p-4" aria-label={t('Create card')}>
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{t('Create card')}</h3><button type="button" className={button + ' text-muted'} onClick={onCancel}>{t('Cancel')}</button></div>
    <LanguagePicker label="Original language" disabled={false} value={source} onChange={code => { setSource(code); setValues({}) }} />
    {!selected && <><label className="block text-sm font-semibold">{t('What would you like to say?')}<textarea autoFocus maxLength={500} lang={source} className="mt-2 min-h-24 w-full rounded-xl border border-line bg-paper p-3 text-base text-ink" placeholder={t('Type a phrase or full sentence')} value={query} onChange={event => setQuery(event.target.value)} /></label><p className="text-xs text-muted">{t('Choose a suggested structure, or continue with your own sentence.')}</p><h4 className="text-sm font-semibold">{t('Recommended structures')}</h4></>}
    {!selected ? <><div className="divide-y divide-line overflow-hidden rounded-xl border border-line">{recommendTemplates(query, source).map(template => <button key={template.id} type="button" className="flex min-h-16 w-full items-center justify-between gap-3 bg-paper p-3 text-left text-sm hover:bg-accent-soft" onClick={() => { setSelected(template); setValues({}) }}><span><span className="mb-1 block text-xs text-muted">{t(template.title)}</span>{template.wording[source].split(/(\{\w+\})/g).map((part, index) => /^\{/.test(part) ? <mark key={index} className="mx-0.5 inline-block rounded-md bg-secondary-soft px-1.5 py-1 text-xs text-secondary-ink">{t(templateFields[part.slice(1, -1)].label)}</mark> : <span key={index}>{part}</span>)}</span><span aria-hidden="true">›</span></button>)}</div>
      {!recommendTemplates(query, source).length && <p role="status" className="text-sm text-muted">{t('No matching structure. You can still create this sentence.')}</p>}
      <button type="button" disabled={!query.trim()} className={button + ' bg-accent text-on-accent disabled:opacity-50'} onClick={() => onApply(query.trim(), source)}>{t('Use my full sentence')}</button>
    </> : <>
      <button type="button" className="min-h-11 text-sm text-accent underline" onClick={() => setSelected(undefined)}>← {t('Back to my sentence')}</button>
      <h4 className="font-semibold">{t(selected.title)}</h4>
      {selected.fields.map(id => <label key={id} className="block text-sm font-semibold">{t(templateFields[id].label)}<input type="text" dir="auto" autoComplete="off" maxLength={120} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper p-3 text-base text-ink" value={values[id] ?? ''} onChange={event => setValues(previous => ({ ...previous, [id]: event.target.value }))} />{templateFields[id].kind === 'date' && <span className="mt-1 block text-xs font-normal text-muted">{t('Write the month in words to avoid ambiguous dates.')}</span>}</label>)}
      {selected.id === 'allergy' && <p className="rounded-xl bg-warning/15 p-3 text-xs text-warning">{t('Allergy wording needs careful review. A template does not verify medical translations.')}</p>}
      <div className="rounded-xl bg-paper p-3"><p className="text-xs text-muted">{t('Completed phrase')}</p><p className="mt-2 wrap-anywhere" lang={source}>{preview || t(error)}</p></div>
      <p className="text-xs text-muted">{t('Check names, numbers and dates in the translation. AI may change them; nothing is marked reviewed automatically.')}</p>
      <button type="button" disabled={!preview} className={button + ' bg-accent text-on-accent disabled:opacity-50'} onClick={() => onApply(preview, source, { id: selected.id, revision: selected.revision, source, values: Object.fromEntries(selected.fields.map(id => [id, values[id].trim()])) })}>{t('Continue to translations')}</button>
    </>}
  </section>
}
