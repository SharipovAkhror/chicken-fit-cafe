'use client'

import type { CartItem } from '@/lib/cart'
import { lineTotal, cartTotal } from '@/lib/cart'
import { receiptPrice } from '@/lib/receipt'
import type { OrderType, PaymentMethod } from '@/lib/orders'

type Props = {
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
}: Props) {
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
          <div className="receipt-logo">ChickenFit</div>
          <div className="receipt-sub">Кафе вкусной курочки · Самарканд</div>
        </div>

        <div className="receipt-divider" />

        {/* Номер и тип заказа */}
        <div className="receipt-order-type">
          <strong>{orderTypeLabel}</strong>
        </div>

        <div className="receipt-meta">
          <span>{dateTime}</span>
          <span>Заказ <strong>{orderNumber}</strong></span>
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
          <div>Оплата: {paymentMethod === 'cash' ? 'Наличные' : 'Click / Payme'}</div>
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
          <div>Приятного аппетита!</div>
          <div>Спасибо, что выбираете нас!</div>
          <div className="receipt-url">ChickenFit Samarkand</div>
        </div>
      </div>
    </div>
  )
}
