'use client'

import type { Order } from '@/lib/orders'
import { calculateDailyStats } from '@/lib/orders'

type Props = {
  orders: Order[]
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function ShiftReport({ orders }: Props) {
  const stats = calculateDailyStats(orders)
  const avgCheck = stats.orderCount > 0 ? Math.round(stats.totalRevenue / stats.orderCount) : 0

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto pr-1">
      <div>
        <h2 className="text-lg font-bold text-white">Сводка за день / Смена</h2>
        <p className="text-xs text-white/50">
          Данные за {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Ключевые карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Общая выручка */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-1">
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
            Общая выручка
          </span>
          <p className="text-2xl font-extrabold text-amber-400">
            {formatNum(stats.totalRevenue)}{' '}
            <span className="text-sm font-normal text-amber-300/60">сум</span>
          </p>
        </div>

        {/* Наличные */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-1">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
            💵 Наличные
          </span>
          <p className="text-xl font-bold text-white">
            {formatNum(stats.cashRevenue)}{' '}
            <span className="text-xs font-normal text-white/40">сум</span>
          </p>
        </div>

        {/* Click / Payme */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-1">
          <span className="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider">
            💳 Click / Payme
          </span>
          <p className="text-xl font-bold text-cyan-300">
            {formatNum(stats.clickRevenue)}{' '}
            <span className="text-xs font-normal text-white/40">сум</span>
          </p>
        </div>

        {/* Количество заказов & средний чек */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-1">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
            Заказов / Средний чек
          </span>
          <p className="text-xl font-bold text-white">
            {stats.orderCount}{' '}
            <span className="text-xs font-normal text-white/40">
              (ср. {formatNum(avgCheck)} сум)
            </span>
          </p>
        </div>
      </div>

      {/* Разбивка по типам заказов */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Структура продаж
        </h3>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/5 p-3">
            <span className="text-xs text-white/50">🍽️ В зале</span>
            <p className="text-lg font-bold text-white mt-1">{stats.dineInCount}</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <span className="text-xs text-white/50">🛍️ Навынос</span>
            <p className="text-lg font-bold text-white mt-1">{stats.takeawayCount}</p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <span className="text-xs text-white/50">🛵 Доставка</span>
            <p className="text-lg font-bold text-white mt-1">{stats.deliveryCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
