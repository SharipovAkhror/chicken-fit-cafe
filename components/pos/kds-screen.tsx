'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  Flame,
  Check,
  PackageCheck,
  Utensils,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import type { Order, OrderStatus } from '@/lib/orders'
import { updateOrderStatus, playKitchenChime } from '@/lib/orders'
import { getKitchenItems, kitchenItemsCount } from '@/lib/cart'

type Props = {
  orders: Order[]
  onRefresh: () => void
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

export function KdsScreen({ orders, onRefresh }: Props) {
  const [filter, setFilter] = useState<'active' | 'pending' | 'cooking' | 'ready' | 'completed'>('active')
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [tick, setTick] = useState(0)

  // Обновляем таймер каждые 30 секунд для точного отображения минут
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Фильтрация заказов для KDS
  const filteredOrders = useMemo(() => {
    // В KDS показываем только заказы, где есть хотя бы одно блюдо кухни (или все сегодняшние)
    return orders.filter((o) => {
      if (o.status === 'cancelled') return false
      if (filter === 'active') {
        return o.status === 'pending' || o.status === 'cooking' || o.status === 'ready'
      }
      return o.status === filter
    })
  }, [orders, filter, tick])

  // Счетчики для вкладок
  const counts = useMemo(() => {
    const p = orders.filter((o) => o.status === 'pending').length
    const c = orders.filter((o) => o.status === 'cooking').length
    const r = orders.filter((o) => o.status === 'ready').length
    const comp = orders.filter((o) => o.status === 'completed').length
    return {
      active: p + c + r,
      pending: p,
      cooking: c,
      ready: r,
      completed: comp,
    }
  }, [orders])

  async function handleStatusAdvance(order: Order) {
    let nextStatus: OrderStatus = 'cooking'
    if (order.status === 'pending') nextStatus = 'cooking'
    else if (order.status === 'cooking') nextStatus = 'ready'
    else if (order.status === 'ready') nextStatus = 'completed'

    await updateOrderStatus(order.id, nextStatus)
    if (soundEnabled && nextStatus === 'ready') {
      playKitchenChime()
    }
    onRefresh()
  }

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden text-foreground">
      {/* Шапка KDS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-xs">
            <ChefHat className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight">
                КУХНЯ (KDS) · ЭКРАН ПОВАРОВ
              </h1>
              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-500 animate-pulse">
                ● LIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Сенсорное управление заказами в реальном времени
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Переключатель звукового сигнала */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer border ${
              soundEnabled
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-secondary border-border text-muted-foreground'
            }`}
            title="Звуковой сигнал при поступлении заказа"
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            <span>{soundEnabled ? 'Звук ВКЛ' : 'Звук ВЫКЛ'}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Вкладки статусов заказов */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
            filter === 'active'
              ? 'bg-amber-500 text-black shadow-xs'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🔥 Все активные</span>
          <span className="rounded-full bg-black/20 dark:bg-white/20 px-1.5 py-0.2 text-[11px] font-mono">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
            filter === 'pending'
              ? 'bg-blue-500 text-white shadow-xs'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>⏳ Ожидают</span>
          <span className="rounded-full bg-black/20 dark:bg-white/20 px-1.5 py-0.2 text-[11px] font-mono">
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('cooking')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
            filter === 'cooking'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🍳 Готовятся</span>
          <span className="rounded-full bg-black/20 dark:bg-white/20 px-1.5 py-0.2 text-[11px] font-mono">
            {counts.cooking}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('ready')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
            filter === 'ready'
              ? 'bg-emerald-500 text-black shadow-xs'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>✅ Готовы к выдаче</span>
          <span className="rounded-full bg-black/20 dark:bg-white/20 px-1.5 py-0.2 text-[11px] font-mono">
            {counts.ready}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
            filter === 'completed'
              ? 'bg-secondary text-foreground shadow-xs'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>📦 Выдано ({counts.completed})</span>
        </button>
      </div>

      {/* Сетка карточек заказов KDS */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredOrders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 text-center text-muted-foreground">
            <CheckCircle2 className="size-12 text-muted-foreground/40 mb-2" />
            <p className="text-base font-bold">Все заказы приготовлены!</p>
            <p className="text-xs text-muted-foreground/70">Новые чеки с кассы появятся здесь автоматически со звуковым сигналом</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.createdAt)
              const kitchenItems = getKitchenItems(order.items)
              const totalKitchenCount = kitchenItemsCount(order.items)

              // Цветовое кодирование по времени ожидания
              const isUrgent = elapsed >= 15 && order.status !== 'ready' && order.status !== 'completed'
              const isWarning = elapsed >= 8 && elapsed < 15 && order.status !== 'ready' && order.status !== 'completed'

              const timeBadgeClass = isUrgent
                ? 'bg-red-500 text-white animate-pulse'
                : isWarning
                ? 'bg-amber-500 text-black'
                : 'bg-secondary text-foreground'

              // Тип заказа
              const orderTypeIcon =
                order.type === 'dine_in' ? (
                  <Utensils className="size-3.5 text-blue-500" />
                ) : order.type === 'delivery' ? (
                  <Truck className="size-3.5 text-emerald-500" />
                ) : (
                  <ShoppingBag className="size-3.5 text-amber-500" />
                )

              const orderTypeLabel =
                order.type === 'dine_in'
                  ? `В ЗАЛЕ · СТОЛ №${order.tableNumber || '1'}`
                  : order.type === 'delivery'
                  ? `ДОСТАВКА (${order.customerPhone || '—'})`
                  : 'С СОБОЙ'

              return (
                <div
                  key={order.id}
                  className={`flex flex-col rounded-2xl border bg-card shadow-sm transition-all overflow-hidden ${
                    isUrgent
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : order.status === 'ready'
                      ? 'border-emerald-500/60 ring-2 ring-emerald-500/15'
                      : order.status === 'cooking'
                      ? 'border-orange-500/50'
                      : 'border-border'
                  }`}
                >
                  {/* Шапка карточки заказа */}
                  <div className="flex items-center justify-between border-b border-border/80 bg-secondary/30 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                        {order.orderNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-card border border-border/70 px-2 py-0.5 text-[11px] font-bold">
                        {orderTypeIcon}
                        <span>{orderTypeLabel}</span>
                      </span>
                    </div>

                    {/* Таймер ожидания */}
                    <div className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold font-mono ${timeBadgeClass}`}>
                      <Clock className="size-3" />
                      <span>{elapsed} мин</span>
                    </div>
                  </div>

                  {/* Список блюд кухни */}
                  <div className="flex-1 p-3.5 space-y-2 overflow-y-auto max-h-60">
                    {kitchenItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2 text-center">
                        (Только напитки/бар — горячих блюд нет)
                      </p>
                    ) : (
                      kitchenItems.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className="flex items-start gap-2.5 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background font-black text-sm shrink-0">
                            {item.qty}×
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-bold leading-tight block">
                              {item.name}
                            </span>
                            {item.notes && item.notes !== item.name && (
                              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                ↳ {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Подвал карточки с кнопками сенсорного переключения */}
                  <div className="border-t border-border/80 bg-secondary/20 p-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      Блюд: {totalKitchenCount} шт
                    </span>

                    {order.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleStatusAdvance(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold px-3.5 py-2 text-xs transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Flame className="size-3.5" />
                        <span>Начать готовить</span>
                      </button>
                    )}

                    {order.status === 'cooking' && (
                      <button
                        type="button"
                        onClick={() => handleStatusAdvance(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3.5 py-2 text-xs transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Check className="size-3.5" />
                        <span>Готово!</span>
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => handleStatusAdvance(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold px-3.5 py-2 text-xs transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        <PackageCheck className="size-3.5 text-emerald-500" />
                        <span>Выдано гостю</span>
                      </button>
                    )}

                    {order.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span>Выдан</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
