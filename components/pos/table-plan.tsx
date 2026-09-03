'use client'

import { useState, useMemo } from 'react'
import {
  Clock,
  ArrowRightLeft,
  Banknote,
  ShoppingBag,
  Truck,
  Users,
  Plus,
  Flame,
  CheckCircle2,
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
  onDirectPay,
}: Props) {
  const [selectedZone, setSelectedZone] = useState<string>('all')

  // Карта активных открытых заказов на столах
  const activeTableOrders = useMemo(() => {
    return getActiveOrdersByTables(orders)
  }, [orders])

  const occupiedCount = Object.keys(activeTableOrders).length
  const totalTables = RESTAURANT_TABLES.length
  const freeCount = Math.max(0, totalTables - occupiedCount)

  const totalRevenueOnTables = useMemo(() => {
    return Object.values(activeTableOrders).reduce((sum, o) => sum + o.total, 0)
  }, [activeTableOrders])

  const filteredTables = useMemo(() => {
    if (selectedZone === 'all') return RESTAURANT_TABLES
    if (selectedZone === 'occupied') {
      return RESTAURANT_TABLES.filter((t) => Boolean(activeTableOrders[t.id]))
    }
    if (selectedZone === 'free') {
      return RESTAURANT_TABLES.filter((t) => !activeTableOrders[t.id])
    }
    return RESTAURANT_TABLES.filter((t) => t.zone === selectedZone)
  }, [selectedZone, activeTableOrders])

  const zones = useMemo(() => {
    const list = Array.from(new Set(RESTAURANT_TABLES.map((t) => t.zone)))
    return ['all', 'occupied', 'free', ...list]
  }, [])

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden text-foreground">
      {/* Верхняя командная панель: Сводка зала и быстрые чеки */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>ПЛАН ЗАЛА И СТОЛЫ</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-secondary/80 px-2 py-0.5 rounded-md border border-border">
                r_keeper / iiko style
              </span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Сенсорный выбор стола · Открытые счета · Дозаказы · Перенос столов
          </p>
        </div>

        {/* Быстрые кнопки обслуживания без привязки к столу */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectFastOrder('takeaway')}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <ShoppingBag className="size-4" />
            <span>Быстрый чек «С собой»</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFastOrder('delivery')}
            className="flex items-center gap-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <Truck className="size-4 text-emerald-500" />
            <span>Новая доставка</span>
          </button>
        </div>
      </div>

      {/* Метрики зала: Свободно, занято, открытые суммы */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground">Всего столов</p>
          <p className="text-lg font-black text-foreground mt-0.5 flex items-baseline gap-1">
            <span>{totalTables}</span>
            <span className="text-xs font-normal text-muted-foreground">мест</span>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">🟢 Свободно</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {freeCount} <span className="text-xs font-normal">столов</span>
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">🟡 Занято (Счета)</p>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {occupiedCount} <span className="text-xs font-normal">столов</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground">На столах в зале</p>
          <p className="text-lg font-black text-foreground mt-0.5 font-mono">
            {formatNum(totalRevenueOnTables)}{' '}
            <span className="text-xs font-normal text-muted-foreground">сум</span>
          </p>
        </div>
      </div>

      {/* Фильтры зон */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {zones.map((z) => {
          let label = z
          if (z === 'all') label = 'Все столы'
          else if (z === 'occupied') label = `🟡 Занятые (${occupiedCount})`
          else if (z === 'free') label = `🟢 Свободные (${freeCount})`

          const active = selectedZone === z
          return (
            <button
              key={z}
              type="button"
              onClick={() => setSelectedZone(z)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                active
                  ? 'bg-foreground text-background shadow-xs'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Сенсорная сетка столов */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-6">
          {filteredTables.map((t) => {
            const activeOrder = activeTableOrders[t.id]
            const isOccupied = Boolean(activeOrder)
            const elapsed = activeOrder ? getElapsedMinutes(activeOrder.createdAt) : 0

            if (isOccupied && activeOrder) {
              // Карточка занятого стола (открытый счет)
              return (
                <div
                  key={t.id}
                  className="flex flex-col justify-between rounded-2xl border-2 border-amber-500/70 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 shadow-sm transition hover:shadow-md ring-2 ring-amber-500/15"
                >
                  {/* Шапка занятого стола */}
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black text-foreground">
                            {t.name}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground rounded-md bg-secondary/80 px-1.5 py-0.5 border border-border">
                            {t.zone}
                          </span>
                        </div>
                        <p className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                          Чек #{activeOrder.orderNumber}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 text-[11px] font-mono">
                          <Clock className="size-3" />
                          <span>{elapsed} мин</span>
                        </span>
                        {activeOrder.status === 'cooking' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500 font-bold">
                            <Flame className="size-3" /> Готовится
                          </span>
                        )}
                        {activeOrder.status === 'ready' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-500 font-bold">
                            <CheckCircle2 className="size-3" /> Готов
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Состав заказа на столе */}
                    <div className="my-2.5 rounded-xl bg-background/80 border border-border/60 p-2 text-xs space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground border-b border-border/40 pb-1">
                        <span>Блюд: {activeOrder.items.reduce((s, it) => s + it.qty, 0)} шт</span>
                        <span className="text-foreground">{activeOrder.items.length} поз.</span>
                      </div>
                      <div className="max-h-20 overflow-y-auto space-y-0.5 pr-0.5 text-[11px]">
                        {activeOrder.items.map((it, idx) => (
                          <div key={`${it.id}-${idx}`} className="flex justify-between text-muted-foreground">
                            <span className="truncate pr-1">
                              {it.qty}× {it.name}
                            </span>
                            <span className="shrink-0 font-mono font-semibold text-foreground">
                              {formatNum(it.price * it.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Подвал с суммой и кнопками действий */}
                  <div className="pt-2 border-t border-amber-500/20 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Итого к оплате:</span>
                      <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                        {formatNum(activeOrder.total)} <span className="text-xs font-normal">сум</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectTable(t.id, activeOrder)}
                        className="col-span-2 flex items-center justify-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black py-2 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Plus className="size-3.5" />
                        <span>Дозаказ / Чек</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenTransferModal(activeOrder)}
                        title="Перенести заказ на другой стол"
                        className="flex items-center justify-center gap-1 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground py-2 text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        <ArrowRightLeft className="size-3.5" />
                        <span>Перенос</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDirectPay(activeOrder)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 py-1.5 text-xs font-black transition cursor-pointer active:scale-95"
                    >
                      <Banknote className="size-3.5" />
                      <span>Быстрая оплата ({formatNum(activeOrder.total)} сум)</span>
                    </button>
                  </div>
                </div>
              )
            }

            // Карточка свободного стола
            return (
              <div
                key={t.id}
                onClick={() => onSelectTable(t.id)}
                className="group flex flex-col justify-between rounded-2xl border-2 border-dashed border-border/80 hover:border-emerald-500/80 bg-card hover:bg-emerald-500/5 p-4 shadow-xs transition cursor-pointer active:scale-98"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-foreground group-hover:text-emerald-500 transition">
                      {t.name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      🟢 Свободен
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5 text-muted-foreground" />
                      <span>До {t.capacity} мест</span>
                    </span>
                    <span>·</span>
                    <span>{t.zone}</span>
                  </div>
                </div>

                <div className="mt-8 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  <span>Открыть новый заказ</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-secondary group-hover:bg-emerald-500 group-hover:text-black transition">
                    <Plus className="size-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
