import type { CartItem } from './cart'

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type PaymentMethod = 'cash' | 'click_payme'
export type OrderStatus = 'open' | 'sent' | 'cooking' | 'ready' | 'served' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid'

/** Заказ v2 (локальная форма, camelCase). Совпадает с payload мутации order.upsert. */
export type Order = {
  id: string
  number: string
  type: OrderType
  tableId?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  items: CartItem[]
  subtotal: number
  discountPercent: number
  discountAmount: number
  deliveryFee: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod | null
  paidAt?: string | null
  cashReceived?: number | null
  changeAmount?: number | null
  shiftId?: string | null
  cashierName?: string | null
  notes?: string | null
  deviceId?: string
  createdAt: string
  updatedAt: string
  source?: 'pos' | 'legacy_rescue'
  dataQuality?: string[]
  /** «Счёт выдан» (пречек напечатан) — синхронизируется через сервер (0013); null — снять отметку */
  precheckAt?: string | null
  /** заказ был возобновлён после оплаты (0013): прежняя оплата сторнирована, сумма и способ — здесь */
  reopenedAt?: string | null
  reopenPaidAmount?: number | null
  reopenPaidMethod?: PaymentMethod | null
  /** локально: есть ли неотправленные изменения */
  dirty?: boolean
}

export type Shift = {
  id: string
  number?: number
  cashierName: string
  openedAt: string
  closedAt?: string | null
  initialCash: number
  countedCash?: number | null
  status: 'open' | 'closed'
  notes?: string | null
  zSnapshot?: ShiftSummary | null
  source?: 'pos' | 'legacy_rescue'
  dirty?: boolean
}

export type ShiftSummary = {
  number?: number
  cashier_name?: string
  opened_at?: string
  closed_at?: string | null
  initial_cash: number
  counted_cash?: number | null
  orders_count: number
  total_revenue: number
  cash_revenue: number
  click_revenue: number
  discount_total: number
  expected_cash: number
  dine_in: number
  takeaway: number
  delivery: number
  cancelled_count: number
  unpaid_open_count: number
  top_items: Array<{ name: string; qty: number; revenue: number }>
  quality?: { inferred_shift: number; legacy_orders: number; flagged_orders: number }
  computed_at?: string
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Открыт',
  sent: 'На кухне',
  cooking: 'Готовится',
  ready: 'Готов',
  served: 'Подан',
  completed: 'Закрыт',
  cancelled: 'Отменён',
}

export const TYPE_LABEL: Record<OrderType, string> = { dine_in: 'В зале', takeaway: 'С собой', delivery: 'Доставка' }
export const PAYMENT_LABEL: Record<PaymentMethod, string> = { cash: 'Наличные', click_payme: 'Click / Payme' }

/**
 * Активный (открытый) заказ для кассы: не отменён и не оплачен. Оплата закрывает заказ и освобождает стол —
 * независимо от статуса кухни (кухонный экран может быть не в работе; раньше оплаченный заказ «висел» до «Выдано»).
 */
export function isActive(o: Order): boolean {
  return o.status !== 'cancelled' && o.paymentStatus === 'unpaid'
}

/** Оплаченный и не отменённый заказ — закрыт. */
export const isClosed = (o: Order): boolean => o.status !== 'cancelled' && o.paymentStatus === 'paid'

/** Статус после оплаты: закрыт; если кухня уже начала готовить на экране — остаётся у неё до «Выдано» (тогда → completed). */
export function statusAfterPayment(o: Order): OrderStatus {
  if (o.status === 'cancelled') return 'cancelled'
  return o.status === 'cooking' || o.status === 'ready' ? o.status : 'completed'
}

/** Статус для людей: оплаченный заказ всегда «Закрыт». */
export function displayStatus(o: Order): string {
  if (o.status === 'cancelled') return STATUS_LABEL.cancelled
  if (o.paymentStatus === 'paid') return STATUS_LABEL.completed
  return STATUS_LABEL[o.status]
}

/** Заказ виден на кухне: отправлен и не оплачен, либо кухня уже готовит/приготовила. */
export const isKitchenVisible = (o: Order): boolean =>
  (o.status === 'sent' && o.paymentStatus === 'unpaid') || o.status === 'cooking' || o.status === 'ready'

/** Бизнес-дата в Самарканде (UTC+5) — как на сервере (_business_date). */
export function businessDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

/** Локальный расчёт итогов смены (резерв, когда сервер недоступен). Та же логика, что _shift_summary. */
export function localShiftSummary(shift: Shift, orders: Order[]): ShiftSummary {
  const end = shift.closedAt ? Date.parse(shift.closedAt) : Date.now()
  const inShift = orders.filter((o) => o.source !== ('dev_test' as never) &&
    (o.shiftId === shift.id || (!o.shiftId && Date.parse(o.createdAt) >= Date.parse(shift.openedAt) && Date.parse(o.createdAt) < end)))
  const paid = inShift.filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled')
  const sum = (l: Order[]) => l.reduce((s, o) => s + o.total, 0)
  const cash = sum(paid.filter((o) => o.paymentMethod === 'cash'))
  const items = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const o of paid) for (const i of o.items) {
    const t = items.get(i.name) ?? { name: i.name, qty: 0, revenue: 0 }
    t.qty += i.qty
    t.revenue += Math.round(i.price * i.qty)
    items.set(i.name, t)
  }
  return {
    number: shift.number, cashier_name: shift.cashierName, opened_at: shift.openedAt, closed_at: shift.closedAt ?? null,
    initial_cash: shift.initialCash, counted_cash: shift.countedCash ?? null, orders_count: paid.length,
    total_revenue: sum(paid), cash_revenue: cash, click_revenue: sum(paid.filter((o) => o.paymentMethod === 'click_payme')),
    discount_total: paid.reduce((s, o) => s + (o.discountAmount || 0), 0), expected_cash: shift.initialCash + cash,
    dine_in: paid.filter((o) => o.type === 'dine_in').length, takeaway: paid.filter((o) => o.type === 'takeaway').length,
    delivery: paid.filter((o) => o.type === 'delivery').length, cancelled_count: inShift.filter((o) => o.status === 'cancelled').length,
    unpaid_open_count: inShift.filter((o) => o.paymentStatus === 'unpaid' && o.status !== 'cancelled').length,
    top_items: [...items.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  }
}

/** Состояние стола для плана зала (как в iiko/Toast): свободен · занят · счёт выдан. */
export type TableState = 'free' | 'busy' | 'billed'
export function tableStateOf(orders: Order[]): TableState {
  const open = orders.filter(isActive)
  if (!open.length) return 'free'
  return open.some((o) => o.precheckAt) ? 'billed' : 'busy'
}

/** Кассир сам отменяет только заказ, который не уходил на кухню и по которому не печатали счёт (как на сервере, 0013). */
export const cashierCanCancel = (o: Order): boolean => o.status === 'open' && !o.precheckAt

/** Возобновлённый заказ: ранее принятая сумма (касса просит только разницу). */
export const prepaidOf = (o: Order): number => (o.reopenedAt && o.paymentStatus === 'unpaid' ? Math.max(0, o.reopenPaidAmount ?? 0) : 0)
/** К оплате сейчас: итог минус ранее принятое (может быть < 0 — тогда вернуть гостю). */
export const amountDue = (o: Order): number => o.total - prepaidOf(o)
