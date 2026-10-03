/** Гарниры и смеси гарниров (логика v1: components/pos/garnish-mixer-modal.tsx, menu-grid.tsx). */
import type { GarnishIngredient } from './cart'

export const GARNISHES = [
  { id: 'puree', name: 'Пюре' },
  { id: 'rice', name: 'Рис' },
  { id: 'buckwheat', name: 'Гречка' },
  { id: 'macaroni', name: 'Макароны' },
  { id: 'fries', name: 'Фри' },
] as const

export const QUICK_MIXES: [string, string][] = [
  ['puree', 'rice'], ['puree', 'buckwheat'], ['rice', 'buckwheat'], ['puree', 'macaroni'], ['rice', 'macaroni'],
]

export const PORTION = { half: { label: 'Полпорции', grams: 180 }, full: { label: '1 порция', grams: 350 } } as const
export type PortionSize = keyof typeof PORTION

/** Блюда, к которым кассир выбирает гарнир (список v1 + «с гарниром» в названии). */
const DISHES_WITH_SIDE = new Set(['cutlet-homemade', 'cutlet-homemade-half', 'cutlet-chicken', 'cutlet-chicken-half', 'goulash', 'tefteli', 'kiev-cutlet', 'chicken-roast', 'kupaty'])
export const needsSideChoice = (m: { id: string; nameRu: string; kind?: string | null }) => (m.kind ? m.kind === 'with_side' : DISHES_WITH_SIDE.has(m.id) || /с гарниром/i.test(m.nameRu))
/** Сборный гарнир (порция/полпорции) — открывает конструктор смеси. Картофель фри добавляется как обычная позиция. */
export const isGarnishPortion = (m: { id: string }) => m.id.startsWith('side-portion')
export const portionOf = (m: { id: string; price: number }): PortionSize => (m.id.includes('full') || m.price >= 35000 ? 'full' : 'half')

const nameOf = (id: string) => GARNISHES.find((g) => g.id === id)?.name ?? id

/** Равные доли: 100 / 50+50 / 34+33+33 … (остаток — первому). */
export function equalSplit(n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(100 / n)
  return Array.from({ length: n }, (_, i) => base + (i < 100 - base * n ? 1 : 0))
}

/** Сдвиг доли ингредиента на step с компенсацией за счёт остальных; минимум 10% на каждого. */
export function shiftPercent(p: number[], idx: number, step: number, min = 10): number[] {
  if (p.length < 2) return p
  const next = [...p]
  const target = Math.min(100 - min * (p.length - 1), Math.max(min, next[idx] + step))
  let delta = target - next[idx]
  next[idx] = target
  // по 1% у остальных, начиная с самого большого (или отдаём самому маленькому) — доли меняются равномерно
  while (delta !== 0) {
    const others = next.map((v, i) => ({ v, i })).filter((o) => o.i !== idx && (delta > 0 ? o.v > min : o.v < 100))
    if (!others.length) break
    others.sort((x, y) => (delta > 0 ? y.v - x.v : x.v - y.v) || x.i - y.i)
    const sgn = delta > 0 ? 1 : -1
    next[others[0].i] -= sgn
    delta -= sgn
  }
  return next
}

export function buildMix(ids: string[], percents: number[], grams?: number): GarnishIngredient[] {
  return ids.map((id, i) => ({ ingredient: nameOf(id), percent: percents[i], ...(grams ? { grams: Math.round((grams * percents[i]) / 100) } : {}) }))
}

export const mixLabel = (mix: GarnishIngredient[]) => mix.map((g) => g.ingredient).join(' + ')
export const mixNote = (mix: GarnishIngredient[], grams?: number) =>
  (mix.length === 1 ? mix[0].ingredient : mix.map((g) => `${g.ingredient} ${g.percent}%`).join(' + ')) + (grams ? ` (${grams}г)` : '')
