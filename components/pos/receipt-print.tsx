'use client'

import { useState, useMemo } from 'react'
import {
  Printer,
  ChefHat,
  Receipt as ReceiptIcon,
  Zap,
  X,
  QrCode,
} from 'lucide-react'
import type { CartItem } from '@/lib/cart'
import { lineTotal, cartTotal, getKitchenItems, kitchenItemsCount } from '@/lib/cart'
import {
  receiptPrice,
  type PaperWidth,
  getStoredPaperWidth,
  setStoredPaperWidth,
  getStoredQrEnabled,
  setStoredQrEnabled,
} from '@/lib/receipt'
import type { OrderType, PaymentMethod } from '@/lib/orders'
import { SimpleQR } from '@/lib/qr-generator'

export type PrintMode = 'guest' | 'kitchen' | 'both' | 'shift'

export type ShiftThermalData = {
  type: 'X' | 'Z' // X = interim check, Z = final close of shift
  shiftNumber: number
  cashierName: string
  openedAt: string
  closedAt?: string
  initialCash: number
  finalCash?: number
  totalRevenue: number
  cashRevenue: number
  cardRevenue: number
  discountTotal: number
  ordersCount: number
  dineInCount: number
  takeawayCount: number
  deliveryCount: number
  topItems?: Array<{ name: string; qty: number; revenue: number }>
}

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
  cashierName?: string
  printMode?: PrintMode
  paperWidth?: PaperWidth
  showQrCode?: boolean
  shiftData?: ShiftThermalData
}

/**
 * Чек для термопринтера (58мм / 80мм).
 * Монохромный, плотный ресторанный вывод с проверенной высотой и авто-отрезкой.
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
  cashierName = 'Кассир',
  printMode = 'guest',
  paperWidth = '80mm',
  showQrCode = true,
  shiftData,
}: ReceiptProps) {
  const calculatedSubtotal = cartTotal(items)
  const subtotal = propSubtotal ?? calculatedSubtotal
  const total = propTotal ?? subtotal - discountAmount + deliveryFee
  const kitchenItems = getKitchenItems(items)
  const kitchenCount = kitchenItemsCount(items)

  const is58mm = paperWidth === '58mm'

  const orderTypeLabel =
    orderType === 'dine_in'
      ? `В ЗАЛЕ ${tableNumber ? `(СТОЛ №${tableNumber})` : ''}`
      : orderType === 'delivery'
      ? 'ДОСТАВКА'
      : 'С СОБОЙ'

  // Динамический QR-код для отзыва / онлайн-меню
  const qrSvg = useMemo(() => {
    if (!showQrCode) return ''
    try {
      const baseUrl = typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://chicken-fit-cafe.vercel.app'
      const targetUrl = `${baseUrl}?ref=receipt&order=${orderNumber}${tableNumber ? `&table=${tableNumber}` : ''}`
      const size = is58mm ? 90 : 110
      return SimpleQR.toSVG(targetUrl, {
        size,
        margin: 1,
        darkColor: '#000000',
        lightColor: '#ffffff',
      })
    } catch {
      return ''
    }
  }, [showQrCode, orderNumber, tableNumber, is58mm])

  return (
    <div
      id="receipt-print-wrapper"
      className={`receipt-hidden print-mode-${printMode} paper-${paperWidth}`}
    >
      {/* ── 1. ГОСТЕВОЙ ТЕРМО-ЧЕК (58мм / 80мм) ── */}
      <div id="receipt-print-area" className="receipt-container guest-receipt-print">
        <div className="receipt font-mono leading-tight text-black p-0 m-0">
          {/* Логотип и шапка */}
          <div className="text-center pb-1 border-b border-black">
            <div className={`${is58mm ? 'text-xs' : 'text-sm'} font-black tracking-widest uppercase`}>
              🍗 CHICKENFIT 🍗
            </div>
            <div className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} font-semibold mt-0.5`}>
              Самарканд, ул. Ибн Сина 136
            </div>
            <div className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} text-black/80`}>
              Тел: +998 (93) 380-2002
            </div>
            <div className="my-1 border-t border-dashed border-black/70" />
            <div className={`${is58mm ? 'text-[10px]' : 'text-[11px]'} font-black`}>
              ЧЕК #{orderNumber} · {orderTypeLabel}
            </div>
            <div className={`${is58mm ? 'text-[8.5px]' : 'text-[9px]'} text-black/70 mt-0.5`}>
              {dateTime} · {cashierName}
            </div>

            {orderType === 'delivery' && (
              <div className={`${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'} mt-1 border-t border-dotted border-black pt-1 text-left`}>
                {customerPhone && <div><span className="font-bold">Тел:</span> {customerPhone}</div>}
                {deliveryAddress && <div><span className="font-bold">Адрес:</span> {deliveryAddress}</div>}
              </div>
            )}
          </div>

          {/* Список блюд */}
          <table className="w-full text-left my-1 border-collapse">
            <thead>
              <tr className="border-b border-black text-[9px] uppercase font-bold">
                <th className="pb-0.5">Блюдо</th>
                <th className="pb-0.5 text-right whitespace-nowrap">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-dotted border-gray-400">
                  <td className="py-0.5 pr-1 align-top">
                    <div className={`${is58mm ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
                      <span className="font-bold">{item.name}</span>
                      {item.qty > 1 && (
                        <span className="font-black"> ×{item.qty} ({receiptPrice(item.price)})</span>
                      )}
                    </div>
                    {item.notes && item.notes !== item.name && (
                      <div className="text-[8.5px] text-black/80 pl-1">↳ {item.notes}</div>
                    )}
                  </td>
                  <td className={`${is58mm ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
                    {receiptPrice(lineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Скидка / доставка при наличии */}
          {(discountAmount > 0 || deliveryFee > 0) && (
            <div className="border-t border-dashed border-black pt-1 my-0.5 space-y-0.5 text-[9.5px]">
              <div className="flex justify-between">
                <span>Сумма блюд:</span>
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

          {/* Итоговая сумма и оплата */}
          <div className="border-t-2 border-b border-black py-1 my-1">
            <div className={`flex justify-between ${is58mm ? 'text-xs' : 'text-sm'} font-black`}>
              <span>ИТОГО К ОПЛАТЕ:</span>
              <span>{receiptPrice(total)} сум</span>
            </div>
            <div className="flex justify-between text-[9px] mt-0.5 font-semibold">
              <span>Оплата: {paymentMethod === 'cash' ? 'Наличные' : 'Click / Payme (QR)'}</span>
              {paymentMethod === 'cash' && cashReceived !== undefined && cashReceived > 0 && (
                <span>Получено: {receiptPrice(cashReceived)} сум</span>
              )}
            </div>
            {paymentMethod === 'cash' && changeAmount !== undefined && changeAmount > 0 && (
              <div className="flex justify-between text-[9.5px] font-black text-black pt-0.5">
                <span>СДАЧА ГОСТЮ:</span>
                <span>{receiptPrice(changeAmount)} сум</span>
              </div>
            )}
          </div>

          {/* Динамический QR-код на чек */}
          {showQrCode && qrSvg && (
            <div className="text-center py-1 border-b border-black/40">
              <div
                className="mx-auto flex justify-center [&>svg]:mx-auto"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="text-[8.5px] font-bold mt-0.5">
                ОТСКАНИРУЙТЕ ДЛЯ МЕНЮ И ОТЗЫВА
              </div>
              <div className="text-[8px] text-black/70">
                chickenfit.vercel.app
              </div>
            </div>
          )}

          {/* Подвал и линия авто-отрезки */}
          <div className="text-center text-[9px] font-bold pt-1">
            Спасибо за заказ! Ждем вас снова!
          </div>
          <div className="receipt-tear-off">
            ✂ - - - - - - - - - - - - - - - - - - - - - - - -
          </div>
        </div>
      </div>

      {/* ── 2. КУХОННЫЙ БЕГУНОК (Экономный, без цен, крупный шрифт) ── */}
      <div
        id="kitchen-ticket-print-area"
        className="receipt-container kitchen-receipt-print"
      >
        <div className="receipt receipt--kitchen font-mono text-black p-1.5 border-2 border-black m-0">
          <div className="text-center border-b-2 border-black pb-1">
            <div className={`${is58mm ? 'text-sm' : 'text-base'} font-black tracking-wide`}>
              КУХНЯ #{orderNumber}
            </div>
            <div className="text-[10.5px] font-bold mt-0.5">
              {orderTypeLabel}
            </div>
            <div className="text-[9px] text-black/70">
              {dateTime}
            </div>
          </div>

          <div className="py-1 space-y-1">
            {kitchenItems.length === 0 ? (
              <div className="text-center py-1 text-[10px] text-gray-600">
                (Только напитки из бара)
              </div>
            ) : (
              kitchenItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="border-b border-dashed border-black/60 pb-0.5">
                  <div className="flex items-start gap-1">
                    <span className="font-black text-xs bg-black text-white px-1 rounded shrink-0">
                      {item.qty}×
                    </span>
                    <span className={`${is58mm ? 'text-[11px]' : 'text-xs'} font-bold leading-tight`}>
                      {item.name}
                    </span>
                  </div>
                  {item.notes && item.notes !== item.name && (
                    <div className="pl-5 text-[9px] font-semibold text-black">↳ {item.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t-2 border-black pt-0.5 flex justify-between text-xs font-black">
            <span>ВСЕГО БЛЮД КУХНИ:</span>
            <span>{kitchenCount} шт</span>
          </div>

          <div className="receipt-tear-off">
            ✂ - - - - - - - - - - - - - - - - - - - - - - - -
          </div>
        </div>
      </div>

      {/* ── 3. ТЕРМО-ОТЧЕТ СМЕНЫ (X-ОТЧЕТ / Z-ОТЧЕТ) ── */}
      {shiftData && (
        <div id="shift-ticket-print-area" className="receipt-container shift-receipt-print">
          <div className="receipt font-mono leading-tight text-black p-0 m-0">
            <div className="text-center pb-1 border-b-2 border-black">
              <div className={`${is58mm ? 'text-xs' : 'text-sm'} font-black tracking-wider`}>
                CHICKENFIT · {shiftData.type === 'X' ? 'X-ОТЧЕТ (ПРОМЕЖУТОЧНЫЙ)' : 'Z-ОТЧЕТ (ЗАКРЫТИЕ СМЕНЫ)'}
              </div>
              <div className="text-[10px] font-bold mt-0.5">
                СМЕНА №{shiftData.shiftNumber}
              </div>
              <div className="text-[9px] text-black/80">
                Кассир: {shiftData.cashierName}
              </div>
              <div className="text-[8.5px] text-black/70">
                Открыта: {shiftData.openedAt.slice(0, 16).replace('T', ' ')}
              </div>
              {shiftData.closedAt && (
                <div className="text-[8.5px] text-black/70">
                  Закрыта: {shiftData.closedAt.slice(0, 16).replace('T', ' ')}
                </div>
              )}
            </div>

            <div className="py-1 space-y-1 text-[10px]">
              <div className="flex justify-between border-b border-dotted border-black pb-0.5">
                <span>Начальный размен в кассе:</span>
                <span className="font-bold">{receiptPrice(shiftData.initialCash)} сум</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-black pb-0.5">
                <span>Выручка наличными:</span>
                <span className="font-bold">{receiptPrice(shiftData.cashRevenue)} сум</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-black pb-0.5">
                <span>Выручка Click / Payme:</span>
                <span className="font-bold">{receiptPrice(shiftData.cardRevenue)} сум</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-black pb-0.5">
                <span>Предоставлено скидок:</span>
                <span className="font-bold">-{receiptPrice(shiftData.discountTotal)} сум</span>
              </div>
              <div className="flex justify-between border-b-2 border-black py-0.5 font-black text-[11px]">
                <span>ОБЩАЯ ВЫРУЧКА:</span>
                <span>{receiptPrice(shiftData.totalRevenue)} сум</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Количество чеков:</span>
                <span className="font-bold">{shiftData.ordersCount} шт</span>
              </div>
              <div className="flex justify-between text-[9px] text-black/80">
                <span>В зале: {shiftData.dineInCount} · С собой: {shiftData.takeawayCount} · Доставка: {shiftData.deliveryCount}</span>
              </div>
              {shiftData.finalCash !== undefined && (
                <div className="border-t border-black pt-1 space-y-0.5 text-[9.5px]">
                  <div className="flex justify-between">
                    <span>Ожидалось в кассе:</span>
                    <span className="font-bold">{receiptPrice(shiftData.initialCash + shiftData.cashRevenue)} сум</span>
                  </div>
                  <div className="flex justify-between font-black">
                    <span>Фактически в ящике:</span>
                    <span>{receiptPrice(shiftData.finalCash)} сум</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Кассовая разница:</span>
                    <span>
                      {shiftData.finalCash === shiftData.initialCash + shiftData.cashRevenue
                        ? '0 сум (сходится)'
                        : shiftData.finalCash > shiftData.initialCash + shiftData.cashRevenue
                        ? `+${receiptPrice(shiftData.finalCash - (shiftData.initialCash + shiftData.cashRevenue))} сум (излишек)`
                        : `-${receiptPrice(Math.abs(shiftData.finalCash - (shiftData.initialCash + shiftData.cashRevenue)))} сум (недостача)`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black pt-2 mt-2 text-center text-[9px]">
              <div className="h-6" />
              <div>Подпись кассира: __________________</div>
            </div>

            <div className="receipt-tear-off">
              ✂ - - - - - - - - - - - - - - - - - - - - - - - -
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Экранный модальный предпросмотр чека перед печатью.
 * Позволяет переключать ширину ленты (58мм / 80мм) и QR-код.
 */
export function ReceiptModal({
  data,
  onClose,
  onPrint,
  onUpdateSettings,
}: {
  data: ReceiptProps
  onClose: () => void
  onPrint: (mode: PrintMode, width?: PaperWidth) => void
  onUpdateSettings?: (width: PaperWidth, qr: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState<'guest' | 'kitchen'>('guest')
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(() => data.paperWidth || getStoredPaperWidth())
  const [showQr, setShowQr] = useState<boolean>(() => data.showQrCode ?? getStoredQrEnabled())

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

  function handleToggleWidth(width: PaperWidth) {
    setPaperWidth(width)
    setStoredPaperWidth(width)
    if (onUpdateSettings) onUpdateSettings(width, showQr)
  }

  function handleToggleQr() {
    const next = !showQr
    setShowQr(next)
    setStoredQrEnabled(next)
    if (onUpdateSettings) onUpdateSettings(paperWidth, next)
  }

  const qrSvg = useMemo(() => {
    if (!showQr) return ''
    try {
      const baseUrl = typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://chicken-fit-cafe.vercel.app'
      const targetUrl = `${baseUrl}?ref=receipt&order=${data.orderNumber}${data.tableNumber ? `&table=${data.tableNumber}` : ''}`
      return SimpleQR.toSVG(targetUrl, {
        size: paperWidth === '58mm' ? 84 : 104,
        margin: 1,
        darkColor: '#000000',
        lightColor: '#ffffff',
      })
    } catch {
      return ''
    }
  }, [showQr, data.orderNumber, data.tableNumber, paperWidth])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[94vh] w-full max-w-sm flex-col rounded-2xl bg-card border border-border text-foreground shadow-2xl overflow-hidden">
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
            className="flex size-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Переключатель ширины ленты и опций термопринтера */}
        <div className="flex items-center justify-between border-b border-border/80 bg-secondary/20 px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium mr-1">Лента:</span>
            <button
              type="button"
              onClick={() => handleToggleWidth('80mm')}
              className={`rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer ${
                paperWidth === '80mm'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              80 мм
            </button>
            <button
              type="button"
              onClick={() => handleToggleWidth('58mm')}
              className={`rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer ${
                paperWidth === '58mm'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              58 мм
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleQr}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition cursor-pointer ${
              showQr
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-secondary text-muted-foreground'
            }`}
            title="Печатать QR-код на гостевом чеке"
          >
            <QrCode className="size-3" />
            <span>{showQr ? 'QR вкл' : 'QR выкл'}</span>
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

        {/* Содержимое чека (визуальный превью для выбранной ленты) */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
          {activeTab === 'guest' ? (
            <div className={`space-y-2 rounded-lg border border-border bg-background p-3 ${paperWidth === '58mm' ? 'max-w-[240px] mx-auto text-[11px]' : ''}`}>
              <div className="text-center border-b border-border/60 pb-1.5">
                <div className="text-sm font-black tracking-wider">CHICKENFIT</div>
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
                    <div className="min-w-0">
                      <span className="font-bold">{it.name}</span>
                      {it.qty > 1 && (
                        <span className="font-black text-foreground/80"> ×{it.qty} ({receiptPrice(it.price)})</span>
                      )}
                      {it.notes && it.notes !== it.name && (
                        <p className="text-[9.5px] text-amber-500">↳ {it.notes}</p>
                      )}
                    </div>
                    <span className="font-black shrink-0">{receiptPrice(lineTotal(it))} сум</span>
                  </div>
                ))}
              </div>

              {/* Расчет */}
              <div className="border-t border-border/60 pt-1.5 space-y-0.5 text-[11px]">
                {((data.discountAmount || 0) > 0 || (data.deliveryFee || 0) > 0) && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Сумма:</span>
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

                <div className="flex justify-between items-baseline pt-1 border-t border-border font-black text-sm">
                  <span>ИТОГО:</span>
                  <span className="text-amber-500">{receiptPrice(total)} сум</span>
                </div>

                <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Оплата: {data.paymentMethod === 'cash' ? 'Наличные' : 'Click / QR'}</span>
                  {data.paymentMethod === 'cash' && data.cashReceived !== undefined && data.cashReceived > 0 && (
                    <span>Получено: {receiptPrice(data.cashReceived)} сум</span>
                  )}
                </div>
                {data.paymentMethod === 'cash' && data.changeAmount !== undefined && data.changeAmount > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-emerald-500 pt-0.5">
                    <span>СДАЧА ГОСТЮ:</span>
                    <span>{receiptPrice(data.changeAmount)} сум</span>
                  </div>
                )}

                {/* QR превью */}
                {showQr && qrSvg && (
                  <div className="text-center pt-2 border-t border-border/40">
                    <div
                      className="mx-auto flex justify-center [&>svg]:mx-auto"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                    <p className="text-[9px] text-muted-foreground mt-0.5">Отсканируйте для меню и отзыва</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Кухонный бегунок */
            <div className={`rounded-lg border-2 border-foreground bg-secondary/30 p-2.5 font-mono ${paperWidth === '58mm' ? 'max-w-[240px] mx-auto' : ''}`}>
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
                    (Только бар / напитки)
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
              onClick={() => onPrint('guest', paperWidth)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-black shadow-xs transition cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>Чек гостю</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint('kitchen', paperWidth)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary hover:bg-secondary/80 py-2.5 text-xs font-bold text-foreground border border-border shadow-xs transition cursor-pointer"
            >
              <ChefHat className="size-3.5 text-amber-500" />
              <span>Кухня</span>
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onPrint('both', paperWidth)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
            >
              <Zap className="size-3.5" />
              <span>Оба чека (Гость + Кухня)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
