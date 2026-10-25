'use client'
/**
 * Ненавязчивое сообщение для касс: «скоро обновление» (из /api/pos-notice) и «Обновление готово» —
 * когда на сервере уже другая сборка. Не блокирует работу, можно скрыть.
 */
import { useEffect, useState } from 'react'
import { X, RefreshCw } from 'lucide-react'

type Notice = { kind: string; text: string } | null
const OWN = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'

export function UpdateBanner() {
  const [notice, setNotice] = useState<Notice>(null)
  const [ready, setReady] = useState(false)
  const [hidden, setHidden] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const r = await fetch('/api/pos-notice', { cache: 'no-store' })
        if (!r.ok) return
        const j = (await r.json()) as { build: string; notice: Notice }
        if (!alive) return
        setNotice(j.notice)
        setReady(OWN !== 'dev' && j.build !== 'dev' && j.build !== OWN)
      } catch { /* нет сети — молчим */ }
    }
    void check()
    const t = setInterval(check, 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  const showReload = ready || notice?.kind === 'ready'
  const key = ready ? 'ready' : notice?.text ?? ''
  if (!key || hidden === key) return null
  return (
    <div className="update-banner banner banner-info" role="status">
      <span>{ready ? 'Обновление готово. Когда будет пауза — обновите страницу.' : notice!.text}</span>
      {showReload && <button className="btn" onClick={() => location.reload()}><RefreshCw size={16} aria-hidden />Обновить</button>}
      <button className="btn btn-ghost" aria-label="Скрыть" onClick={() => setHidden(key)}><X size={16} /></button>
    </div>
  )
}
