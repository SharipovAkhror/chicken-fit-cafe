'use client'

import { useMemo } from 'react'
import {
  Clock,
  ArrowRightLeft,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import {
  type Order,
  RESTAURANT_TABLES,
  getActiveOrdersByTables,
} from '@/lib/orders'

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function getElapsedMinutes(isoString: string): number {
  try {
    const start = new Date(isoString).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((now - start) / 60000))
  } catch {
    return 0
  }
}

type Props = {
  orders: Order[]
  onSelectTable: (tableId: string, activeOrder?: Order) => void
  onSelectFastOrder: (type: 'takeaway' | 'delivery') => void
  onOpenTransferModal: (order: Order) => void
  onDirectPay: (order: Order) => void
}

export function TablePlan({
  orders,
  onSelectTable,
  onSelectFastOrder,
  onOpenTransferModal,
}: Props) {
  // Карта открытых счетов на столах
  const activeTableOrders = useMemo(() => {
    return getActiveOrdersByTables(orders)
  }, [orders])

  const occupiedCount = Object.keys(activeTableOrders).length
  const totalTables = RESTAURANT_TABLES.length
  const freeCount = Math.max(0, totalTables - occupiedCount)

  // Разделение столов по этажам: 1 этаж (1-6) и 1.5 этаж (7-8)
  const floor1Tables = useMemo(
    () => RESTAURANT_TABLES.filter((t) => t.id <= '6'),
    [],
  )
  const floor2Tables = useMemo(
    () => RESTAURANT_TABLES.filter((t) => t.id > '6'),
    [],
  )

  return (
    <div className="flex h-full flex-col space-y-4 text-foreground overflow-y-auto pr-1">
      {/* Лаконичная верхняя панель: статус столов и кнопки быстрых чеков */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-black tracking-wide">
            СТОЛЫ ({totalTables})
          </h2>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 border border-emerald-500/30">
              🟢 Свободно: {freeCount}
            </span>
            <span className="rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 border border-amber-500/30 font-bold">
              🟡 Занято: {occupiedCount}
            </span>
          </div>
        </div>

        {/* Быстрые чеки без стола */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectFastOrder('takeaway')}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <ShoppingBag className="size-4" />
            <span>С собой</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFastOrder('delivery')}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <Truck className="size-4 text-emerald-500" />
            <span>Доставка</span>
          </button>
        </div>
      </div>

      {/* ── СЕКЦИЯ 1: 1-Й ЭТАЖ (ОСНОВНОЙ ЗАЛ — 6 СТОЛОВ) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1-й этаж · Основной зал (6 столов)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {floor1Tables.map((t) => {
            const activeOrder = activeTableOrders[t.id]
            const isOccupied = Boolean(activeOrder)
            const elapsed = activeOrder ? getElapsedMinutes(activeOrder.createdAt) : 0

            if (isOccupied && activeOrder) {
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTable(t.id, activeOrder)}
                  className="group relative flex flex-col justify-between rounded-2xl border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-950/30 p-4 shadow-xs transition hover:shadow-md cursor-pointer active:scale-98 min-h-[115px]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl font-black text-foreground">
                        {t.name}
                      </span>
                      <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        Чек #{activeOrder.orderNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 text-[11px] font-mono">
                        <Clock className="size-3" />
                        <span>{elapsed}м</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTransferModal(activeOrder)
                        }}
                        title="Перенести счёт на другой стол"
                        className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition cursor-pointer"
                      >
                        <ArrowRightLeft className="size-3.5 text-amber-500" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 flex items-baseline justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {activeOrder.items.reduce((s, it) => s + it.qty, 0)} блюд
                    </span>
                    <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                      {formatNum(activeOrder.total)} сум
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={t.id}
                onClick={() => onSelectTable(t.id)}
                className="group flex flex-col justify-between rounded-2xl border-2 border-dashed border-border/80 hover:border-emerald-500 bg-card hover:bg-emerald-500/5 p-4 shadow-xs transition cursor-pointer active:scale-98 min-h-[115px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-foreground group-hover:text-emerald-500 transition">
                    {t.name}
                  </span>
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    🟢 Свободен
                  </span>
                </div>

                <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-medium transition">
                  Нажмите, чтобы открыть чек
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── СЕКЦИЯ 2: 1.5 ЭТАЖ (ВЕРХНИЙ МИНИ-ЭТАЖ — 2 СТОЛА) ── */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1.5 этаж · Верх (2 стола)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {floor2Tables.map((t) => {
            const activeOrder = activeTableOrders[t.id]
            const isOccupied = Boolean(activeOrder)
            const elapsed = activeOrder ? getElapsedMinutes(activeOrder.createdAt) : 0

            if (isOccupied && activeOrder) {
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTable(t.id, activeOrder)}
                  className="group relative flex flex-col justify-between rounded-2xl border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-950/30 p-4 shadow-xs transition hover:shadow-md cursor-pointer active:scale-98 min-h-[115px]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl font-black text-foreground">
                        {t.name} (Верх)
                      </span>
                      <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        Чек #{activeOrder.orderNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 text-[11px] font-mono">
                        <Clock className="size-3" />
                        <span>{elapsed}м</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTransferModal(activeOrder)
                        }}
                        title="Перенести счёт на другой стол"
                        className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition cursor-pointer"
                      >
                        <ArrowRightLeft className="size-3.5 text-amber-500" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 flex items-baseline justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {activeOrder.items.reduce((s, it) => s + it.qty, 0)} блюд
                    </span>
                    <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                      {formatNum(activeOrder.total)} сум
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={t.id}
                onClick={() => onSelectTable(t.id)}
                className="group flex flex-col justify-between rounded-2xl border-2 border-dashed border-border/80 hover:border-emerald-500 bg-card hover:bg-emerald-500/5 p-4 shadow-xs transition cursor-pointer active:scale-98 min-h-[115px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-foreground group-hover:text-emerald-500 transition">
                    {t.name} (Верх)
                  </span>
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    🟢 Свободен
                  </span>
                </div>

                <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-medium transition">
                  Нажмите, чтобы открыть чек
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
