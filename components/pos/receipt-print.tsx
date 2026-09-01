'use client'

import { useState } from 'react'
import {
  Printer,
  ChefHat,
  Receipt as ReceiptIcon,
  Zap,
  X,
} from 'lucide-react'
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
 * Компактный, строгий монохромный вывод без лишней длины и пустот.
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
  const kitchenCount = kitchenItemsCount(items)

  const orderTypeLabel =
    orderType === 'dine_in'
      ? `В ЗАЛЕ ${tableNumber ? `(СТОЛ №${tableNumber})` : ''}`
      : orderType === 'delivery'
      ? 'ДОСТАВКА'
      : 'С СОБОЙ'

  return (
    <div
      id="receipt-print-wrapper"
      className={`receipt-hidden print-mode-${printMode}`}
    >
      {/* ── 1. ГОСТЕВОЙ ЧЕК (Компактный, обрывается сразу после контактов) ── */}
      <div id="receipt-print-area" className="receipt-container guest-receipt-print">
        <div className="receipt font-mono text-[11px] leading-tight text-black p-0 m-0">
          {/* Шапка */}
          <div className="text-center pb-1 border-b border-black">
            <div className="text-sm font-bold tracking-wider">CHICKENFIT</div>
            <div className="text-[10px]">Самарканд, ул. Ибн Сина 136</div>
            <div className="text-[10px] font-bold mt-0.5">
              Чек #{orderNumber} · {orderTypeLabel}
            </div>
            <div className="text-[9px] text-gray-600">{dateTime}</div>
            {orderType === 'delivery' && (
              <div className="text-[9px] mt-0.5 border-t border-dotted border-black pt-0.5">
                {customerPhone && <span>Тел: {customerPhone} </span>}
                {deliveryAddress && <span>Адрес: {deliveryAddress}</span>}
              </div>
            )}
          </div>

          {/* Список блюд */}
          <table className="w-full text-left text-[11px] my-1">
            <thead>
              <tr className="border-b border-black text-[10px]">
                <th className="pb-0.5">Блюдо</th>
                <th className="pb-0.5 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-dotted border-gray-300">
                  <td className="py-0.5 pr-1 align-top">
                    <div>
                      <span className="font-semibold">{item.name}</span>
                      {item.qty > 1 && <span className="font-bold"> ×{item.qty}</span>}
                    </div>
                    {item.notes && item.notes !== item.name && (
                      <div className="text-[9px] text-gray-700">↳ {item.notes}</div>
                    )}
                  </td>
                  <td className="py-0.5 text-right font-bold whitespace-nowrap align-top">
                    {receiptPrice(lineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Скидка/доставка если есть */}
          {(discountAmount > 0 || deliveryFee > 0) && (
            <div className="border-t border-dashed border-black pt-0.5 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Сумма:</span>
                <span>{receiptPrice(subtotal)} сум</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Скидка {discountPercent ? `(${discountPercent}%)` : ''}:</span>
                  <span>-{receiptPrice(discountAmount)} сум</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Доставка:</span>
                  <span>+{receiptPrice(deliveryFee)} сум</span>
                </div>
              )}
            </div>
          )}

          {/* ИТОГО И ОПЛАТА */}
          <div className="border-t-2 border-b border-black py-1 my-1">
            <div className="flex justify-between text-xs font-black">
              <span>ИТОГО:</span>
              <span>{receiptPrice(total)} сум</span>
            </div>
            <div className="flex justify-between text-[10px] mt-0.5">
              <span>Оплата: {paymentMethod === 'cash' ? 'Наличные' : 'Карта / QR'}</span>
              {paymentMethod === 'cash' && changeAmount !== undefined && changeAmount > 0 && (
                <span className="font-bold">Сдача: {receiptPrice(changeAmount)} сум</span>
              )}
            </div>
          </div>

          {/* Конец чека: только контакты и сразу отрез */}
          <div className="text-center text-[10px] font-bold">
            Бесплатная доставка: 93-380-2002
          </div>
        </div>
      </div>

      {/* ── 2. КУХОННЫЙ БЕГУНОК (Супер-экономный, строго внутри одной рамки) ── */}
      <div
        id="kitchen-ticket-print-area"
        className="receipt-container kitchen-receipt-print"
      >
        <div className="receipt receipt--kitchen font-mono text-black p-1.5 border-2 border-black m-0">
          {/* Шапка внутри рамки */}
          <div className="text-center border-b-2 border-black pb-1">
            <div className="text-base font-black tracking-wide">
              КУХНЯ #{orderNumber}
            </div>
            <div className="text-xs font-bold mt-0.5">
              {orderTypeLabel} · {dateTime}
            </div>
          </div>

          {/* Список только горячих блюд кухни */}
          <div className="py-1 space-y-1 text-xs">
            {kitchenItems.length === 0 ? (
              <div className="text-center py-1 text-[10px] text-gray-500 font-sans">
                (Только напитки из бара)
              </div>
            ) : (
              kitchenItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="border-b border-dashed border-gray-400 pb-0.5">
                  <div className="flex items-start gap-1.5">
                    <span className="font-black text-sm bg-black text-white px-1 py-0.2 rounded shrink-0">
                      {item.qty}×
                    </span>
                    <span className="font-bold text-xs leading-tight">
                      {item.name}
                    </span>
                  </div>
                  {item.notes && item.notes !== item.name && (
                    <div className="pl-6 text-[10px] font-semibold text-gray-800">↳ {item.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Итог кухни внутри рамки */}
          <div className="border-t-2 border-black pt-0.5 flex justify-between text-xs font-black">
            <span>ИТОГО БЛЮД:</span>
            <span>{kitchenCount} шт</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Экранный модальный предпросмотр чека перед печатью.
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
  const subtotal = data.subtotal ?? cartTotal(data.items)
  const total =
    data.total ??
    subtotal - (data.discountAmount || 0) + (data.deliveryFee || 0)

  const kitchenItems = getKitchenItems(data.items)
  const kitchenCount = kitchenItemsCount(data.items)

  const orderTypeLabel =
    data.orderType === 'dine_in'
      ? `В ЗАЛЕ ${data.tableNumber ? `(СТОЛ №${data.tableNumber})` : ''}`
      : data.orderType === 'delivery'
      ? 'ДОСТАВКА'
      : 'С СОБОЙ'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-sm flex-col rounded-xl bg-card border border-border text-foreground shadow-2xl overflow-hidden">
        {/* Шапка модалки */}
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="size-4 text-amber-500" />
            <h3 className="text-sm font-bold">
              Чек #{data.orderNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Переключатель вкладок: Гость / Кухня */}
        <div className="flex border-b border-border bg-secondary/30 p-1 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('guest')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'guest'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ReceiptIcon className="size-3.5" />
            <span>Гостевой чек</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'kitchen'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ChefHat className="size-3.5 text-amber-500" />
            <span>Кухня ({kitchenCount} шт)</span>
          </button>
        </div>

        {/* Содержимое чека */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
          {activeTab === 'guest' ? (
            /* Гостевой чек */
            <div className="space-y-2 rounded-lg border border-border bg-background p-3">
              <div className="text-center border-b border-border/60 pb-1.5">
                <div className="text-sm font-bold">CHICKENFIT</div>
                <p className="text-[10px] text-muted-foreground">Самарканд, ул. Ибн Сина 136</p>
                <div className="text-[11px] font-bold text-amber-500 mt-0.5">
                  Чек #{data.orderNumber} · {orderTypeLabel}
                </div>
                <div className="text-[9px] text-muted-foreground">{data.dateTime}</div>
              </div>

              {/* Список позиций */}
              <div className="space-y-1 py-1">
                {data.items.map((it) => (
                  <div key={it.id} className="flex justify-between items-start gap-1 border-b border-border/30 pb-0.5">
                    <div>
                      <span className="font-medium">{it.name}</span>
                      {it.qty > 1 && <span className="font-bold"> ×{it.qty}</span>}
                      {it.notes && it.notes !== it.name && (
                        <p className="text-[10px] text-amber-500">↳ {it.notes}</p>
                      )}
                    </div>
                    <span className="font-bold shrink-0">{receiptPrice(lineTotal(it))} сум</span>
                  </div>
                ))}
              </div>

              {/* Расчет */}
              <div className="border-t border-border/60 pt-1.5 space-y-0.5">
                {((data.discountAmount || 0) > 0 || (data.deliveryFee || 0) > 0) && (
                  <>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Сумма:</span>
                      <span>{receiptPrice(subtotal)} сум</span>
                    </div>
                    {(data.discountAmount || 0) > 0 && (
                      <div className="flex justify-between font-bold text-emerald-500 text-[11px]">
                        <span>Скидка:</span>
                        <span>-{receiptPrice(data.discountAmount || 0)} сум</span>
                      </div>
                    )}
                    {(data.deliveryFee || 0) > 0 && (
                      <div className="flex justify-between text-amber-500 text-[11px]">
                        <span>Доставка:</span>
                        <span>+{receiptPrice(data.deliveryFee || 0)} сум</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-baseline pt-1 border-t border-border font-bold text-sm">
                  <span>ИТОГО:</span>
                  <span className="text-amber-500">{receiptPrice(total)} сум</span>
                </div>

                <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Оплата: {data.paymentMethod === 'cash' ? 'Наличные' : 'Карта / QR'}</span>
                  {data.paymentMethod === 'cash' && data.changeAmount !== undefined && data.changeAmount > 0 && (
                    <span className="text-emerald-500 font-bold">Сдача: {receiptPrice(data.changeAmount)} сум</span>
                  )}
                </div>

                <div className="text-center text-[10px] font-bold pt-1 text-muted-foreground border-t border-border/40">
                  Бесплатная доставка: 93-380-2002
                </div>
              </div>
            </div>
          ) : (
            /* Кухонный бегунок */
            <div className="rounded-lg border-2 border-foreground bg-secondary/30 p-2.5 font-mono">
              <div className="text-center border-b-2 border-foreground pb-1">
                <div className="text-sm font-black">
                  КУХНЯ #{data.orderNumber}
                </div>
                <div className="text-xs font-bold mt-0.5">
                  {orderTypeLabel} · {data.dateTime}
                </div>
              </div>

              <div className="space-y-1.5 py-2">
                {kitchenItems.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-2 font-sans">
                    (Только бар/напитки)
                  </p>
                ) : (
                  kitchenItems.map((it) => (
                    <div key={it.id} className="border-b border-dashed border-border/80 pb-1">
                      <div className="flex items-start gap-1.5">
                        <span className="rounded bg-amber-500 text-black px-1 py-0.2 text-xs font-black shrink-0">
                          {it.qty}×
                        </span>
                        <span className="text-xs font-bold leading-tight">{it.name}</span>
                      </div>
                      {it.notes && it.notes !== it.name && (
                        <div className="pl-6 text-[10px] text-amber-500">↳ {it.notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t-2 border-foreground pt-1 flex justify-between text-xs font-black">
                <span>ИТОГО БЛЮД:</span>
                <span>{kitchenCount} шт</span>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки печати */}
        <div className="border-t border-border bg-secondary/40 p-2.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onPrint('guest')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 py-2 text-xs font-bold text-black shadow-xs transition cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>Чек гостю</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint('kitchen')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary hover:bg-secondary/80 py-2 text-xs font-bold text-foreground border border-border shadow-xs transition cursor-pointer"
            >
              <ChefHat className="size-3.5 text-amber-500" />
              <span>Кухня</span>
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onPrint('both')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
            >
              <Zap className="size-3.5" />
              <span>Оба чека (Гость + Кухня)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
