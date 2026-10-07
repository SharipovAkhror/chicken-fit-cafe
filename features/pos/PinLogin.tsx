'use client'
import { Delete } from 'lucide-react'
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
    <main className="login">
      <section className="login-brand" aria-hidden>
        <img src="/logo-mark.svg" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
        <div className="login-brand-name">Chicken<span>Fit</span></div>
        <div className="login-brand-sub">Касса кафе · Самарканд</div>
      </section>
      <div className="login-card panel w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h1 className="text-2xl font-bold">Вход</h1>
          <SyncBadge />
        </div>
        <p className="muted mb-5">Введите PIN сотрудника</p>
        <div className="pin-dots mb-5" aria-label={`Введено ${pin.length} цифр`}>
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => <i key={i} data-on={i < pin.length || undefined} />)}
        </div>
        {err && <div className="banner banner-danger mb-3" role="alert">{err}</div>}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map((k) => (
            <button key={k} className={`btn numkey${k === 'OK' ? ' btn-primary' : ''}`} disabled={busy || (k === 'OK' && pin.length < 4)} onClick={() => press(k)} aria-label={k === '⌫' ? 'Стереть' : undefined}>
              {k === 'OK' ? (busy ? '…' : 'Войти') : k === '⌫' ? <Delete size={24} /> : k}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
