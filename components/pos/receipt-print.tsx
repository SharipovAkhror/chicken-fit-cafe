'use client'

import type { CartItem } from '@/lib/cart'
import { lineTotal, cartTotal } from '@/lib/cart'
import { receiptPrice } from '@/lib/receipt'
import type { OrderType, PaymentMethod } from '@/lib/orders'

export type ReceiptProps = {
  items: CartItem[]
  orderNumber: string
  dateTime: string
  orderType?: OrderType
  tableNumber?: string
  customerPhone?: string
  deliveryAddress?: string
  subtotal?: number
  discountAmount?: number
  discountPercent?: number
  deliveryFee?: number
  total?: number
  paymentMethod?: PaymentMethod
  cashReceived?: number
  changeAmount?: number
}

/**
 * Чек для термопринтера (58мм / 80мм).
 * Рендерится всегда, но выводится на печать при вызове window.print().
 */
export function ReceiptPrint({
  items,
  orderNumber,
  dateTime,
  orderType = 'takeaway',
  tableNumber,
  customerPhone,
  deliveryAddress,
  subtotal: propSubtotal,
  discountAmount = 0,
  discountPercent,
  deliveryFee = 0,
  total: propTotal,
  paymentMethod = 'cash',
  cashReceived,
  changeAmount,
}: ReceiptProps) {
  const calculatedSubtotal = cartTotal(items)
  const subtotal = propSubtotal ?? calculatedSubtotal
  const total = propTotal ?? (subtotal - discountAmount + deliveryFee)

  const orderTypeLabel =
    orderType === 'dine_in'
      ? `В ЗАЛЕ ${tableNumber ? `(СТОЛ №${tableNumber})` : ''}`
      : orderType === 'delivery'
      ? 'ДОСТАВКА'
      : 'НАВЫНОС (С СОБОЙ)'

  return (
    <div id="receipt-print-area" className="receipt-hidden">
      <div className="receipt">
        {/* Заголовок заведения */}
        <div className="receipt-header">
          <div className="receipt-logo">CHICKENFIT</div>
          <div className="receipt-sub">Вкусно · Полезно · По-домашнему</div>
          <div className="receipt-sub">Самарканд, ул. Ибн Сина 136 (аэропорт)</div>
          <div className="receipt-sub">Тел: 93-380-2002 · @ChickenFit</div>
        </div>

        <div className="receipt-divider" />

        {/* Номер и тип заказа */}
        <div className="receipt-order-type">
          <strong>{orderTypeLabel}</strong>
        </div>

        <div className="receipt-meta">
          <span>{dateTime}</span>
          <span>Чек <strong>{orderNumber}</strong></span>
        </div>

        {orderType === 'delivery' && (
          <div className="receipt-delivery-info">
            {customerPhone && <div>Тел: {customerPhone}</div>}
            {deliveryAddress && <div>Адрес: {deliveryAddress}</div>}
          </div>
        )}

        <div className="receipt-divider" />

        {/* Список блюд */}
        <table className="receipt-items">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Наименование</th>
              <th style={{ textAlign: 'right' }}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="receipt-item-name">
                  {item.name}
                  {item.qty > 1 && (
                    <span className="receipt-item-qty"> × {item.qty}</span>
                  )}
                </td>
                <td className="receipt-item-price">
                  {receiptPrice(lineTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Скидка и доставка если есть */}
        {(discountAmount > 0 || deliveryFee > 0) && (
          <div className="receipt-breakdown" style={{ marginTop: '4px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Подытог:</span>
              <span>{receiptPrice(subtotal)} сум</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Скидка {discountPercent ? `(${discountPercent}%)` : ''}:</span>
                <span>-{receiptPrice(discountAmount)} сум</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Доставка:</span>
                <span>+{receiptPrice(deliveryFee)} сум</span>
              </div>
            )}
          </div>
        )}

        <div className="receipt-divider receipt-divider--bold" />

        {/* Итого и оплата */}
        <div className="receipt-total">
          <span>ИТОГО:</span>
          <span>{receiptPrice(total)} сум</span>
        </div>

        <div className="receipt-payment">
          <div>Оплата: {paymentMethod === 'cash' ? 'Наличные' : 'Click / Payme / Карта'}</div>
          {paymentMethod === 'cash' && cashReceived !== undefined && cashReceived > 0 && (
            <>
              <div>Получено: {receiptPrice(cashReceived)} сум</div>
              <div>Сдача: {receiptPrice(changeAmount ?? 0)} сум</div>
            </>
          )}
        </div>

        <div className="receipt-divider" />

        {/* Подвал чека */}
        <div className="receipt-footer">
          <div>Приятного аппетита! Ждем вас снова!</div>
          <div className="receipt-url">Бесплатная доставка до 1 км · 93-380-2002</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Интерактивная карточка чека для отображения на экране смартфона / ПК.
 */
export function ReceiptModal({
  data,
  onClose,
  onPrint,
}: {
  data: ReceiptProps
  onClose: () => void
  onPrint: () => void
}) {
  const calculatedSubtotal = cartTotal(data.items)
  const subtotal = data.subtotal ?? calculatedSubtotal
  const total = data.total ?? (subtotal - (data.discountAmount || 0) + (data.deliveryFee || 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm print:hidden">
      <div className="flex flex-col max-h-[92vh] w-full max-w-sm rounded-3xl bg-white text-zinc-900 shadow-2xl p-5 border border-zinc-200">
        {/* Заголовок */}
        <div className="text-center border-b border-zinc-200 pb-3">
          <div className="text-2xl font-black tracking-wider text-black">CHICKENFIT</div>
          <p className="text-xs text-zinc-500 font-semibold">Вкусно · Полезно · По-домашнему</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Самарканд, ул. Ибн Сина 136 · 93-380-2002</p>
        </div>

        {/* Мета-информация */}
        <div className="py-2.5 border-b border-dashed border-zinc-300 text-xs space-y-1">
          <div className="flex justify-between font-bold">
            <span>
              {data.orderType === 'dine_in'
                ? `В зале (Стол №${data.tableNumber || 1})`
                : data.orderType === 'delivery'
                ? 'Доставка'
                : 'С собой (навынос)'}
            </span>
            <span className="text-amber-600 font-black">Чек #{data.orderNumber}</span>
          </div>
          <div className="flex justify-between text-zinc-500 text-[11px]">
            <span>{data.dateTime}</span>
            <span>Кассир: Администратор</span>
          </div>
          {data.orderType === 'delivery' && (
            <div className="pt-1 text-[11px] text-zinc-600">
              {data.customerPhone && <p>Тел: {data.customerPhone}</p>}
              {data.deliveryAddress && <p>Адрес: {data.deliveryAddress}</p>}
            </div>
          )}
        </div>

        {/* Список позиций */}
        <div className="my-3 flex-1 overflow-y-auto space-y-1.5 text-xs">
          {data.items.map((it) => (
            <div key={it.id} className="flex justify-between items-start gap-2">
              <span className="leading-snug">
                {it.name} <span className="text-zinc-500">× {it.qty}</span>
              </span>
              <span className="font-bold shrink-0">{receiptPrice(lineTotal(it))} сум</span>
            </div>
          ))}
        </div>

        {/* Расчет и скидки */}
        <div className="border-t border-dashed border-zinc-300 pt-2 space-y-1 text-xs">
          {((data.discountAmount || 0) > 0 || (data.deliveryFee || 0) > 0) && (
            <>
              <div className="flex justify-between text-zinc-500">
                <span>Подытог:</span>
                <span>{receiptPrice(subtotal)} сум</span>
              </div>
              {(data.discountAmount || 0) > 0 && (
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Скидка {data.discountPercent ? `(${data.discountPercent}%)` : ''}:</span>
                  <span>-{receiptPrice(data.discountAmount || 0)} сум</span>
                </div>
              )}
              {(data.deliveryFee || 0) > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Доставка:</span>
                  <span>+{receiptPrice(data.deliveryFee || 0)} сум</span>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800 text-sm font-black">
            <span>ИТОГО К ОПЛАТЕ:</span>
            <span className="text-base font-black text-amber-600">{receiptPrice(total)} сум</span>
          </div>

          <div className="pt-1 text-[11px] text-zinc-500 space-y-0.5">
            <div className="flex justify-between">
              <span>Оплата:</span>
              <span className="font-semibold">{data.paymentMethod === 'cash' ? 'Наличные' : 'Click / Payme'}</span>
            </div>
            {data.paymentMethod === 'cash' && data.cashReceived !== undefined && (
              <>
                <div className="flex justify-between">
                  <span>Получено:</span>
                  <span>{receiptPrice(data.cashReceived)} сум</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Сдача:</span>
                  <span>{receiptPrice(data.changeAmount || 0)} сум</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div className="mt-4 flex gap-2 border-t border-zinc-200 pt-3">
          <button
            type="button"
            onClick={onPrint}
            className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-bold text-black shadow transition hover:bg-amber-400 active:scale-98"
          >
            🖨️ Печать чека
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-200"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
