import type { CartItem } from './cart'
import { supabase } from './supabase'

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type PaymentMethod = 'cash' | 'click_payme'
export type OrderStatus = 'completed' | 'cancelled'

export type Order = {
  id: string
  orderNumber: string
  createdAt: string
  type: OrderType
  tableNumber?: string
  customerPhone?: string
  deliveryAddress?: string
  items: CartItem[]
  subtotal?: number
  discountPercent?: number
  discountAmount?: number
  deliveryFee?: number
  total: number
  paymentMethod: PaymentMethod
  cashReceived?: number
  changeAmount?: number
  status: OrderStatus
}

const LOCAL_ORDERS_KEY = 'chickenfit_pos_orders_v1'

/** Получить локально сохраненные заказы */
export function getLocalOrders(): Order[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Order[]
  } catch {
    return []
  }
}

/** Сохранить локально */
function saveLocalOrder(order: Order): void {
  if (typeof window === 'undefined') return
  const existing = getLocalOrders()
  const updated = [order, ...existing].slice(0, 500) // храним последние 500
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated))
}

/** Создать и сохранить заказ */
export async function createOrder(data: {
  orderNumber: string
  type: OrderType
  tableNumber?: string
  customerPhone?: string
  deliveryAddress?: string
  items: CartItem[]
  subtotal?: number
  discountPercent?: number
  discountAmount?: number
  deliveryFee?: number
  total: number
  paymentMethod: PaymentMethod
  cashReceived?: number
  changeAmount?: number
}): Promise<Order> {
  const newOrder: Order = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order_${Date.now()}`,
    orderNumber: data.orderNumber,
    createdAt: new Date().toISOString(),
    type: data.type,
    tableNumber: data.tableNumber || undefined,
    customerPhone: data.customerPhone || undefined,
    deliveryAddress: data.deliveryAddress || undefined,
    items: data.items,
    subtotal: data.subtotal,
    discountPercent: data.discountPercent,
    discountAmount: data.discountAmount,
    deliveryFee: data.deliveryFee,
    total: data.total,
    paymentMethod: data.paymentMethod,
    cashReceived: data.cashReceived,
    changeAmount: data.changeAmount,
    status: 'completed',
  }

  // 1. Всегда сохраняем в локальное хранилище для мгновенного доступа
  saveLocalOrder(newOrder)

  // 2. Если подключен Supabase — сохраняем в облако
  if (supabase) {
    try {
      await supabase.from('orders').insert({
        id: newOrder.id,
        order_number: newOrder.orderNumber,
        order_type: newOrder.type,
        table_number: newOrder.tableNumber ?? null,
        customer_phone: newOrder.customerPhone ?? null,
        delivery_address: newOrder.deliveryAddress ?? null,
        items: newOrder.items,
        total_amount: newOrder.total,
        payment_method: newOrder.paymentMethod,
        cash_received: newOrder.cashReceived ?? null,
        change_amount: newOrder.changeAmount ?? null,
        status: newOrder.status,
      })
    } catch (err) {
      console.warn('Supabase order insert failed, order saved locally:', err)
    }
  }

  return newOrder
}

/** Заказы за сегодня */
export async function fetchTodayOrders(): Promise<Order[]> {
  const todayStr = new Date().toISOString().split('T')[0]

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          orderNumber: row.order_number,
          createdAt: row.created_at,
          type: row.order_type as OrderType,
          tableNumber: row.table_number,
          customerPhone: row.customer_phone,
          deliveryAddress: row.delivery_address,
          items: row.items as CartItem[],
          total: row.total_amount,
          paymentMethod: row.payment_method as PaymentMethod,
          cashReceived: row.cash_received,
          changeAmount: row.change_amount,
          status: row.status as OrderStatus,
        }))
      }
    } catch {
      // fallback to local
    }
  }

  const local = getLocalOrders()
  return local.filter((o) => o.createdAt.startsWith(todayStr))
}

/** Сводка смены за день */
export type DailyStats = {
  totalRevenue: number
  cashRevenue: number
  clickRevenue: number
  orderCount: number
  dineInCount: number
  takeawayCount: number
  deliveryCount: number
}

export function calculateDailyStats(orders: Order[]): DailyStats {
  const stats: DailyStats = {
    totalRevenue: 0,
    cashRevenue: 0,
    clickRevenue: 0,
    orderCount: orders.length,
    dineInCount: 0,
    takeawayCount: 0,
    deliveryCount: 0,
  }

  for (const o of orders) {
    if (o.status === 'cancelled') continue
    stats.totalRevenue += o.total
    if (o.paymentMethod === 'cash') {
      stats.cashRevenue += o.total
    } else {
      stats.clickRevenue += o.total
    }

    if (o.type === 'dine_in') stats.dineInCount += 1
    else if (o.type === 'takeaway') stats.takeawayCount += 1
    else if (o.type === 'delivery') stats.deliveryCount += 1
  }

  return stats
}
