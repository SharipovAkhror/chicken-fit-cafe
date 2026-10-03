import { describe, expect, it } from 'vitest'
import { buildMix, equalSplit, mixNote, shiftPercent, needsSideChoice, isGarnishPortion } from '@/domain/garnish'

describe('гарниры', () => {
  it('равные доли как в v1', () => {
    expect(equalSplit(1)).toEqual([100])
    expect(equalSplit(2)).toEqual([50, 50])
    expect(equalSplit(3)).toEqual([34, 33, 33])
  })
  it('сдвиг доли держит сумму 100 и минимум 10', () => {
    let p = [50, 50]
    for (let i = 0; i < 10; i++) p = shiftPercent(p, 0, 10)
    expect(p).toEqual([90, 10])
    const q = shiftPercent([34, 33, 33], 1, 10)
    expect(q.reduce((a, b) => a + b, 0)).toBe(100)
    expect(Math.min(...q)).toBeGreaterThanOrEqual(10)
  })
  it('смесь и заметка для кухни', () => {
    const mix = buildMix(['puree', 'rice'], [50, 50], 180)
    expect(mix).toEqual([{ ingredient: 'Пюре', percent: 50, grams: 90 }, { ingredient: 'Рис', percent: 50, grams: 90 }])
    expect(mixNote(mix, 180)).toBe('Пюре 50% + Рис 50% (180г)')
  })
  it('какие позиции открывают выбор', () => {
    expect(needsSideChoice({ id: 'goulash', nameRu: 'Гуляш' })).toBe(true)
    expect(needsSideChoice({ id: 'x', nameRu: 'Рыба с гарниром' })).toBe(true)
    expect(needsSideChoice({ id: 'cutlet-single', nameRu: 'Котлеты (без гарнира)' })).toBe(false)
    expect(isGarnishPortion({ id: 'side-portion-half' })).toBe(true)
    expect(isGarnishPortion({ id: 'fries' })).toBe(false)
  })
})
