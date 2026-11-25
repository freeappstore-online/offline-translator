import { useId, useState } from 'react'
import type { Language } from './model-options'

export const languageLabels = {
  en: { name: 'English', translatedName: 'English', flag: '🇬🇧', lang: 'en' },
  vi: { name: 'Tiếng Việt', translatedName: 'Vietnamese', flag: '🇻🇳', lang: 'vi' },
  zh: { name: '简体中文', translatedName: 'Chinese (Simplified)', flag: '🇨🇳', lang: 'zh-Hans' },
}

const codes = Object.keys(languageLabels) as Language[]
const searchable = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()

export function LanguagePicker({ label, value, disabled, onChange }: {
  label: string
  value: Language
  disabled: boolean
  onChange: (value: Language) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const selected = languageLabels[value]
  const options = codes.filter(code => searchable([code, languageLabels[code].name, languageLabels[code].translatedName].join(' ')).includes(searchable(query.trim())))
  const display = selected.name === selected.translatedName ? selected.name : selected.name + ' · ' + selected.translatedName

  function choose(code: Language) {
    onChange(code)
    setOpen(false)
  }

  return <div className="relative min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <label className="mb-2 block text-sm font-semibold" htmlFor={id}>{label}</label>
    <div className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-panel px-3 focus-within:outline-2 focus-within:outline-accent">
      <span aria-hidden="true" className="text-xl">{selected.flag}</span>
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={id + '-list'} aria-activedescendant={open && options[highlight] ? id + '-' + options[highlight] : undefined}
        disabled={disabled} value={open ? query : display} placeholder="Search languages"
        className="min-h-12 w-full min-w-0 bg-transparent text-base text-ink outline-none disabled:opacity-50"
        onFocus={() => { setOpen(true); setQuery(''); setHighlight(0) }}
        onClick={() => { if (!open) { setOpen(true); setQuery(''); setHighlight(0) } }}
        onChange={event => { setQuery(event.target.value); setOpen(true); setHighlight(0) }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
          if (event.key === 'Enter' && open) {
            event.preventDefault()
            if (options[highlight]) choose(options[highlight])
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) { setOpen(true); setQuery(''); setHighlight(0); return }
            setHighlight(index => options.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : 0)
          }
        }} />
      <span aria-hidden="true">⌄</span>
    </div>
    {open && <div id={id + '-list'} role="listbox" aria-label={label}
      className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-popover p-1">
      {options.map((code, index) => {
        const language = languageLabels[code]
        return <div key={code} id={id + '-' + code} role="option" aria-selected={code === value}
          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${highlight === index ? 'bg-accent-soft' : ''}`}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setHighlight(index)}
          onClick={() => choose(code)}>
          <span aria-hidden="true" className="text-xl">{language.flag}</span>
          <span><span className="block font-semibold" lang={language.lang}>{language.name}</span>
            {language.name !== language.translatedName && <span className="text-muted">{language.translatedName}</span>}
          </span>
          {code === value && <span aria-hidden="true" className="ml-auto">✓</span>}
        </div>
      })}
      {!options.length && <p className="px-3 py-3 text-sm text-muted" role="status">No matching languages</p>}
    </div>}
  </div>
}
