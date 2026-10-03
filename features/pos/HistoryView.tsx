'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Printer } from 'lucide-react'
import { businessDate, PAYMENT_LABEL, STATUS_LABEL, TYPE_LABEL, type Order } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { useRuntime } from '@/features/app/runtime'
import { printJob } from './print'
import { useTables } from './useData'

const today = () => businessDate(new Date().toISOString())

/** Заказы за день: поиск по номеру, повторная печать чека, открытие заказа. */
export function HistoryView({ onOpen }: { onOpen: (o: Order) => void }) {
  const { db } = useRuntime()
  const tables = useTables()
  const [day, setDay] = useState(today())
  const [q, setQ] = useState('')
  const orders = useLiveQuery(async () => {
    const from = new Date(Date.parse(`${day}T00:00:00+05:00`)).toISOString()
    const to = new Date(Date.parse(`${day}T00:00:00+05:00`) + 86400_000).toISOString()
    return (await db.orders.where('createdAt').between(from, to).toArray()).filter((o) => o.number).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [db, day]) ?? []
  const list = orders.filter((o) => !q || o.number.includes(q))
  const label = (o: Order) => (o.type === 'dine_in' ? tables.find((t) => t.id === o.tableId)?.label ?? `Стол ${o.tableId ?? '?'}` : TYPE_LABEL[o.type])
  return (
    <div className="p-4 grid gap-3">
      <div className="flex gap-2 flex-wrap">
        <input type="date" className="input" style={{ width: 170 }} value={day} onChange={(e) => setDay(e.target.value)} aria-label="День" />
        <input className="input" style={{ width: 200 }} inputMode="numeric" placeholder="Номер заказа" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted self-center">Заказов: {list.length} · оплачено {formatUZS(list.filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))} сум</span>
      </div>
      <div className="panel overflow-auto">
        <table className="data">
          <thead><tr><th>№</th><th>Время</th><th>Где</th><th>Статус</th><th>Оплата</th><th className="num">Сумма</th><th /></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} onClick={() => onOpen(o)} style={{ cursor: 'pointer', opacity: o.status === 'cancelled' ? 0.5 : 1 }}>
                <td className="font-bold">{o.number}</td>
                <td>{new Date(o.createdAt).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Samarkand', hour: '2-digit', minute: '2-digit' })}</td>
                <td>{label(o)}</td>
                <td>{STATUS_LABEL[o.status]}{o.dataQuality?.length ? ' · из старой версии' : ''}</td>
                <td>{o.paymentStatus === 'paid' ? (o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] : 'оплачен') : 'не оплачен'}</td>
                <td className="num">{formatUZS(o.total)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {o.paymentStatus === 'paid' && <button className="btn" aria-label={`Печать чека ${o.number}`} onClick={() => printJob({ kind: 'receipt', order: o, tableLabel: label(o) })}><Printer size={18} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="muted p-4">Нет заказов</p>}
      </div>
    </div>
  )
}
