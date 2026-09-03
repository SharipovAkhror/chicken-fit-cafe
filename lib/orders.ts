import type { CartItem } from './cart'
import { supabase } from './supabase'

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type PaymentMethod = 'cash' | 'click_payme'
export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled'

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
  shiftId?: string
  cashierName?: string
  status: OrderStatus
  cookingStartedAt?: string
  readyAt?: string
  completedAt?: string
}

export type Shift = {
  id: string
  shiftNumber: number
  cashierId?: string
  cashierName: string
  cashierRole?: string
  openedAt: string
  closedAt?: string
  initialCash: number
  finalCash?: number
  totalRevenue: number
  cashRevenue: number
  cardRevenue: number
  discountTotal: number
  ordersCount: number
  status: 'open' | 'closed'
  notes?: string
}

const LOCAL_ORDERS_KEY = 'chickenfit_pos_orders_v1'
const LOCAL_SHIFTS_KEY = 'chickenfit_pos_shifts_v1'
const LOCAL_CURRENT_SHIFT_KEY = 'chickenfit_pos_current_shift_v1'

const SYNC_CHANNEL_NAME = 'chickenfit_orders_bus_v1'

/** Web Audio API chime for kitchen notifications */
export function playKitchenChime() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.15)
    gain2.gain.setValueAtTime(0.35, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.6)
  } catch {
    // audio context blocked by browser autoplay policy until user gesture
  }
}

/** Local BroadcastChannel for instant cross-tab / cross-window sync */
function broadcastOrderEvent(action: 'new' | 'update', order: Order) {
  if (typeof window === 'undefined') return
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(SYNC_CHANNEL_NAME)
      bc.postMessage({ action, order, timestamp: Date.now() })
      bc.close()
    }
  } catch {
    // fallback
  }
}

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
  const idx = existing.findIndex((o) => o.id === order.id)
  let updated: Order[]
  if (idx >= 0) {
    updated = [...existing]
    updated[idx] = order
  } else {
    updated = [order, ...existing].slice(0, 500)
  }
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated))
}

// ─── SHIFT MANAGEMENT ─────────────────────────────────────────

export function getLocalShifts(): Shift[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_SHIFTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Shift[]
  } catch {
    return []
  }
}

export function getCurrentShift(): Shift | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_CURRENT_SHIFT_KEY)
    if (!raw) return null
    const shift = JSON.parse(raw) as Shift
    return shift.status === 'open' ? shift : null
  } catch {
    return null
  }
}

export async function openShift(options: {
  initialCash?: number
  cashierName?: string
  cashierRole?: string
}): Promise<Shift> {
  const shifts = getLocalShifts()
  const nextNumber = shifts.length + 1
  const newShift: Shift = {
    id: `shift_${Date.now()}`,
    shiftNumber: nextNumber,
    cashierName: options.cashierName || 'Кассир 1',
    cashierRole: options.cashierRole || 'cashier',
    openedAt: new Date().toISOString(),
    initialCash: options.initialCash || 0,
    totalRevenue: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    discountTotal: 0,
    ordersCount: 0,
    status: 'open',
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_CURRENT_SHIFT_KEY, JSON.stringify(newShift))
    localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify([newShift, ...shifts]))
  }

  if (supabase) {
    try {
      await supabase.from('shifts').insert({
        id: newShift.id,
        shift_number: newShift.shiftNumber,
        cashier_name: newShift.cashierName,
        cashier_role: newShift.cashierRole,
        opened_at: newShift.openedAt,
        initial_cash: newShift.initialCash,
        status: 'open',
      })
    } catch (err) {
      console.warn('Supabase shift insert failed, saved locally:', err)
    }
  }

  return newShift
}

export async function closeShift(options: {
  finalCash?: number
  notes?: string
}): Promise<Shift | null> {
  const current = getCurrentShift()
  if (!current) return null

  const todayOrders = await fetchTodayOrders()
  const shiftOrders = todayOrders.filter((o) => {
    if (o.shiftId === current.id) return true
    if (!o.shiftId && o.createdAt >= current.openedAt) return true
    return false
  })
  const stats = calculateDailyStats(shiftOrders)

  const closedShift: Shift = {
    ...current,
    closedAt: new Date().toISOString(),
    finalCash: options.finalCash ?? (current.initialCash + stats.cashRevenue),
    totalRevenue: stats.totalRevenue,
    cashRevenue: stats.cashRevenue,
    cardRevenue: stats.clickRevenue,
    discountTotal: stats.totalDiscount,
    ordersCount: stats.orderCount,
    status: 'closed',
    notes: options.notes,
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_CURRENT_SHIFT_KEY)
    const shifts = getLocalShifts().map((s) => (s.id === closedShift.id ? closedShift : s))
    localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(shifts))
  }

  if (supabase) {
    try {
      await supabase
        .from('shifts')
        .update({
          closed_at: closedShift.closedAt,
          final_cash: closedShift.finalCash,
          total_revenue: closedShift.totalRevenue,
          cash_revenue: closedShift.cashRevenue,
          card_revenue: closedShift.cardRevenue,
          discount_total: closedShift.discountTotal,
          orders_count: closedShift.ordersCount,
          status: 'closed',
          notes: closedShift.notes,
        })
        .eq('id', closedShift.id)
    } catch (err) {
      console.warn('Supabase shift update failed:', err)
    }
  }

  return closedShift
}

// ─── ORDER MANAGEMENT ─────────────────────────────────────────

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
  cashierName?: string
  status?: OrderStatus
}): Promise<Order> {
  const currentShift = getCurrentShift()

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
    shiftId: currentShift?.id,
    cashierName: data.cashierName || currentShift?.cashierName || 'Кассир',
    status: data.status || 'pending',
  }

  // 1. Всегда сохраняем в локальное хранилище для мгновенного доступа
  saveLocalOrder(newOrder)

  // 2. Broadcast event locally for other tabs (POS & KDS)
  broadcastOrderEvent('new', newOrder)

  // 3. Если подключен Supabase — сохраняем в облако
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
        subtotal: newOrder.subtotal ?? null,
        discount_percent: newOrder.discountPercent ?? null,
        discount_amount: newOrder.discountAmount ?? null,
        delivery_fee: newOrder.deliveryFee ?? null,
        total_amount: newOrder.total,
        payment_method: newOrder.paymentMethod,
        cash_received: newOrder.cashReceived ?? null,
        change_amount: newOrder.changeAmount ?? null,
        shift_id: newOrder.shiftId ?? null,
        cashier_name: newOrder.cashierName ?? null,
        status: newOrder.status,
      })
    } catch (err) {
      console.warn('Supabase order insert failed, order saved locally:', err)
    }
  }

  return newOrder
}

/** Обновить статус заказа (для KDS / кухни: pending -> cooking -> ready -> completed) */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  const local = getLocalOrders()
  const existing = local.find((o) => o.id === orderId)
  if (!existing) return null

  const now = new Date().toISOString()
  const updated: Order = {
    ...existing,
    status,
    cookingStartedAt: status === 'cooking' && !existing.cookingStartedAt ? now : existing.cookingStartedAt,
    readyAt: status === 'ready' && !existing.readyAt ? now : existing.readyAt,
    completedAt: (status === 'completed' || status === 'cancelled') ? now : existing.completedAt,
  }

  saveLocalOrder(updated)
  broadcastOrderEvent('update', updated)

  if (supabase) {
    try {
      await supabase
        .from('orders')
        .update({ status: updated.status })
        .eq('id', orderId)
    } catch (err) {
      console.warn('Supabase status update failed:', err)
    }
  }

  return updated
}

/** Заказы за сегодня (с учетом активной смены и местного времени) */
export async function fetchTodayOrders(): Promise<Order[]> {
  const current = getCurrentShift()
  const now = new Date()
  const startOfLocalDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
  const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (supabase) {
    try {
      let query = supabase.from('orders').select('*')
      if (current?.id) {
        query = query.or(`shift_id.eq.${current.id},created_at.gte.${startOfLocalDay}`)
      } else {
        query = query.gte('created_at', startOfLocalDay)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

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
          subtotal: row.subtotal,
          discountPercent: row.discount_percent,
          discountAmount: row.discount_amount,
          deliveryFee: row.delivery_fee,
          total: row.total_amount,
          paymentMethod: row.payment_method as PaymentMethod,
          cashReceived: row.cash_received,
          changeAmount: row.change_amount,
          shiftId: row.shift_id,
          cashierName: row.cashier_name,
          status: (row.status as OrderStatus) || 'pending',
        }))
      }
    } catch {
      // fallback to local
    }
  }

  const local = getLocalOrders()
  return local.filter((o) => {
    if (current && (o.shiftId === current.id || o.createdAt >= current.openedAt)) {
      return true
    }
    const orderDate = new Date(o.createdAt)
    const orderLocalStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`
    return orderLocalStr === todayLocalStr
  })
}

/** Подписка на Realtime заказы (Supabase + BroadcastChannel fallback) */
export function subscribeToOrders(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  // 1. BroadcastChannel listener (instant local multi-tab)
  let bc: BroadcastChannel | null = null
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(SYNC_CHANNEL_NAME)
      bc.onmessage = (ev) => {
        if (ev.data?.action === 'new') {
          playKitchenChime()
        }
        onUpdate()
      }
    } catch {}
  }

  // 2. Storage event listener (fallback for other windows)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_ORDERS_KEY) {
      onUpdate()
    }
  }
  window.addEventListener('storage', handleStorage)

  // 3. Supabase Realtime channel (cloud postgres changes)
  let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null
  if (supabase) {
    try {
      supabaseChannel = supabase
        .channel('public:orders:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              playKitchenChime()
            }
            onUpdate()
          },
        )
        .subscribe()
    } catch {}
  }

  return () => {
    if (bc) {
      bc.close()
    }
    window.removeEventListener('storage', handleStorage)
    if (supabase && supabaseChannel) {
      supabase.removeChannel(supabaseChannel)
    }
  }
}

/** Сводка смены за день */
export type DailyStats = {
  totalRevenue: number
  cashRevenue: number
  clickRevenue: number
  totalDiscount: number
  orderCount: number
  dineInCount: number
  takeawayCount: number
  deliveryCount: number
  topItems: Array<{ name: string; qty: number; revenue: number }>
}

export function calculateDailyStats(orders: Order[]): DailyStats {
  const stats: DailyStats = {
    totalRevenue: 0,
    cashRevenue: 0,
    clickRevenue: 0,
    totalDiscount: 0,
    orderCount: 0,
    dineInCount: 0,
    takeawayCount: 0,
    deliveryCount: 0,
    topItems: [],
  }

  const itemsMap: Record<string, { qty: number; revenue: number }> = {}

  for (const o of orders) {
    if (o.status === 'cancelled') continue
    stats.orderCount += 1
    stats.totalRevenue += Math.round(o.total)
    stats.totalDiscount += Math.round(o.discountAmount || 0)

    if (o.paymentMethod === 'cash') {
      stats.cashRevenue += Math.round(o.total)
    } else {
      stats.clickRevenue += Math.round(o.total)
    }

    if (o.type === 'dine_in') stats.dineInCount += 1
    else if (o.type === 'takeaway') stats.takeawayCount += 1
    else if (o.type === 'delivery') stats.deliveryCount += 1

    for (const it of o.items) {
      if (!itemsMap[it.name]) {
        itemsMap[it.name] = { qty: 0, revenue: 0 }
      }
      itemsMap[it.name].qty += it.qty
      itemsMap[it.name].revenue += Math.round(it.price * it.qty)
    }
  }

  stats.topItems = Object.entries(itemsMap)
    .map(([name, val]) => ({ name, qty: val.qty, revenue: val.revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  return stats
}
