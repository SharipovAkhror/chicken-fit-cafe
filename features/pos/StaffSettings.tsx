'use client'
/** Настройки: название этого устройства (все) и смена PIN сотрудников (только админ). PIN не сохраняется на устройстве. */
import { useEffect, useState } from 'react'
import { KeyRound, Smartphone } from 'lucide-react'
import { useRuntime } from '@/features/app/runtime'
import { PIN_ERR, adminSetPin, adminStaff, defaultDeviceLabel, setDeviceLabel, storeDeviceLabel, storedDeviceLabel, type StaffRow } from '@/data/staff-admin'

const ROLE: Record<string, string> = { admin: 'Администратор', cashier: 'Кассир', kitchen: 'Кухня' }

export function DeviceNameSection() {
  const { session } = useRuntime()
  const [label, setLabel] = useState(() => storedDeviceLabel() ?? defaultDeviceLabel(session?.staff.name ?? ''))
  const [msg, setMsg] = useState<string | null>(null)
  const save = async () => {
    const v = label.trim().slice(0, 40)
    if (!v || !session) return
    storeDeviceLabel(v)
    try {
      const r = await setDeviceLabel(session.token, v)
      setMsg('ok' in r ? 'Сохранено' : 'Не удалось сохранить на сервере')
    } catch { setMsg('Сохранено на устройстве, на сервер отправится при следующем входе') }
  }
  return (
    <section className="panel p-4 grid gap-3" aria-labelledby="s-device">
      <h2 id="s-device" className="section-title"><Smartphone size={20} aria-hidden />Это устройство</h2>
      <label className="grid gap-1">
        <span className="field-label">Название (видно на заказах: кто и откуда)</span>
        <input className="input input-lg" maxLength={40} value={label} onChange={(e) => { setLabel(e.target.value); setMsg(null) }} />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn btn-lg" onClick={() => void save()}>Сохранить название</button>
        {msg && <span className="muted text-sm" role="status">{msg}</span>}
      </div>
    </section>
  )
}

export function PinAdminSection() {
  const { session } = useRuntime()
  const [staff, setStaff] = useState<StaffRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const token = session?.token
  useEffect(() => {
    if (!token) return
    let alive = true
    adminStaff(token).then((r) => { if (alive) { if ('staff' in r) setStaff(r.staff); else setErr(PIN_ERR[r.error] ?? r.error) } })
      .catch(() => { if (alive) setErr('Нет связи с сервером или обновление ещё не установлено') })
    return () => { alive = false }
  }, [token])
  const submit = async (id: string) => {
    if (!token) return
    if (!/^\d{4,8}$/.test(pin)) return setMsg(PIN_ERR.bad_pin)
    if (pin !== pin2) return setMsg('PIN не совпадает')
    setBusy(true)
    try {
      const r = await adminSetPin(token, id, pin)
      if ('ok' in r) {
        setMsg('PIN изменён. Старый PIN больше не действует.')
        setEditing(null)
        setStaff((s) => s?.map((x) => (x.id === id ? { ...x, pin_changed_at: new Date().toISOString() } : x)) ?? s)
      } else setMsg(PIN_ERR[r.error] ?? r.error)
    } catch { setMsg('Нет связи с сервером') } finally { setBusy(false); setPin(''); setPin2('') }
  }
  return (
    <section className="panel p-4 grid gap-3" aria-labelledby="s-pins">
      <h2 id="s-pins" className="section-title"><KeyRound size={20} aria-hidden />PIN сотрудников</h2>
      {err && <div className="banner banner-warn">{err}</div>}
      {msg && <div className="banner banner-info" role="status">{msg}</div>}
      {staff?.map((s) => (
        <div key={s.id} className="grid gap-2">
          <div className="setting-row">
            <span><b>{s.name}</b><span className="muted text-sm block">{ROLE[s.role] ?? s.role}{s.pin_changed_at ? ` · PIN изменён ${new Date(s.pin_changed_at).toLocaleDateString('ru-RU')}` : ''}</span></span>
            <button className="btn" onClick={() => { setEditing(editing === s.id ? null : s.id); setPin(''); setPin2(''); setMsg(null) }}>{editing === s.id ? 'Отмена' : 'Сменить PIN'}</button>
          </div>
          {editing === s.id && (
            <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void submit(s.id) }}>
              <input className="input input-lg" type="password" inputMode="numeric" autoComplete="new-password" aria-label={`Новый PIN для ${s.name}`} placeholder="Новый PIN" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              <input className="input input-lg" type="password" inputMode="numeric" autoComplete="new-password" aria-label="Повторите PIN" placeholder="Повторите" maxLength={8} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
              <button className="btn btn-lg btn-primary" disabled={busy}>Сохранить PIN</button>
            </form>
          )}
        </div>
      ))}
      <p className="muted text-sm">PIN хранится на сервере только в виде хеша. Сотрудник с новым PIN войдёт при следующем входе; текущие сеансы не прерываются.</p>
    </section>
  )
}
