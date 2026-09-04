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
  receiptDateOnly,
  receiptTimeOnly,
  aggregateReceiptItems,
  type PaperWidth,
  getStoredPaperWidth,
  setStoredPaperWidth,
  getStoredQrEnabled,
  setStoredQrEnabled,
} from '@/lib/receipt'
import type { OrderType, PaymentMethod } from '@/lib/orders'
import { SimpleQR } from '@/lib/qr-generator'

export type PrintMode = 'guest' | 'kitchen' | 'both' | 'shift' | 'precheck'

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
 * Высокая четкость (203 DPI, 100% чистый черный цвет без полутонов/размытия),
 * крупная шапка CHICKENFIT, точное время с секундами и умный расчет:
 * количество × цена за шт = итоговая сумма.
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
  cashierName = 'Главный кассир',
  printMode = 'guest',
  paperWidth = '80mm',
  showQrCode = true,
  shiftData,
}: ReceiptProps) {
  // Умный подбор: агрегация одинаковых блюд (если одно блюдо выбрано много раз)
  const aggregatedItems = useMemo(() => aggregateReceiptItems(items), [items])
  const kitchenItems = useMemo(() => getKitchenItems(items), [items])
  const aggregatedKitchenItems = useMemo(
    () => aggregateReceiptItems(kitchenItems),
    [kitchenItems],
  )
  const kitchenCount = kitchenItemsCount(items)

  const calculatedSubtotal = cartTotal(aggregatedItems)
  const subtotal = propSubtotal ?? calculatedSubtotal
  const total = propTotal ?? subtotal - discountAmount + deliveryFee

  const is58mm = paperWidth === '58mm'

  const orderTypeLabel =
    orderType === 'dine_in'
      ? `В ЗАЛЕ ${tableNumber ? `(СТОЛ №${tableNumber})` : ''}`
      : orderType === 'delivery'
      ? 'ДОСТАВКА'
      : 'С СОБОЙ'

  // Разделение даты и времени с секундами
  const { dateOnly, timeOnly } = useMemo(() => {
    if (!dateTime) {
      const now = new Date()
      return { dateOnly: receiptDateOnly(now), timeOnly: receiptTimeOnly(now) }
    }
    const trimmed = dateTime.trim()
    const parts = trimmed.split(/\s+/)
    if (parts.length >= 2) {
      return { dateOnly: parts[0], timeOnly: parts.slice(1).join(' ') }
    }
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return { dateOnly: receiptDateOnly(d), timeOnly: receiptTimeOnly(d) }
    }
    return { dateOnly: trimmed, timeOnly: '' }
  }, [dateTime])

  // Динамический QR-код для отзыва / онлайн-меню
  const qrSvg = useMemo(() => {
    if (!showQrCode) return ''
    try {
      const baseUrl =
        typeof window !== 'undefined' && window.location.origin
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
        <div className="receipt leading-tight text-black p-0 m-0">
          {/* Логотип и шапка: Крупный жирный CHICKENFIT */}
          <div className="text-center pb-1.5 border-b-2 border-black">
            <div className="receipt-brand-title font-black tracking-widest uppercase">
              CHICKENFIT
            </div>
            <div className={`${is58mm ? 'text-[9.5px]' : 'text-[10.5px]'} font-extrabold uppercase tracking-wider mt-0.5`}>
              Кафе правильного питания
            </div>
            <div className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} font-bold`}>
              г. Самарканд, ул. Ибн Сина, 136
            </div>
            <div className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} font-bold`}>
              Тел: +998 (93) 380-20-02
            </div>
          </div>

          {/* Информация о чеке: Дата, время с секундами, кассир */}
          <div className="py-1 border-b border-black text-[10px] space-y-0.5">
            <div className={`${is58mm ? 'text-[10.5px]' : 'text-[12px]'} font-black text-center tracking-wide uppercase py-0.5 border-y border-dashed border-black my-0.5`}>
              {printMode === 'precheck'
                ? 'ПРЕДВАРИТЕЛЬНЫЙ СЧЁТ (ПРЕЧЕК)'
                : 'КАССОВЫЙ ЧЕК ПРОДАЖИ'}
            </div>
            <div className="flex justify-between font-extrabold">
              <span>ЗАКАЗ: {orderNumber}</span>
              <span>{orderTypeLabel}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>ДАТА: {dateOnly}</span>
              <span>ВРЕМЯ: {timeOnly}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>КАССИР: {cashierName}</span>
              <span>СМЕНА: №1</span>
            </div>

            {orderType === 'delivery' && (
              <div className="border-t border-black border-dotted pt-1 mt-1 font-bold">
                {customerPhone && <div><span>КЛИЕНТ:</span> {customerPhone}</div>}
                {deliveryAddress && <div><span>АДРЕС:</span> {deliveryAddress}</div>}
              </div>
            )}
          </div>

          {/* Список блюд: умный подбор с формулой: кол-во × цена за шт = сумма */}
          <div className="my-1 border-b-2 border-black divide-y divide-dashed divide-black">
            {aggregatedItems.map((item) => {
              const itemTotal = lineTotal(item)
              return (
                <div key={`${item.id}-${item.notes || ''}`} className="py-1">
                  <div className="flex justify-between items-start gap-1">
                    <span className={`${is58mm ? 'text-[10.5px]' : 'text-[11.5px]'} font-extrabold leading-tight flex-1`}>
                      {item.name}
                    </span>
                    <span className={`${is58mm ? 'text-[10.5px]' : 'text-[11.5px]'} font-black text-right whitespace-nowrap tabular-nums`}>
                      {receiptPrice(itemTotal)} сум
                    </span>
                  </div>

                  {/* Строка с расчетом: кол-во × цена штуки */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-black pl-1 mt-0.5">
                    <span className="tabular-nums">
                      {item.qty} × {receiptPrice(item.price)} сум
                    </span>
                    {item.qty > 1 && (
                      <span className="text-[9px] uppercase font-bold tracking-tight">
                        (= {receiptPrice(itemTotal)} сум)
                      </span>
                    )}
                  </div>

                  {item.notes && item.notes !== item.name && (
                    <div className="text-[9.5px] font-semibold pl-2 mt-0.5">
                      ↳ {item.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Скидка / доставка при наличии */}
          {(discountAmount > 0 || deliveryFee > 0) && (
            <div className="border-b border-dashed border-black pb-1 my-1 space-y-0.5 text-[10px] font-bold">
              <div className="flex justify-between">
                <span>Сумма позиций:</span>
                <span className="tabular-nums">{receiptPrice(subtotal)} сум</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between font-black">
                  <span>Скидка {discountPercent ? `(${discountPercent}%)` : ''}:</span>
                  <span className="tabular-nums">-{receiptPrice(discountAmount)} сум</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Доставка:</span>
                  <span className="tabular-nums">+{receiptPrice(deliveryFee)} сум</span>
                </div>
              )}
            </div>
          )}

          {/* Итоговая сумма и расчет оплаты */}
          <div className="border-b-2 border-black py-1.5 my-1 space-y-1">
            <div className={`flex justify-between items-baseline ${is58mm ? 'text-xs' : 'text-sm'} font-black tracking-wide`}>
              <span>ИТОГО К ОПЛАТЕ:</span>
              <span className={`tabular-nums ${is58mm ? 'text-sm' : 'text-base'}`}>{receiptPrice(total)} сум</span>
            </div>

            <div className="flex justify-between text-[10px] font-bold pt-0.5 border-t border-black border-dotted">
              <span>Вид оплаты:</span>
              <span>{paymentMethod === 'cash' ? 'НАЛИЧНЫЕ' : 'БЕЗНАЛИЧНЫЕ (CLICK/PAYME)'}</span>
            </div>

            {paymentMethod === 'cash' && cashReceived !== undefined && cashReceived > 0 && (
              <div className="flex justify-between text-[10px] font-bold">
                <span>Получено от гостя:</span>
                <span className="tabular-nums">{receiptPrice(cashReceived)} сум</span>
              </div>
            )}

            {paymentMethod === 'cash' && changeAmount !== undefined && changeAmount > 0 && (
              <div className="flex justify-between text-[11px] font-black pt-0.5 border-t border-black">
                <span>СДАЧА ГОСТЮ:</span>
                <span className="tabular-nums">{receiptPrice(changeAmount)} сум</span>
              </div>
            )}
          </div>

          {/* Динамический QR-код на электронный чек / отзыв */}
          {showQrCode && qrSvg && (
            <div className="text-center py-1.5 border-b border-black">
              <div
                className="mx-auto flex justify-center [&>svg]:mx-auto"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="text-[9.5px] font-black uppercase mt-1">
                ЭЛЕКТРОННЫЙ ЧЕК И ОТЗЫВ
              </div>
              <div className="text-[8.5px] font-bold">
                Отсканируйте камерой смартфона
              </div>
            </div>
          )}

          {/* Подвал и линия авто-отрезки */}
          {printMode === 'precheck' ? (
            <div className="text-center text-[9px] font-black pt-1.5 space-y-0.5">
              <div>*** ПРЕДВАРИТЕЛЬНЫЙ СЧЁТ ***</div>
              <div>НЕ ЯВЛЯЕТСЯ ФИСКАЛЬНЫМ ЧЕКОМ</div>
              <div>ПОЖАЛУЙСТА, ОПЛАТИТЕ НА КАССЕ</div>
            </div>
          ) : (
            <div className="text-center text-[10px] font-black pt-1.5 space-y-0.5">
              <div>СПАСИБО ЗА ЗАКАЗ!</div>
              <div>ЖДЕМ ВАС СНОВА В CHICKENFIT!</div>
            </div>
          )}

          <div className="receipt-tear-off">
            - - - - - - - - - - - - - - - - - - - - - - - -
          </div>
        </div>
      </div>

      {/* ── 2. КУХОННЫЙ БЕГУНОК (Экономный, без цен, крупный шрифт) ── */}
      <div
        id="kitchen-ticket-print-area"
        className="receipt-container kitchen-receipt-print"
      >
        <div className="receipt receipt--kitchen text-black p-1.5 border-2 border-black m-0">
          <div className="text-center border-b-2 border-black pb-1">
            <div className="text-[12px] font-black tracking-widest uppercase">
              *** ЗАКАЗ НА КУХНЮ ***
            </div>
            <div className={`${is58mm ? 'text-sm' : 'text-base'} font-black mt-0.5`}>
              ЗАКАЗ {orderNumber}
            </div>
            <div className="text-[11.5px] font-black mt-0.5 border border-black py-0.5 px-2 inline-block">
              {orderTypeLabel}
            </div>
            <div className="flex justify-between text-[10px] font-bold mt-1 pt-1 border-t border-black border-dashed">
              <span>ДАТА: {dateOnly}</span>
              <span>ВРЕМЯ: {timeOnly}</span>
            </div>
          </div>

          <div className="py-1 space-y-1.5">
            {aggregatedKitchenItems.length === 0 ? (
              <div className="text-center py-2 text-[11px] font-black text-black">
                (ТОЛЬКО НАПИТКИ ИЗ БАРА)
              </div>
            ) : (
              aggregatedKitchenItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="border-b border-dashed border-black pb-1">
                  <div className="flex items-start gap-1.5">
                    <span className="font-black text-[13px] bg-black text-white px-1.5 py-0.2 rounded-sm shrink-0 badge-black">
                      {item.qty}×
                    </span>
                    <span className={`${is58mm ? 'text-[11.5px]' : 'text-[13px]'} font-black leading-tight flex-1`}>
                      {item.name}
                    </span>
                  </div>
                  {item.notes && item.notes !== item.name && (
                    <div className="pl-6 text-[10.5px] font-black mt-0.5">
                      ↳ {item.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t-2 border-black pt-1 flex justify-between text-[12px] font-black">
            <span>ВСЕГО БЛЮД КУХНИ:</span>
            <span>{kitchenCount} шт</span>
          </div>

          <div className="receipt-tear-off">
            - - - - - - - - - - - - - - - - - - - - - - - -
          </div>
        </div>
      </div>

      {/* ── 3. ТЕРМО-ОТЧЕТ СМЕНЫ (X-ОТЧЕТ / Z-ОТЧЕТ) ── */}
      {shiftData && (
        <div id="shift-ticket-print-area" className="receipt-container shift-receipt-print">
          <div className="receipt leading-tight text-black p-0 m-0">
            <div className="text-center pb-1 border-b-2 border-black">
              <div className="receipt-brand-title font-black tracking-wider">
                CHICKENFIT
              </div>
              <div className="text-[11px] font-black mt-0.5">
                {shiftData.type === 'X' ? 'X-ОТЧЕТ (ПРОМЕЖУТОЧНЫЙ)' : 'Z-ОТЧЕТ (ЗАКРЫТИЕ СМЕНЫ)'}
              </div>
              <div className="text-[10px] font-bold mt-0.5">
                СМЕНА №{shiftData.shiftNumber}
              </div>
              <div className="text-[9.5px] font-bold">
                Кассир: {shiftData.cashierName}
              </div>
              <div className="text-[9px] font-bold">
                Открыта: {shiftData.openedAt.slice(0, 19).replace('T', ' ')}
              </div>
              {shiftData.closedAt && (
                <div className="text-[9px] font-bold">
                  Закрыта: {shiftData.closedAt.slice(0, 19).replace('T', ' ')}
                </div>
              )}
            </div>

            <div className="py-1 space-y-1 text-[10px]">
              <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold">
                <span>Начальный размен в кассе:</span>
                <span className="tabular-nums">{receiptPrice(shiftData.initialCash)} сум</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold">
                <span>Выручка наличными:</span>
                <span className="tabular-nums">{receiptPrice(shiftData.cashRevenue)} сум</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold">
                <span>Выручка Click / Payme:</span>
                <span className="tabular-nums">{receiptPrice(shiftData.cardRevenue)} сум</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold">
                <span>Предоставлено скидок:</span>
                <span className="tabular-nums">-{receiptPrice(shiftData.discountTotal)} сум</span>
              </div>
              <div className="flex justify-between border-b-2 border-black py-1 font-black text-[12px]">
                <span>ОБЩАЯ ВЫРУЧКА:</span>
                <span className="tabular-nums">{receiptPrice(shiftData.totalRevenue)} сум</span>
              </div>
              <div className="flex justify-between pt-0.5 font-bold">
                <span>Количество чеков:</span>
                <span className="tabular-nums">{shiftData.ordersCount} шт</span>
              </div>
              <div className="flex justify-between text-[9px] font-bold">
                <span>В зале: {shiftData.dineInCount} · С собой: {shiftData.takeawayCount} · Доставка: {shiftData.deliveryCount}</span>
              </div>
              {shiftData.finalCash !== undefined && (
                <div className="border-t border-black pt-1 space-y-0.5 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>Ожидалось в ящике:</span>
                    <span className="tabular-nums">{receiptPrice(shiftData.initialCash + shiftData.cashRevenue)} сум</span>
                  </div>
                  <div className="flex justify-between font-black">
                    <span>Фактически в ящике:</span>
                    <span className="tabular-nums">{receiptPrice(shiftData.finalCash)} сум</span>
                  </div>
                  <div className="flex justify-between font-black">
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

            <div className="border-t border-dashed border-black pt-3 mt-2 text-center text-[9px] font-bold">
              <div className="h-6" />
              <div>Подпись кассира: __________________</div>
            </div>

            <div className="receipt-tear-off">
              - - - - - - - - - - - - - - - - - - - - - - - -
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

  // Умный подбор: группируем одинаковые блюда
  const aggregatedItems = useMemo(() => aggregateReceiptItems(data.items), [data.items])
  const kitchenItems = useMemo(() => getKitchenItems(data.items), [data.items])
  const aggregatedKitchenItems = useMemo(
    () => aggregateReceiptItems(kitchenItems),
    [kitchenItems],
  )

  const subtotal = data.subtotal ?? cartTotal(aggregatedItems)
  const total =
    data.total ??
    subtotal - (data.discountAmount || 0) + (data.deliveryFee || 0)

  const kitchenCount = kitchenItemsCount(data.items)

  const orderTypeLabel =
    data.orderType === 'dine_in'
      ? `В ЗАЛЕ ${data.tableNumber ? `(СТОЛ №${data.tableNumber})` : ''}`
      : data.orderType === 'delivery'
      ? 'ДОСТАВКА'
      : 'С СОБОЙ'

  // Разделение даты и времени
  const { dateOnly, timeOnly } = useMemo(() => {
    if (!data.dateTime) {
      const now = new Date()
      return { dateOnly: receiptDateOnly(now), timeOnly: receiptTimeOnly(now) }
    }
    const trimmed = data.dateTime.trim()
    const parts = trimmed.split(/\s+/)
    if (parts.length >= 2) {
      return { dateOnly: parts[0], timeOnly: parts.slice(1).join(' ') }
    }
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return { dateOnly: receiptDateOnly(d), timeOnly: receiptTimeOnly(d) }
    }
    return { dateOnly: trimmed, timeOnly: '' }
  }, [data.dateTime])

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
      const baseUrl =
        typeof window !== 'undefined' && window.location.origin
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
        <div className="flex-1 overflow-y-auto p-3 text-xs">
          {activeTab === 'guest' ? (
            <div className={`space-y-2 rounded-lg border border-border bg-background p-3 ${paperWidth === '58mm' ? 'max-w-[240px] mx-auto text-[11px]' : ''}`}>
              <div className="text-center border-b border-border/60 pb-2">
                <div className="text-xl font-black tracking-wider text-amber-500">CHICKENFIT</div>
                <div className="text-[10px] font-semibold text-muted-foreground">Кафе правильного питания</div>
                <p className="text-[9.5px] text-muted-foreground">Самарканд, ул. Ибн Сина 136</p>
                <div className="text-[11px] font-black text-foreground mt-1 py-0.5 border-y border-dashed border-border">
                  ЧЕК #{data.orderNumber} · {orderTypeLabel}
                </div>
                <div className="text-[9.5px] text-muted-foreground flex justify-between mt-1">
                  <span>Дата: {dateOnly}</span>
                  <span>Время: {timeOnly}</span>
                </div>
              </div>

              {/* Список позиций: умная группировка с умножением */}
              <div className="space-y-1.5 py-1">
                {aggregatedItems.map((it) => {
                  const itTotal = lineTotal(it)
                  return (
                    <div key={`${it.id}-${it.notes || ''}`} className="border-b border-border/40 pb-1">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-foreground leading-tight flex-1">{it.name}</span>
                        <span className="font-black shrink-0 tabular-nums">{receiptPrice(itTotal)} сум</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-medium tabular-nums">{it.qty} × {receiptPrice(it.price)} сум</span>
                        {it.qty > 1 && <span className="text-[9.5px] font-semibold">(= {receiptPrice(itTotal)} сум)</span>}
                      </div>
                      {it.notes && it.notes !== it.name && (
                        <p className="text-[9.5px] text-amber-500 mt-0.5">↳ {it.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Расчет */}
              <div className="border-t border-border/60 pt-1.5 space-y-0.5 text-[11px]">
                {((data.discountAmount || 0) > 0 || (data.deliveryFee || 0) > 0) && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Сумма позиций:</span>
                      <span className="tabular-nums">{receiptPrice(subtotal)} сум</span>
                    </div>
                    {(data.discountAmount || 0) > 0 && (
                      <div className="flex justify-between font-bold text-emerald-500">
                        <span>Скидка:</span>
                        <span className="tabular-nums">-{receiptPrice(data.discountAmount || 0)} сум</span>
                      </div>
                    )}
                    {(data.deliveryFee || 0) > 0 && (
                      <div className="flex justify-between text-amber-500">
                        <span>Доставка:</span>
                        <span className="tabular-nums">+{receiptPrice(data.deliveryFee || 0)} сум</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-baseline pt-1 border-t border-border font-black text-sm">
                  <span>ИТОГО К ОПЛАТЕ:</span>
                  <span className="text-amber-500 tabular-nums">{receiptPrice(total)} сум</span>
                </div>

                <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Оплата: {data.paymentMethod === 'cash' ? 'Наличные' : 'Click / Payme (QR)'}</span>
                  {data.paymentMethod === 'cash' && data.cashReceived !== undefined && data.cashReceived > 0 && (
                    <span className="tabular-nums">Получено: {receiptPrice(data.cashReceived)} сум</span>
                  )}
                </div>
                {data.paymentMethod === 'cash' && data.changeAmount !== undefined && data.changeAmount > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-emerald-500 pt-0.5">
                    <span>СДАЧА ГОСТЮ:</span>
                    <span className="tabular-nums">{receiptPrice(data.changeAmount)} сум</span>
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
            <div className={`rounded-lg border-2 border-foreground bg-secondary/30 p-2.5 ${paperWidth === '58mm' ? 'max-w-[240px] mx-auto' : ''}`}>
              <div className="text-center border-b-2 border-foreground pb-1">
                <div className="text-xs font-black uppercase text-muted-foreground">
                  *** ЗАКАЗ НА КУХНЮ ***
                </div>
                <div className="text-base font-black">
                  ЗАКАЗ {data.orderNumber}
                </div>
                <div className="text-xs font-bold mt-0.5">
                  {orderTypeLabel}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 flex justify-between">
                  <span>Дата: {dateOnly}</span>
                  <span>Время: {timeOnly}</span>
                </div>
              </div>

              <div className="space-y-1.5 py-2">
                {aggregatedKitchenItems.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    (Только бар / напитки)
                  </p>
                ) : (
                  aggregatedKitchenItems.map((it) => (
                    <div key={it.id} className="border-b border-dashed border-border/80 pb-1">
                      <div className="flex items-start gap-1.5">
                        <span className="rounded bg-amber-500 text-black px-1.5 py-0.2 text-xs font-black shrink-0">
                          {it.qty}×
                        </span>
                        <span className="text-xs font-bold leading-tight flex-1">{it.name}</span>
                      </div>
                      {it.notes && it.notes !== it.name && (
                        <div className="pl-6 text-[10px] text-amber-500">↳ {it.notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t-2 border-foreground pt-1 flex justify-between text-xs font-black">
                <span>ИТОГО БЛЮД КУХНИ:</span>
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
