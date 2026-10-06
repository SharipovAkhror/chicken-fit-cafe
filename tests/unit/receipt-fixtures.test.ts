/**
 * Тестовые чеки для визуальной проверки печати (tests/e2e/receipt-render.mjs → PNG 80 мм).
 * Без RECEIPT_OUT только проверяет, что разметка строится; с RECEIPT_OUT=<папка> пишет HTML-файлы.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import { OrderSlipV1, ShiftSlipV1 } from '@/features/pos/receipt-v1'
import type { Order, ShiftSummary } from '@/domain/order'

const base = { id: 'x', type: 'dine_in', tableId: '3', discountPercent: 0, discountAmount: 0, deliveryFee: 0, status: 'completed', paymentStatus: 'paid',
  paymentMethod: 'cash', paidAt: '2026-10-04T10:05:53Z', cashierName: 'Кассир 1', createdAt: '2026-10-04T10:00:00Z', updatedAt: '2026-10-04T10:05:53Z' }
const owner017 = { ...base, number: '017', subtotal: 133000, total: 133000, cashReceived: 150000, changeAmount: 17000, items: [
  { id: 'combo', name: 'Супер Комбо Chicken', price: 45000, originalPrice: 45000, qty: 2, isKitchen: true },
  { id: 'goulash', name: 'Гуляш с гарниром', price: 35000, originalPrice: 35000, qty: 1, isKitchen: true, notes: 'Гарнир: Гречка' },
  { id: 'kompot', name: 'Освежающий компот 0.5л', price: 8000, originalPrice: 8000, qty: 1, isKitchen: false },
] } as unknown as Order
const stress = { ...base, number: '128', type: 'delivery', tableId: null, customerPhone: '+998 93 380 20 02', deliveryAddress: 'ул. Ибн Сина, 136, подъезд 2, этаж 5, домофон 54',
  subtotal: 12_458_000, discountPercent: 10, discountAmount: 1_245_800, deliveryFee: 25_000, total: 11_237_200, cashReceived: 11_300_000, changeAmount: 62_800,
  cashierName: 'Шарипова Мухаббат Абдуллаевна', items: [
    { id: 'long', name: 'Шашлык из куриного филе в фирменном маринаде с овощами гриль и соусом терияки', price: 1_250_000, originalPrice: 1_250_000, qty: 9, isKitchen: true },
    { id: 'mix', name: 'Гарнир (Порция): Пюре + Рис + Гречка', price: 35000, originalPrice: 35000, qty: 1, isKitchen: true, notes: 'Пюре 44% + Рис 28% + Гречка 28% (180г)' },
    { id: 'w', name: 'Chicken Крылья 1250 г', price: 112_500, originalPrice: 112_500, qty: 1, weightKg: 1.25, pricePerKg: 90000, isKitchen: true, notes: 'Острый' },
    { id: 'nospace', name: 'Суперкомбосемейныйнаборбезпробеловдлятеста', price: 99000, originalPrice: 99000, qty: 1, isKitchen: true },
    { id: 'tea', name: 'Чай', price: 5000, originalPrice: 5000, qty: 1, isKitchen: false },
  ] } as unknown as Order
const shift: ShiftSummary = { number: 12, cashier_name: 'Кассир 1', opened_at: '2026-10-04T03:00:00Z', closed_at: '2026-10-04T16:00:00Z', initial_cash: 200000,
  counted_cash: 3_150_000, orders_count: 87, total_revenue: 4_912_000, cash_revenue: 2_950_000, click_revenue: 1_962_000, discount_total: 45000, expected_cash: 3_150_000,
  dine_in: 60, takeaway: 20, delivery: 7, cancelled_count: 2, unpaid_open_count: 0,
  top_items: [{ name: 'Супер Комбо Chicken', qty: 30, revenue: 1_350_000 }, { name: 'Шашлык из куриного филе в фирменном маринаде', qty: 12, revenue: 1_200_000 }] }

const files: Record<string, { mode: string; html: string }> = {
  'guest-017': { mode: 'guest', html: renderToStaticMarkup(createElement(OrderSlipV1, { mode: 'guest', order: owner017, paper: '80mm', tableLabel: 'Стол 3', shiftNumber: 2 })) },
  'guest-stress': { mode: 'guest', html: renderToStaticMarkup(createElement(OrderSlipV1, { mode: 'guest', order: stress, paper: '80mm', shiftNumber: 12 })) },
  'precheck-stress': { mode: 'precheck', html: renderToStaticMarkup(createElement(OrderSlipV1, { mode: 'precheck', order: { ...stress, paymentStatus: 'unpaid' } as Order, paper: '80mm', shiftNumber: 12 })) },
  'kitchen-stress': { mode: 'kitchen', html: renderToStaticMarkup(createElement(OrderSlipV1, { mode: 'kitchen', order: stress, paper: '80mm' })) },
  'shift-z': { mode: 'shift', html: renderToStaticMarkup(createElement(ShiftSlipV1, { type: 'Z', s: shift })) },
}

describe('тестовые чеки для печати', () => {
  it('строятся и (по запросу) пишутся в RECEIPT_OUT', () => {
    for (const f of Object.values(files)) expect(f.html.length).toBeGreaterThan(500)
    const out = process.env.RECEIPT_OUT
    if (!out) return
    mkdirSync(out, { recursive: true })
    for (const [name, f] of Object.entries(files)) writeFileSync(`${out}/${name}.${f.mode}.html`, f.html)
  })
})
