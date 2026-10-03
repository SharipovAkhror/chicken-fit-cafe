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

/** Активный (не закрытый) заказ: не отменён и (не оплачен или ещё готовится). */
export function isActive(o: Order): boolean {
  if (o.status === 'cancelled') return false
  if (o.paymentStatus === 'unpaid') return true
  return o.status === 'sent' || o.status === 'cooking' || o.status === 'ready'
}

/** Заказ виден на кухне. */
export const isKitchenVisible = (o: Order): boolean =>
  o.status === 'sent' || o.status === 'cooking' || o.status === 'ready'

/** Бизнес-дата в Самарканде (UTC+5) — как на сервере (_business_date). */
export function businessDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}
