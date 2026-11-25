import type { Language } from './model-options'

declare const __TRANSLATOR_BUILD__: string

export const buildFingerprint = __TRANSLATOR_BUILD__

const key = 'offline-translator-history-v1'

export type MeaningCheck = {
  status: 'pending' | 'card match' | 'stored match' | 'review' | 'no issue detected' | 'unavailable' | 'direct checks only'
  errors: string[]
  backTranslation?: string
  note?: string
}

export type LogEntry = {
  id: string
  at: string
  experiment?: {
    build: string
    mode: 'development' | 'production'
    selectedEngine: string
    modelRevision?: string
    execution: 'phrase card' | 'Phrase card' | 'Vocabulary' | 'Phrase pattern' | 'browser API' | 'WASM worker'
    changes: string
  }
  lookup?: { elapsedMs: number; kind: string; id?: string; vocabularyId?: string }
  original: string
  translation: string | null
  from: Language
  to: Language
  model: string
  elapsedMs: number
  error?: string
  check: MeaningCheck
}

export function readLog(): LogEntry[] {
  try {
    const entries = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(entries) ? entries.map((entry: LogEntry) => entry.check.status === 'pending' ? { ...entry, check: { status: 'unavailable', errors: ['Meaning check was interrupted.'] } } : entry) : []
  } catch {
    return []
  }
}

export function writeLog(entries: LogEntry[]) {
  localStorage.setItem(key, JSON.stringify(entries))
}

const currencies = {
  VND: /₫|\b(?:vnd|dong)\b|đồng|越南盾/iu,
  USD: /\$|\b(?:usd|dollars?)\b|美元|đô la/iu,
  EUR: /€|\b(?:eur|euros?)\b|欧元|歐元/iu,
}

const negation = {
  en: /\b(?:no|not|never|without)\b|n['’]t\b/iu,
  vi: /không|chưa|chẳng|đừng/iu,
  zh: /不|没|沒|无|無|别|別|未/u,
}

function checkDetails(original: string, translated: string, from: Language, to: Language) {
  const errors: string[] = []
  const normalized = translated.normalize('NFKC').toUpperCase()
  for (const code of new Set(original.normalize('NFKC').match(/\b[A-Z]+\d+[A-Z0-9]*\b/gu))) {
    if (!normalized.includes(code)) errors.push(`Identifier may be missing or changed: ${code}.`)
  }
  const sourceCurrencies = Object.entries(currencies).filter(([, pattern]) => pattern.test(original)).map(([code]) => code)
  const targetCurrencies = Object.entries(currencies).filter(([, pattern]) => pattern.test(translated)).map(([code]) => code)
  if (sourceCurrencies.length && sourceCurrencies.join() !== targetCurrencies.join()) {
    errors.push(`Currency may have changed: ${sourceCurrencies.join(', ')} → ${targetCurrencies.join(', ') || 'unrecognized'}.`)
  }
  const sourceTime = original.match(/\b(\d{1,2}):(\d{2})\b/u)
  if (sourceTime) {
    const clock = new RegExp(`(?:^|[^0-9])0?${Number(sourceTime[1])}\\s*(?::|h|giờ|点|點)\\s*${sourceTime[2]}(?![0-9])`, 'iu')
    if (!clock.test(translated)) errors.push(`Time may be missing or changed: ${sourceTime[0]}.`)
  }
  const evening = /\b(?:tonight|evening|p\.?m\.?)\b|tối|晚上|晚间/iu
  const morning = /\b(?:morning|a\.?m\.?)\b|buổi sáng|上午|早上/iu
  if ((evening.test(original) && morning.test(translated)) || (morning.test(original) && evening.test(translated))) {
    errors.push('Time of day may have changed between morning and evening.')
  }
  if (negation[from].test(original) !== negation[to].test(translated)) errors.push('Negation or question wording may have changed.')
  return errors
}

export function checkMeaning(entry: LogEntry): MeaningCheck {
  if (!entry.translation) return { status: 'unavailable', errors: [] }
  const errors = checkDetails(entry.original, entry.translation, entry.from, entry.to)
  return { status: errors.length ? 'review' : 'direct checks only', errors }
}

export function exportLog(entries: LogEntry[]) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'translation-history.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
