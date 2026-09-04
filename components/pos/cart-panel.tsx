'use client'

import { useState } from 'react'
import {
  Trash2,
  Plus,
  Minus,
  X,
  Printer,
  Edit2,
  Check,
  Percent,
  Banknote,
  CreditCard,
  Utensils,
  ShoppingBag,
  Truck,
  Delete,
  ChefHat,
  FileText,
  ArrowRightLeft,
  RotateCcw,
  LayoutGrid,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react'
import type { CartItem } from '@/lib/cart'
import { lineTotal, cartTotal } from '@/lib/cart'
import type { OrderType, PaymentMethod } from '@/lib/orders'

type Props = {
  items: CartItem[]
  orderNumber: string
  orderType: OrderType
  tableNumber: string
  customerPhone: string
  deliveryAddress: string
  paymentMethod: PaymentMethod
  cashReceived: number
  discountPercent: number
  customDiscount: number
  deliveryFee: number
  onSetOrderType: (type: OrderType) => void
  onSetTableNumber: (table: string) => void
  onSetCustomerPhone: (phone: string) => void
  onSetDeliveryAddress: (address: string) => void
  onSetPaymentMethod: (method: PaymentMethod) => void
  onSetCashReceived: (val: number) => void
  onSetDiscountPercent: (pct: number) => void
  onSetCustomDiscount: (amt: number) => void
  onSetDeliveryFee: (fee: number) => void
  onSetQty: (id: string, qty: number) => void
  onSetPrice: (id: string, price: number) => void
  onSetNotes?: (id: string, notes: string) => void
  onRemove: (id: string) => void
  onAddCustomItem: (item: { name: string; price: number }) => void
  onClear: () => void
  onSubmitOrder: () => void
  onCloseMobile?: () => void
  activeOrderId?: string | null
  isTableOccupied?: boolean
  orderStatus?: 'draft' | 'pending' | 'cooking' | 'ready' | 'precheck' | 'completed' | 'cancelled'
  onReopenOrder?: () => void
  onSaveToKitchen?: () => void
  onPrintPrecheck?: () => void
  onOpenTransferModal?: () => void
  onBackToTables?: () => void
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Строка позиции заказа с крупными touch-мишенями */
function CartLine({
  item,
  onSetQty,
  onSetPrice,
  onSetNotes,
  onRemove,
}: {
  item: CartItem
  onSetQty: (id: string, qty: number) => void
  onSetPrice: (id: string, price: number) => void
  onSetNotes?: (id: string, notes: string) => void
  onRemove: (id: string) => void
}) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesInput, setNotesInput] = useState(item.notes || '')
  const modified = item.price !== item.originalPrice

  function startEditPrice() {
    setPriceInput(String(item.price))
    setEditingPrice(true)
  }

  function commitPrice() {
    const val = parseInt(priceInput, 10)
    if (!isNaN(val) && val >= 0) {
      onSetPrice(item.id, val)
    }
    setEditingPrice(false)
  }

  function commitNotes() {
    if (onSetNotes) {
      onSetNotes(item.id, notesInput.trim())
    }
    setEditingNotes(false)
  }

  return (
    <div className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 transition hover:border-amber-500/40 shadow-2xs">
      {/* Название + сумма строки */}
      <div className="flex items-start justify-between gap-2">
        <div className="leading-snug min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
            {item.name}
          </span>
          {item.notes && !editingNotes && (
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              <span className="size-1 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">{item.notes}</span>
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs sm:text-sm font-black font-mono text-foreground">
          {formatNum(lineTotal(item))} <span className="text-[10px] font-normal text-muted-foreground">сум</span>
        </span>
      </div>

      {/* Поле редактирования комментария к блюду для кухни */}
      {editingNotes && (
        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Примечание: без лука, с собой..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNotes()
              if (e.key === 'Escape') setEditingNotes(false)
            }}
            className="flex-1 rounded-lg border border-amber-500 bg-background px-2.5 py-1 text-xs outline-none"
          />
          <button
            type="button"
            onClick={commitNotes}
            className="p-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold cursor-pointer"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingNotes(false)}
            className="p-1.5 rounded-lg bg-secondary text-muted-foreground text-xs cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Управление количеством и ценой (touch-friendly >=44px) */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty - 1)}
            className="flex size-8 sm:size-9 items-center justify-center rounded-lg text-foreground hover:bg-card active:scale-90 transition cursor-pointer touch-manipulation"
            aria-label="Уменьшить"
          >
            <Minus className="size-3.5 sm:size-4 stroke-[2.5]" />
          </button>
          <span className="min-w-7 text-center text-xs sm:text-sm font-black font-mono text-foreground">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty + 1)}
            className="flex size-8 sm:size-9 items-center justify-center rounded-lg text-foreground hover:bg-card active:scale-90 transition cursor-pointer touch-manipulation"
            aria-label="Увеличить"
          >
            <Plus className="size-3.5 sm:size-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Цена единицы */}
        {editingPrice ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitPrice()
                if (e.key === 'Escape') setEditingPrice(false)
              }}
              autoFocus
              className="w-20 rounded-lg border border-amber-500 bg-background px-2 py-1 text-xs font-bold font-mono text-amber-600 dark:text-amber-300 outline-none"
            />
            <button
              type="button"
              onClick={commitPrice}
              className="p-1.5 rounded-md bg-amber-500 text-black text-xs font-bold cursor-pointer"
            >
              <Check className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditPrice}
            title="Изменить цену единицы"
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono transition hover:bg-secondary cursor-pointer touch-manipulation ${
              modified
                ? 'font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10'
                : 'text-muted-foreground'
            }`}
          >
            <span>{formatNum(item.price)}</span>
            <Edit2 className="size-2.5 opacity-50" />
          </button>
        )}

        <div className="flex items-center gap-1">
          {/* Кнопка комментария к позиции */}
          {onSetNotes && !editingNotes && (
            <button
              type="button"
              onClick={() => {
                setNotesInput(item.notes || '')
                setEditingNotes(true)
              }}
              title="Добавить комментарий к блюду"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition cursor-pointer touch-manipulation"
            >
              <MessageSquare className="size-3.5" />
            </button>
          )}

          {/* Удаление */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive active:scale-90 transition cursor-pointer touch-manipulation"
            title="Удалить из чека"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function CartPanel({
  items,
  orderNumber,
  orderType,
  tableNumber,
  customerPhone,
  deliveryAddress,
  paymentMethod,
  cashReceived,
  discountPercent,
  customDiscount,
  deliveryFee,
  onSetOrderType,
  onSetTableNumber,
  onSetCustomerPhone,
  onSetDeliveryAddress,
  onSetPaymentMethod,
  onSetCashReceived,
  onSetDiscountPercent,
  onSetCustomDiscount,
  onSetDeliveryFee,
  onSetQty,
  onSetPrice,
  onSetNotes,
  onRemove,
  onAddCustomItem,
  onClear,
  onSubmitOrder,
  onCloseMobile,
  activeOrderId,
  isTableOccupied,
  orderStatus,
  onReopenOrder,
  onSaveToKitchen,
  onPrintPrecheck,
  onOpenTransferModal,
  onBackToTables,
}: Props) {
  // Двухрежимный рабочий процесс (iiko / Syrve / Poster canon):
  // 'order' — свободный набор заказа без мусора и громоздких калькуляторов
  // 'pay' — сфокусированный экран оплаты со сдачей, купюрами и закрытием чека
  const [mode, setMode] = useState<'order' | 'pay'>('order')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [showNumpad, setShowNumpad] = useState(false)

  const subtotal = cartTotal(items)
  const percentDiscountAmount =
    discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : 0
  const totalDiscountAmount = Math.round(percentDiscountAmount + (customDiscount || 0))
  const activeDeliveryFee = orderType === 'delivery' ? deliveryFee : 0
  const finalTotal = Math.max(0, Math.round(subtotal - totalDiscountAmount + activeDeliveryFee))
  const hasItems = items.length > 0
  const change = Math.max(0, (cashReceived || finalTotal) - finalTotal)

  function handleAddCustomLine(e: React.FormEvent) {
    e.preventDefault()
    if (!customName.trim() || !customPrice) return
    onAddCustomItem({
      name: customName.trim(),
      price: parseInt(customPrice, 10) || 0,
    })
    setCustomName('')
    setCustomPrice('')
    setShowAddCustom(false)
  }

  function handleNumpadPress(digit: string) {
    const curStr = String(cashReceived || '')
    const nextStr = curStr + digit
    const val = parseInt(nextStr, 10) || 0
    onSetCashReceived(val)
  }

  function handleNumpadClear() {
    onSetCashReceived(0)
  }

  function handleNumpadBackspace() {
    const curStr = String(cashReceived || '')
    const nextStr = curStr.slice(0, -1)
    onSetCashReceived(parseInt(nextStr, 10) || 0)
  }

  function handleAddBill(amount: number) {
    onSetCashReceived((cashReceived || 0) + amount)
  }

  // ─────────────────────────────────────────────────────────────
  // РЕЖИМ 2: ЭКРАН ОПЛАТЫ И ЗАКРЫТИЯ ЧЕКА (FOCUSED PAYMENT VIEW)
  // ─────────────────────────────────────────────────────────────
  if (mode === 'pay') {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-3 sm:p-4 text-foreground shadow-xs select-none">
        {/* Шапка режима оплаты */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setMode('order')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-1.5 text-xs font-bold text-foreground hover:border-amber-500 active:scale-95 transition cursor-pointer touch-manipulation"
          >
            <ArrowLeft className="size-3.5" />
            <span>К заказу</span>
          </button>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Чек #{orderNumber}
            </span>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400">
              {orderType === 'dine_in' ? `Стол №${tableNumber}` : orderType === 'takeaway' ? 'С собой' : 'Доставка'}
            </span>
          </div>
        </div>

        {/* Тело экрана оплаты */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-0.5">
          {/* Баннер суммы к оплате */}
          <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Сумма к оплате
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {formatNum(finalTotal)}{' '}
              <span className="text-xs font-normal text-muted-foreground">сум</span>
            </div>
            {totalDiscountAmount > 0 && (
              <span className="text-xs font-semibold text-emerald-500 mt-1 block">
                Скидка учтена: -{formatNum(totalDiscountAmount)} сум
              </span>
            )}
          </div>

          {/* 1. Выбор способа оплаты */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Способ оплаты:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSetPaymentMethod('cash')
                  if (!cashReceived) onSetCashReceived(finalTotal)
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 border-2 font-black text-xs sm:text-sm transition cursor-pointer touch-manipulation active:scale-95 ${
                  paymentMethod === 'cash'
                    ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <Banknote className="size-4 text-amber-500" />
                <span>Наличные</span>
              </button>

              <button
                type="button"
                onClick={() => onSetPaymentMethod('click_payme')}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 border-2 font-black text-xs sm:text-sm transition cursor-pointer touch-manipulation active:scale-95 ${
                  paymentMethod === 'click_payme'
                    ? 'border-blue-500 bg-blue-500/15 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <CreditCard className="size-4 text-blue-500" />
                <span>Карта / QR</span>
              </button>
            </div>
          </div>

          {/* 2. Скидка на заказ */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Скидка на чек:</span>
              {discountPercent > 0 && (
                <span className="text-emerald-500 font-mono">
                  {discountPercent}% (-{formatNum(percentDiscountAmount)} сум)
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    onSetDiscountPercent(pct)
                    onSetCustomDiscount(0)
                  }}
                  className={`rounded-xl py-2 text-xs font-mono font-bold transition cursor-pointer touch-manipulation active:scale-95 ${
                    discountPercent === pct && customDiscount === 0
                      ? 'bg-emerald-500 text-black shadow-xs font-black'
                      : 'border border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 3. Расчёт сдачи при наличных */}
          {paymentMethod === 'cash' && (
            <div className="rounded-2xl border border-border bg-secondary/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Получено от гостя:</span>
                <span className="text-sm font-black font-mono text-foreground">
                  {cashReceived > 0 ? formatNum(cashReceived) : formatNum(finalTotal)} сум
                </span>
              </div>

              {/* Быстрые банкноты */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetCashReceived(finalTotal)}
                  className="rounded-xl bg-amber-500/15 border border-amber-500/30 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 active:scale-95 transition cursor-pointer text-center touch-manipulation"
                >
                  Без сдачи
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBill(50000)}
                  className="rounded-xl border border-border bg-card py-2.5 text-xs font-mono font-bold hover:bg-secondary active:scale-95 transition cursor-pointer text-center touch-manipulation"
                >
                  +50к
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBill(100000)}
                  className="rounded-xl border border-border bg-card py-2.5 text-xs font-mono font-bold hover:bg-secondary active:scale-95 transition cursor-pointer text-center touch-manipulation"
                >
                  +100к
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBill(200000)}
                  className="rounded-xl border border-border bg-card py-2.5 text-xs font-mono font-bold hover:bg-secondary active:scale-95 transition cursor-pointer text-center touch-manipulation"
                >
                  +200к
                </button>
              </div>

              {/* Расчет сдачи */}
              {change > 0 ? (
                <div className="flex items-baseline justify-between pt-2 border-t border-border font-mono">
                  <span className="text-xs text-emerald-500 font-bold uppercase">Сдача гостю:</span>
                  <span className="text-xl font-black text-emerald-500">
                    {formatNum(change)} сум
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <span>Сдача:</span>
                  <span className="font-mono">0 сум</span>
                </div>
              )}

              {/* Кнопка ручного ввода суммы / калькулятора */}
              <button
                type="button"
                onClick={() => setShowNumpad(!showNumpad)}
                className="w-full py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline text-center cursor-pointer touch-manipulation"
              >
                {showNumpad ? 'Скрыть клавиатуру' : 'Ввести другую сумму (калькулятор)'}
              </button>

              {/* On-Screen Numpad при необходимости */}
              {showNumpad && (
                <div className="pt-2 border-t border-border/60">
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadPress(n)}
                        className="h-10 rounded-xl bg-card border border-border text-sm font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer touch-manipulation"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadClear}
                      className="h-10 rounded-xl bg-destructive/15 text-destructive text-xs font-bold hover:bg-destructive/25 active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      СБРОС
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="h-10 rounded-xl bg-card border border-border text-sm font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="h-10 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground active:scale-90 transition cursor-pointer touch-manipulation"
                    >
                      <Delete className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопка закрытия чека и печати */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={onSubmitOrder}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm sm:text-base font-black text-black transition active:scale-[0.98] cursor-pointer shadow-md shadow-amber-500/20 touch-manipulation"
          >
            <Printer className="size-5" />
            <span>Пробить чек ({formatNum(finalTotal)} сум)</span>
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // РЕЖИМ 1: СБОРКА ЧЕКА / НАБОР ЗАКАЗА (CLEAN ORDER MODE)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-3 sm:p-4 text-foreground shadow-xs select-none">
      {/* 1. Верхняя панель: формат заказа + стол + кнопка очистки */}
      <div className="border-b border-border/80 pb-3 space-y-2.5">
        {/* Переключатель формата заказа: 3 компактных кнопки */}
        <div className="flex items-center justify-between gap-2">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-secondary/50 p-1 text-xs font-semibold flex-1">
            <button
              type="button"
              onClick={() => onSetOrderType('dine_in')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer touch-manipulation ${
                orderType === 'dine_in'
                  ? 'bg-card font-black text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Utensils className="size-3.5 text-amber-500" />
              <span className="text-xs">В зале</span>
            </button>
            <button
              type="button"
              onClick={() => onSetOrderType('takeaway')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer touch-manipulation ${
                orderType === 'takeaway'
                  ? 'bg-card font-black text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingBag className="size-3.5 text-amber-500" />
              <span className="text-xs">С собой</span>
            </button>
            <button
              type="button"
              onClick={() => onSetOrderType('delivery')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer touch-manipulation ${
                orderType === 'delivery'
                  ? 'bg-card font-black text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="size-3.5 text-emerald-500" />
              <span className="text-xs">Доставка</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasItems && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition cursor-pointer"
                title="Очистить весь чек"
              >
                Очистить
              </button>
            )}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground lg:hidden cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Строка стола или параметров доставки */}
        {orderType === 'dine_in' ? (
          <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-2.5 py-1.5 border border-border/70 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-foreground">
                Стол №{tableNumber}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  ({parseInt(tableNumber, 10) > 6 ? '1.5 эт' : '1 эт'})
                </span>
              </span>
              {orderStatus === 'completed' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-300 px-1.5 py-0.2 text-[10px] font-bold border border-blue-500/30">
                  ЗАКРЫТ
                </span>
              ) : orderStatus === 'precheck' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-bold border border-amber-500/30">
                  СЧЁТ
                </span>
              ) : activeOrderId ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-300 px-1.5 py-0.2 text-[10px] font-bold border border-orange-500/30">
                  КУХНЯ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-bold border border-emerald-500/30">
                  НОВЫЙ
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {activeOrderId && onOpenTransferModal && (
                <button
                  type="button"
                  onClick={onOpenTransferModal}
                  title="Перенести на другой стол"
                  className="flex items-center gap-1 rounded-lg bg-card px-2 py-1 text-[11px] font-bold border border-border hover:bg-secondary cursor-pointer shadow-2xs"
                >
                  <ArrowRightLeft className="size-3 text-amber-500" />
                  <span>Перенести</span>
                </button>
              )}
              {onBackToTables && (
                <button
                  type="button"
                  onClick={onBackToTables}
                  title="Вернуться к плану зала"
                  className="flex items-center gap-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 text-[11px] font-bold border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer shadow-2xs"
                >
                  <LayoutGrid className="size-3 text-amber-500" />
                  <span>Столы</span>
                </button>
              )}
            </div>
          </div>
        ) : orderType === 'delivery' ? (
          <div className="space-y-1.5 rounded-xl border border-border/70 bg-secondary/30 p-2 text-xs">
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => onSetCustomerPhone(e.target.value)}
              placeholder="Телефон клиента (+998...)"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 outline-none font-mono text-xs"
            />
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => onSetDeliveryAddress(e.target.value)}
              placeholder="Адрес доставки / ориентир"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 outline-none text-xs"
            />
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <span className="text-[11px] text-muted-foreground">Доставка:</span>
              <div className="flex gap-1">
                {[0, 10000, 15000, 20000].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => onSetDeliveryFee(fee)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold font-mono transition cursor-pointer ${
                      deliveryFee === fee
                        ? 'bg-amber-500 text-black'
                        : 'border border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {fee === 0 ? '0' : `${fee / 1000}к`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Список блюд в чеке (Главная зона: занимает до 75% высоты!) */}
      <div className="my-2.5 flex-1 space-y-2 overflow-y-auto pr-0.5 min-h-[140px]">
        {!hasItems && (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/60 text-muted-foreground">
              <Utensils className="size-6 opacity-40" />
            </div>
            <p className="text-xs font-bold text-foreground">Чек пуст</p>
            <p className="text-[11px] text-muted-foreground max-w-[200px]">
              Нажимайте на блюда слева для добавления в заказ
            </p>
          </div>
        )}

        {items.map((item) => (
          <CartLine
            key={item.id}
            item={item}
            onSetQty={onSetQty}
            onSetPrice={onSetPrice}
            onSetNotes={onSetNotes}
            onRemove={onRemove}
          />
        ))}

        {hasItems && !showAddCustom && (
          <button
            type="button"
            onClick={() => setShowAddCustom(true)}
            className="w-full rounded-xl border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground hover:border-amber-500 hover:text-amber-500 transition cursor-pointer"
          >
            + Добавить доплату / произвольную позицию
          </button>
        )}

        {showAddCustom && (
          <form onSubmit={handleAddCustomLine} className="flex gap-1.5 p-2 rounded-xl border border-border bg-secondary/40">
            <input
              type="text"
              required
              placeholder="Название услуги / блюда"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none"
            />
            <input
              type="number"
              required
              placeholder="Сумма"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono outline-none"
            />
            <button type="submit" className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-black cursor-pointer">
              <Check className="size-3.5" />
            </button>
            <button type="button" onClick={() => setShowAddCustom(false)} className="px-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="size-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* 3. Итого и основные действия кассира */}
      <div className="border-t border-border/80 pt-2.5 space-y-2">
        {/* Строка Итого */}
        <div className="space-y-1 font-mono">
          {subtotal !== finalTotal && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Сумма блюд:</span>
              <span>{formatNum(subtotal)} сум</span>
            </div>
          )}
          {totalDiscountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-500 font-semibold">
              <span>Скидка:</span>
              <span>-{formatNum(totalDiscountAmount)} сум</span>
            </div>
          )}
          {activeDeliveryFee > 0 && (
            <div className="flex justify-between text-xs text-amber-500 font-semibold">
              <span>Доставка:</span>
              <span>+{formatNum(activeDeliveryFee)} сум</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-sans">
              ИТОГО:
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-500">
              {formatNum(finalTotal)}{' '}
              <span className="text-xs font-normal text-muted-foreground">сум</span>
            </span>
          </div>
        </div>

        {/* Кнопки действий: разделены по стандарту ресторанных систем */}
        {orderStatus === 'completed' && onReopenOrder ? (
          <button
            type="button"
            onClick={onReopenOrder}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs sm:text-sm font-bold text-white transition active:scale-[0.98] cursor-pointer shadow-sm shadow-blue-500/20 touch-manipulation"
          >
            <RotateCcw className="size-4" />
            <span>Возобновить заказ стола</span>
          </button>
        ) : orderType === 'dine_in' ? (
          <div className="space-y-2">
            {/* Дополнительные действия: Кухня и Пречек */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSaveToKitchen}
                disabled={!hasItems}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground py-2.5 text-xs font-bold transition active:scale-98 disabled:opacity-30 cursor-pointer touch-manipulation shadow-2xs"
              >
                <ChefHat className="size-4 text-orange-500" />
                <span>{activeOrderId ? 'На кухню (дозаказ)' : 'На кухню'}</span>
              </button>

              <button
                type="button"
                onClick={onPrintPrecheck}
                disabled={!hasItems}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground py-2.5 text-xs font-bold transition active:scale-98 disabled:opacity-30 cursor-pointer touch-manipulation shadow-2xs"
              >
                <FileText className="size-4 text-blue-500" />
                <span>{orderStatus === 'precheck' ? 'Повтор счёта' : 'Пречек (счёт)'}</span>
              </button>
            </div>

            {/* Главная кнопка перехода к расчёту */}
            <button
              type="button"
              onClick={() => setMode('pay')}
              disabled={!hasItems}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm sm:text-base font-black text-black transition active:scale-[0.98] disabled:opacity-30 cursor-pointer shadow-md shadow-amber-500/20 touch-manipulation"
            >
              <CreditCard className="size-4" />
              <span>Оплатить ({formatNum(finalTotal)} сум) →</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Главная кнопка расчёта для навынос / доставки */}
            <button
              type="button"
              onClick={() => setMode('pay')}
              disabled={!hasItems}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm sm:text-base font-black text-black transition active:scale-[0.98] disabled:opacity-30 cursor-pointer shadow-md shadow-amber-500/20 touch-manipulation"
            >
              <CreditCard className="size-4" />
              <span>Оплатить ({formatNum(finalTotal)} сум) →</span>
            </button>

            <button
              type="button"
              onClick={onSaveToKitchen}
              disabled={!hasItems}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground py-2 text-xs font-bold transition active:scale-98 disabled:opacity-30 cursor-pointer touch-manipulation shadow-2xs"
            >
              <ChefHat className="size-4 text-orange-500" />
              <span>Отправить на кухню без оплаты</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
