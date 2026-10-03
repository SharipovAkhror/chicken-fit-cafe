import { describe, expect, it } from 'vitest'
import { addItem, baseName, gramsOf, isPriceOverridden, lineTotal, weighLine, type CartItem } from '@/domain/cart'

const chicken = (): CartItem => addItem([], { id: 'chicken-1kg', name: 'Chicken Крылья 556 г', price: 50000, originalPrice: 50000, weightKg: 0.556, pricePerKg: 90000, listPricePerKg: 90000 })[0]

describe('правка позиции в чеке', () => {
  it('смена веса пересчитывает цену и название, это не «своя цена»', () => {
    const l = weighLine(chicken(), { grams: 750 })
    expect(l.price).toBe(67500)
    expect(lineTotal(l)).toBe(67500)
    expect(l.name).toBe('Chicken Крылья 750 г')
    expect(gramsOf(l)).toBe(750)
    expect(isPriceOverridden(l)).toBe(false)
  })
  it('ввод суммы → граммы; сумма точная', () => {
    const l = weighLine(chicken(), { sum: 45000 })
    expect(gramsOf(l)).toBe(500)
    expect(l.price).toBe(45000)
    expect(isPriceOverridden(l)).toBe(false)
  })
  it('своя цена за кг — помечается, вес сохраняется; возврат к цене меню снимает пометку', () => {
    const l = weighLine(weighLine(chicken(), { grams: 1000 }), { pricePerKg: 80000 })
    expect(l.price).toBe(80000)
    expect(l.originalPrice).toBe(90000)
    expect(isPriceOverridden(l)).toBe(true)
    const back = weighLine(l, { pricePerKg: l.listPricePerKg })
    expect(isPriceOverridden(back)).toBe(false)
    expect(back.price).toBe(90000)
  })
  it('старая весовая строка без listPricePerKg (prod v2) — цена за кг берётся из строки', () => {
    const old: CartItem = { id: 'chicken-1kg', name: 'Chicken 300 г', price: 27000, originalPrice: 27000, qty: 1, weightKg: 0.3, pricePerKg: 90000 }
    const l = weighLine(old, { grams: 600 })
    expect(l.price).toBe(54000)
    expect(isPriceOverridden(l)).toBe(false)
  })
  it('обычная позиция: своя цена и название без веса', () => {
    const l = addItem([], { id: 'borsch', name: 'Борщ', price: 25000 })[0]
    expect(isPriceOverridden({ ...l, price: 20000 })).toBe(true)
    expect(baseName(l)).toBe('Борщ')
    expect(baseName({ name: 'Плов 2 г', weightKg: undefined })).toBe('Плов 2 г')
  })
})
