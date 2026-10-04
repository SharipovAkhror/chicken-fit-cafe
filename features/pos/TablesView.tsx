'use client'
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRightLeft, Clock3, ShoppingBag, Truck, Users } from 'lucide-react'
import { formatUZS } from '@/domain/money'
import { useRuntime } from '@/features/app/runtime'
import { saveOrder } from './actions'
import { TransferDialog } from './ItemDialogs'
import { isActive, STATUS_LABEL, type Order } from '@/domain/order'
import { baseName } from '@/domain/cart'
import { useTables } from './useData'

const LATE_MIN = 45
const seatsLabel = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'место' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'места' : 'мест'}`
type Tone = 'brand' | 'info' | 'success' | 'accent' | 'muted'
/** Состояние стола: одна точка + подпись. Как в iiko — отдельное состояние «счёт выдан». */
function stateOf(o: Order, billed: boolean): { tone: Tone; label: string } {
  if (billed) return { tone: 'accent', label: 'Счёт выдан' }
  if (o.status === 'ready') return { tone: 'success', label: STATUS_LABEL.ready }
  if (o.status === 'sent' || o.status === 'cooking') return { tone: 'info', label: STATUS_LABEL[o.status] }
  return { tone: 'brand', label: STATUS_LABEL[o.status] }
}
/** Превью заказа (Toast/iiko): первые позиции + «ещё N». */
function preview(os: Order[]): string {
  const items = os.flatMap((o) => o.items)
  if (!items.length) return 'Пустой заказ'
  const names = items.slice(0, 2).map((i) => `${!i.weightKg && i.qty > 1 ? `${i.qty}× ` : ''}${baseName(i)}`)
  return names.join(', ') + (items.length > 2 ? ` и ещё ${items.length - 2}` : '')
}

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
          <h2 className="zone-title">{z}</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {tables.filter((t) => t.zone === z).map((t) => {
              const os = active.filter((o) => o.type === 'dine_in' && o.tableId === t.id)
              const total = os.reduce((s, o) => s + o.total, 0)
              const busy = os.length > 0
              const unpaid = os.some((o) => o.paymentStatus === 'unpaid')
              const first = os[0]
              const check = os.some((o) => prechecks.has(o.id))
              const m = busy ? mins(first.createdAt) : 0
              const st = busy ? stateOf(first, check && unpaid) : null
              return (
                <div key={t.id} className="relative">
                  <button className={`tcard ${busy ? 'is-busy' : 'is-free'}`} data-tone={st?.tone} onClick={() => onOpenTable(t.id)}
                    aria-label={`${t.label}${busy ? `, занят, ${formatUZS(total)} сум` : ', свободен'}`}>
                    <span className="tcard-top">
                      <span className="tcard-num">{t.label.replace('Стол ', '')}</span>
                      {st && <span className="tcard-status"><i className="dot" data-tone={st.tone} />{st.label}</span>}
                    </span>
                    {busy ? <span className="tcard-preview">{preview(os)}</span>
                      : <span className="tcard-preview inline-flex items-center gap-1"><Users size={14} aria-hidden />{seatsLabel(t.seats ?? 4)}</span>}
                    <span className="tcard-foot">
                      {busy ? (
                        <>
                          <span className={`tcard-time${m >= LATE_MIN ? ' is-late' : ''}`}><Clock3 size={14} aria-hidden />{m} мин</span>
                          <span className="tcard-total">{formatUZS(total)}</span>
                        </>
                      ) : <span>Свободен</span>}
                    </span>
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
          <h2 className="zone-title">С собой и доставка</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {others.map((o) => {
              const st = stateOf(o, false)
              return (
                <button key={o.id} className="tcard is-busy" data-tone={st.tone} onClick={() => onOpenOrder(o)}>
                  <span className="tcard-top" style={{ paddingRight: 0 }}>
                    <span className="font-bold inline-flex items-center gap-2">{o.type === 'delivery' ? <Truck size={18} aria-hidden /> : <ShoppingBag size={18} aria-hidden />}№{o.number}</span>
                    <span className="tcard-status"><i className="dot" data-tone={st.tone} />{st.label}</span>
                  </span>
                  <span className="tcard-preview">{preview([o])}</span>
                  <span className="tcard-foot"><span className="tcard-time"><Clock3 size={14} aria-hidden />{mins(o.createdAt)} мин</span><span className="tcard-total">{formatUZS(o.total)}</span></span>
                </button>
              )
            })}
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
