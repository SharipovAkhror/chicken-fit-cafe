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
    <div className="flex h-full flex-col space-y-6 overflow-y-auto pr-1 text-zinc-900 dark:text-white">
      <div>
        <h2 className="text-base sm:text-lg font-black tracking-tight">Сводка за день / Смена</h2>
        <p className="text-xs text-zinc-500">
          Данные за {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Ключевые карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Общая выручка */}
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-1 shadow-xs">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
            Общая выручка
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {formatNum(stats.totalRevenue)}{' '}
            <span className="text-sm font-normal text-zinc-500">сум</span>
          </p>
        </div>

        {/* Наличные */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 space-y-1 shadow-xs">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            💵 Наличные
          </span>
          <p className="text-2xl font-black text-zinc-900 dark:text-white">
            {formatNum(stats.cashRevenue)}{' '}
            <span className="text-sm font-normal text-zinc-400">сум</span>
          </p>
        </div>

        {/* Click / Payme */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 space-y-1 shadow-xs">
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            💳 Click / Payme
          </span>
          <p className="text-2xl font-black text-cyan-600 dark:text-cyan-300">
            {formatNum(stats.clickRevenue)}{' '}
            <span className="text-sm font-normal text-zinc-400">сум</span>
          </p>
        </div>

        {/* Заказов & средний чек */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 space-y-1 shadow-xs">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Заказов / Средний чек
          </span>
          <p className="text-2xl font-black text-zinc-900 dark:text-white">
            {stats.orderCount}{' '}
            <span className="text-xs font-normal text-zinc-400">
              (ср. {formatNum(avgCheck)} сум)
            </span>
          </p>
        </div>
      </div>

      {/* Разбивка по типам заказов */}
      <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
          Структура заказов
        </h3>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <span className="text-xs font-bold text-zinc-500">🍽️ В зале</span>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{stats.dineInCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <span className="text-xs font-bold text-zinc-500">🛍️ С собой</span>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{stats.takeawayCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <span className="text-xs font-bold text-zinc-500">🛵 Доставка</span>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{stats.deliveryCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
