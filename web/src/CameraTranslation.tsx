import { useEffect, useRef, useState } from 'react'
import type { Language } from './model-options'
import { LanguagePicker } from './LanguagePicker'
import { recognizeImage, releaseOcr } from './ocr-engine'
import { t } from './i18n'
import { logOcr } from './ocr-log'
const control = 'min-h-11 rounded-xl border border-line bg-paper px-3 py-2 text-sm'
export function CameraTranslation({ onUse }: { onUse: (text: string, from: Language, to: Language) => void }) {
  const [from, setFrom] = useState<Language>('en'), [to, setTo] = useState<Language>('vi')
  const [image, setImage] = useState(''), [text, setText] = useState(''), [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState<number>()
  const request = useRef<AbortController | null>(null), input = useRef<HTMLInputElement>(null), photo = useRef<HTMLInputElement>(null)
  const run = useRef(0)
  useEffect(() => () => { run.current++; request.current?.abort(); void releaseOcr() }, [])
  async function choose(file?: File) {
    if (!file) return
    request.current?.abort(); const id = ++run.current
    if (!/^image\//.test(file.type) || file.size > 20 * 1024 * 1024) { setStatus('Choose an image smaller than 20 MB.'); return }
    setText(''); setStatus(''); setBusy(true)
    try {
      const url = URL.createObjectURL(file)
      try {
        const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Could not read this image. Try JPG or PNG.')); img.src = url })
        const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas')
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not prepare the image.')
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        if (run.current === id) setImage(canvas.toDataURL('image/png'))
      } finally { URL.revokeObjectURL(url) }
    } catch (error) { if (run.current === id) setStatus(String(error)) }
    finally { if (run.current === id) setBusy(false) }
  }
  async function recognize() {
    const id = ++run.current, controller = new AbortController(); request.current = controller
    setBusy(true); setStatus('Preparing camera recognition…'); setProgress(undefined)
    const timer = window.setTimeout(() => controller.abort(), 180000)
    try {
      const result = await recognizeImage(image, from, controller.signal, (message, value) => { if (run.current === id) { setStatus(message); setProgress(value) } })
      if (run.current !== id) return
      setText(result.text); setStatus('Check the recognized text before translating.')
      logOcr({ from, text: result.text, confidence: result.confidence, preparationMs: result.preparationMs, inferenceMs: result.inferenceMs })
    } catch (error) { if (run.current === id) { setStatus(controller.signal.aborted ? 'Camera recognition canceled.' : String(error)); logOcr({ from, error: String(error) }) } }
    finally { clearTimeout(timer); if (run.current === id) { request.current = null; setBusy(false); setProgress(undefined) } }
  }
  return <section className="mx-auto max-w-xl space-y-4 rounded-3xl bg-panel p-4 sm:p-5">
    <h2 className="text-xl font-bold">{t('Camera translation')}</h2>
    <div className="grid gap-3 sm:grid-cols-2"><LanguagePicker label="Translate from" value={from} disabled={busy} onChange={value => { setFrom(value); if (value === to) setTo(from) }} /><LanguagePicker label="Translate to" value={to} disabled={busy} onChange={value => { setTo(value); if (value === from) setFrom(to) }} /></div>
    <p className="text-xs text-muted">{t('Images stay on this device. Download the camera language once while online.')}</p>
    <input ref={input} className="hidden" tabIndex={-1} type="file" accept="image/*" aria-label={t('Choose photo')} onChange={event => { void choose(event.target.files?.[0]); event.target.value = '' }} />
    <input ref={photo} className="hidden" tabIndex={-1} type="file" accept="image/*" capture="environment" aria-label={t('Take photo')} onChange={event => { void choose(event.target.files?.[0]); event.target.value = '' }} />
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={control} onClick={() => photo.current?.click()}>{t('Take photo')}</button><button type="button" disabled={busy} className={control} onClick={() => input.current?.click()}>{t('Choose photo')}</button></div>
    {image && <img className="max-h-72 w-full rounded-2xl object-contain" src={image} alt={t('Selected image')} />}
    {image && <button type="button" disabled={busy} className="min-h-11 rounded-full bg-accent px-5 font-semibold text-on-accent disabled:opacity-50" onClick={() => void recognize()}>{t('Read text')}</button>}
    {busy && <button type="button" className={control} onClick={() => { request.current?.abort(); void releaseOcr() }}>{t('Cancel')}</button>}
    {status && <p role="status" className="text-xs text-muted">{t(status)}{progress !== undefined ? ` ${progress}%` : ''}</p>}
    {text && <><label className="block text-sm font-semibold" htmlFor="camera-result">{t('Recognized text')}</label><textarea id="camera-result" className={control + ' min-h-32 w-full'} lang={from} value={text} onChange={event => setText(event.target.value)} /><button type="button" disabled={busy || !text.trim()} className="min-h-11 rounded-full bg-accent px-5 font-semibold text-on-accent" onClick={() => onUse(text, from, to)}>{t('Use in Translate')}</button>{text.length > 500 && <p className="text-xs text-warning">{t('Only the first 500 characters will be sent. Edit the text to choose another section.')}</p>}</>}
  </section>
}
