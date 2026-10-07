import { describe, expect, it } from 'vitest'
import { addDays, dayOf, daySales, delta, durationLabel, floorOf, shiftSales, shortSum, timerProgress, timerTone } from '@/domain/metrics'
import type { Order } from '@/domain/order'

const o = (p: Partial<Order>): Order => ({
  id: Math.random().toString(36).slice(2), number: '1', type: 'dine_in', tableId: '1', items: [], subtotal: 0, discountPercent: 0, discountAmount: 0, deliveryFee: 0,
  total: 0, status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash', createdAt: '2026-10-06T05:00:00Z', updatedAt: '2026-10-06T05:00:00Z', ...p,
} as Order)
const item = (id: string, name: string, price: number, qty = 1, weightKg?: number) => ({ id, name, price, originalPrice: price, qty, weightKg })

describe('показатели дня', () => {
  const orders = [
    o({ total: 100000, paidAt: '2026-10-06T05:10:00Z', items: [item('combo', 'Супер Комбо', 50000, 2)] }), // 10:10 по Самарканду
    o({ total: 30000, paidAt: '2026-10-06T08:30:00Z', paymentMethod: 'click_payme', type: 'takeaway', items: [item('combo', 'Супер Комбо', 30000)] }),
    o({ total: 45000, paidAt: '2026-10-06T09:00:00Z', items: [item('w', 'Крылья 500 г', 45000, 1, 0.5)] }),
    o({ total: 99999, paidAt: '2026-10-06T09:30:00Z', status: 'cancelled' }), // отменён — не продажа
    o({ total: 70000, paymentStatus: 'unpaid', status: 'open' }), // не оплачен
    o({ total: 80000, paidAt: '2026-10-05T05:00:00Z' }), // вчера 10:00
    o({ total: 20000, paidAt: '2026-10-05T12:00:00Z' }), // вчера 17:00
    o({ total: 5000, paidAt: '2026-10-06T19:30:00Z' }), // 00:30 7 октября по Самарканду
  ]
  it('выручка, чеки, средний чек, наличные/Click, по часам, хиты', () => {
    const s = daySales(orders, '2026-10-06')
    expect(s.revenue).toBe(175000)
    expect(s.orders).toBe(3)
    expect(s.avg).toBe(58333)
    expect(s.cash).toBe(145000)
    expect(s.card).toBe(30000)
    expect(s.byType).toEqual({ dine_in: 2, takeaway: 1, delivery: 0 })
    expect(s.byHour[10]).toBe(100000)
    expect(s.byHour[13]).toBe(30000)
    expect(s.top[0]).toMatchObject({ id: 'combo', name: 'Супер Комбо', qty: 3, revenue: 130000 })
    expect(s.top[1]).toMatchObject({ name: 'Крылья', qty: 1 })
  })
  it('сравнение со вчера на это же время', () => {
    const now = 14 * 60 // 14:00
    const y = daySales(orders, addDays('2026-10-06', -1), now)
    expect(y.revenue).toBe(80000)
    expect(delta(daySales(orders, '2026-10-06', now).revenue, y.revenue)).toBe(63) // до 14:00: 130 000 к 80 000
    expect(delta(10, 0)).toBeNull()
  })
  it('день по Самарканду, смена', () => {
    expect(dayOf('2026-10-06T19:30:00Z')).toBe('2026-10-07')
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(shiftSales([o({ total: 10, paidAt: '2026-10-06T05:00:00Z', shiftId: 's1' }), o({ total: 7, paidAt: '2026-10-06T05:00:00Z', shiftId: 's2' })], 's1').revenue).toBe(10)
    expect(shiftSales(orders, null).orders).toBe(0)
  })
})

describe('зал', () => {
  it('загрузка, счёт выдан, сумма открытых, самый долгий стол', () => {
    const now = Date.parse('2026-10-06T10:00:00Z')
    const f = floorOf([
      o({ tableId: '1', status: 'open', paymentStatus: 'unpaid', total: 50000, items: [item('a', 'A', 50000)], createdAt: '2026-10-06T09:15:00Z' }),
      o({ tableId: '2', status: 'sent', paymentStatus: 'unpaid', total: 20000, items: [item('a', 'A', 20000)], precheckAt: '2026-10-06T09:50:00Z', createdAt: '2026-10-06T09:40:00Z' }),
      o({ tableId: null, type: 'takeaway', status: 'open', paymentStatus: 'unpaid', total: 9000, items: [item('a', 'A', 9000)], createdAt: '2026-10-06T09:58:00Z' }),
      o({ tableId: '3', total: 1000, paidAt: '2026-10-06T09:00:00Z' }),
    ], ['1', '2', '3', '4'], now)
    expect(f).toEqual({ tables: 4, busy: 2, billed: 1, free: 2, occupancy: 50, openSum: 79000, openChecks: 3, longestMin: 45 })
  })
  it('таймер стола и подписи', () => {
    expect([timerTone(5), timerTone(30), timerTone(75)]).toEqual(['ok', 'warn', 'late'])
    expect(timerProgress(45)).toBe(0.5)
    expect(timerProgress(200)).toBe(1)
    expect(durationLabel(65)).toBe('1 ч 05 мин')
    expect(durationLabel(7)).toBe('7 мин')
    expect([shortSum(4_912_000), shortSum(12_400_000), shortSum(254_000), shortSum(8000), shortSum(1_000_000)]).toEqual(['4,9 млн', '12 млн', '254 тыс', '8 000', '1 млн'])
  })
})
