'use client'

import { useState, useMemo } from 'react'
import {
  BarChart3,
  Printer,
  Lock,
  Unlock,
  AlertCircle,
  TrendingUp,
  Banknote,
  CreditCard,
  Percent,
  History,
  CheckCircle,
} from 'lucide-react'
import type { Order } from '@/lib/orders'
import {
  calculateDailyStats,
  getCurrentShift,
  openShift,
  closeShift,
  getLocalShifts,
  type Shift,
} from '@/lib/orders'
import type { ShiftThermalData } from './receipt-print'

type Props = {
  orders: Order[]
  onPrintShiftReport?: (data: ShiftThermalData) => void
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function ShiftReport({ orders, onPrintShiftReport }: Props) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(() => getCurrentShift())
  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>(() => getLocalShifts())

  // Модалка открытия смены
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [initialCashInput, setInitialCashInput] = useState('100000')
  const [cashierNameInput, setCashierNameInput] = useState('Кассир 1')

  // Модалка закрытия смены
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [actualCashInput, setActualCashInput] = useState('')
  const [closeNotesInput, setCloseNotesInput] = useState('')

  // Заказы текущей смены
  const shiftOrders = useMemo(() => {
    if (!currentShift) return orders
    return orders.filter((o) => !o.shiftId || o.shiftId === currentShift.id)
  }, [orders, currentShift])

  const stats = useMemo(() => {
    return calculateDailyStats(shiftOrders)
  }, [shiftOrders])

  const avgCheck = stats.orderCount > 0 ? Math.round(stats.totalRevenue / stats.orderCount) : 0
  const expectedCashInDrawer = (currentShift?.initialCash || 0) + stats.cashRevenue

  async function handleOpenShift() {
    const cash = parseInt(initialCashInput, 10) || 0
    const name = cashierNameInput.trim() || 'Кассир 1'
    const shift = await openShift({ initialCash: cash, cashierName: name })
    setCurrentShift(shift)
    setShiftsHistory(getLocalShifts())
    setShowOpenModal(false)
  }

  async function handleCloseShift() {
    const cash = parseInt(actualCashInput, 10) || expectedCashInDrawer
    const shift = await closeShift({ finalCash: cash, notes: closeNotesInput })
    setCurrentShift(null)
    setShiftsHistory(getLocalShifts())
    setShowCloseModal(false)

    // Автоматически печатаем Z-отчет если доступен обработчик печати
    if (onPrintShiftReport && shift) {
      onPrintShiftReport({
        type: 'Z',
        shiftNumber: shift.shiftNumber,
        cashierName: shift.cashierName,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        initialCash: shift.initialCash,
        finalCash: shift.finalCash,
        totalRevenue: shift.totalRevenue,
        cashRevenue: shift.cashRevenue,
        cardRevenue: shift.cardRevenue,
        discountTotal: shift.discountTotal,
        ordersCount: shift.ordersCount,
        dineInCount: stats.dineInCount,
        takeawayCount: stats.takeawayCount,
        deliveryCount: stats.deliveryCount,
        topItems: stats.topItems,
      })
    }
  }

  function handlePrintXReport() {
    if (!onPrintShiftReport) return
    onPrintShiftReport({
      type: 'X',
      shiftNumber: currentShift?.shiftNumber || 1,
      cashierName: currentShift?.cashierName || 'Кассир',
      openedAt: currentShift?.openedAt || new Date().toISOString(),
      initialCash: currentShift?.initialCash || 0,
      totalRevenue: stats.totalRevenue,
      cashRevenue: stats.cashRevenue,
      cardRevenue: stats.clickRevenue,
      discountTotal: stats.totalDiscount,
      ordersCount: stats.orderCount,
      dineInCount: stats.dineInCount,
      takeawayCount: stats.takeawayCount,
      deliveryCount: stats.deliveryCount,
      topItems: stats.topItems,
    })
  }

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto pr-1 text-foreground">
      {/* Шапка смены */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight">Кассовая смена и X/Z-отчеты</h1>
            {currentShift ? (
              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
                Смена #{currentShift.shiftNumber} (ОТКРЫТА)
              </span>
            ) : (
              <span className="rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[11px] font-bold text-red-500">
                СМЕНА ЗАКРЫТА
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentShift
              ? `Кассир: ${currentShift.cashierName} · Открыта: ${new Date(currentShift.openedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
              : 'Откройте смену для начала регистрации продаж'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentShift ? (
            <>
              <button
                type="button"
                onClick={handlePrintXReport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
                title="Распечатать промежуточный X-отчет без закрытия смены"
              >
                <Printer className="size-3.5 text-amber-500" />
                <span>Печать X-отчёта</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActualCashInput(String(expectedCashInDrawer))
                  setShowCloseModal(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Lock className="size-3.5" />
                <span>Закрыть смену (Z-отчёт)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpenModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Unlock className="size-3.5" />
              <span>Открыть новую смену</span>
            </button>
          )}
        </div>
      </div>

      {/* Ключевые карточки выручки текущей смены */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Общая выручка */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
            Общая выручка
          </span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatNum(stats.totalRevenue)}{' '}
            <span className="text-xs font-normal text-muted-foreground">сум</span>
          </p>
        </div>

        {/* Наличные в кассе */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1">
              <Banknote className="size-3.5 text-emerald-500" />
              <span>Наличные (выручка)</span>
            </span>
          </div>
          <p className="text-2xl font-black text-foreground">
            {formatNum(stats.cashRevenue)}{' '}
            <span className="text-xs font-normal text-muted-foreground">сум</span>
          </p>
          {currentShift && (
            <p className="text-[10px] text-muted-foreground">
              В ящике с разменом: {formatNum(expectedCashInDrawer)} сум
            </p>
          )}
        </div>

        {/* Click / Payme */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider inline-flex items-center gap-1">
            <CreditCard className="size-3.5" />
            <span>Click / Payme (QR)</span>
          </span>
          <p className="text-2xl font-black text-cyan-600 dark:text-cyan-300">
            {formatNum(stats.clickRevenue)}{' '}
            <span className="text-xs font-normal text-muted-foreground">сум</span>
          </p>
        </div>

        {/* Чеков & Средний чек */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1">
            <TrendingUp className="size-3.5" />
            <span>Чеков / Ср. чек</span>
          </span>
          <p className="text-2xl font-black text-foreground">
            {stats.orderCount}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              (ср. {formatNum(avgCheck)} сум)
            </span>
          </p>
          {stats.totalDiscount > 0 && (
            <p className="text-[10px] font-semibold text-emerald-500 inline-flex items-center gap-1">
              <Percent className="size-3" />
              <span>Скидок: -{formatNum(stats.totalDiscount)} сум</span>
            </p>
          )}
        </div>
      </div>

      {/* Структура по типам заказов */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Структура заказов за смену
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <span className="text-xs font-bold text-muted-foreground">🍽️ В зале</span>
            <p className="text-xl font-black text-foreground mt-0.5">{stats.dineInCount}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <span className="text-xs font-bold text-muted-foreground">🛍️ С собой</span>
            <p className="text-xl font-black text-foreground mt-0.5">{stats.takeawayCount}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <span className="text-xs font-bold text-muted-foreground">🛵 Доставка</span>
            <p className="text-xl font-black text-foreground mt-0.5">{stats.deliveryCount}</p>
          </div>
        </div>
      </div>

      {/* Топ продаваемых блюд смены */}
      {stats.topItems.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Топ блюд за текущую смену
          </h3>
          <div className="space-y-1.5">
            {stats.topItems.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between border-b border-border/40 pb-1.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-md bg-secondary text-[11px] font-bold font-mono">
                    {idx + 1}
                  </span>
                  <span className="font-semibold">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-black text-amber-500">{item.qty} шт</span>
                  <span className="text-muted-foreground">{formatNum(item.revenue)} сум</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* История закрытых смен */}
      {shiftsHistory.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Архив кассовых смен ({shiftsHistory.length})
            </h3>
          </div>
          <div className="space-y-2">
            {shiftsHistory.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 p-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Смена #{s.shiftNumber}</span>
                    <span className="text-[10px] text-muted-foreground">{s.cashierName}</span>
                    {s.status === 'open' ? (
                      <span className="rounded bg-emerald-500/15 text-emerald-500 px-1.5 py-0.2 text-[10px] font-bold">
                        Открыта
                      </span>
                    ) : (
                      <span className="rounded bg-secondary text-muted-foreground px-1.5 py-0.2 text-[10px] font-bold">
                        Закрыта
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(s.openedAt).toLocaleDateString('ru-RU')} · {s.ordersCount} заказов
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold">{formatNum(s.totalRevenue)} сум</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно открытия смены */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-500">
              <Unlock className="size-5" />
              <h3 className="text-base font-bold text-foreground">Открытие кассовой смены</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground">Имя кассира</label>
                <input
                  type="text"
                  value={cashierNameInput}
                  onChange={(e) => setCashierNameInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 outline-none font-medium"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground">Начальный размен в ящике (сум)</label>
                <input
                  type="number"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 outline-none font-mono font-bold"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenShift}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-black cursor-pointer shadow-xs"
              >
                Открыть смену
              </button>
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно закрытия смены (Z-отчет) */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-500">
              <Lock className="size-5" />
              <h3 className="text-base font-bold text-foreground">Закрытие смены (Z-отчёт)</h3>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Ожидаемо в ящике:</span>
                <span className="font-bold text-foreground">{formatNum(expectedCashInDrawer)} сум</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Выручка за смену:</span>
                <span className="font-bold text-amber-500">{formatNum(stats.totalRevenue)} сум</span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground">Фактически пересчитано наличных (сум)</label>
                <input
                  type="number"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground">Примечание / Комментарий</label>
                <input
                  type="text"
                  placeholder="Всё сходится / инкассация..."
                  value={closeNotesInput}
                  onChange={(e) => setCloseNotesInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseShift}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white cursor-pointer shadow-xs"
              >
                Закрыть и напечатать Z-отчёт
              </button>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
