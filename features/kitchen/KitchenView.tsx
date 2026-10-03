'use client'
import { useEffect, useState } from 'react'
import { isKitchenVisible, TYPE_LABEL, type Order } from '@/domain/order'
import { useRuntime } from '@/features/app/runtime'
import { setStatus } from '@/features/pos/actions'
import { useActiveOrders, useTables } from '@/features/pos/useData'

const mins = (iso: string, now: number) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))

export function KitchenView() {
  const { db } = useRuntime()
  const orders = useActiveOrders()
  const tables = useTables()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])
  const list = (orders ?? []).filter((o) => isKitchenVisible(o) && o.items.some((i) => i.isKitchen)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const next: Record<string, Order['status']> = { sent: 'cooking', cooking: 'ready', ready: 'served' }
  const label: Record<string, string> = { sent: 'Начать', cooking: 'Готово', ready: 'Выдано' }
  if (!list.length) return <div className="p-8 text-center muted text-xl">Нет заказов на кухне</div>
  return (
    <div className="p-3 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {list.map((o) => {
        const m = mins(o.createdAt, now)
        const late = m >= 15
        return (
          <article key={o.id} className="panel p-3 flex flex-col gap-2" style={{ borderWidth: 2, borderColor: o.status === 'ready' ? 'var(--success)' : late ? 'var(--danger)' : 'var(--border)' }}>
            <header className="flex justify-between items-baseline">
              <span className="text-xl font-bold">№{o.number}</span>
              <span className="font-bold" style={{ color: late ? 'var(--danger)' : 'var(--muted)' }}>{m} мин</span>
            </header>
            <div className="text-sm muted">{o.type === 'dine_in' ? tables.find((t) => t.id === o.tableId)?.label ?? `Стол ${o.tableId}` : TYPE_LABEL[o.type]}{o.paymentStatus === 'paid' ? ' · оплачен' : ''}</div>
            <ul className="flex-1">
              {o.items.filter((i) => i.isKitchen).map((i, idx) => (
                <li key={idx} className="py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-lg font-bold">{i.qty} × {i.name}</span>
                  {i.garnishMix?.length ? <div className="text-sm">микс: {i.garnishMix.map((g) => `${g.ingredient} ${g.percent}%`).join(', ')}</div> : null}
                  {i.notes && <div className="font-bold" style={{ color: 'var(--accent)' }}>! {i.notes}</div>}
                </li>
              ))}
            </ul>
            <button className={`btn btn-lg${o.status === 'cooking' ? ' btn-primary' : ''}`} onClick={() => setStatus(db, o, next[o.status])}>{label[o.status]}</button>
          </article>
        )
      })}
    </div>
  )
}
