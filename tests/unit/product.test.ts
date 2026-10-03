import { describe, expect, it } from 'vitest'
import { kindOf, stationOf, optionsOf, hasOptions, pricePerKgOf, optionsNote, parseList } from '@/domain/product'
import { needsSideChoice } from '@/domain/garnish'
import menu from '@/content/menu.json'

const row = (o: Partial<Parameters<typeof kindOf>[0]> & { id: string }) => ({ nameRu: o.id, price: 10000, ...o })

describe('типы товаров', () => {
  it('явный kind из БД важнее признаков', () => {
    expect(kindOf(row({ id: 'chicken-1kg', nameRu: 'Chicken кг', kind: 'portion' }))).toBe('portion')
    expect(kindOf(row({ id: 'x', kind: 'with_side' }))).toBe('with_side')
  })
  it('старые строки без kind: тип выводится как в v1', () => {
    expect(kindOf(row({ id: 'chicken-1kg', nameRu: 'Chicken кг' }))).toBe('weighted')
    expect(kindOf(row({ id: 'w', nameRu: 'Крылья', unit: 'kg' }))).toBe('weighted')
    expect(kindOf(row({ id: 'side-portion-half', nameRu: 'Гарнир (Полпорции)' }))).toBe('side_mix')
    expect(kindOf(row({ id: 'goulash', nameRu: 'Гуляш' }))).toBe('with_side')
    expect(kindOf(row({ id: 'n', nameRu: 'Рыба с гарниром' }))).toBe('with_side')
    expect(kindOf(row({ id: 'borsch', nameRu: 'Борщ' }))).toBe('portion')
  })
  it('kind влияет на выбор гарнира', () => {
    expect(needsSideChoice({ id: 'goulash', nameRu: 'Гуляш', kind: 'portion' })).toBe(false)
    expect(needsSideChoice({ id: 'new', nameRu: 'Плов', kind: 'with_side' })).toBe(true)
    expect(needsSideChoice({ id: 'goulash', nameRu: 'Гуляш' })).toBe(true)
  })
  it('станция: кухня / бар', () => {
    expect(stationOf(row({ id: 'a', isKitchen: false }))).toBe('bar')
    expect(stationOf(row({ id: 'a', isKitchen: true }))).toBe('kitchen')
  })
  it('модификаторы: по умолчанию для Chicken кг, свои — из БД', () => {
    expect(optionsOf(row({ id: 'chicken-1kg' }))).toEqual({ variants: ['Микс', 'Крылья', 'Стрипсы'], extras: ['Острый'] })
    expect(optionsOf(row({ id: 'chicken-1kg', options: { variants: ['BBQ'] } }))).toEqual({ variants: ['BBQ'], extras: [] })
    expect(hasOptions(row({ id: 'borsch' }))).toBe(false)
    expect(optionsNote('Крылья', ['Острый'])).toBe('Крылья · Острый')
    expect(optionsNote(null, [])).toBe('')
  })
  it('цена за кг', () => {
    expect(pricePerKgOf(row({ id: 'c', price: 90000 }))).toBe(90000)
    expect(pricePerKgOf(row({ id: 'c', price: 90000, pricePerKg: 95000 }))).toBe(95000)
  })
  it('разбор списка из формы', () => {
    expect(parseList(' Микс, Крылья;Крылья\nСтрипсы ,, ')).toEqual(['Микс', 'Крылья', 'Стрипсы'])
    expect(parseList('a,b,c,d,e,f,g,h,i,j')).toHaveLength(8)
  })
  it('текущее меню: тип выводится для всех позиций', () => {
    const items = (menu as unknown as { categories: { items: { id: string; name: { ru: string }; price: number }[] }[] }).categories.flatMap((c) => c.items)
    const kinds = items.map((m) => kindOf({ id: m.id, nameRu: m.name.ru, price: m.price }))
    expect(items.length).toBeGreaterThan(30)
    const count = (k: string) => kinds.filter((x) => x === k).length
    expect(count('weighted')).toBeGreaterThanOrEqual(1)
    expect(count('side_mix')).toBeGreaterThanOrEqual(1)
    expect(count('with_side')).toBeGreaterThanOrEqual(3)
    expect(count('portion')).toBeGreaterThan(20)
  })
})
