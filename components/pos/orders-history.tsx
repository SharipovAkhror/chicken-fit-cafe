'use client'

import { useState, useMemo } from 'react'
import type { Order, OrderType } from '@/lib/orders'
import type { PrintMode } from './receipt-print'

type Props = {
  orders: Order[]
  onReprint: (order: Order, mode?: PrintMode) => void
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
  const [filterType, setFilterType] = useState<OrderType | 'all'>('all')
  const [search, setSearch] = useState('')

  // Метрики смены (только не отмененные заказы для точности учета)
  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelled')
  }, [orders])

  const cancelledCount = useMemo(() => {
    return orders.filter((o) => o.status === 'cancelled').length
  }, [orders])

  const totalRevenue = useMemo(() => {
    return activeOrders.reduce((sum, o) => sum + o.total, 0)
  }, [activeOrders])

  const avgCheck = useMemo(() => {
    return activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0
  }, [totalRevenue, activeOrders.length])

  const filteredOrders = useMemo(() => {
    let list = orders
    if (filterType !== 'all') {
      list = list.filter((o) => o.type === filterType)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((o) => {
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerPhone && o.customerPhone.includes(q)) ||
          (o.tableNumber && o.tableNumber.includes(q)) ||
          o.items.some((it) => it.name.toLowerCase().includes(q))
        )
      })
    }
    return list
  }, [orders, filterType, search])

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden text-zinc-900 dark:text-white">
      {/* Шапка и сводка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-tight">
            История заказов за сегодня
          </h2>
          <p className="text-xs text-zinc-500">
            Авто-обновление · Повторная печать гостевых чеков и бегунков на кухню
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-bold transition hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shadow-xs"
        >
          <span>🔄</span>
          <span>Обновить</span>
        </button>
      </div>

      {/* 3 карточки ключевых показателей */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-zinc-400">Выручка</p>
          <p className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {formatNum(totalRevenue)}{' '}
            <span className="text-[10px] font-normal text-zinc-400">сум</span>
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-zinc-400">Чеков</p>
          <p className="text-sm sm:text-base font-black text-zinc-900 dark:text-white mt-0.5">
            {activeOrders.length}{' '}
            <span className="text-[10px] font-normal text-zinc-400">зак.</span>
          </p>
          {cancelledCount > 0 && (
            <p className="text-[10px] text-red-500 font-semibold mt-0.5">
              (отменено: {cancelledCount})
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-zinc-400">Средний чек</p>
          <p className="text-sm sm:text-base font-black text-zinc-900 dark:text-white mt-0.5">
            {formatNum(avgCheck)}{' '}
            <span className="text-[10px] font-normal text-zinc-400">сум</span>
          </p>
        </div>
      </div>

      {/* Поиск и фильтры по типу заказа */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по чеку #, столу, телефону или блюду..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 pr-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `Все (${orders.length})` },
            { id: 'dine_in', label: '🍽️ В зале' },
            { id: 'takeaway', label: '🛍️ С собой' },
            { id: 'delivery', label: '🛵 Доставка' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as OrderType | 'all')}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                filterType === f.id
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Список чеков */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-zinc-400">
            <p className="text-sm font-medium">Заказов не найдено</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const typeBadge =
              order.type === 'dine_in'
                ? {
                    label: `🍽️ Стол ${order.tableNumber || '1'}`,
                    bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                  }
                : order.type === 'delivery'
                ? {
                    label: `🛵 Доставка (${order.customerPhone || '—'})`,
                    bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                  }
                : {
                    label: '🛍️ Навынос',
                    bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                  }

            const payBadge =
              order.paymentMethod === 'cash'
                ? {
                    label: '💵 Наличные',
                    bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
                  }
                : {
                    label: '💳 Click/Payme',
                    bg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
                  }

            return (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 p-4 transition hover:border-amber-500/30 hover:shadow-xs"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400">
                      {formatTime(order.createdAt)}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${typeBadge.bg}`}
                    >
                      {typeBadge.label}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${payBadge.bg}`}
                    >
                      {payBadge.label}
                    </span>

                    {/* Бейдж статуса KDS */}
                    {order.status === 'cooking' && (
                      <span className="rounded-lg px-2 py-0.5 text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 animate-pulse">
                        🍳 Готовится
                      </span>
                    )}
                    {order.status === 'ready' && (
                      <span className="rounded-lg px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        ✅ Готов к выдаче
                      </span>
                    )}
                    {order.status === 'pending' && (
                      <span className="rounded-lg px-2 py-0.5 text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        ⏳ Ожидает кухни
                      </span>
                    )}
                    {order.status === 'completed' && (
                      <span className="rounded-lg px-2 py-0.5 text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        📦 Выдан
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 line-clamp-1">
                    {order.items
                      .map((it) => `${it.name} (×${it.qty})`)
                      .join(', ')}
                  </div>

                  {order.deliveryAddress && (
                    <div className="text-[11px] text-zinc-400">
                      📍 {order.deliveryAddress}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-2 sm:border-0 sm:pt-0 shrink-0">
                  <div className="text-right">
                    <span className="text-base font-black text-zinc-900 dark:text-white">
                      {formatNum(order.total)}{' '}
                      <span className="text-xs font-normal text-zinc-400">
                        сум
                      </span>
                    </span>
                    {order.discountAmount && order.discountAmount > 0 && (
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Скидка -{formatNum(order.discountAmount)}
                      </p>
                    )}
                  </div>

                  {/* Кнопки печати: Гость и Кухня */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReprint(order, 'guest')}
                      title="Печать гостевого чека"
                      className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-800 dark:text-white transition hover:bg-amber-500 hover:text-black cursor-pointer shadow-xs"
                    >
                      <span>🖨️</span>
                      <span>Гость</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onReprint(order, 'kitchen')}
                      title="Печать кухонного бегунка (без цен)"
                      className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-3 py-2 text-xs font-bold transition hover:opacity-85 cursor-pointer shadow-xs"
                    >
                      <span>👨‍🍳</span>
                      <span>Кухня</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
