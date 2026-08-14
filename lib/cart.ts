/**
 * Логика корзины POS-терминала.
 *
 * Все функции чистые: принимают массив, возвращают новый массив.
 * Компонент хранит `CartItem[]` в `useState` и вызывает эти хелперы.
 */

export type CartItem = {
  /** id позиции из menu.json */
  id: string
  /** Название (ru) */
  name: string
  /** Текущая цена за единицу (может быть изменена кассиром) */
  price: number
  /** Исходная цена из меню — для отображения скидки */
  originalPrice: number
  /** Количество */
  qty: number
}

/** Добавить +1 к позиции. Если её нет в корзине — создать запись. */
export function addItem(
  cart: CartItem[],
  item: { id: string; name: string; price: number },
): CartItem[] {
  const idx = cart.findIndex((c) => c.id === item.id)
  if (idx >= 0) {
    return cart.map((c, i) => (i === idx ? { ...c, qty: c.qty + 1 } : c))
  }
  return [
    ...cart,
    {
      id: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.price,
      qty: 1,
    },
  ]
}

/** Удалить позицию из корзины полностью. */
export function removeItem(cart: CartItem[], id: string): CartItem[] {
  return cart.filter((c) => c.id !== id)
}

/** Установить конкретное количество. Если qty <= 0, позиция удаляется. */
export function setQty(cart: CartItem[], id: string, qty: number): CartItem[] {
  if (qty <= 0) return removeItem(cart, id)
  return cart.map((c) => (c.id === id ? { ...c, qty } : c))
}

/** Изменить цену позиции (для скидок/акций). */
export function setPrice(
  cart: CartItem[],
  id: string,
  price: number,
): CartItem[] {
  return cart.map((c) => (c.id === id ? { ...c, price: Math.max(0, price) } : c))
}

/** Сумма позиции (цена × количество). */
export function lineTotal(item: CartItem): number {
  return item.price * item.qty
}

/** Итого по всей корзине. */
export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + lineTotal(item), 0)
}

/** Общее количество единиц товаров. */
export function cartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.qty, 0)
}

/** Очистить корзину. */
export function clearCart(): CartItem[] {
  return []
}
