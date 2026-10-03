'use client'
import { useState } from 'react'
import { useRuntime } from '@/features/app/runtime'
import { SyncBadge } from './common'

export function PinLogin() {
  const { login } = useRuntime()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (p = pin) => {
    if (p.length < 4 || busy) return
    setBusy(true)
    const e = await login(p)
    setBusy(false)
    setErr(e)
    if (e) setPin('')
  }
  const press = (k: string) => {
    setErr(null)
    if (k === '⌫') setPin((p) => p.slice(0, -1))
    else if (k === 'OK') void submit()
    else if (pin.length < 8) setPin(pin + k)
  }
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="panel w-full" style={{ maxWidth: 380, padding: 24 }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Chicken Fit</h1>
          <SyncBadge />
        </div>
        <p className="muted mb-4">Введите PIN сотрудника</p>
        <div className="flex justify-center gap-3 mb-4" aria-label={`Введено ${pin.length} цифр`}>
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
            <span key={i} style={{ width: 16, height: 16, borderRadius: 8, border: '2px solid var(--border-strong)', background: i < pin.length ? 'var(--text)' : 'transparent' }} />
          ))}
        </div>
        {err && <div className="banner banner-danger mb-3" role="alert">{err}</div>}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map((k) => (
            <button key={k} className={`btn numkey${k === 'OK' ? ' btn-primary' : ''}`} disabled={busy || (k === 'OK' && pin.length < 4)} onClick={() => press(k)}>
              {k === 'OK' ? (busy ? '…' : 'Войти') : k}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
