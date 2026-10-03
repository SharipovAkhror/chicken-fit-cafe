/** Операции кассы: сначала локально (IndexedDB), затем в outbox. Работают без сети. */
import { uuidv4 } from '@/domain/ids'
import { computeTotals, type CartItem } from '@/domain/cart'
import type { Order, OrderStatus, OrderType, PaymentMethod, Shift } from '@/domain/order'
import type { LocalDb } from '@/data/local-db'
import { enqueue } from '@/data/outbox'
import { orderToPayload, shiftToPayload } from '@/data/mappers'
import { getEngine } from '@/features/app/runtime'

export function newOrder(p: { type: OrderType; tableId?: string | null; cashierName: string; shiftId?: string | null; deviceId: string }): Order {
  const now = new Date().toISOString()
  return {
    id: uuidv4(), number: '', type: p.type, tableId: p.tableId ?? null, items: [], subtotal: 0, discountPercent: 0,
    discountAmount: 0, deliveryFee: 0, total: 0, status: 'open', paymentStatus: 'unpaid', paymentMethod: null,
    shiftId: p.shiftId ?? null, cashierName: p.cashierName, deviceId: p.deviceId, createdAt: now, updatedAt: now, source: 'pos',
  }
}

/** Номер заказа: порядковый за бизнес-день на этом устройстве (D-номер устройства не нужен — 1 касса). */
export async function nextOrderNumber(db: LocalDb): Promise<string> {
  const day = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10)
  const key = `orderSeq:${day}`
  const cur = ((await db.kv.get(key))?.value as number | undefined) ?? 0
  await db.kv.put({ key, value: cur + 1 })
  return String(cur + 1).padStart(3, '0')
}

export function withTotals(o: Order, items: CartItem[], discountPercent = o.discountPercent, customDiscount = 0, deliveryFee = o.deliveryFee): Order {
  const t = computeTotals(items, discountPercent, customDiscount, deliveryFee)
  return { ...o, items, discountPercent, ...t }
}

export async function saveOrder(db: LocalDb, o: Order, extra: Record<string, unknown> = {}): Promise<Order> {
  const next: Order = { ...o, number: o.number || (await nextOrderNumber(db)), updatedAt: new Date().toISOString(), dirty: false }
  await db.orders.put(next)
  await enqueue(db, 'order.upsert', next.id, orderToPayload(next, extra))
  getEngine().kick()
  return next
}

export async function sendToKitchen(db: LocalDb, o: Order): Promise<Order> {
  const resend = o.status !== 'open'
  return saveOrder(db, { ...o, status: 'sent' }, resend ? { resend: true } : {})
}

export async function pay(db: LocalDb, o: Order, method: PaymentMethod, cashReceived: number | null): Promise<Order> {
  const hasKitchen = o.items.some((i) => i.isKitchen)
  const kitchenDone = !hasKitchen || o.status === 'served' || o.status === 'ready'
  return saveOrder(db, {
    ...o,
    paymentStatus: 'paid',
    paymentMethod: method,
    paidAt: new Date().toISOString(),
    cashReceived: method === 'cash' ? cashReceived : null,
    changeAmount: method === 'cash' && cashReceived ? Math.max(0, cashReceived - o.total) : null,
    // если кухонные позиции ещё не отправлены — отправляем при оплате
    status: hasKitchen && o.status === 'open' ? 'sent' : kitchenDone ? 'completed' : o.status,
  })
}

export async function setStatus(db: LocalDb, o: Order, status: OrderStatus): Promise<void> {
  const final = status === 'served' && o.paymentStatus === 'paid' ? 'completed' : status
  await db.orders.update(o.id, { status: final, updatedAt: new Date().toISOString() })
  await enqueue(db, 'order.set_status', o.id, { id: o.id, status: final })
  getEngine().kick()
}

export async function cancelOrder(db: LocalDb, o: Order, reason: string): Promise<void> {
  await saveOrder(db, { ...o, status: 'cancelled', notes: [o.notes, `Отмена: ${reason}`].filter(Boolean).join('\n') })
}

export async function openShift(db: LocalDb, cashierName: string, initialCash: number, deviceId: string): Promise<Shift> {
  const s: Shift = { id: uuidv4(), cashierName, openedAt: new Date().toISOString(), initialCash, status: 'open', source: 'pos', dirty: true }
  await db.shifts.put(s)
  await enqueue(db, 'shift.upsert', s.id, { ...shiftToPayload(s), deviceId })
  getEngine().kick()
  return s
}

export async function closeShift(db: LocalDb, s: Shift, countedCash: number, notes: string): Promise<Shift> {
  const next: Shift = { ...s, closedAt: new Date().toISOString(), countedCash, status: 'closed', notes, dirty: true }
  await db.shifts.put(next)
  await enqueue(db, 'shift.upsert', s.id, shiftToPayload(next))
  getEngine().kick(50)
  return next
}

/** Черновик (корзина) — только локально, без отправки; pull его не перезапишет (dirty). */
export async function saveDraftLocal(db: LocalDb, o: Order): Promise<void> {
  await db.orders.put({ ...o, updatedAt: new Date().toISOString(), dirty: true })
}

/** Счёт (пречек) выдан гостю — локальная отметка для плана зала (как «СЧЁТ» в v1). */
export async function markPrecheck(db: LocalDb, orderId: string): Promise<void> {
  await db.kv.put({ key: `precheck:${orderId}`, value: new Date().toISOString() })
}
