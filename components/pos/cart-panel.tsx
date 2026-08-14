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
    <div className="group flex flex-col gap-1.5 rounded-xl bg-white/[0.04] p-2.5 transition hover:bg-white/[0.07]">
      {/* Название + сумма строки */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium leading-snug text-white/90">
          {item.name}
        </span>
        <span className="shrink-0 text-xs sm:text-sm font-bold text-white">
          {formatNum(lineTotal(item))} сум
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
          <span className="min-w-[1.75rem] text-center text-xs font-bold">
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
            title="Нажмите для изменения цены единицы"
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition hover:bg-white/10 ${
              modified ? 'font-semibold text-amber-400' : 'text-white/60'
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

  // Быстрые купюры
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
    <div className="flex h-full flex-col bg-zinc-950/60 rounded-2xl border border-white/10 p-3 sm:p-4 text-white">
      {/* Верх: номер заказа, тип и кнопка закрытия на мобильных */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
            {orderNumber}
          </span>
          <h2 className="text-base font-bold text-white">Текущий чек</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasItems && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-2.5 py-1 text-xs text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
            >
              Сброс
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white lg:hidden"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 1. Выбор формата заказа */}
      <div className="pt-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => onSetOrderType('dine_in')}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
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
            className={`rounded-lg py-1.5 transition cursor-pointer ${
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
            className={`rounded-lg py-1.5 transition cursor-pointer ${
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
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs text-white/50 shrink-0">Стол:</span>
            {['1', '2', '3', '4', '5', '6', '7', '8', 'Бар'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onSetTableNumber(num)}
                className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                  tableNumber === num
                    ? 'bg-amber-400 text-black shadow'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {orderType === 'delivery' && (
          <div className="mt-2.5 space-y-2 rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
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
            {/* Доставка: выбор стоимости */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
              <span className="text-[11px] text-white/60">Услуга доставки:</span>
              <div className="flex gap-1">
                {[0, 10000, 15000, 20000].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => onSetDeliveryFee(fee)}
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${
                      deliveryFee === fee
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
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
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-white/30">
              Нажимайте на блюда слева для добавления в чек
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

        {/* Кнопка добавления произвольной доплаты / услуги */}
        {hasItems && !showAddCustom && (
          <button
            type="button"
            onClick={() => setShowAddCustom(true)}
            className="w-full rounded-lg border border-dashed border-white/10 py-1.5 text-[11px] text-white/50 transition hover:border-amber-500/40 hover:text-amber-400"
          >
            + Добавить доплату / услугу в чек
          </button>
        )}

        {showAddCustom && (
          <form onSubmit={handleAddCustomLine} className="flex gap-1.5 p-2 rounded-xl bg-white/5">
            <input
              type="text"
              required
              placeholder="Название услуги"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none"
            />
            <input
              type="number"
              required
              placeholder="Сумма"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none"
            />
            <button type="submit" className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-bold text-black">
              ✓
            </button>
            <button type="button" onClick={() => setShowAddCustom(false)} className="px-1 text-xs text-white/50">
              ✕
            </button>
          </form>
        )}
      </div>

      {/* 3. Скидки, Доставка и Способ оплаты */}
      {hasItems && (
        <div className="border-t border-white/10 pt-2.5 space-y-2.5">
          {/* Блок скидки на чек */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>Скидка на чек:</span>
              {totalDiscountAmount > 0 && (
                <span className="font-bold text-emerald-400">
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
                  className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${
                    discountPercent === d.val && customDiscount === 0
                      ? 'bg-emerald-500 text-black font-bold shadow'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Переключатель способа оплаты */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onSetPaymentMethod('cash')
                if (!cashReceived) onSetCashReceived(finalTotal)
              }}
              className={`rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              💵 Наличные
            </button>
            <button
              type="button"
              onClick={() => onSetPaymentMethod('click_payme')}
              className={`rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                paymentMethod === 'click_payme'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              💳 Click / Payme / Карта
            </button>
          </div>

          {/* Расчет наличных / сдачи */}
          {paymentMethod === 'cash' && (
            <div className="rounded-xl bg-white/[0.03] p-2 space-y-1.5 border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Получено:</span>
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => onSetCashReceived(Number(e.target.value))}
                  placeholder={String(finalTotal)}
                  className="w-28 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-right text-xs font-bold text-amber-300 outline-none focus:border-amber-400"
                />
              </div>

              {/* Быстрые кнопки купюр */}
              <div className="flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => onSetCashReceived(finalTotal)}
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

              {cashReceived > finalTotal && (
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
      <div className="mt-2 border-t border-white/10 pt-2.5">
        <div className="space-y-1 mb-2">
          {subtotal !== finalTotal && (
            <div className="flex justify-between text-xs text-white/50">
              <span>Сумма блюд:</span>
              <span>{formatNum(subtotal)} сум</span>
            </div>
          )}
          {totalDiscountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-400">
              <span>Скидка:</span>
              <span>-{formatNum(totalDiscountAmount)} сум</span>
            </div>
          )}
          {activeDeliveryFee > 0 && (
            <div className="flex justify-between text-xs text-amber-300">
              <span>Доставка:</span>
              <span>+{formatNum(activeDeliveryFee)} сум</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
              ИТОГО К ОПЛАТЕ:
            </span>
            <span className="text-xl font-extrabold text-amber-400">
              {formatNum(finalTotal)}{' '}
              <span className="text-xs font-normal text-white/50">сум</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmitOrder}
          disabled={!hasItems}
          className="w-full rounded-xl bg-amber-500 py-3 text-base font-bold text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-25 disabled:hover:bg-amber-500 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
        >
          <span>🖨️</span>
          <span>Оформить и распечатать чек</span>
        </button>
      </div>
    </div>
  )
}
