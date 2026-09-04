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
  QrCode,
  Utensils,
  ShoppingBag,
  Truck,
  Delete,
  ChefHat,
  FileText,
  ArrowRightLeft,
  RotateCcw,
  LayoutGrid,
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

function CartLine({
  item,
  onSetQty,
  onSetPrice,
  onRemove,
}: {
  item: CartItem
  onSetQty: (id: string, qty: number) => void
  onSetPrice: (id: string, price: number) => void
  onRemove: (id: string) => void
}) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState('')
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

  return (
    <div className="group flex flex-col gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 transition hover:border-amber-500/40">
      {/* Название + сумма строки */}
      <div className="flex items-start justify-between gap-2">
        <div className="leading-snug min-w-0">
          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate block">
            {item.name}
          </span>
          {item.notes && item.notes !== item.name && (
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
              ↳ {item.notes}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs sm:text-sm font-bold font-mono text-zinc-900 dark:text-white">
          {formatNum(lineTotal(item))} сум
        </span>
      </div>

      {/* Управление количеством и ценой */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty - 1)}
            className="flex size-7 items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            aria-label="Уменьшить"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="min-w-6 text-center text-xs font-bold font-mono text-zinc-900 dark:text-white">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty + 1)}
            className="flex size-7 items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            aria-label="Увеличить"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <span className="text-zinc-400 text-xs font-mono">×</span>

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
              className="w-20 rounded-lg border border-amber-500 bg-white dark:bg-zinc-800 px-1.5 py-1 text-xs font-bold font-mono text-amber-600 dark:text-amber-300 outline-none"
            />
            <button
              type="button"
              onClick={commitPrice}
              className="p-1 rounded-md bg-amber-500 text-black text-xs font-bold"
            >
              <Check className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditPrice}
            title="Нажмите для изменения цены единицы"
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono transition hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${
              modified
                ? 'font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <span>{formatNum(item.price)}</span>
            <Edit2 className="size-2.5 opacity-60" />
          </button>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex size-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/15 hover:text-red-500 transition cursor-pointer"
          title="Удалить"
        >
          <Trash2 className="size-3.5" />
        </button>
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

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 text-foreground shadow-xs">
      {/* Верх: номер заказа, тип и кнопка закрытия */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
            {orderNumber}
          </span>
          <h2 className="text-sm sm:text-base font-bold">Текущий чек</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasItems && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition cursor-pointer"
            >
              Очистить
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-foreground lg:hidden"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Выбор формата заказа */}
      <div className="pt-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-secondary/50 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSetOrderType('dine_in')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer ${
              orderType === 'dine_in'
                ? 'bg-card font-bold text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Utensils className="size-3.5" />
            <span>В зале</span>
          </button>
          <button
            type="button"
            onClick={() => onSetOrderType('takeaway')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer ${
              orderType === 'takeaway'
                ? 'bg-card font-bold text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>С собой</span>
          </button>
          <button
            type="button"
            onClick={() => onSetOrderType('delivery')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer ${
              orderType === 'delivery'
                ? 'bg-card font-bold text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Truck className="size-3.5" />
            <span>Доставка</span>
          </button>
        </div>

        {/* Столы (r_keeper / iiko style) */}
        {orderType === 'dine_in' && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-foreground">
                  Стол №{tableNumber}
                </span>
                {orderStatus === 'completed' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold border border-blue-500/20">
                    <span className="size-1.5 rounded-full bg-blue-500" />
                    <span>ЗАКРЫТ #{orderNumber}</span>
                  </span>
                ) : orderStatus === 'precheck' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold border border-amber-500/20">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    <span>СЧЁТ #{orderNumber}</span>
                  </span>
                ) : activeOrderId ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-300 px-2 py-0.5 text-[10px] font-bold border border-orange-500/20">
                    <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <span>КУХНЯ #{orderNumber}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 text-[10px] font-bold border border-zinc-500/20">
                    <span className="size-1.5 rounded-full bg-zinc-400" />
                    <span>ЧЕРНОВИК</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {activeOrderId && onOpenTransferModal && (
                  <button
                    type="button"
                    onClick={onOpenTransferModal}
                    title="Перенести заказ на другой свободный стол"
                    className="flex items-center gap-1 rounded-lg border border-border bg-secondary hover:bg-secondary/80 px-2 py-1 text-[10.5px] font-bold transition cursor-pointer"
                  >
                    <ArrowRightLeft className="size-3 text-amber-500" />
                    <span>Перенести</span>
                  </button>
                )}
                {onBackToTables && (
                  <button
                    type="button"
                    onClick={onBackToTables}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 text-[10.5px] font-bold transition cursor-pointer"
                  >
                    <LayoutGrid className="size-3 text-amber-500" />
                    <span>Карта зала</span>
                  </button>
                )}
              </div>
            </div>

            {/* 8 столов: 1-6 (1 этаж), 7-8 (1.5 этаж) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <span className="text-[10px] text-muted-foreground font-semibold shrink-0">1 эт:</span>
              {['1', '2', '3', '4', '5', '6'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onSetTableNumber(num)}
                  className={`min-w-7 h-7 rounded-lg text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                    tableNumber === num
                      ? 'bg-amber-500 text-black shadow-xs font-black'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {num}
                </button>
              ))}
              <span className="text-[10px] text-muted-foreground font-semibold shrink-0 ml-1">1.5 эт:</span>
              {['7', '8'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onSetTableNumber(num)}
                  className={`min-w-7 h-7 rounded-lg text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                    tableNumber === num
                      ? 'bg-amber-500 text-black shadow-xs font-black'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Доставка */}
        {orderType === 'delivery' && (
          <div className="mt-2 space-y-1.5 rounded-xl border border-border/70 bg-secondary/30 p-2 text-xs">
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => onSetCustomerPhone(e.target.value)}
              placeholder="Телефон (+998...)"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 outline-none font-mono"
            />
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => onSetDeliveryAddress(e.target.value)}
              placeholder="Адрес доставки / ориентир"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 outline-none"
            />
            <div className="flex items-center justify-between gap-1 pt-1">
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
        )}
      </div>

      {/* 2. Список блюд в чеке */}
      <div className="my-2.5 flex-1 space-y-1.5 overflow-y-auto pr-0.5 min-h-[100px]">
        {!hasItems && (
          <div className="flex h-full flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <p className="text-xs">Нажимайте на блюда слева для добавления в чек</p>
          </div>
        )}
        {items.map((item) => (
          <CartLine
            key={item.id}
            item={item}
            onSetQty={onSetQty}
            onSetPrice={onSetPrice}
            onRemove={onRemove}
          />
        ))}

        {hasItems && !showAddCustom && (
          <button
            type="button"
            onClick={() => setShowAddCustom(true)}
            className="w-full rounded-xl border border-dashed border-border py-1.5 text-[11px] font-medium text-muted-foreground hover:border-amber-500 hover:text-amber-500 transition cursor-pointer"
          >
            + Добавить доплату / услугу в чек
          </button>
        )}

        {showAddCustom && (
          <form onSubmit={handleAddCustomLine} className="flex gap-1.5 p-2 rounded-xl border border-border bg-secondary/40">
            <input
              type="text"
              required
              placeholder="Название услуги"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none"
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

      {/* 3. Скидки, Оплата и Сенсорный калькулятор сдачи */}
      {hasItems && (
        <div className="border-t border-border/70 pt-2 space-y-2">
          {/* Скидки */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Percent className="size-3" />
                <span>Скидка:</span>
              </span>
              {totalDiscountAmount > 0 && (
                <span className="font-bold font-mono text-emerald-500">
                  -{formatNum(totalDiscountAmount)} сум
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[0, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    onSetDiscountPercent(pct)
                    onSetCustomDiscount(0)
                  }}
                  className={`rounded-lg py-1 text-xs font-mono font-bold transition cursor-pointer ${
                    discountPercent === pct && customDiscount === 0
                      ? 'bg-emerald-500 text-black shadow-xs'
                      : 'border border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Метод оплаты */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-secondary/50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onSetPaymentMethod('cash')
                if (!cashReceived) onSetCashReceived(finalTotal)
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-card font-bold text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Banknote className="size-3.5 text-amber-500" />
              <span>Наличные</span>
            </button>
            <button
              type="button"
              onClick={() => onSetPaymentMethod('click_payme')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition cursor-pointer ${
                paymentMethod === 'click_payme'
                  ? 'bg-card font-bold text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="size-3.5 text-blue-500" />
              <span>Карта / QR</span>
            </button>
          </div>

          {/* Сенсорный ввод наличных и сдачи (Touch Numpad) */}
          {paymentMethod === 'cash' && (
            <div className="rounded-xl border border-border/80 bg-secondary/20 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Получено от гостя:</span>
                <button
                  type="button"
                  onClick={() => setShowNumpad(!showNumpad)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-background border border-border px-2.5 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 cursor-pointer"
                >
                  <span>{cashReceived > 0 ? formatNum(cashReceived) : '0'} сум</span>
                  <Edit2 className="size-3 opacity-60" />
                </button>
              </div>

              {/* Быстрые купюры */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => onSetCashReceived(finalTotal)}
                  className="rounded-lg bg-amber-500/15 border border-amber-500/30 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer text-center"
                >
                  Без сдачи
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBill(50000)}
                  className="rounded-lg border border-border bg-background py-1 text-[11px] font-mono font-bold hover:bg-secondary cursor-pointer text-center"
                >
                  +50к
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBill(100000)}
                  className="rounded-lg border border-border bg-background py-1 text-[11px] font-mono font-bold hover:bg-secondary cursor-pointer text-center"
                >
                  +100к
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBill(200000)}
                  className="rounded-lg border border-border bg-background py-1 text-[11px] font-mono font-bold hover:bg-secondary cursor-pointer text-center"
                >
                  +200к
                </button>
              </div>

              {/* Сенсорная цифровая клавиатура (On-Screen Numpad) */}
              {showNumpad && (
                <div className="pt-2 border-t border-border/60">
                  <div className="grid grid-cols-3 gap-1 mb-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadPress(n)}
                        className="h-10 rounded-lg bg-card border border-border/80 text-sm font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadClear}
                      className="h-10 rounded-lg bg-destructive/15 text-destructive text-xs font-bold hover:bg-destructive/25 cursor-pointer"
                    >
                      СБРОС
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="h-10 rounded-lg bg-card border border-border/80 text-sm font-bold font-mono hover:bg-secondary cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="h-10 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Delete className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Расчет сдачи */}
              {cashReceived > finalTotal && (
                <div className="flex items-baseline justify-between pt-1.5 border-t border-border/60 font-mono">
                  <span className="text-xs text-emerald-500 font-bold">СДАЧА ГОСТЮ:</span>
                  <span className="text-base font-bold text-emerald-500">
                    {formatNum(change)} сум
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Итого и кнопка быстрой печати чека */}
      <div className="mt-2 border-t border-border/70 pt-2.5">
        <div className="space-y-1 mb-2 font-mono">
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
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase font-sans">
              ИТОГО:
            </span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-500">
              {formatNum(finalTotal)}{' '}
              <span className="text-xs font-normal text-muted-foreground">сум</span>
            </span>
          </div>
        </div>

        {/* Кнопки действий */}
        {orderType === 'dine_in' ? (
          <div className="space-y-2">
            {orderStatus === 'completed' && onReopenOrder ? (
              <button
                type="button"
                onClick={onReopenOrder}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs sm:text-sm font-bold text-white transition active:scale-[0.98] cursor-pointer shadow-sm shadow-blue-500/20"
              >
                <RotateCcw className="size-4" />
                <span>Возобновить обслуживание стола</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSubmitOrder}
                  disabled={!hasItems}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm sm:text-base font-black text-black transition active:scale-[0.98] disabled:opacity-30 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Printer className="size-5" />
                  <span>Оплатить и закрыть ({formatNum(finalTotal)} сум)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onSaveToKitchen}
                    disabled={!hasItems}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground py-2 text-xs font-bold transition active:scale-98 disabled:opacity-30 cursor-pointer"
                  >
                    <ChefHat className="size-4 text-orange-500" />
                    <span>{activeOrderId ? 'На кухню (дозаказ)' : 'На кухню'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onPrintPrecheck}
                    disabled={!hasItems}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground py-2 text-xs font-bold transition active:scale-98 disabled:opacity-30 cursor-pointer"
                  >
                    <FileText className="size-4 text-blue-500" />
                    <span>{orderStatus === 'precheck' ? 'Повтор счёта' : 'Выдать счёт'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {orderStatus === 'completed' && onReopenOrder ? (
              <button
                type="button"
                onClick={onReopenOrder}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs sm:text-sm font-bold text-white transition active:scale-[0.98] cursor-pointer shadow-sm shadow-blue-500/20"
              >
                <RotateCcw className="size-4" />
                <span>Возобновить заказ</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSubmitOrder}
                  disabled={!hasItems}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm sm:text-base font-black text-black transition active:scale-[0.98] disabled:opacity-30 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Printer className="size-5" />
                  <span>Оплатить ({formatNum(finalTotal)} сум)</span>
                </button>

                <button
                  type="button"
                  onClick={onSaveToKitchen}
                  disabled={!hasItems}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground py-2 text-xs font-bold transition active:scale-98 disabled:opacity-30 cursor-pointer"
                >
                  <ChefHat className="size-4 text-orange-500" />
                  <span>Отправить на кухню без оплаты</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
