/** Операции кассы: сначала локально (IndexedDB), затем в outbox. Работают без сети. */
import { uuidv4 } from '@/domain/ids'
import { computeTotals, mergeCarts, type CartItem } from '@/domain/cart'
import { statusAfterPayment, type Order, type OrderStatus, type OrderType, type PaymentMethod, type Shift } from '@/domain/order'
import type { LocalDb, MenuItemRow } from '@/data/local-db'
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

/** Оплата закрывает заказ (освобождает стол). Неотправленные кухонные позиции печатаются на кухню вызывающим кодом. */
export async function pay(db: LocalDb, o: Order, method: PaymentMethod, cashReceived: number | null): Promise<Order> {
  // возобновлённый заказ: reopenedAt уходит как есть — сервер отклонит оплату, если заказ с тех пор снова изменили (0013)
  return saveOrder(db, {
    ...o,
    paymentStatus: 'paid',
    paymentMethod: method,
    paidAt: new Date().toISOString(),
    cashReceived: method === 'cash' ? cashReceived : null,
    changeAmount: method === 'cash' && cashReceived ? Math.max(0, cashReceived - o.total) : null,
    status: statusAfterPayment(o),
  })
}

export async function setStatus(db: LocalDb, o: Order, status: OrderStatus): Promise<void> {
  const final = status === 'served' && o.paymentStatus === 'paid' ? 'completed' : status
  await db.orders.update(o.id, { status: final, updatedAt: new Date().toISOString() })
  await enqueue(db, 'order.set_status', o.id, { id: o.id, status: final })
  getEngine().kick()
}

/**
 * Отмена заказа (0013): локально + мутация order.cancel — сервер пишет аудит (order_events 'cancelled': кто, сумма, причина).
 * Без PIN (решение владельца); причина необязательна — пустую сервер запишет как «Без причины».
 * Черновик без номера (не уходил на сервер) просто удаляется.
 */
export async function cancelOrder(db: LocalDb, o: Order, reason: string, opts: { mergedInto?: string } = {}): Promise<void> {
  if (!o.number) { await db.orders.delete(o.id); return }
  const r = reason.trim().slice(0, 200)
  await db.orders.put({ ...o, status: 'cancelled', notes: [o.notes, `${opts.mergedInto ? 'Объединён' : 'Отмена'}: ${r || 'Без причины'}`].filter(Boolean).join('\n'), updatedAt: new Date().toISOString(), dirty: false })
  await enqueue(db, 'order.cancel', o.id, { id: o.id, reason: r, mergedInto: opts.mergedInto ?? null })
  getEngine().kick()
}

/** Объединить счёт стола `from` в заказ `into` (#9): позиции переносятся, исходный заказ отменяется с причиной «Объединён…». */
export async function mergeOrders(db: LocalDb, into: Order, from: Order, fromLabel: string): Promise<Order> {
  const items = mergeCarts(into.items, from.items)
  const saved = await saveOrder(db, { ...withTotals(into, items), precheckAt: into.precheckAt ? null : into.precheckAt })
  await cancelOrder(db, from, `Объединён со счётом №${saved.number} (${fromLabel})`, { mergedInto: saved.id })
  return saved
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

/** «Счёт выдан»: отметка уходит на сервер (orders.precheck_at, 0013) — видна на всех кассах (#12). */
export async function markPrecheck(db: LocalDb, o: Order): Promise<Order> {
  return saveOrder(db, { ...o, precheckAt: new Date().toISOString() })
}

export type MenuItemInput = Omit<MenuItemRow, 'isDeleted' | 'needsReview' | 'sortOrder'>

/** Создать/изменить блюдо: локально + menu.upsert в outbox (из редактора меню и из заказа). */
export async function saveMenuItem(db: LocalDb, row: MenuItemInput, categoryTitle: string, existing: MenuItemRow | null): Promise<MenuItemRow> {
  const same = await db.menu.where('categoryId').equals(row.categoryId ?? '').toArray().catch(() => [] as MenuItemRow[])
  const maxSort = Math.max(0, ...same.map((i) => i.sortOrder))
  const full: MenuItemRow = existing ? { ...existing, ...row } : { ...row, isDeleted: false, needsReview: false, sortOrder: maxSort + 1 }
  await db.menu.put(full)
  if (full.categoryId && !(await db.categories.get(full.categoryId))) await db.categories.put({ id: full.categoryId, titleRu: categoryTitle, sortOrder: 99, isActive: true })
  await enqueue(db, 'menu.upsert', full.id, {
    id: full.id, nameRu: full.nameRu, categoryId: full.categoryId, categoryTitle, price: full.price, imageUrl: full.imageUrl ?? '',
    isKitchen: full.isKitchen, available: full.available, kind: full.kind, unit: full.unit, pricePerKg: full.pricePerKg ?? null,
    weight: full.weight ?? null, options: full.options ?? null, ...(existing ? {} : { sortOrder: full.sortOrder }),
  })
  getEngine().kick()
  return full
}
