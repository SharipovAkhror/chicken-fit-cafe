'use client'
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRightLeft, ShoppingBag, Truck } from 'lucide-react'
import { formatUZS } from '@/domain/money'
import { useRuntime } from '@/features/app/runtime'
import { saveOrder } from './actions'
import { TransferDialog } from './ItemDialogs'
import { isActive, STATUS_LABEL, type Order } from '@/domain/order'
import { Money } from './common'
import { useTables } from './useData'

export function TablesView({ orders, onOpenTable, onNew, onOpenOrder }: {
  orders: Order[]; onOpenTable: (tableId: string) => void; onNew: (type: 'takeaway' | 'delivery') => void; onOpenOrder: (o: Order) => void
}) {
  const { db } = useRuntime()
  const tables = useTables()
  const active = orders.filter(isActive)
  const [moving, setMoving] = useState<Order | null>(null)
  const prechecks = new Set((useLiveQuery(() => db.kv.where('key').startsWith('precheck:').primaryKeys(), [db]) ?? []).map((k) => String(k).slice(9)))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const mins = (iso: string) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))
  const busyIds = new Set(active.filter((o) => o.type === 'dine_in' && o.tableId).map((o) => o.tableId as string))
  const zones = [...new Set(tables.map((t) => t.zone))]
  const others = active.filter((o) => o.type !== 'dine_in' || !o.tableId)
  return (
    <div className="p-4 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 560 }}>
        <button className="btn btn-lg" onClick={() => onNew('takeaway')}><ShoppingBag size={20} />С собой</button>
        <button className="btn btn-lg" onClick={() => onNew('delivery')}><Truck size={20} />Доставка</button>
      </div>
      {zones.map((z) => (
        <section key={z}>
          <h2 className="font-bold mb-2 muted">{z}</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {tables.filter((t) => t.zone === z).map((t) => {
              const os = active.filter((o) => o.type === 'dine_in' && o.tableId === t.id)
              const total = os.reduce((s, o) => s + o.total, 0)
              const busy = os.length > 0
              const unpaid = os.some((o) => o.paymentStatus === 'unpaid')
              const first = os[0]
              const check = os.some((o) => prechecks.has(o.id))
              const count = os.reduce((s, o) => s + o.items.reduce((n, i) => n + (i.weightKg ? 1 : i.qty), 0), 0)
              return (
                <div key={t.id} className="relative">
                  <button className="tile w-full" style={{ minHeight: 128, borderWidth: busy ? 2 : 1, borderColor: busy ? (unpaid ? 'var(--brand)' : 'var(--success)') : 'var(--border)', borderStyle: busy ? 'solid' : 'dashed' }}
                    onClick={() => onOpenTable(t.id)} aria-label={`${t.label}${busy ? `, занят, ${formatUZS(total)} сум` : ', свободен'}`}>
                    <span>
                      <span className="text-2xl font-bold block" style={{ paddingRight: busy ? 40 : 0 }}>{t.label.replace('Стол ', '')}</span>
                      <span className="text-sm muted">{busy ? `${first.number ? (/^\d/.test(first.number) ? `№${first.number} · ` : `${first.number} · `) : ''}${mins(first.createdAt)} мин` : `${t.seats ?? 4} места`}</span>
                    </span>
                    {busy ? (
                      <span className="w-full">
                        <span className="block text-sm font-semibold" style={{ color: unpaid ? 'var(--primary-ink)' : 'var(--success)' }}>
                          {check && unpaid ? 'Счёт выдан' : unpaid ? STATUS_LABEL[first.status] : `Оплачен · ${STATUS_LABEL[first.status]}`}
                        </span>
                        <span className="flex justify-between items-baseline"><span className="muted text-sm">{count} поз.</span><Money v={total} className="font-bold" /></span>
                      </span>
                    ) : <span className="muted text-sm">Свободен</span>}
                  </button>
                  {busy && unpaid && first.number && (
                    <button className="btn btn-ghost tcard-act" aria-label={`Перенести счёт ${t.label}`} title="Перенести на другой стол" onClick={() => setMoving(first)}>
                      <ArrowRightLeft size={18} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      {others.length > 0 && (
        <section>
          <h2 className="font-bold mb-2 muted">С собой и доставка</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {others.map((o) => (
              <button key={o.id} className="tile" onClick={() => onOpenOrder(o)}>
                <span className="font-bold">№{o.number} · {o.type === 'delivery' ? 'Доставка' : 'С собой'}</span>
                <span className="text-sm">{o.paymentStatus === 'unpaid' ? 'Не оплачен' : 'Оплачен'} · {STATUS_LABEL[o.status]}</span>
                <Money v={o.total} className="font-bold" />
              </button>
            ))}
          </div>
        </section>
      )}
      {moving?.tableId && (
        <TransferDialog from={moving.tableId} tables={tables} busy={busyIds} onClose={() => setMoving(null)}
          onPick={async (id) => { const o = moving; setMoving(null); await saveOrder(db, { ...o, tableId: id }) }} />
      )}
    </div>
  )
}
