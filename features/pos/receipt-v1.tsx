/**
 * Термочек в разметке и метриках v1 (тег `pre-v2`, components/pos/receipt-print.tsx), которые печатали
 * правильно на принтере кафе: обёртка #receipt-print-wrapper + классы paper-80mm/58mm и print-mode-*,
 * стили — блок «Receipt» и «@media print» в app/globals.css (не менять: это и есть метрики v1).
 * QR не печатается (в v1 на кассе кафе он был выключен: chickenfit-pos-receipt-qr=false).
 */
import type { CartItem } from '@/domain/cart'
import { lineTotal } from '@/domain/cart'
import type { Order, ShiftSummary } from '@/domain/order'

export type Paper = '58mm' | '80mm'
export type SlipMode = 'guest' | 'precheck' | 'kitchen' | 'shift'

const receiptPrice = (price: number) => String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const parts = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Samarkand', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return { dateOnly: `${p.day}.${p.month}.${p.year}`, timeOnly: `${p.hour}:${p.minute}:${p.second}`, iso: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}` }
}
/** Как v1 aggregateReceiptItems: одинаковые позиции (id, имя, цена, примечание) складываются. Весовые — не складываются. */
function aggregate(items: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()
  items.forEach((item, i) => {
    const key = item.weightKg ? `w${i}` : `${item.id}__${item.name}__${item.price}__${(item.notes || '').trim()}`
    const ex = map.get(key)
    if (ex) map.set(key, { ...ex, qty: ex.qty + item.qty })
    else map.set(key, { ...item })
  })
  return [...map.values()]
}
const qtyLine = (i: CartItem) => i.weightKg
  ? `${Math.round(i.weightKg * 1000)} г × ${receiptPrice(i.pricePerKg ?? Math.round(i.price / i.weightKg))} сум/кг`
  : `${i.qty} × ${receiptPrice(i.price)} сум`
const noteOf = (i: CartItem) => i.notes || (i.garnishMix?.length ? i.garnishMix.map((g) => `${g.ingredient} ${g.percent}%`).join(' + ') : '')

export function OrderSlipV1({ mode, order: o, paper, tableLabel, shiftNumber }: {
  mode: 'guest' | 'precheck' | 'kitchen'; order: Order; paper: Paper; tableLabel?: string; shiftNumber?: number
}) {
  const is58mm = paper === '58mm'
  const tableNumber = o.tableId ? (tableLabel ?? o.tableId).replace(/^Стол\s*/i, '') : ''
  const orderTypeLabel = o.type === 'dine_in' ? `В ЗАЛЕ ${tableNumber ? `(СТОЛ №${tableNumber})` : ''}` : o.type === 'delivery' ? 'ДОСТАВКА' : 'С СОБОЙ'
  const { dateOnly, timeOnly } = parts(mode === 'guest' ? o.paidAt ?? new Date().toISOString() : new Date().toISOString())
  const orderNumber = `#${o.number}`
  const items = aggregate(o.items)
  const kitchenItems = aggregate(o.items.filter((i) => i.isKitchen))
  const kitchenCount = o.items.filter((i) => i.isKitchen).reduce((s, i) => s + (i.weightKg ? 1 : i.qty), 0)
  const paymentMethod = o.paymentMethod ?? 'cash'

  if (mode === 'kitchen') return (
    <div id="kitchen-ticket-print-area" className="receipt-container kitchen-receipt-print">
      <div className="receipt receipt--kitchen text-black p-1.5 border-2 border-black m-0">
        <div className="text-center border-b-2 border-black pb-1">
          <div className="text-[12px] font-black tracking-widest uppercase">*** ЗАКАЗ НА КУХНЮ ***</div>
          <div className={`${is58mm ? 'text-sm' : 'text-base'} font-black mt-0.5`}>ЗАКАЗ {orderNumber}</div>
          <div className="text-[11.5px] font-black mt-0.5 border border-black py-0.5 px-2 inline-block">{orderTypeLabel}</div>
          <div className="flex justify-between text-[10px] font-bold mt-1 pt-1 border-t border-black border-dashed">
            <span>ДАТА: {dateOnly}</span>
            <span>ВРЕМЯ: {timeOnly}</span>
          </div>
        </div>
        <div className="py-1 space-y-1.5">
          {kitchenItems.length === 0 ? (
            <div className="text-center py-2 text-[11px] font-black text-black">(ТОЛЬКО НАПИТКИ ИЗ БАРА)</div>
          ) : kitchenItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="border-b border-dashed border-black pb-1">
              <div className="flex items-start gap-1.5">
                <span className="font-black text-[13px] bg-black text-white px-1.5 py-0.2 rounded-sm shrink-0 badge-black">
                  {item.weightKg ? `${Math.round(item.weightKg * 1000)}г` : `${item.qty}×`}
                </span>
                <span className={`${is58mm ? 'text-[11.5px]' : 'text-[13px]'} font-black leading-tight flex-1`}>{item.name}</span>
              </div>
              {noteOf(item) && noteOf(item) !== item.name && <div className="pl-6 text-[10.5px] font-black mt-0.5">↳ {noteOf(item)}</div>}
            </div>
          ))}
        </div>
        <div className="border-t-2 border-black pt-1 flex justify-between text-[12px] font-black">
          <span>ВСЕГО БЛЮД КУХНИ:</span>
          <span>{kitchenCount} шт</span>
        </div>
        <div className="receipt-tear-off">- - - - - - - - - - - - - - - - - - - - - - - -</div>
      </div>
    </div>
  )

  return (
    <div id="receipt-print-area" className="receipt-container guest-receipt-print">
      <div className="receipt leading-tight text-black p-0 m-0">
        <div className="text-center pb-1.5 border-b-2 border-black">
          <div className="receipt-brand-title font-black tracking-widest uppercase">CHICKENFIT</div>
          <div className={`${is58mm ? 'text-[9.5px]' : 'text-[10.5px]'} font-extrabold uppercase tracking-wider mt-0.5`}>Кафе правильного питания</div>
          <div className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} font-bold`}>г. Самарканд, ул. Ибн Сина, 136</div>
          <div className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} font-bold`}>Тел: +998 (93) 380-20-02</div>
        </div>
        <div className="py-1 border-b border-black text-[10px] space-y-0.5">
          <div className={`${is58mm ? 'text-[10.5px]' : 'text-[12px]'} font-black text-center tracking-wide uppercase py-0.5 border-y border-dashed border-black my-0.5`}>
            {mode === 'precheck' ? 'ПРЕДВАРИТЕЛЬНЫЙ СЧЁТ (ПРЕЧЕК)' : 'КАССОВЫЙ ЧЕК ПРОДАЖИ'}
          </div>
          <div className="flex justify-between font-extrabold"><span>ЗАКАЗ: {orderNumber}</span><span>{orderTypeLabel}</span></div>
          <div className="flex justify-between font-bold"><span>ДАТА: {dateOnly}</span><span>ВРЕМЯ: {timeOnly}</span></div>
          <div className="flex justify-between font-bold"><span>КАССИР: {o.cashierName || 'Главный кассир'}</span><span>СМЕНА: №{shiftNumber ?? 1}</span></div>
          {o.type === 'delivery' && (
            <div className="border-t border-black border-dotted pt-1 mt-1 font-bold">
              {o.customerPhone && <div><span>КЛИЕНТ:</span> {o.customerPhone}</div>}
              {o.deliveryAddress && <div><span>АДРЕС:</span> {o.deliveryAddress}</div>}
            </div>
          )}
        </div>
        <div className="my-1 border-b-2 border-black divide-y divide-dashed divide-black">
          {items.map((item, idx) => {
            const itemTotal = lineTotal(item)
            const note = noteOf(item)
            return (
              <div key={`${item.id}-${idx}`} className="py-1">
                <div className="flex justify-between items-start gap-1">
                  <span className={`${is58mm ? 'text-[10.5px]' : 'text-[11.5px]'} font-extrabold leading-tight flex-1`}>{item.name}</span>
                  <span className={`${is58mm ? 'text-[10.5px]' : 'text-[11.5px]'} font-black text-right whitespace-nowrap tabular-nums`}>{receiptPrice(itemTotal)} сум</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-black pl-1 mt-0.5">
                  <span className="tabular-nums">{qtyLine(item)}</span>
                  {!item.weightKg && item.qty > 1 && <span className="text-[9px] uppercase font-bold tracking-tight">(= {receiptPrice(itemTotal)} сум)</span>}
                </div>
                {note && note !== item.name && <div className="text-[9.5px] font-semibold pl-2 mt-0.5">↳ {note}</div>}
              </div>
            )
          })}
        </div>
        {(o.discountAmount > 0 || o.deliveryFee > 0) && (
          <div className="border-b border-dashed border-black pb-1 my-1 space-y-0.5 text-[10px] font-bold">
            <div className="flex justify-between"><span>Сумма позиций:</span><span className="tabular-nums">{receiptPrice(o.subtotal)} сум</span></div>
            {o.discountAmount > 0 && <div className="flex justify-between font-black"><span>Скидка {o.discountPercent ? `(${o.discountPercent}%)` : ''}:</span><span className="tabular-nums">-{receiptPrice(o.discountAmount)} сум</span></div>}
            {o.deliveryFee > 0 && <div className="flex justify-between"><span>Доставка:</span><span className="tabular-nums">+{receiptPrice(o.deliveryFee)} сум</span></div>}
          </div>
        )}
        <div className="border-b-2 border-black py-1.5 my-1 space-y-1">
          <div className={`flex justify-between items-baseline ${is58mm ? 'text-xs' : 'text-sm'} font-black tracking-wide`}>
            <span>ИТОГО К ОПЛАТЕ:</span>
            <span className={`tabular-nums ${is58mm ? 'text-sm' : 'text-base'}`}>{receiptPrice(o.total)} сум</span>
          </div>
          <div className="flex justify-between text-[10px] font-bold pt-0.5 border-t border-black border-dotted">
            <span>Вид оплаты:</span>
            <span>{paymentMethod === 'cash' ? 'НАЛИЧНЫЕ' : 'БЕЗНАЛИЧНЫЕ (CLICK/PAYME)'}</span>
          </div>
          {paymentMethod === 'cash' && !!o.cashReceived && o.cashReceived > 0 && (
            <div className="flex justify-between text-[10px] font-bold"><span>Получено от гостя:</span><span className="tabular-nums">{receiptPrice(o.cashReceived)} сум</span></div>
          )}
          {paymentMethod === 'cash' && !!o.changeAmount && o.changeAmount > 0 && (
            <div className="flex justify-between text-[11px] font-black pt-0.5 border-t border-black"><span>СДАЧА ГОСТЮ:</span><span className="tabular-nums">{receiptPrice(o.changeAmount)} сум</span></div>
          )}
        </div>
        {mode === 'precheck' ? (
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
        <div className="receipt-tear-off">- - - - - - - - - - - - - - - - - - - - - - - -</div>
      </div>
    </div>
  )
}

export function ShiftSlipV1({ type, s }: { type: 'X' | 'Z'; s: ShiftSummary }) {
  const finalCash = s.counted_cash ?? undefined
  const diff = finalCash === undefined ? 0 : finalCash - s.expected_cash
  return (
    <div id="shift-ticket-print-area" className="receipt-container shift-receipt-print">
      <div className="receipt leading-tight text-black p-0 m-0">
        <div className="text-center pb-1 border-b-2 border-black">
          <div className="receipt-brand-title font-black tracking-wider">CHICKENFIT</div>
          <div className="text-[11px] font-black mt-0.5">{type === 'X' ? 'X-ОТЧЕТ (ПРОМЕЖУТОЧНЫЙ)' : 'Z-ОТЧЕТ (ЗАКРЫТИЕ СМЕНЫ)'}</div>
          <div className="text-[10px] font-bold mt-0.5">СМЕНА №{s.number ?? '—'}</div>
          <div className="text-[9.5px] font-bold">Кассир: {s.cashier_name ?? '—'}</div>
          {s.opened_at && <div className="text-[9px] font-bold">Открыта: {parts(s.opened_at).iso}</div>}
          {s.closed_at && <div className="text-[9px] font-bold">Закрыта: {parts(s.closed_at).iso}</div>}
        </div>
        <div className="py-1 space-y-1 text-[10px]">
          <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold"><span>Начальный размен в кассе:</span><span className="tabular-nums">{receiptPrice(s.initial_cash)} сум</span></div>
          <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold"><span>Выручка наличными:</span><span className="tabular-nums">{receiptPrice(s.cash_revenue)} сум</span></div>
          <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold"><span>Выручка Click / Payme:</span><span className="tabular-nums">{receiptPrice(s.click_revenue)} сум</span></div>
          <div className="flex justify-between border-b border-dashed border-black pb-0.5 font-bold"><span>Предоставлено скидок:</span><span className="tabular-nums">-{receiptPrice(s.discount_total)} сум</span></div>
          <div className="flex justify-between border-b-2 border-black py-1 font-black text-[12px]"><span>ОБЩАЯ ВЫРУЧКА:</span><span className="tabular-nums">{receiptPrice(s.total_revenue)} сум</span></div>
          <div className="flex justify-between pt-0.5 font-bold"><span>Количество чеков:</span><span className="tabular-nums">{s.orders_count} шт</span></div>
          <div className="flex justify-between text-[9px] font-bold"><span>В зале: {s.dine_in} · С собой: {s.takeaway} · Доставка: {s.delivery}</span></div>
          {s.cancelled_count > 0 && <div className="flex justify-between text-[9px] font-bold"><span>Отменено заказов:</span><span>{s.cancelled_count}</span></div>}
          <div className="border-t border-black pt-1 space-y-0.5 text-[10px]">
            <div className="flex justify-between font-bold"><span>Ожидалось в ящике:</span><span className="tabular-nums">{receiptPrice(s.expected_cash)} сум</span></div>
            {finalCash !== undefined && (
              <>
                <div className="flex justify-between font-black"><span>Фактически в ящике:</span><span className="tabular-nums">{receiptPrice(finalCash)} сум</span></div>
                <div className="flex justify-between font-black"><span>Кассовая разница:</span>
                  <span>{diff === 0 ? '0 сум (сходится)' : diff > 0 ? `+${receiptPrice(diff)} сум (излишек)` : `-${receiptPrice(-diff)} сум (недостача)`}</span></div>
              </>
            )}
          </div>
          {!!s.top_items?.length && (
            <div className="border-t border-dashed border-black pt-1 space-y-0.5">
              {s.top_items.slice(0, 10).map((t) => (
                <div key={t.name} className="flex justify-between font-bold"><span>{t.qty} × {t.name}</span><span className="tabular-nums">{receiptPrice(t.revenue)}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-dashed border-black pt-3 mt-2 text-center text-[9px] font-bold">
          <div className="h-6" />
          <div>Подпись кассира: __________________</div>
        </div>
        <div className="receipt-tear-off">- - - - - - - - - - - - - - - - - - - - - - - -</div>
      </div>
    </div>
  )
}
