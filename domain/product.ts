/**
 * Типы товаров кассы. Модель выведена из v1 (menu-grid, garnish-mixer, chicken-weight-modal) и текущего меню.
 *
 *  portion   — обычная позиция за штуку/порцию (суп, салат, выпечка, напиток);
 *  weighted  — на вес: цена за кг, кассир вводит граммы или сумму («на 50 000»); пример — Chicken кг;
 *  with_side — блюдо с гарниром: при добавлении выбирается гарнир или смесь 50/50 (котлеты, гуляш…);
 *  side_mix  — сборный гарнир: порция/полпорции, 1–5 гарниров с долями.
 *
 * Отдельно от типа:
 *  station   — куда уходит позиция: kitchen (кухонный тикет, KDS) или bar (напитки — без кухни);
 *  options   — модификаторы без доплаты: variants (выбор одного, напр. Микс/Крылья/Стрипсы), extras (флажки, напр. Острый).
 *
 * В БД (миграция 0009) хранятся kind и options; у старых строк kind = null — тип выводится по признакам ниже,
 * поэтому prod v2 и старые данные продолжают работать без переразметки.
 */
import { isKitchenItem } from './cart'

export type ProductKind = 'portion' | 'weighted' | 'with_side' | 'side_mix'
export type Station = 'kitchen' | 'bar'
export type ProductOptions = { variants?: string[]; extras?: string[] }

export const KIND_LABEL: Record<ProductKind, string> = {
  portion: 'Порция',
  weighted: 'На вес',
  with_side: 'С гарниром',
  side_mix: 'Гарнир-микс',
}
export const KIND_HINT: Record<ProductKind, string> = {
  portion: 'Добавляется одним нажатием',
  weighted: 'Цена за 1 кг; кассир вводит граммы или сумму',
  with_side: 'При добавлении выбирается гарнир или смесь',
  side_mix: 'Порция или полпорции, гарниры с долями',
}

type Row = { id: string; nameRu: string; categoryId?: string | null; unit?: string | null; kind?: ProductKind | null; isKitchen?: boolean | null; options?: ProductOptions | null; price: number; pricePerKg?: number | null }

const DISHES_WITH_SIDE = new Set(['cutlet-homemade', 'cutlet-homemade-half', 'cutlet-chicken', 'cutlet-chicken-half', 'goulash', 'tefteli', 'kiev-cutlet', 'chicken-roast', 'kupaty'])

/** Модификаторы по умолчанию (как в v1) — пока админ не задал свои. */
const DEFAULT_OPTIONS: Record<string, ProductOptions> = {
  'chicken-1kg': { variants: ['Микс', 'Крылья', 'Стрипсы'], extras: ['Острый'] },
}

export function kindOf(m: Row): ProductKind {
  if (m.kind) return m.kind
  if (m.unit === 'kg' || /(^|\s)кг$/i.test(m.nameRu)) return 'weighted'
  if (m.id.startsWith('side-portion')) return 'side_mix'
  if (DISHES_WITH_SIDE.has(m.id) || /с гарниром/i.test(m.nameRu)) return 'with_side'
  return 'portion'
}
export const stationOf = (m: Row): Station => (isKitchenItem({ id: m.id, name: m.nameRu, category: m.categoryId ?? undefined, isKitchen: m.isKitchen ?? undefined }) ? 'kitchen' : 'bar')
export const optionsOf = (m: Row): ProductOptions => {
  const o = m.options ?? DEFAULT_OPTIONS[m.id] ?? {}
  return { variants: (o.variants ?? []).filter(Boolean), extras: (o.extras ?? []).filter(Boolean) }
}
export const hasOptions = (m: Row) => { const o = optionsOf(m); return (o.variants?.length ?? 0) > 0 || (o.extras?.length ?? 0) > 0 }
/** Цена за кг для весового товара: price_per_kg, иначе price (у «Chicken кг» цена задана за 1 кг). */
export const pricePerKgOf = (m: Row) => m.pricePerKg ?? m.price

/** Строка модификаторов для кухни: «Крылья · Острый». */
export const optionsNote = (variant: string | null, extras: string[]) => [variant, ...extras].filter(Boolean).join(' · ')

/** Разбор поля «через запятую» из формы редактора. */
export const parseList = (s: string) => [...new Set(s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 8)
