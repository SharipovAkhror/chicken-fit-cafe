import { describe, expect, it } from 'vitest'
import { addItem, isSaneLine, MAX_GRAMS, MAX_QTY, setQty, weighLine, type CartItem } from '@/domain/cart'

const w: CartItem = { id: 'mix', name: 'Chicken Микс 500 г', price: 45000, originalPrice: 45000, qty: 1, weightKg: 0.5, pricePerKg: 90000, listPricePerKg: 90000 }

describe('caps (№062)', () => {
  it('weight 999999999 г clamps to max', () => {
    const l = weighLine(w, { grams: 999_999_999 })
    expect(l.weightKg).toBe(MAX_GRAMS / 1000)
    expect(l.price).toBe(1_800_000)
    expect(isSaneLine(l)).toBe(true)
  })
  it('huge sum clamps grams', () => {
    expect(weighLine(w, { sum: 89_999_999_910 }).weightKg).toBe(MAX_GRAMS / 1000)
  })
  it('piece qty clamps', () => {
    const c = addItem([], { id: 'a', name: 'A', price: 1000, qty: 999_999_999 })
    expect(c[0].qty).toBe(MAX_QTY)
    expect(setQty(c, 0, 1e9)[0].qty).toBe(MAX_QTY)
    expect(addItem(c, { id: 'a', name: 'A', price: 1000 })[0].qty).toBe(MAX_QTY)
  })
  it('isSaneLine rejects bogus line', () => {
    expect(isSaneLine({ qty: 1, price: 89_999_999_910, weightKg: 999_999.999 })).toBe(false)
  })
})
