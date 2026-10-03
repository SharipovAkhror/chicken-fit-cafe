import { describe, expect, it } from 'vitest'
import { addItem, cartSubtotal, computeTotals, changeDue, setQty } from '@/domain/cart'
import { formatSum, roundUZS } from '@/domain/money'

describe('cart', () => {
  it('склеивает одинаковые позиции, но не миксы и не позиции с комментарием', () => {
    let c = addItem([], { id: 'a', name: 'A', price: 1000 })
    c = addItem(c, { id: 'a', name: 'A', price: 1000 })
    c = addItem(c, { id: 'a', name: 'A', price: 1000, notes: 'без лука' })
    expect(c).toHaveLength(2)
    expect(c[0].qty).toBe(2)
    expect(cartSubtotal(c)).toBe(3000)
    expect(setQty(c, 0, 0)).toHaveLength(1)
  })
  it('итоги: скидка % или сумма (берётся большая), доставка, сдача', () => {
    const c = addItem([], { id: 'a', name: 'A', price: 50000, qty: 2 })
    const t = computeTotals(c, 10, 0, 0)
    expect(t).toMatchObject({ subtotal: 100000, discountAmount: 10000, total: 90000 })
    expect(computeTotals(c, 0, 0, 15000).total).toBe(115000)
    expect(changeDue(90000, 100000)).toBe(10000)
  })
  it('деньги', () => {
    expect(roundUZS(1234.6)).toBe(1235)
    expect(formatSum(1234567).replace(/\s/g, ' ')).toBe('1 234 567 сум')
  })
})
