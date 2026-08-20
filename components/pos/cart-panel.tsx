'use client'

import { useState } from 'react'
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
    <div className="group flex flex-col gap-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-2.5 transition hover:border-amber-500/30">
      {/* Название + сумма строки */}
      <div className="flex items-start justify-between gap-2">
        <div className="leading-snug">
          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {item.name}
          </span>
          {item.notes && item.notes !== item.name && (
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
              ↳ {item.notes}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
          {formatNum(lineTotal(item))} сум
        </span>
      </div>

      {/* Управление количеством и ценой */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5">
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty - 1)}
            className="flex size-6 items-center justify-center rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold"
          >
            −
          </button>
          <span className="min-w-[1.5rem] text-center text-xs font-black text-zinc-900 dark:text-white">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty + 1)}
            className="flex size-6 items-center justify-center rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold"
          >
            +
          </button>
        </div>

        <span className="text-zinc-400 text-xs">×</span>
        {editingPrice ? (
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
            className="w-20 rounded-lg border border-amber-500 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-300 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEditPrice}
            title="Нажмите для изменения цены единицы"
            className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs transition hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
              modified ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <span>{formatNum(item.price)}</span>
            <span className="text-[10px] opacity-40">✏️</span>
          </button>
        )}

        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex size-6 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition"
          title="Удалить"
        >
          ✕
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
}: Props) {
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')

  const subtotal = cartTotal(items)
  const percentDiscountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0
  const totalDiscountAmount = percentDiscountAmount + (customDiscount || 0)
  const activeDeliveryFee = orderType === 'delivery' ? deliveryFee : 0
  const finalTotal = Math.max(0, subtotal - totalDiscountAmount + activeDeliveryFee)
  const hasItems = items.length > 0
  const change = Math.max(0, (cashReceived || finalTotal) - finalTotal)

  const quickBills = [50000, 100000, 200000]

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

  return (
    <div className="flex h-full flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-zinc-900 dark:text-white shadow-sm">
      {/* Верх: номер заказа, тип и кнопка закрытия на мобильных */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-amber-500/15 dark:bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-600 dark:text-amber-400">
            {orderNumber}
          </span>
          <h2 className="text-sm sm:text-base font-black">Текущий чек</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasItems && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition"
            >
              Сброс
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-200 lg:hidden"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 1. Выбор формата заказа */}
      <div className="pt-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => onSetOrderType('dine_in')}
            className={`rounded-xl py-1.5 transition cursor-pointer ${
              orderType === 'dine_in'
                ? 'bg-amber-500 font-black text-black shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            🍽️ В зале
          </button>
          <button
            type="button"
            onClick={() => onSetOrderType('takeaway')}
            className={`rounded-xl py-1.5 transition cursor-pointer ${
              orderType === 'takeaway'
                ? 'bg-amber-500 font-black text-black shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            🛍️ С собой
          </button>
          <button
            type="button"
            onClick={() => onSetOrderType('delivery')}
            className={`rounded-xl py-1.5 transition cursor-pointer ${
              orderType === 'delivery'
                ? 'bg-amber-500 font-black text-black shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            🛵 Доставка
          </button>
        </div>

        {/* Столы */}
        {orderType === 'dine_in' && (
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-zinc-400 shrink-0">Стол:</span>
            {['1', '2', '3', '4', '5', '6', '7', '8', 'Бар'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onSetTableNumber(num)}
                className={`min-w-7 h-7 px-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  tableNumber === num
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {/* Доставка */}
        {orderType === 'delivery' && (
          <div className="mt-2.5 space-y-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2.5">
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => onSetCustomerPhone(e.target.value)}
              placeholder="Телефон клиента (+998...)"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => onSetDeliveryAddress(e.target.value)}
              placeholder="Адрес доставки / ориентир"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-500">Доставка:</span>
              <div className="flex gap-1">
                {[0, 10000, 15000, 20000].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => onSetDeliveryFee(fee)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                      deliveryFee === fee
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
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
      <div className="my-3 flex-1 space-y-1.5 overflow-y-auto pr-0.5 min-h-[120px]">
        {!hasItems && (
          <div className="flex h-full flex-col items-center justify-center text-center p-4 text-zinc-400">
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
            className="w-full rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 py-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 transition hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
          >
            + Добавить доплату / услугу в чек
          </button>
        )}

        {showAddCustom && (
          <form onSubmit={handleAddCustomLine} className="flex gap-1.5 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <input
              type="text"
              required
              placeholder="Название услуги"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none"
            />
            <input
              type="number"
              required
              placeholder="Сумма"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-20 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none"
            />
            <button type="submit" className="rounded-xl bg-amber-500 px-2.5 py-1 text-xs font-bold text-black">
              ✓
            </button>
            <button type="button" onClick={() => setShowAddCustom(false)} className="px-1 text-xs text-zinc-400">
              ✕
            </button>
          </form>
        )}
      </div>

      {/* 3. Скидки, Оплата и Сдача */}
      {hasItems && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2.5 space-y-2.5">
          {/* Скидка */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
              <span>Скидка на чек:</span>
              {totalDiscountAmount > 0 && (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  -{formatNum(totalDiscountAmount)} сум
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {[
                { label: '0%', val: 0 },
                { label: '5%', val: 5 },
                { label: '10%', val: 10 },
                { label: '15%', val: 15 },
                { label: '20%', val: 20 },
              ].map((d) => (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => {
                    onSetDiscountPercent(d.val)
                    onSetCustomDiscount(0)
                  }}
                  className={`flex-1 rounded-xl py-1 text-xs font-bold transition ${
                    discountPercent === d.val && customDiscount === 0
                      ? 'bg-emerald-500 text-black shadow-xs'
                      : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Оплата */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onSetPaymentMethod('cash')
                if (!cashReceived) onSetCashReceived(finalTotal)
              }}
              className={`rounded-xl py-1.5 font-bold transition cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              💵 Наличные
            </button>
            <button
              type="button"
              onClick={() => onSetPaymentMethod('click_payme')}
              className={`rounded-xl py-1.5 font-bold transition cursor-pointer ${
                paymentMethod === 'click_payme'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              💳 Click / Payme / Карта
            </button>
          </div>

          {/* Сдача */}
          {paymentMethod === 'cash' && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-500">Получено:</span>
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => onSetCashReceived(Number(e.target.value))}
                  placeholder={String(finalTotal)}
                  className="w-28 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-right text-xs font-bold text-amber-600 dark:text-amber-400 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => onSetCashReceived(finalTotal)}
                  className="rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                >
                  Ровно
                </button>
                {quickBills.map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => onSetCashReceived(bill)}
                    className="rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                  >
                    {formatNum(bill)}
                  </button>
                ))}
              </div>

              {cashReceived > finalTotal && (
                <div className="flex items-baseline justify-between pt-1 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Сдача:</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatNum(change)} сум
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Итого и кнопка печати */}
      <div className="mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
        <div className="space-y-1 mb-2">
          {subtotal !== finalTotal && (
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Сумма блюд:</span>
              <span>{formatNum(subtotal)} сум</span>
            </div>
          )}
          {totalDiscountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Скидка:</span>
              <span>-{formatNum(totalDiscountAmount)} сум</span>
            </div>
          )}
          {activeDeliveryFee > 0 && (
            <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
              <span>Доставка:</span>
              <span>+{formatNum(activeDeliveryFee)} сум</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              ИТОГО К ОПЛАТЕ:
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {formatNum(finalTotal)}{' '}
              <span className="text-xs font-normal text-zinc-400">сум</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmitOrder}
          disabled={!hasItems}
          className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm sm:text-base font-black text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-25 disabled:hover:bg-amber-500 cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <span>🖨️</span>
          <span>Оформить и распечатать чек</span>
        </button>
      </div>
    </div>
  )
}
