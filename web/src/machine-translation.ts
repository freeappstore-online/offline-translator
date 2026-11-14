type LanguagePair = { sourceLanguage: string; targetLanguage: string }

type BrowserTranslator = {
  availability(pair: LanguagePair): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>
  create(options: LanguagePair & {
    signal: AbortSignal
    monitor(monitor: EventTarget): void
  }): Promise<{
    translate(input: string, options: { signal: AbortSignal }): Promise<string>
    destroy(): void
  }>
}

export async function translateOnDevice(
  input: string,
  pair: LanguagePair,
  signal: AbortSignal,
  report: (status: string) => void,
): Promise<string | undefined> {
  const engine = (window as Window & { Translator?: BrowserTranslator }).Translator
  if (!engine || await engine.availability(pair) === 'unavailable') return
  signal.throwIfAborted()
  const translator = await engine.create({
    ...pair,
    signal,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', event => {
        const percent = Math.round((event as ProgressEvent).loaded * 100)
        report(percent >= 100 ? 'Preparing translation…' : `Downloading language pack… ${percent}%`)
      })
    },
  })
  try {
    report('Translating…')
    const result = (await translator.translate(input, { signal })).trim()
    if (!result) throw new Error('Empty translation')
    return result
  } finally {
    translator.destroy()
  }
}
