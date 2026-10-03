'use client'
import { ShoppingBag, Truck } from 'lucide-react'
import { isActive, STATUS_LABEL, type Order } from '@/domain/order'
import { Money } from './common'
import { useTables } from './useData'

export function TablesView({ orders, onOpenTable, onNew, onOpenOrder }: {
  orders: Order[]; onOpenTable: (tableId: string) => void; onNew: (type: 'takeaway' | 'delivery') => void; onOpenOrder: (o: Order) => void
}) {
  const tables = useTables()
  const active = orders.filter(isActive)
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
              return (
                <button key={t.id} className="tile" style={{ minHeight: 120, borderWidth: busy ? 2 : 1, borderColor: busy ? (unpaid ? 'var(--brand)' : 'var(--success)') : 'var(--border)' }}
                  onClick={() => onOpenTable(t.id)} aria-label={`${t.label}${busy ? ', занят' : ', свободен'}`}>
                  <span className="text-2xl font-bold">{t.label.replace('Стол ', '')}</span>
                  {busy ? (
                    <span>
                      <span className="block text-sm" style={{ color: unpaid ? 'var(--primary-ink)' : 'var(--success)' }}>
                        {unpaid ? 'Не оплачен' : 'Оплачен'} · {STATUS_LABEL[os[0].status]}
                      </span>
                      <Money v={total} className="font-bold" />
                    </span>
                  ) : <span className="muted text-sm">Свободен</span>}
                </button>
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
    </div>
  )
}
