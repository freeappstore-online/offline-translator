import { useEffect, useState } from 'react'
export function usePreference<T>(key: string, fallback: T, valid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => { try { const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null'); return valid(parsed) ? parsed : fallback } catch { return fallback } })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Use a session preference. */ } }, [key, value])
  return [value, setValue] as const
}
