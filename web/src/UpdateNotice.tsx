import { useEffect, useState } from 'react'
import { t } from './i18n'
export function UpdateNotice() {
  const [available, setAvailable] = useState(false), [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const connection = () => setOffline(!navigator.onLine)
    window.addEventListener('online', connection); window.addEventListener('offline', connection)
    const controlled = Boolean(navigator.serviceWorker?.controller)
    const changed = () => { if (controlled) setAvailable(true) }
    navigator.serviceWorker?.addEventListener('controllerchange', changed)
    const check = () => { if (navigator.onLine) void navigator.serviceWorker?.getRegistration().then(registration => registration?.update()).catch(() => {}) }
    check(); const interval = window.setInterval(check, 5 * 60 * 1000)
    return () => { clearInterval(interval); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); navigator.serviceWorker?.removeEventListener('controllerchange', changed) }
  }, [])
  if (!available && !offline) return null
  return <aside className="mb-3 rounded-2xl bg-panel p-3 text-sm text-ink" role="status">
    {offline && <p>{t('Offline · saved resources are available. New downloads need internet.')}</p>}
    {available && <p>{t('A new app version is ready. Reload when you finish your current task.')} <button type="button" className="min-h-11 font-semibold text-accent underline" onClick={() => location.reload()}>{t('Reload app')}</button></p>}
  </aside>
}
