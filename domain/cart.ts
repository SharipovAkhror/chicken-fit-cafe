/**
 * Корзина/позиции заказа. Чистые функции (перенесены из v1 lib/cart.ts, логика расчётов сохранена).
 */
import { roundUZS } from './money'

export type GarnishIngredient = { ingredient: string; percent: number; grams?: number }

export type CartItem = {
  /** id позиции меню или уникальный id микса */
  id: string
  name: string
  /** цена за единицу (может быть изменена кассиром) */
  price: number
  originalPrice: number
  qty: number
  category?: string
  isKitchen?: boolean
  notes?: string
  garnishMix?: GarnishIngredient[]
  weightKg?: number
  /** цена за кг в этой позиции (может быть изменена кассиром) */
  pricePerKg?: number
  /** цена за кг по меню — для расчёта originalPrice весовой позиции */
  listPricePerKg?: number
  unit?: string
}

const NON_KITCHEN_HINTS = ['напит', 'drink', 'чай', 'tea', 'кофе', 'coffee', 'cola', 'кола', 'вода', 'water', 'компот', 'compote', 'сок', 'juice', 'fanta', 'sprite', 'pepsi']

export function isKitchenItem(item: { id?: string; name?: string; category?: string; isKitchen?: boolean }): boolean {
  if (typeof item.isKitchen === 'boolean') return item.isKitchen
  const cat = (item.category || '').toLowerCase()
  if (cat === 'drinks' || cat === 'напитки') return false
  const hay = `${item.id || ''} ${item.name || ''}`.toLowerCase()
  return !NON_KITCHEN_HINTS.some((h) => hay.includes(h))
}

export function addItem(cart: CartItem[], item: Omit<CartItem, 'qty' | 'originalPrice'> & { qty?: number; originalPrice?: number }): CartItem[] {
  const addQty = item.qty && item.qty > 0 ? item.qty : 1
  // позиции с индивидуальными параметрами (микс, вес, комментарий) не склеиваем
  const mergeable = !item.garnishMix && !item.weightKg && !item.notes
  const idx = mergeable ? cart.findIndex((c) => c.id === item.id && !c.garnishMix && !c.weightKg && !c.notes) : -1
  if (idx >= 0) return cart.map((c, i) => (i === idx ? { ...c, qty: c.qty + addQty } : c))
  return [
    ...cart,
    {
      ...item,
      qty: addQty,
      originalPrice: item.originalPrice ?? item.price,
      isKitchen: item.isKitchen ?? isKitchenItem(item),
    },
  ]
}

export function setQty(cart: CartItem[], index: number, qty: number): CartItem[] {
  if (qty <= 0) return cart.filter((_, i) => i !== index)
  return cart.map((c, i) => (i === index ? { ...c, qty } : c))
}

export function updateLine(cart: CartItem[], index: number, updates: Partial<CartItem>): CartItem[] {
  return cart.map((c, i) => (i === index ? { ...c, ...updates, price: Math.max(0, updates.price ?? c.price) } : c))
}

export const lineTotal = (item: CartItem): number => roundUZS(item.price * item.qty)
export const cartSubtotal = (cart: CartItem[]): number => cart.reduce((s, i) => s + lineTotal(i), 0)
export const cartCount = (cart: CartItem[]): number => cart.reduce((s, i) => s + (i.weightKg ? 1 : i.qty), 0)

export type Totals = { subtotal: number; discountAmount: number; deliveryFee: number; total: number }

/** Итоги: скидка в % от подытога ИЛИ фиксированная сумма (что задано), доставка сверху. Всё целыми сумами. */
export function computeTotals(cart: CartItem[], discountPercent = 0, customDiscount = 0, deliveryFee = 0): Totals {
  const subtotal = cartSubtotal(cart)
  const pct = Math.min(100, Math.max(0, discountPercent))
  const byPct = roundUZS((subtotal * pct) / 100)
  const discountAmount = Math.min(subtotal, Math.max(byPct, roundUZS(customDiscount)))
  const fee = Math.max(0, roundUZS(deliveryFee))
  return { subtotal, discountAmount, deliveryFee: fee, total: subtotal - discountAmount + fee }
}

/** Сдача (не меньше нуля). */
export const changeDue = (total: number, received: number): number => Math.max(0, roundUZS(received) - roundUZS(total))

/** Название без хвоста веса: «Chicken Крылья 556 г» → «Chicken Крылья». */
export const baseName = (item: Pick<CartItem, 'name' | 'weightKg'>): string => (item.weightKg ? item.name.replace(/\s+\d+\s?г$/u, '') : item.name)
export const gramsOf = (item: Pick<CartItem, 'weightKg'>): number => Math.round((item.weightKg ?? 0) * 1000)
/** Цена изменена вручную (price ≠ цена по меню). Эти строки сервер пишет в аудит (order_events 'price_override'). */
export const isPriceOverridden = (item: CartItem): boolean => roundUZS(item.price) !== roundUZS(item.originalPrice)

/**
 * Весовая позиция: новый вес, сумма или цена за кг. Цена пересчитывается; originalPrice = вес × цена за кг по меню,
 * поэтому смена веса — не «ручная цена», а смена цены за кг — ручная.
 */
export function weighLine(item: CartItem, change: { grams?: number; sum?: number; pricePerKg?: number }): CartItem {
  const listPpk = item.listPricePerKg ?? item.pricePerKg ?? item.price
  const ppk = Math.max(0, change.pricePerKg ?? item.pricePerKg ?? listPpk)
  let grams = change.grams ?? gramsOf(item)
  let price: number
  if (change.sum !== undefined) {
    price = roundUZS(change.sum)
    grams = ppk > 0 ? Math.round((price * 1000) / ppk) : 0
  } else price = roundUZS((grams * ppk) / 1000)
  const originalPrice = ppk === listPpk ? price : roundUZS((grams * listPpk) / 1000)
  return { ...item, qty: 1, weightKg: grams / 1000, pricePerKg: ppk, listPricePerKg: listPpk, price, originalPrice, name: `${baseName(item)} ${grams} г` }
}

/**
 * Объединение счетов (слияние столов): позиции второго заказа добавляются к первому.
 * Одинаковые простые позиции (тот же id и цена, без веса/микса/комментария) складываются по количеству.
 */
export function mergeCarts(into: CartItem[], from: CartItem[]): CartItem[] {
  const out = into.map((c) => ({ ...c }))
  const simple = (c: CartItem) => !c.garnishMix && !c.weightKg && !c.notes
  for (const it of from) {
    const idx = simple(it) ? out.findIndex((c) => simple(c) && c.id === it.id && c.price === it.price && c.originalPrice === it.originalPrice) : -1
    if (idx >= 0) out[idx] = { ...out[idx], qty: out[idx].qty + it.qty }
    else out.push({ ...it })
  }
  return out
}
