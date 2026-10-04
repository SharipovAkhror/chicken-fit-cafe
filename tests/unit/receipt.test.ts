/** Термочек в разметке v1 (метрики v1 печатали правильно на принтере кафе, лента 80 мм). */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OrderSlipV1 } from '@/features/pos/receipt-v1'
import type { Order } from '@/domain/order'

const order = {
  id: 'x', number: '017', type: 'dine_in', tableId: '3', subtotal: 133000, discountPercent: 0, discountAmount: 0, deliveryFee: 0, total: 133000,
  status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash', paidAt: '2026-10-04T10:05:53Z', cashReceived: 150000, changeAmount: 17000,
  cashierName: 'Кассир 1', createdAt: '2026-10-04T10:00:00Z', updatedAt: '2026-10-04T10:05:53Z',
  items: [
    { id: 'combo', name: 'Супер Комбо Chicken', price: 45000, originalPrice: 45000, qty: 1, isKitchen: true },
    { id: 'combo', name: 'Супер Комбо Chicken', price: 45000, originalPrice: 45000, qty: 1, isKitchen: true },
    { id: 'kompot', name: 'Освежающий компот 0.5л', price: 8000, originalPrice: 8000, qty: 1, isKitchen: false },
    { id: 'w', name: 'Chicken Крылья', price: 45000, originalPrice: 45000, qty: 1, weightKg: 0.5, pricePerKg: 90000, isKitchen: true },
  ],
} as unknown as Order
const html = (mode: 'guest' | 'precheck' | 'kitchen') => renderToStaticMarkup(createElement(OrderSlipV1, { mode, order, paper: '80mm', tableLabel: 'Стол 3', shiftNumber: 2 }))

describe('чек v1', () => {
  it('гостевой чек: шапка, время по Самарканду, агрегация одинаковых позиций, вес, оплата и сдача', () => {
    const h = html('guest')
    expect(h).toContain('guest-receipt-print')
    expect(h).toContain('КАССОВЫЙ ЧЕК ПРОДАЖИ')
    expect(h).toContain('В ЗАЛЕ (СТОЛ №3)')
    expect(h).toContain('ВРЕМЯ: 15:05:53')
    expect(h).toContain('СМЕНА: №2')
    expect(h).toContain('2 × 45 000 сум')
    expect(h).toContain('500 г × 90 000 сум/кг')
    expect(h).toContain('СДАЧА ГОСТЮ:')
    expect(h).not.toContain('<svg')
  })
  it('пречек помечен как предварительный счёт', () => {
    expect(html('precheck')).toContain('ПРЕДВАРИТЕЛЬНЫЙ СЧЁТ (ПРЕЧЕК)')
  })
  it('бегунок: только кухонные позиции, без цен', () => {
    const h = html('kitchen')
    expect(h).toContain('kitchen-receipt-print')
    expect(h).toContain('Супер Комбо Chicken')
    expect(h).not.toContain('компот')
    expect(h).not.toContain('сум')
    expect(h).toContain('3 шт')
  })
})
