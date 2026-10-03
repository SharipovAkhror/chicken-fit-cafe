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
  pricePerKg?: number
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

export const removeLine = (cart: CartItem[], index: number): CartItem[] => cart.filter((_, i) => i !== index)
export const lineTotal = (item: CartItem): number => roundUZS(item.price * item.qty)
export const cartSubtotal = (cart: CartItem[]): number => cart.reduce((s, i) => s + lineTotal(i), 0)
export const cartCount = (cart: CartItem[]): number => cart.reduce((s, i) => s + (i.weightKg ? 1 : i.qty), 0)
export const kitchenItems = (cart: CartItem[]): CartItem[] => cart.filter((i) => isKitchenItem(i))

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
