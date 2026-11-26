import { useEffect, useState } from 'react'
import type { Language } from './model-options'
import { t } from './i18n'
export function ReadAloud({ text, language }: { text: string; language: Language }) {
  const [speaking, setSpeaking] = useState(false)
  const [message, setMessage] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => { if (!('speechSynthesis' in window)) return; const sync = () => setVoices(speechSynthesis.getVoices()); sync(); speechSynthesis.addEventListener('voiceschanged', sync); return () => speechSynthesis.removeEventListener('voiceschanged', sync) }, [])
  useEffect(() => () => { if ('speechSynthesis' in window) speechSynthesis.cancel() }, [text, language])
  function speak() {
    if (!('speechSynthesis' in window)) { setMessage('Read aloud is unavailable in this browser.'); return }
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return }
    const candidates = (voices.length ? voices : speechSynthesis.getVoices()).filter(entry => entry.localService && entry.lang.toLowerCase().split('-')[0] === language)
    const voice = candidates.find(entry => language !== 'zh' || /^zh-(cn|sg|hans)/i.test(entry.lang)) ?? candidates[0]
    if (!voice) { setMessage('No local voice for this language. Install a device voice to read aloud offline.'); return }
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = voice.lang
    utterance.onstart = () => setSpeaking(true); utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => { setSpeaking(false); setMessage('Could not read aloud. Please try again.') }
    setMessage(''); speechSynthesis.speak(utterance)
  }
  return <span className="inline-flex flex-col items-end gap-1">
    <button type="button" className="flex size-11 items-center justify-center rounded-full text-accent" onClick={speak} aria-label={t(speaking ? 'Stop audio' : 'Read aloud')}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6"><path d="M3 9h4l5-5v16l-5-5H3zM16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/></svg>
    </button>{message && <span role="status" className="max-w-56 text-xs text-muted">{t(message)}</span>}
  </span>
}
