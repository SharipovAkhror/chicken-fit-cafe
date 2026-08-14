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
  onSetOrderType: (type: OrderType) => void
  onSetTableNumber: (table: string) => void
  onSetCustomerPhone: (phone: string) => void
  onSetDeliveryAddress: (address: string) => void
  onSetPaymentMethod: (method: PaymentMethod) => void
  onSetCashReceived: (val: number) => void
  onSetQty: (id: string, qty: number) => void
  onSetPrice: (id: string, price: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onSubmitOrder: () => void
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
    <div className="group flex flex-col gap-1.5 rounded-xl bg-white/[0.04] p-2.5 transition hover:bg-white/[0.07]">
      {/* Название + сумма строки */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug text-white/90">
          {item.name}
        </span>
        <span className="shrink-0 text-sm font-bold text-white">
          {formatNum(lineTotal(item))}
        </span>
      </div>

      {/* Управление количеством и ценой */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-white/10">
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty - 1)}
            className="flex size-7 items-center justify-center rounded-lg text-base text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            −
          </button>
          <span className="min-w-[1.75rem] text-center text-xs font-semibold">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty + 1)}
            className="flex size-7 items-center justify-center rounded-lg text-base text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            +
          </button>
        </div>

        <span className="text-white/30 text-xs">×</span>
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
            className="w-20 rounded-md border border-amber-500/40 bg-white/10 px-1.5 py-0.5 text-xs text-amber-300 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEditPrice}
            title="Нажмите для изменения цены"
            className={`rounded px-1.5 py-0.5 text-xs transition hover:bg-white/10 ${
              modified ? 'font-semibold text-amber-400' : 'text-white/50'
            }`}
          >
            {formatNum(item.price)}
          </button>
        )}

        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex size-7 items-center justify-center rounded-lg text-white/30 transition hover:bg-red-500/20 hover:text-red-400"
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
  onSetOrderType,
  onSetTableNumber,
  onSetCustomerPhone,
  onSetDeliveryAddress,
  onSetPaymentMethod,
  onSetCashReceived,
  onSetQty,
  onSetPrice,
  onRemove,
  onClear,
  onSubmitOrder,
}: Props) {
  const total = cartTotal(items)
  const hasItems = items.length > 0
  const change = Math.max(0, cashReceived - total)

  // Быстрые кнопки купюр
  const quickBills = [50000, 100000, 200000]

  return (
    <div className="flex h-full flex-col bg-zinc-950/40 rounded-2xl border border-white/5 p-3 sm:p-4">
      {/* Верх: номер заказа и тип */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
            {orderNumber}
          </span>
          <h2 className="text-base font-bold text-white">Новый заказ</h2>
        </div>
        {hasItems && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2.5 py-1 text-xs text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
          >
            Сброс
          </button>
        )}
      </div>

      {/* 1. Выбор формата заказа */}
      <div className="pt-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => onSetOrderType('dine_in')}
            className={`rounded-lg py-1.5 transition ${
              orderType === 'dine_in'
                ? 'bg-amber-500 font-bold text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            🍽️ В зале
          </button>
          <button
            type="button"
            onClick={() => onSetOrderType('takeaway')}
            className={`rounded-lg py-1.5 transition ${
              orderType === 'takeaway'
                ? 'bg-amber-500 font-bold text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            🛍️ С собой
          </button>
          <button
            type="button"
            onClick={() => onSetOrderType('delivery')}
            className={`rounded-lg py-1.5 transition ${
              orderType === 'delivery'
                ? 'bg-amber-500 font-bold text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            🛵 Доставка
          </button>
        </div>

        {/* Доп. поля в зависимости от типа заказа */}
        {orderType === 'dine_in' && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs text-white/50">Стол:</span>
            {['1', '2', '3', '4', '5', '6'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onSetTableNumber(num)}
                className={`size-7 rounded-lg text-xs font-bold transition ${
                  tableNumber === num
                    ? 'bg-amber-400 text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {orderType === 'delivery' && (
          <div className="mt-2 space-y-1.5">
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => onSetCustomerPhone(e.target.value)}
              placeholder="Телефон клиента (+998...)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400/60"
            />
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => onSetDeliveryAddress(e.target.value)}
              placeholder="Адрес доставки / ориентир"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400/60"
            />
          </div>
        )}
      </div>

      {/* 2. Список блюд в чеке */}
      <div className="my-3 flex-1 space-y-1.5 overflow-y-auto pr-0.5 min-h-[140px]">
        {!hasItems && (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-white/30">
              Выберите блюда из меню слева
            </p>
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
      </div>

      {/* 3. Способ оплаты и сдача */}
      {hasItems && (
        <div className="border-t border-white/10 pt-2 space-y-2">
          {/* Переключатель способа оплаты */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onSetPaymentMethod('cash')
                if (!cashReceived) onSetCashReceived(total)
              }}
              className={`rounded-lg py-1.5 font-semibold transition ${
                paymentMethod === 'cash'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              💵 Наличные
            </button>
            <button
              type="button"
              onClick={() => onSetPaymentMethod('click_payme')}
              className={`rounded-lg py-1.5 font-semibold transition ${
                paymentMethod === 'click_payme'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              💳 Click / Payme
            </button>
          </div>

          {/* Расчет наличных / сдачи */}
          {paymentMethod === 'cash' && (
            <div className="rounded-xl bg-white/[0.03] p-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Получено:</span>
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => onSetCashReceived(Number(e.target.value))}
                  placeholder={String(total)}
                  className="w-28 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-right text-xs font-bold text-amber-300 outline-none"
                />
              </div>

              {/* Быстрые кнопки купюр */}
              <div className="flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => onSetCashReceived(total)}
                  className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10"
                >
                  Ровно
                </button>
                {quickBills.map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => onSetCashReceived(bill)}
                    className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10"
                  >
                    {formatNum(bill)}
                  </button>
                ))}
              </div>

              {cashReceived > total && (
                <div className="flex items-baseline justify-between pt-1 border-t border-white/5 text-xs">
                  <span className="text-emerald-400 font-semibold">Сдача:</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatNum(change)} сум
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Итого и кнопка печати чека */}
      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
            ИТОГО:
          </span>
          <span className="text-xl font-extrabold text-amber-400">
            {formatNum(total)}{' '}
            <span className="text-xs font-normal text-white/50">сум</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onSubmitOrder}
          disabled={!hasItems}
          className="w-full rounded-xl bg-amber-500 py-3 text-base font-bold text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-25 disabled:hover:bg-amber-500 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
        >
          <span>🖨️</span>
          <span>Оформить и печать чека</span>
        </button>
      </div>
    </div>
  )
}
