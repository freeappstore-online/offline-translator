import type { Language } from './model-options'
export type PackageItem = { key: string; kind: 'phrases' | 'translation' | 'speech' | 'camera'; title: string; bytes: number; info: string; from?: Language; to?: Language; runtime?: 'onnx' | 'ocr' }
// Verified public pinned-model file metadata and decompressed OCR data, 2026-11-26.
export const sharedRuntimeBytes = { onnx: 14264830, ocr: 6936428 }
export const recommendationVersion = 'starter-v1-provisional'
export function packagesForPair(from: Language, to: Language, phraseBytes: number): PackageItem[] {
  const rows: PackageItem[] = [
    { key: 'phrases', kind: 'phrases', title: 'Travel phrases', bytes: phraseBytes, info: 'Saves the shared card library for offline lookup. Pending cards still require review.' },
    { key: 'multilingual', kind: 'translation', title: 'M2M100', bytes: 639976029, runtime: 'onnx', info: 'One shared translation model covers both directions and all three app languages. This starter choice is provisional, not a proven accuracy winner.' },
    { key: 'speech', kind: 'speech', title: 'Voice input', bytes: 43622127, runtime: 'onnx', info: 'Whisper Tiny turns speech into text locally. Shared across all three languages; live text may be revised. Recognition errors are possible.' },
    ...[...new Set([from, to])].map(code => ({ key: 'ocr-' + code, kind: 'camera' as const, title: 'Camera', bytes: { en: 5199098, vi: 1667949, zh: 2471033 }[code], from: code, runtime: 'ocr' as const, info: 'Recognizes text in photos on this device. Each language needs its own data; the camera runtime is shared.' })),
  ]
  if (from !== 'zh' && to !== 'zh') rows.push(
    { key: 'en-vi', kind: 'translation', title: 'OPUS-MT', bytes: 106645206, from: 'en', to: 'vi', runtime: 'onnx', info: 'A smaller, direction-specific translation model. The reverse direction needs a separate package. Optional alternative; quality must be tested for each direction.' },
    { key: 'vi-en', kind: 'translation', title: 'OPUS-MT', bytes: 106706880, from: 'vi', to: 'en', runtime: 'onnx', info: 'A smaller, direction-specific translation model. The reverse direction needs a separate package. Optional alternative; quality must be tested for each direction.' },
  )
  return rows
}
export function recommendedPackages(from: Language, to: Language) {
  return [...new Set(['phrases', 'multilingual', 'speech', 'ocr-' + from, 'ocr-' + to])]
}
export function estimateSelection(items: PackageItem[], keys: readonly string[], saved: Record<string, boolean>, runtimes: Partial<Record<'onnx' | 'ocr', boolean>> = {}) {
  const selected = items.filter(item => keys.includes(item.key)), required = new Set(selected.flatMap(item => item.runtime ? [item.runtime] : []))
  return {
    total: selected.reduce((sum, item) => sum + item.bytes, 0) + [...required].reduce((sum, key) => sum + sharedRuntimeBytes[key], 0),
    additional: selected.filter(item => !saved[item.key]).reduce((sum, item) => sum + item.bytes, 0) + [...required].filter(key => !runtimes[key]).reduce((sum, key) => sum + sharedRuntimeBytes[key], 0),
  }
}
export function translationForSelection(keys: readonly string[], from: Language, to: Language) {
  if (keys.includes('multilingual')) return { engine: 'multilingual' as const, from, to }
  const forward = from === 'vi' ? 'vi-en' : 'en-vi'
  const key = keys.includes(forward) ? forward : ['en-vi', 'vi-en'].find(key => keys.includes(key))
  return key ? { engine: 'opus' as const, from: (key === 'en-vi' ? 'en' : 'vi') as Language, to: (key === 'en-vi' ? 'vi' : 'en') as Language } : undefined
}
export function formatStorage(bytes: number) { return bytes === 0 ? '0 MB' : (bytes / 1000000).toFixed(bytes < 10000000 ? 1 : 0) + ' MB' }
/** Sequential work, no duplicate downloads, and stop at the first failure/cancel. */
export async function installSelection(keys: readonly string[], signal: AbortSignal, install: (key: string) => Promise<void>) {
  for (const key of new Set(keys)) { signal.throwIfAborted(); await install(key); signal.throwIfAborted() }
}
