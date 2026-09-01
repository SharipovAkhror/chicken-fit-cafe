'use client'

import { useState } from 'react'
import {
  Printer,
  ChefHat,
  Receipt as ReceiptIcon,
  Zap,
  X,
  Check,
  Store,
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
      {/* ── 1. ГОСТЕВОЙ ЧЕК ── */}
      <div id="receipt-print-area" className="receipt-container guest-receipt-print">
        <div className="receipt font-mono text-xs text-black">
          {/* Заголовок заведения */}
          <div className="receipt-header text-center">
            <div className="text-base font-bold tracking-wider">CHICKENFIT</div>
            <div className="text-[10px]">Вкусно · Полезно · По-домашнему</div>
            <div className="text-[10px]">Самарканд, ул. Ибн Сина 136</div>
            <div className="text-[10px]">Тел: 93-380-2002 · @ChickenFit</div>
          </div>

          <div className="receipt-divider border-b border-dashed border-black my-1.5" />

          {/* Номер и тип заказа */}
          <div className="text-center font-bold text-xs">
            {orderTypeLabel}
          </div>

          <div className="flex justify-between text-[10px] my-1">
            <span>{dateTime}</span>
            <span>
              Чек <strong>{orderNumber}</strong>
            </span>
          </div>

          {orderType === 'delivery' && (
            <div className="text-[10px] border-b border-dashed border-black pb-1 mb-1">
              {customerPhone && <div>Тел: {customerPhone}</div>}
              {deliveryAddress && <div>Адрес: {deliveryAddress}</div>}
            </div>
          )}

          <div className="receipt-divider border-b border-dashed border-black my-1" />

          {/* Список всех блюд и напитков */}
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-black">
                <th className="pb-1 font-bold">Наименование</th>
                <th className="pb-1 text-right font-bold">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-dotted border-gray-400">
                  <td className="py-1 pr-1">
                    <div>
                      {item.name}
                      {item.qty > 1 && (
                        <span className="font-bold"> × {item.qty}</span>
                      )}
                    </div>
                    {item.notes && item.notes !== item.name && (
                      <div className="text-[9px] text-gray-700">↳ {item.notes}</div>
                    )}
                  </td>
                  <td className="py-1 text-right font-bold whitespace-nowrap align-top">
                    {receiptPrice(lineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Скидка и доставка */}
          {(discountAmount > 0 || deliveryFee > 0) && (
            <div className="mt-1 pt-1 border-t border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Подытог:</span>
                <span>{receiptPrice(subtotal)} сум</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>
                    Скидка {discountPercent ? `(${discountPercent}%)` : ''}:
                  </span>
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

          <div className="receipt-divider border-b-2 border-black my-1.5" />

          {/* Итого и оплата */}
          <div className="flex justify-between text-sm font-black my-1">
            <span>ИТОГО:</span>
            <span>{receiptPrice(total)} сум</span>
          </div>

          <div className="text-[10px] space-y-0.5 pt-1 border-t border-dashed border-black">
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

          <div className="receipt-divider border-b border-dashed border-black my-1.5" />

          {/* Подвал чека */}
          <div className="text-center text-[10px] space-y-0.5 pt-1">
            <div>Приятного аппетита! Ждем вас снова!</div>
            <div>Доставка: 93-380-2002</div>
          </div>
        </div>
      </div>

      {/* ── 2. КУХОННЫЙ БЕГУНОК (БЕЗ ЦЕН, ТОЛЬКО ГОРЯЧАЯ ЕДА) ── */}
      <div
        id="kitchen-ticket-print-area"
        className="receipt-container kitchen-receipt-print"
      >
        <div className="receipt receipt--kitchen font-mono text-xs text-black">
          <div className="text-center border-b-2 border-black pb-1.5">
            <div className="text-xs font-bold tracking-widest uppercase">*** КУХНЯ ***</div>
            <div className="text-2xl font-black">{orderNumber}</div>
            <div className="text-xs font-bold">{orderTypeLabel}</div>
          </div>

          <div className="flex justify-between text-[10px] my-1">
            <span>{dateTime}</span>
            <span>Поварам</span>
          </div>

          <div className="receipt-divider border-b-2 border-black my-1" />

          {/* Список блюд кухни */}
          {kitchenItems.length === 0 ? (
            <div className="text-center py-2 text-[10px] text-gray-500 font-sans">
              (В заказе только напитки из бара / на кухню ничего нет)
            </div>
          ) : (
            <div className="space-y-2 py-1">
              {kitchenItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="border-b border-dashed border-gray-400 pb-1">
                  <div className="flex items-start gap-2">
                    <span className="font-black text-sm bg-black text-white px-1 rounded">
                      {item.qty}×
                    </span>
                    <span className="font-bold text-xs sm:text-sm leading-tight">
                      {item.name}
                    </span>
                  </div>
                  {item.notes && item.notes !== item.name && (
                    <div className="pl-6 text-[10px] text-gray-700">↳ {item.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t-2 border-black pt-1 flex justify-between text-[11px] font-bold mt-2">
            <span>БЛЮД НА КУХНЮ:</span>
            <span>{kitchenItemsCount(items)} шт.</span>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl bg-card border border-border text-foreground shadow-2xl overflow-hidden">
        {/* Шапка модалки */}
        <div className="flex items-center justify-between border-b border-border/70 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="size-5 text-amber-500" />
            <h3 className="text-base font-bold">
              Чек заказа <span className="font-mono text-amber-500">#{data.orderNumber}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Переключатель вкладок: Гость / Кухня */}
        <div className="flex border-b border-border/70 bg-secondary/30 p-1.5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('guest')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'guest'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ReceiptIcon className="size-3.5" />
            <span>Гостевой чек</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'kitchen'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ChefHat className="size-3.5 text-amber-500" />
            <span>Кухня ({kitchenCount} блюд)</span>
          </button>
        </div>

        {/* Содержимое чека */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
          {activeTab === 'guest' ? (
            <div className="space-y-3">
              <div className="text-center border-b border-border/60 pb-2">
                <div className="text-lg font-bold">CHICKENFIT</div>
                <p className="text-[11px] text-muted-foreground">Вкусно · Полезно · По-домашнему</p>
                <p className="text-[10px] text-muted-foreground">Самарканд, ул. Ибн Сина 136 · 93-380-2002</p>
              </div>

              <div className="py-1 border-b border-dashed border-border/60 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span>
                    {data.orderType === 'dine_in'
                      ? `В зале (Стол №${data.tableNumber || 1})`
                      : data.orderType === 'delivery'
                      ? 'Доставка'
                      : 'С собой (навынос)'}
                  </span>
                  <span className="text-amber-500">#{data.orderNumber}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{data.dateTime}</span>
                  <span>Кассир</span>
                </div>
                {data.orderType === 'delivery' && (
                  <div className="pt-1 text-[11px] text-muted-foreground">
                    {data.customerPhone && <p>Тел: {data.customerPhone}</p>}
                    {data.deliveryAddress && <p>Адрес: {data.deliveryAddress}</p>}
                  </div>
                )}
              </div>

              {/* Список позиций */}
              <div className="space-y-1.5 py-1">
                {data.items.map((it) => (
                  <div key={it.id} className="flex justify-between items-start gap-2 border-b border-border/40 pb-1">
                    <div>
                      <span>{it.name}</span>
                      {it.qty > 1 && <span className="font-bold"> × {it.qty}</span>}
                      {it.notes && it.notes !== it.name && (
                        <p className="text-[10px] text-amber-500">↳ {it.notes}</p>
                      )}
                    </div>
                    <span className="font-bold shrink-0">{receiptPrice(lineTotal(it))} сум</span>
                  </div>
                ))}
              </div>

              {/* Расчет */}
              <div className="border-t border-dashed border-border/60 pt-2 space-y-1">
                {((data.discountAmount || 0) > 0 || (data.deliveryFee || 0) > 0) && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Подытог:</span>
                      <span>{receiptPrice(subtotal)} сум</span>
                    </div>
                    {(data.discountAmount || 0) > 0 && (
                      <div className="flex justify-between font-bold text-emerald-500">
                        <span>Скидка:</span>
                        <span>-{receiptPrice(data.discountAmount || 0)} сум</span>
                      </div>
                    )}
                    {(data.deliveryFee || 0) > 0 && (
                      <div className="flex justify-between text-amber-500">
                        <span>Доставка:</span>
                        <span>+{receiptPrice(data.deliveryFee || 0)} сум</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-baseline pt-1 border-t border-border font-bold text-sm">
                  <span>ИТОГО:</span>
                  <span className="text-base text-amber-500">{receiptPrice(total)} сум</span>
                </div>

                <div className="pt-1 text-[11px] text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Оплата:</span>
                    <span>{data.paymentMethod === 'cash' ? 'Наличные' : 'Click / Payme / Карта'}</span>
                  </div>
                  {data.paymentMethod === 'cash' && data.cashReceived !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span>Получено:</span>
                        <span>{receiptPrice(data.cashReceived)} сум</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-500">
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
            <div className="space-y-3 rounded-xl border border-border/80 bg-secondary/30 p-3">
              <div className="text-center border-b border-border pb-1.5">
                <div className="text-[11px] font-bold uppercase text-muted-foreground">
                  *** ЗАКАЗ НА КУХНЮ ***
                </div>
                <div className="text-2xl font-bold text-amber-500">{data.orderNumber}</div>
                <div className="text-xs font-semibold">
                  {data.orderType === 'dine_in'
                    ? `В ЗАЛЕ (СТОЛ №${data.tableNumber || 1})`
                    : data.orderType === 'delivery'
                    ? 'ДОСТАВКА'
                    : 'НАВЫНОС'}
                </div>
              </div>

              <div className="space-y-2 py-1">
                {kitchenItems.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-3 font-sans">
                    В заказе нет блюд для кухни (только бар/напитки)
                  </p>
                ) : (
                  kitchenItems.map((it) => (
                    <div key={it.id} className="rounded-lg border border-border bg-card p-2">
                      <div className="flex items-start gap-2">
                        <span className="rounded bg-amber-500 text-black px-1.5 py-0.5 text-xs font-bold shrink-0">
                          {it.qty}×
                        </span>
                        <span className="text-xs font-bold leading-tight">{it.name}</span>
                      </div>
                      {it.notes && <div className="pl-7 text-[10px] text-amber-500">↳ {it.notes}</div>}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border pt-1.5 flex justify-between text-xs font-bold">
                <span>ИТОГО КУХОННЫХ БЛЮД:</span>
                <span className="text-amber-500">{kitchenCount} шт.</span>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки печати */}
        <div className="border-t border-border/70 bg-secondary/40 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPrint('guest')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-black shadow-xs transition cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>Чек гостю</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint('kitchen')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary hover:bg-secondary/80 py-2.5 text-xs font-bold text-foreground border border-border shadow-xs transition cursor-pointer"
            >
              <ChefHat className="size-3.5 text-amber-500" />
              <span>Чек на кухню</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPrint('both')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
            >
              <Zap className="size-3.5" />
              <span>Печать обоих чеков (Гость + Кухня)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
