'use client'

import { useState, useMemo } from 'react'
import {
  Clock,
  ArrowRightLeft,
  ShoppingBag,
  Truck,
  MapPin,
  Grid,
  Footprints,
  Maximize2,
  Sparkles,
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

/** 
 * Интерактивный 2D элемент стола с физическими стульями вокруг него
 */
function TablePlanItem({
  table,
  activeOrder,
  onSelect,
  onTransfer,
  isLoft = false,
}: {
  table: (typeof RESTAURANT_TABLES)[number]
  activeOrder?: Order
  onSelect: () => void
  onTransfer: (e: React.MouseEvent) => void
  isLoft?: boolean
}) {
  const isOccupied = Boolean(activeOrder)
  const elapsed = activeOrder ? getElapsedMinutes(activeOrder.createdAt) : 0
  const isLarge = table.capacity >= 6

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col justify-between rounded-2xl p-3.5 transition-all duration-200 cursor-pointer active:scale-98 select-none ${
        isLarge ? 'col-span-1 sm:col-span-2 min-h-[140px]' : 'min-h-[140px]'
      } ${
        isOccupied
          ? 'bg-amber-500/15 border-2 border-amber-500 shadow-md shadow-amber-500/10 hover:border-amber-400 ring-2 ring-amber-500/20'
          : 'bg-card/90 hover:bg-emerald-500/10 border-2 border-dashed border-border/80 hover:border-emerald-500 shadow-xs'
      }`}
    >
      {/* Силуэты стульев сверху */}
      <div className="flex justify-around px-4 -mt-5 mb-1 pointer-events-none">
        <div
          className={`h-2.5 w-6 rounded-t-md transition-colors ${
            isOccupied ? 'bg-amber-500/70' : 'bg-muted-foreground/30 group-hover:bg-emerald-500/50'
          }`}
        />
        <div
          className={`h-2.5 w-6 rounded-t-md transition-colors ${
            isOccupied ? 'bg-amber-500/70' : 'bg-muted-foreground/30 group-hover:bg-emerald-500/50'
          }`}
        />
        {isLarge && (
          <div
            className={`h-2.5 w-6 rounded-t-md transition-colors ${
              isOccupied ? 'bg-amber-500/70' : 'bg-muted-foreground/30 group-hover:bg-emerald-500/50'
            }`}
          />
        )}
      </div>

      {/* Верхняя часть карточки стола */}
      <div>
        <div className="flex items-start justify-between gap-1">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-foreground">
                {table.name}
              </span>
              {isLoft && (
                <span className="text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 px-1.5 py-0.2 border border-purple-500/30">
                  1.5 эт
                </span>
              )}
            </div>
            {isOccupied && activeOrder ? (
              <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                Чек #{activeOrder.orderNumber}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {table.capacity} места
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isOccupied && activeOrder ? (
              <>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 text-[11px] font-mono">
                  <Clock className="size-3" />
                  <span>{elapsed}м</span>
                </span>

                <button
                  type="button"
                  onClick={onTransfer}
                  title="Перенести счёт на другой стол"
                  className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition cursor-pointer"
                >
                  <ArrowRightLeft className="size-3.5 text-amber-500" />
                </button>
              </>
            ) : (
              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                🟢 Свободен
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Нижняя часть столешницы */}
      <div className="pt-2 border-t border-border/60 flex items-baseline justify-between mt-auto">
        {isOccupied && activeOrder ? (
          <>
            <span className="text-xs text-muted-foreground font-medium">
              {activeOrder.items.reduce((s, it) => s + it.qty, 0)} блюд
            </span>
            <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
              {formatNum(activeOrder.total)} <span className="text-xs font-normal">сум</span>
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-medium transition">
            Нажмите для заказа
          </span>
        )}
      </div>

      {/* Силуэты стульев снизу */}
      <div className="flex justify-around px-4 -mb-5 mt-1 pointer-events-none">
        <div
          className={`h-2.5 w-6 rounded-b-md transition-colors ${
            isOccupied ? 'bg-amber-500/70' : 'bg-muted-foreground/30 group-hover:bg-emerald-500/50'
          }`}
        />
        <div
          className={`h-2.5 w-6 rounded-b-md transition-colors ${
            isOccupied ? 'bg-amber-500/70' : 'bg-muted-foreground/30 group-hover:bg-emerald-500/50'
          }`}
        />
        {isLarge && (
          <div
            className={`h-2.5 w-6 rounded-b-md transition-colors ${
              isOccupied ? 'bg-amber-500/70' : 'bg-muted-foreground/30 group-hover:bg-emerald-500/50'
            }`}
          />
        )}
      </div>
    </div>
  )
}

export function TablePlan({
  orders,
  onSelectTable,
  onSelectFastOrder,
  onOpenTransferModal,
}: Props) {
  const [viewMode, setViewMode] = useState<'2d' | 'grid'>('2d')

  // Карта открытых счетов на столах
  const activeTableOrders = useMemo(() => {
    return getActiveOrdersByTables(orders)
  }, [orders])

  const occupiedCount = Object.keys(activeTableOrders).length
  const totalTables = RESTAURANT_TABLES.length
  const freeCount = Math.max(0, totalTables - occupiedCount)

  const floor1Tables = useMemo(() => RESTAURANT_TABLES.filter((t) => t.id <= '6'), [])
  const floor2Tables = useMemo(() => RESTAURANT_TABLES.filter((t) => t.id > '6'), [])

  return (
    <div className="flex h-full flex-col space-y-3.5 text-foreground overflow-y-auto pr-1">
      {/* ── Верхняя панель: Переключатель 2D-схемы, статус и быстрые чеки ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-wide flex items-center gap-1.5">
              <span>СТОЛЫ ({totalTables})</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 border border-emerald-500/30">
                🟢 {freeCount} свободно
              </span>
              <span className="rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 border border-amber-500/30 font-bold">
                🟡 {occupiedCount} занято
              </span>
            </div>
          </div>

          {/* Переключатель: 2D-схема зала / Сетка */}
          <div className="flex items-center rounded-xl bg-secondary/80 p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-amber-500 text-black shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="size-3.5" />
              <span>2D План зала</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-black shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid className="size-3.5" />
              <span>Сетка</span>
            </button>
          </div>
        </div>

        {/* Быстрые чеки (С собой / Доставка) */}
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

      {/* ── 2D АРХИТЕКТУРНЫЙ ПЛАН КАФЕ (Вариант Б) ── */}
      {viewMode === '2d' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1-Й ЭТАЖ: Основной зал, панорамные окна, касса и 6 столов */}
          <div className="lg:col-span-2 relative rounded-3xl border-2 border-border/90 bg-secondary/15 p-4 sm:p-5 shadow-xs overflow-hidden">
            {/* Декоративная сетка плана помещения */}
            <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Шапка 1 этажа */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-black font-black text-xs">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-black tracking-wide text-foreground">
                    1-й ЭТАЖ · ОСНОВНОЙ ЗАЛ
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Вход с ул. Ибн Сина · 6 столов · Зона кассы и панорамные окна
                  </p>
                </div>
              </div>

              {/* Маркер панорамных окон */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                <span>🪟 Панорамные окна</span>
              </div>
            </div>

            {/* Схема расстановки: У окон (1, 2, 3) и в центре/зале (4, 5, 6) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 my-2">
              {floor1Tables.map((t) => (
                <TablePlanItem
                  key={t.id}
                  table={t}
                  activeOrder={activeTableOrders[t.id]}
                  onSelect={() => onSelectTable(t.id, activeTableOrders[t.id])}
                  onTransfer={(e) => {
                    e.stopPropagation()
                    if (activeTableOrders[t.id]) onOpenTransferModal(activeTableOrders[t.id])
                  }}
                />
              ))}
            </div>

            {/* Нижний архитектурный пояс: Вход и Зона кассы */}
            <div className="mt-4 pt-3 border-t border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Входные двери */}
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/60 p-2.5 text-xs text-muted-foreground">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                  🚪
                </div>
                <div>
                  <p className="font-bold text-foreground text-[11px]">Главный вход</p>
                  <p className="text-[10px] text-muted-foreground">Улица Ибн Сина, 136</p>
                </div>
              </div>

              {/* Стойка кассы и раздачи */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 p-2.5 text-xs">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-black font-black text-sm">
                  ☕
                </div>
                <div>
                  <p className="font-bold text-foreground text-[11px]">Касса и выдача заказов</p>
                  <p className="text-[10px] text-muted-foreground">Терминал POS · Принтер чеков</p>
                </div>
              </div>
            </div>
          </div>

          {/* 1.5 ЭТАЖ: Мини-балкон (верхний ярус с лестницей) */}
          <div className="flex flex-col rounded-3xl border-2 border-purple-500/50 bg-purple-500/5 dark:bg-purple-950/15 p-4 sm:p-5 shadow-xs relative overflow-hidden">
            {/* Шапка 1.5 этажа */}
            <div className="flex items-center justify-between border-b border-purple-500/30 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-purple-500 text-white font-black text-xs">
                  1.5
                </span>
                <div>
                  <h3 className="text-sm font-black tracking-wide text-foreground">
                    1.5 ЭТАЖ · ВЕРХ
                  </h3>
                  <p className="text-[11px] text-purple-600 dark:text-purple-300 font-medium">
                    Мини-балкон над залом · 2 стола
                  </p>
                </div>
              </div>
            </div>

            {/* Лестничный переход (Стилизованная лестница) */}
            <div className="mb-4 rounded-xl border border-dashed border-purple-500/40 bg-card/70 p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🪜</span>
                <div>
                  <span className="font-bold text-foreground text-[11px]">
                    Лестничный подъём
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    С 1 этажа на 1.5 этаж
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                ▲ Вверх
              </span>
            </div>

            {/* Расстановка столов 1.5 этажа (7 и 8) */}
            <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col justify-around">
              {floor2Tables.map((t) => (
                <TablePlanItem
                  key={t.id}
                  table={t}
                  isLoft
                  activeOrder={activeTableOrders[t.id]}
                  onSelect={() => onSelectTable(t.id, activeTableOrders[t.id])}
                  onTransfer={(e) => {
                    e.stopPropagation()
                    if (activeTableOrders[t.id]) onOpenTransferModal(activeTableOrders[t.id])
                  }}
                />
              ))}
            </div>

            {/* Перила балкона */}
            <div className="mt-4 pt-2.5 border-t border-purple-500/30 text-center text-[10px] text-purple-600 dark:text-purple-300 font-bold">
              ════ Ограждение балкона (вид вниз на зал) ════
            </div>
          </div>
        </div>
      ) : (
        /* ── СЕТОЧНЫЙ РЕЖИМ (GRID) ── */
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              1-й этаж · Основной зал (6 столов)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {floor1Tables.map((t) => (
                <TablePlanItem
                  key={t.id}
                  table={t}
                  activeOrder={activeTableOrders[t.id]}
                  onSelect={() => onSelectTable(t.id, activeTableOrders[t.id])}
                  onTransfer={(e) => {
                    e.stopPropagation()
                    if (activeTableOrders[t.id]) onOpenTransferModal(activeTableOrders[t.id])
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              1.5 этаж · Верх (2 стола)
            </span>
            <div className="grid grid-cols-2 gap-3">
              {floor2Tables.map((t) => (
                <TablePlanItem
                  key={t.id}
                  table={t}
                  isLoft
                  activeOrder={activeTableOrders[t.id]}
                  onSelect={() => onSelectTable(t.id, activeTableOrders[t.id])}
                  onTransfer={(e) => {
                    e.stopPropagation()
                    if (activeTableOrders[t.id]) onOpenTransferModal(activeTableOrders[t.id])
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
