'use client'

import { useState } from 'react'
import type { CartItem } from '@/lib/cart'
import { lineTotal, cartTotal, getKitchenItems, kitchenItemsCount } from '@/lib/cart'
import { receiptPrice } from '@/lib/receipt'
import type { OrderType, PaymentMethod } from '@/lib/orders'

export type PrintMode = 'guest' | 'kitchen' | 'both'

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
  printMode?: PrintMode
}

/**
 * Чек для термопринтера (58мм / 80мм).
 * Рендерит гостевой чек и кухонный бегунок.
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
  printMode = 'guest',
}: ReceiptProps) {
  const calculatedSubtotal = cartTotal(items)
  const subtotal = propSubtotal ?? calculatedSubtotal
  const total = propTotal ?? subtotal - discountAmount + deliveryFee
  const kitchenItems = getKitchenItems(items)
  const totalKitchenDishes = kitchenItemsCount(items)

  const orderTypeLabel =
    orderType === 'dine_in'
      ? `В ЗАЛЕ ${tableNumber ? `(СТОЛ №${tableNumber})` : ''}`
      : orderType === 'delivery'
      ? 'ДОСТАВКА'
      : 'НАВЫНОС (С СОБОЙ)'

  return (
    <div
      id="receipt-print-wrapper"
      className={`receipt-hidden print-mode-${printMode}`}
    >
      {/* ── 1. ГОСТЕВОЙ ЧЕК (С ценами, скидками и напитками) ── */}
      <div id="receipt-print-area" className="receipt-container guest-receipt-print">
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
            <span>
              Чек <strong>{orderNumber}</strong>
            </span>
          </div>

          {orderType === 'delivery' && (
            <div className="receipt-delivery-info">
              {customerPhone && <div>Тел: {customerPhone}</div>}
              {deliveryAddress && <div>Адрес: {deliveryAddress}</div>}
            </div>
          )}

          <div className="receipt-divider" />

          {/* Список всех блюд и напитков */}
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
                    <div>
                      {item.name}
                      {item.qty > 1 && (
                        <span className="receipt-item-qty"> × {item.qty}</span>
                      )}
                    </div>
                    {item.notes && item.notes !== item.name && (
                      <div className="receipt-item-subnote">↳ {item.notes}</div>
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
            <div
              className="receipt-breakdown"
              style={{ marginTop: '4px', fontSize: '11px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Подытог:</span>
                <span>{receiptPrice(subtotal)} сум</span>
              </div>
              {discountAmount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                  }}
                >
                  <span>
                    Скидка {discountPercent ? `(${discountPercent}%)` : ''}:
                  </span>
                  <span>-{receiptPrice(discountAmount)} сум</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
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
            <div>
              Оплата:{' '}
              {paymentMethod === 'cash'
                ? 'Наличные'
                : 'Click / Payme / Карта'}
            </div>
            {paymentMethod === 'cash' &&
              cashReceived !== undefined &&
              cashReceived > 0 && (
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
            <div className="receipt-url">
              Бесплатная доставка до 1 км · 93-380-2002
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. КУХОННЫЙ БЕГУНОК (Без цен, без компотов/напитков) ── */}
      <div
        id="kitchen-ticket-print-area"
        className="receipt-container kitchen-receipt-print"
      >
        <div className="receipt receipt--kitchen">
          <div className="kitchen-badge-header">
            <div className="kitchen-title">*** КУХНЯ ***</div>
            <div className="kitchen-order-number">{orderNumber}</div>
            <div className="kitchen-order-type">{orderTypeLabel}</div>
          </div>

          <div className="receipt-meta" style={{ marginTop: '2mm' }}>
            <span>{dateTime}</span>
            <span>Поварам</span>
          </div>

          <div className="receipt-divider receipt-divider--bold" />

          {/* Список блюд кухни */}
          {kitchenItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4mm 0',
                fontSize: '11px',
                color: '#666',
              }}
            >
              (В заказе только напитки из бара / на кухню ничего нет)
            </div>
          ) : (
            <div className="kitchen-items-list">
              {kitchenItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="kitchen-item-row">
                  <div className="kitchen-item-qty-badge">
                    [ {item.qty} × ]
                  </div>
                  <div className="kitchen-item-details">
                    <div className="kitchen-item-name">{item.name}</div>
                    {item.notes && item.notes !== item.name && (
                      <div className="kitchen-item-notes">↳ {item.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="receipt-divider receipt-divider--bold" />

          <div className="kitchen-footer-summary">
            <div>
              ИТОГО БЛЮД: <strong>{totalKitchenDishes} шт.</strong>
            </div>
            <div className="kitchen-stamp">Приготовить оперативно</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Интерактивная карточка чека для отображения на экране POS-терминала.
 * Позволяет переключать просмотр (Гостевой / Кухонный) и печатать отдельно или вместе.
 */
export function ReceiptModal({
  data,
  onClose,
  onPrint,
}: {
  data: ReceiptProps
  onClose: () => void
  onPrint: (mode: PrintMode) => void
}) {
  const [activeTab, setActiveTab] = useState<'guest' | 'kitchen'>('guest')

  const calculatedSubtotal = cartTotal(data.items)
  const subtotal = data.subtotal ?? calculatedSubtotal
  const total =
    data.total ??
    subtotal - (data.discountAmount || 0) + (data.deliveryFee || 0)
  const kitchenItems = getKitchenItems(data.items)
  const kitchenCount = kitchenItemsCount(data.items)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md print:hidden">
      <div className="flex flex-col max-h-[94vh] w-full max-w-md rounded-3xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Вкладки переключения между гостевым и кухонным чеком */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('guest')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === 'guest'
                ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>📄</span>
            <span>Гостевой чек (с ценами)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === 'kitchen'
                ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>👨‍🍳</span>
            <span>Кухня ({kitchenCount} блюд)</span>
          </button>
        </div>

        {/* ── Содержимое активного чека ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'guest' ? (
            /* Гостевой чек */
            <div className="space-y-3">
              <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="text-2xl font-black tracking-wider text-black dark:text-white">
                  CHICKENFIT
                </div>
                <p className="text-xs text-zinc-500 font-semibold">
                  Вкусно · Полезно · По-домашнему
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Самарканд, ул. Ибн Сина 136 · 93-380-2002
                </p>
              </div>

              {/* Мета-информация */}
              <div className="py-2 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span>
                    {data.orderType === 'dine_in'
                      ? `В зале (Стол №${data.tableNumber || 1})`
                      : data.orderType === 'delivery'
                      ? 'Доставка'
                      : 'С собой (навынос)'}
                  </span>
                  <span className="text-amber-600 font-black">
                    Чек {data.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>{data.dateTime}</span>
                  <span>Кассир: Администратор</span>
                </div>
                {data.orderType === 'delivery' && (
                  <div className="pt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    {data.customerPhone && <p>Тел: {data.customerPhone}</p>}
                    {data.deliveryAddress && (
                      <p>Адрес: {data.deliveryAddress}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Список позиций */}
              <div className="space-y-2 text-xs py-1">
                {data.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex justify-between items-start gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-1.5"
                  >
                    <div className="leading-snug">
                      <span className="font-semibold">{it.name}</span>{' '}
                      <span className="text-zinc-500 font-bold">× {it.qty}</span>
                      {it.notes && it.notes !== it.name && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          ↳ {it.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-bold shrink-0">
                      {receiptPrice(lineTotal(it))} сум
                    </span>
                  </div>
                ))}
              </div>

              {/* Расчет и скидки */}
              <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-2 space-y-1 text-xs">
                {((data.discountAmount || 0) > 0 ||
                  (data.deliveryFee || 0) > 0) && (
                  <>
                    <div className="flex justify-between text-zinc-500">
                      <span>Подытог:</span>
                      <span>{receiptPrice(subtotal)} сум</span>
                    </div>
                    {(data.discountAmount || 0) > 0 && (
                      <div className="flex justify-between font-bold text-emerald-600">
                        <span>
                          Скидка{' '}
                          {data.discountPercent
                            ? `(${data.discountPercent}%)`
                            : ''}
                          :
                        </span>
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

                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800 dark:border-zinc-200 text-sm font-black">
                  <span>ИТОГО К ОПЛАТЕ:</span>
                  <span className="text-base font-black text-amber-600">
                    {receiptPrice(total)} сум
                  </span>
                </div>

                <div className="pt-1 text-[11px] text-zinc-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Оплата:</span>
                    <span className="font-semibold">
                      {data.paymentMethod === 'cash'
                        ? 'Наличные'
                        : 'Click / Payme'}
                    </span>
                  </div>
                  {data.paymentMethod === 'cash' &&
                    data.cashReceived !== undefined && (
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
            </div>
          ) : (
            /* Кухонный бегунок */
            <div className="space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 font-mono">
              <div className="text-center border-b-2 border-zinc-900 dark:border-zinc-100 pb-2">
                <div className="text-xs font-black tracking-widest uppercase text-zinc-500">
                  *** ЗАКАЗ НА КУХНЮ ***
                </div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {data.orderNumber}
                </div>
                <div className="text-sm font-black mt-1">
                  {data.orderType === 'dine_in'
                    ? `🍽️ В ЗАЛЕ (СТОЛ №${data.tableNumber || 1})`
                    : data.orderType === 'delivery'
                    ? '🛵 ДОСТАВКА'
                    : '🛍️ НАВЫНОС'}
                </div>
              </div>

              <div className="flex justify-between text-xs text-zinc-500 py-1 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                <span>Время: {data.dateTime}</span>
                <span>Без цен / Только еда</span>
              </div>

              {/* Список блюд кухни */}
              <div className="space-y-3 py-2">
                {kitchenItems.length === 0 ? (
                  <p className="text-xs text-center text-zinc-400 py-4 font-sans">
                    В этом заказе нет блюд для кухни (только напитки)
                  </p>
                ) : (
                  kitchenItems.map((it) => (
                    <div
                      key={it.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 space-y-1"
                    >
                      <div className="flex items-start gap-2">
                        <span className="rounded-lg bg-amber-500 text-black px-1.5 py-0.5 text-xs font-black shrink-0">
                          {it.qty} ×
                        </span>
                        <span className="text-xs sm:text-sm font-bold leading-tight">
                          {it.name}
                        </span>
                      </div>
                      {it.notes && (
                        <div className="pl-8 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          ↳ {it.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t-2 border-zinc-900 dark:border-zinc-100 pt-2 flex justify-between items-center text-xs font-bold">
                <span>ИТОГО КУХОННЫХ БЛЮД:</span>
                <span className="text-sm font-black text-amber-600">
                  {kitchenCount} шт.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки действий и печати */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 sm:p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPrint('guest')}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 py-3 text-xs font-black text-black shadow-md transition hover:bg-amber-400 active:scale-98 cursor-pointer"
            >
              <span>🖨️</span>
              <span>Гостевой чек</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint('kitchen')}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-3 text-xs font-black shadow-md transition hover:opacity-90 active:scale-98 cursor-pointer"
            >
              <span>👨‍🍳</span>
              <span>Чек на кухню</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPrint('both')}
              className="flex-1 rounded-2xl border border-amber-500 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer text-center"
            >
              ⚡ Распечатать оба чека (Гость + Кухня)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
