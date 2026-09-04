/**
 * Логика корзины POS-терминала.
 *
 * Все функции чистые: принимают массив, возвращают новый массив.
 * Компонент хранит `CartItem[]` в `useState` и вызывает эти хелперы.
 */

export type GarnishIngredient = {
  ingredient: string
  percent: number
  grams?: number
}

export type CartItem = {
  /** id позиции из menu.json или уникальный id микса */
  id: string
  /** Название (ru) */
  name: string
  /** Текущая цена за единицу (может быть изменена кассиром) */
  price: number
  /** Исходная цена из меню — для отображения скидки */
  originalPrice: number
  /** Количество */
  qty: number
  /** Категория меню (например, 'sides', 'drinks', 'mains') */
  category?: string
  /** Относится ли блюдо к кухне (false для напитков бара, компотов, воды) */
  isKitchen?: boolean
  /** Дополнительные примечания (например, состав микса гарнира) */
  notes?: string
  /** Подробная раскладка ингредиентов микса */
  garnishMix?: GarnishIngredient[]
}

/** Проверка, готовится ли позиция на кухне */
export function isKitchenItem(item: {
  id?: string
  name?: string
  category?: string
  isKitchen?: boolean
}): boolean {
  if (typeof item.isKitchen === 'boolean') {
    return item.isKitchen
  }

  const cat = (item.category || '').toLowerCase()
  if (cat === 'drinks' || cat === 'напитки') {
    return false
  }

  const id = (item.id || '').toLowerCase()
  const name = (item.name || '').toLowerCase()

  // Исключаем напитки, компоты, пакетированный чай/кофе, минералку
  const drinkKeywords = [
    'compote',
    'компот',
    'tea',
    'чай',
    'coffee',
    'кофе',
    'coca-cola',
    'cola',
    'fanta',
    'sprite',
    'water',
    'вода',
    'torabika',
    'maccoffee',
    'americano',
    'американо',
    'напиток',
  ]

  for (const kw of drinkKeywords) {
    if (id.includes(kw) || name.includes(kw)) {
      return false
    }
  }

  return true
}

/** Отфильтровать только блюда для кухни */
export function getKitchenItems(items: CartItem[]): CartItem[] {
  return items.filter(isKitchenItem)
}

/** Добавить +1 к позиции или создать новую запись */
export function addItem(
  cart: CartItem[],
  item: {
    id: string
    name: string
    price: number
    category?: string
    isKitchen?: boolean
    notes?: string
    garnishMix?: GarnishIngredient[]
  },
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
      category: item.category,
      isKitchen:
        item.isKitchen !== undefined ? item.isKitchen : isKitchenItem(item),
      notes: item.notes,
      garnishMix: item.garnishMix,
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

/** Изменить примечание / комментарий позиции (для кухни). */
export function setNotes(
  cart: CartItem[],
  id: string,
  notes: string,
): CartItem[] {
  return cart.map((c) => (c.id === id ? { ...c, notes } : c))
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

/** Общее количество блюд на кухню. */
export function kitchenItemsCount(cart: CartItem[]): number {
  return getKitchenItems(cart).reduce((sum, item) => sum + item.qty, 0)
}

/** Очистить корзину. */
export function clearCart(): CartItem[] {
  return []
}
