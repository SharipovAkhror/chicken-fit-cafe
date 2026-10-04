/**
 * Регрессия прод-инцидента 04.10.2026: «заказы не закрываются».
 * Заказ с кухонными позициями оплачивали сразу (без «Кухня») → pay() ставил status='sent', и заказ оставался
 * активным до «Выдано» на экране кухни, которым кафе не пользуется: стол занят, «С собой» копились, стол открывал
 * оплаченный (заблокированный) заказ. Теперь оплата закрывает заказ.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
vi.mock('@/features/app/runtime', () => ({ getEngine: () => ({ kick() {} }) }))
import { LocalDb } from '@/data/local-db'
import { pay, sendToKitchen, newOrder } from '@/features/pos/actions'
import { displayStatus, isActive, isClosed, isKitchenVisible, statusAfterPayment, type Order } from '@/domain/order'

const kitchenItem = { id: 'combo', name: 'Супер Комбо Chicken', price: 45000, originalPrice: 45000, qty: 1, isKitchen: true }
const base = (p: Partial<Order> = {}): Order => ({
  ...newOrder({ type: 'dine_in', tableId: '3', cashierName: 'Кассир 1', deviceId: 'd' }),
  items: [kitchenItem as never], subtotal: 45000, total: 45000, ...p,
})

describe('закрытие заказа оплатой', () => {
  it('оплаченный заказ со статусом кухни «sent» (как 17 заказов на проде) — закрыт, стол свободен, на кухне не висит', () => {
    const stuck = base({ number: '013', status: 'sent', paymentStatus: 'paid', paymentMethod: 'cash' })
    expect(isActive(stuck)).toBe(false)
    expect(isClosed(stuck)).toBe(true)
    expect(displayStatus(stuck)).toBe('Закрыт')
    expect(isKitchenVisible(stuck)).toBe(false)
  })
  it('неоплаченный заказ активен; отправленный на кухню — виден кухне', () => {
    expect(isActive(base())).toBe(true)
    expect(isKitchenVisible(base({ status: 'sent' }))).toBe(true)
    expect(displayStatus(base({ status: 'sent' }))).toBe('На кухне')
  })
  it('отменённый — не активен и не «Закрыт»', () => {
    const c = base({ status: 'cancelled', paymentStatus: 'unpaid' })
    expect(isActive(c)).toBe(false)
    expect(isClosed(c)).toBe(false)
    expect(displayStatus(c)).toBe('Отменён')
  })
  it('статус после оплаты: completed; если кухня уже готовит — остаётся у кухни', () => {
    for (const s of ['open', 'sent', 'served', 'completed'] as const) expect(statusAfterPayment(base({ status: s }))).toBe('completed')
    expect(statusAfterPayment(base({ status: 'cooking' }))).toBe('cooking')
    expect(statusAfterPayment(base({ status: 'ready' }))).toBe('ready')
    expect(statusAfterPayment(base({ status: 'cancelled' }))).toBe('cancelled')
  })
})

describe('pay() в IndexedDB + outbox', () => {
  let db: LocalDb
  beforeEach(async () => { db = new LocalDb(`t-${Math.random()}`); await db.open() })

  it('оплата сразу (без «Кухня») закрывает заказ и отправляет completed+paid на сервер', async () => {
    const o = await pay(db, base(), 'cash', 50000)
    expect(o.status).toBe('completed')
    expect(o.paymentStatus).toBe('paid')
    expect(o.changeAmount).toBe(5000)
    expect(isActive((await db.orders.get(o.id))!)).toBe(false)
    const q = await db.outbox.toArray()
    expect(q.at(-1)!.payload).toMatchObject({ id: o.id, status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash' })
  })
  it('«Кухня» → оплата тоже закрывает', async () => {
    const sent = await sendToKitchen(db, base())
    expect(isActive(sent)).toBe(true)
    const paid = await pay(db, sent, 'click_payme', null)
    expect(paid.status).toBe('completed')
    expect(isActive(paid)).toBe(false)
  })
})
