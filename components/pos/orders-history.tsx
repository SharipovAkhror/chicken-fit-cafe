'use client'

import type { Order } from '@/lib/orders'

type Props = {
  orders: Order[]
  onReprint: (order: Order) => void
  onRefresh: () => void
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function OrdersHistory({ orders, onReprint, onRefresh }: Props) {
  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">История заказов за сегодня</h2>
          <p className="text-xs text-white/50">Всего заказов: {orders.length}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
        >
          🔄 Обновить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
        {orders.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-center">
            <p className="text-sm text-white/40">Сегодня ещё не было заказов</p>
          </div>
        ) : (
          orders.map((order) => {
            const typeBadge =
              order.type === 'dine_in'
                ? { label: `🍽️ В зале (Стол ${order.tableNumber || '—'})`, bg: 'bg-blue-500/20 text-blue-400' }
                : order.type === 'delivery'
                ? { label: `🛵 Доставка (${order.customerPhone || '—'})`, bg: 'bg-emerald-500/20 text-emerald-400' }
                : { label: '🛍️ Навынос', bg: 'bg-amber-500/20 text-amber-400' }

            const payBadge =
              order.paymentMethod === 'cash'
                ? { label: '💵 Наличные', bg: 'bg-white/10 text-white/80' }
                : { label: '💳 Click/Payme', bg: 'bg-cyan-500/20 text-cyan-300' }

            return (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-amber-400 text-sm">{order.orderNumber}</span>
                    <span className="text-xs text-white/40">{formatTime(order.createdAt)}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${typeBadge.bg}`}>
                      {typeBadge.label}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${payBadge.bg}`}>
                      {payBadge.label}
                    </span>
                  </div>

                  <div className="text-xs text-white/60 line-clamp-1">
                    {order.items.map((it) => `${it.name} (×${it.qty})`).join(', ')}
                  </div>

                  {order.deliveryAddress && (
                    <div className="text-[11px] text-white/40">
                      📍 {order.deliveryAddress}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-white/5 pt-2 sm:border-0 sm:pt-0">
                  <span className="text-base font-bold text-white">
                    {formatNum(order.total)}{' '}
                    <span className="text-xs font-normal text-white/40">сум</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onReprint(order)}
                    className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 hover:text-black cursor-pointer"
                  >
                    <span>🖨️</span>
                    <span>Чек</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
