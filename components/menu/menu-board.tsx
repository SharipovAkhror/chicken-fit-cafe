'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  ShoppingBag,
  Check,
  X,
  ArrowRight,
  Plus,
  Minus,
  MapPin,
  Phone,
  User,
  Send,
  UtensilsCrossed,
  Utensils,
} from 'lucide-react'
import { createOrder } from '@/lib/orders'
import { nextOrderNumber, receiptDateTime } from '@/lib/receipt'

export type ViewItem = {
  id: string
  name: string
  description: string
  price: string
  rawPrice: number
  image: string
  available: boolean
  meta: string
  eager: boolean
}

export type ViewCategory = {
  id: string
  title: string
  items: ViewItem[]
}

type Labels = {
  ingredients: string
  soldOut: string
  close: string
}

export type CartItemRecord = {
  cartKey: string
  baseId: string
  name: string
  optionsDescription?: string
  price: number
  qty: number
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const SIDES_4 = [
  { id: 'puree', name: 'Картофельное пюре', icon: '🥔' },
  { id: 'rice', name: 'Рис отварной', icon: '🍚' },
  { id: 'buckwheat', name: 'Гречка', icon: '🌾' },
  { id: 'macaroni', name: 'Макароны', icon: '🍝' },
]

const SAUCES = ['Чесночный', 'Томатный', 'Сырный', 'Кисло-сладкий']

const DISHES_WITH_SIDE = new Set([
  'cutlet-chicken',
  'goulash',
  'tefteli',
  'kiev-cutlet',
  'chicken-roast',
  'kupaty',
])

function hasSideChoice(item: ViewItem): boolean {
  return (
    DISHES_WITH_SIDE.has(item.id) ||
    (item.name || '').toLowerCase().includes('с гарниром') ||
    (item.description || '').toLowerCase().includes('с гарниром')
  )
}

function Thumb({
  item,
  className,
}: {
  item: ViewItem
  className?: string
}) {
  if (!item.image) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary/50 ${className ?? ''}`}
        aria-hidden
      >
        <UtensilsCrossed className="size-8 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={item.image}
      alt={item.name}
      loading={item.eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`object-cover ${className ?? ''}`}
    />
  )
}

export function MenuBoard({
  categories,
  labels,
}: {
  categories: ViewCategory[]
  labels: Labels
}) {
  const [openItem, setOpenItem] = useState<ViewItem | null>(null)
  const [cartItems, setCartItems] = useState<Record<string, CartItemRecord>>({})
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in')
  const [selectedTable, setSelectedTable] = useState('1')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string
    table: string
    orderType: string
    total: number
    items: Array<{ name: string; qty: number; price: number; options?: string }>
    time: string
  } | null>(null)

  // Состояния для конструктора весовой курицы
  const [chickenType, setChickenType] = useState<'mix' | 'wings' | 'strips'>('mix')
  const [chickenWeightKg, setChickenWeightKg] = useState<number>(1.0)

  // Состояния для Комбо 45к
  const [comboChickenPart, setComboChickenPart] = useState<'mix' | 'wings' | 'strips'>('mix')
  const [comboIncludeFries, setComboIncludeFries] = useState(true)
  const [comboIncludeDrink, setComboIncludeDrink] = useState(true)
  const [selectedSauces, setSelectedSauces] = useState<string[]>(['Чесночный', 'Томатный'])

  // Состояние для выбора гарнира к вторым блюдам
  const [selectedSide, setSelectedSide] = useState<string>('puree')

  const close = useCallback(() => setOpenItem(null), [])

  // Чтение параметра стола из URL (?table=2)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('table')
      if (t) setSelectedTable(t)
    }
  }, [])

  const cartList = useMemo(() => {
    return Object.values(cartItems).filter((it) => it.qty > 0)
  }, [cartItems])

  const totalItemsCount = useMemo(() => {
    return cartList.reduce((sum, e) => sum + e.qty, 0)
  }, [cartList])

  const totalCartSum = useMemo(() => {
    return cartList.reduce((sum, e) => sum + e.price * e.qty, 0)
  }, [cartList])

  // Добавление обычного блюда без опций
  function handleAddSimple(item: ViewItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    const key = item.id
    setCartItems((prev) => {
      const existing = prev[key]
      if (existing) {
        return {
          ...prev,
          [key]: { ...existing, qty: existing.qty + 1 },
        }
      }
      return {
        ...prev,
        [key]: {
          cartKey: key,
          baseId: item.id,
          name: item.name,
          price: item.rawPrice,
          qty: 1,
        },
      }
    })
  }

  function handleDecrementCart(key: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setCartItems((prev) => {
      const existing = prev[key]
      if (!existing) return prev
      if (existing.qty <= 1) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return {
        ...prev,
        [key]: { ...existing, qty: existing.qty - 1 },
      }
    })
  }

  function handleIncrementCart(key: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setCartItems((prev) => {
      const existing = prev[key]
      if (!existing) return prev
      return {
        ...prev,
        [key]: { ...existing, qty: existing.qty + 1 },
      }
    })
  }

  // Выбор соусов для комбо
  function handleToggleSauce(sauce: string) {
    setSelectedSauces((prev) => {
      if (prev.includes(sauce)) {
        if (prev.length <= 1) return prev
        return prev.filter((s) => s !== sauce)
      }
      if (prev.length < 2) {
        return [...prev, sauce]
      }
      return [prev[1], sauce]
    })
  }

  // Добавление комбо через выбор опций
  function handleAddCustomCombo(item: ViewItem) {
    let price = 30000
    if (comboIncludeFries) price += 10000
    if (comboIncludeDrink) price += 5000

    const chickenLabel =
      comboChickenPart === 'mix'
        ? 'Курица 300г (Микс)'
        : comboChickenPart === 'wings'
        ? 'Курица 300г (Крылья)'
        : 'Курица 300г (Стрипсы)'

    const friesLabel = comboIncludeFries ? 'Фри 100г' : 'Без фри'
    const drinkLabel = comboIncludeDrink ? 'Компот 0.5л' : 'Без напитка'
    const saucesLabel = `Соусы: ${selectedSauces.join(', ')}`

    const optDesc = `${chickenLabel} · ${friesLabel} · ${drinkLabel} · ${saucesLabel}`
    const key = `combo-${comboChickenPart}-${comboIncludeFries}-${comboIncludeDrink}-${selectedSauces.slice().sort().join('-')}`

    setCartItems((prev) => {
      const existing = prev[key]
      if (existing) {
        return { ...prev, [key]: { ...existing, qty: existing.qty + 1 } }
      }
      return {
        ...prev,
        [key]: {
          cartKey: key,
          baseId: item.id,
          name: 'Супер Комбо Chicken',
          optionsDescription: optDesc,
          price,
          qty: 1,
        },
      }
    })
    close()
  }

  // Добавление весовой курицы
  function handleAddChickenByWeight(item: ViewItem) {
    const pricePerKg = 90000
    const calcPrice = Math.round(chickenWeightKg * pricePerKg)
    const typeLabel =
      chickenType === 'mix'
        ? 'Микс (крылья + стрипсы)'
        : chickenType === 'wings'
        ? 'Только крылья'
        : 'Только стрипсы'

    const optDesc = `${typeLabel} · ${chickenWeightKg.toFixed(1)} кг`
    const key = `chicken-weight-${chickenType}-${chickenWeightKg}`

    setCartItems((prev) => {
      const existing = prev[key]
      if (existing) {
        return { ...prev, [key]: { ...existing, qty: existing.qty + 1 } }
      }
      return {
        ...prev,
        [key]: {
          cartKey: key,
          baseId: item.id,
          name: `Хрустящая курица (${chickenWeightKg.toFixed(1)} кг)`,
          optionsDescription: optDesc,
          price: calcPrice,
          qty: 1,
        },
      }
    })
    close()
  }

  // Добавление второго блюда с гарниром
  function handleAddMainWithSide(item: ViewItem) {
    const sideObj = SIDES_4.find((s) => s.id === selectedSide) || SIDES_4[0]
    const optDesc = `Гарнир: ${sideObj.name}`
    const key = `${item.id}-${selectedSide}`

    setCartItems((prev) => {
      const existing = prev[key]
      if (existing) {
        return { ...prev, [key]: { ...existing, qty: existing.qty + 1 } }
      }
      return {
        ...prev,
        [key]: {
          cartKey: key,
          baseId: item.id,
          name: item.name,
          optionsDescription: optDesc,
          price: item.rawPrice,
          qty: 1,
        },
      }
    })
    close()
  }

  // Отправка заказа прямо на кассу
  async function handleSendOrderToPOS() {
    if (cartList.length === 0) return

    const num = nextOrderNumber()
    const dt = receiptDateTime()
    const orderItems = cartList.map((e) => ({
      id: e.baseId,
      name: e.optionsDescription ? `${e.name} (${e.optionsDescription})` : e.name,
      price: e.price,
      originalPrice: e.price,
      qty: e.qty,
    }))

    const destination =
      orderType === 'dine_in'
        ? `Стол №${selectedTable}`
        : orderType === 'takeaway'
        ? `Самовывоз (${customerName || 'Гость'}, тел: ${customerPhone || 'не указан'})`
        : `Доставка (${deliveryAddress || 'Адрес не указан'}, ${customerPhone || ''})`

    await createOrder({
      orderNumber: num,
      type: orderType,
      tableNumber: orderType === 'dine_in' ? selectedTable : undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() || undefined : undefined,
      items: orderItems,
      subtotal: totalCartSum,
      total: totalCartSum,
      paymentMethod: 'cash',
      cashierName: customerName.trim() ? `Гость (${customerName.trim()})` : 'Онлайн-заказ',
    })

    setOrderSuccess({
      orderNumber: num,
      table: destination,
      orderType:
        orderType === 'dine_in'
          ? 'В зале'
          : orderType === 'takeaway'
          ? 'Самовывоз'
          : 'Доставка',
      total: totalCartSum,
      items: cartList.map((it) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
        options: it.optionsDescription,
      })),
      time: dt,
    })

    setCartItems({})
    setShowCartDrawer(false)
  }

  useEffect(() => {
    if (!openItem && !showCartDrawer && !orderSuccess) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        setShowCartDrawer(false)
        setOrderSuccess(null)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openItem, showCartDrawer, orderSuccess, close])

  return (
    <>
      {categories.map((category) => (
        <section
          key={category.id}
          id={category.id}
          className="scroll-mt-28 md:scroll-mt-32"
        >
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {category.title}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {category.items.length} позиций
            </span>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {category.items.map((item) => {
              const isCombo = item.id === 'combo-chicken'
              const isWeightChicken = item.id === 'chicken-1kg'
              const isMainWithSide = hasSideChoice(item)
              const isConfigurable = isCombo || isWeightChicken || isMainWithSide

              // Количество в корзине
              const simpleItemInCart = cartItems[item.id]?.qty || 0

              return (
                <li key={item.id} className="flex">
                  <div
                    onClick={() => setOpenItem(item)}
                    className="group flex flex-col h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition-all duration-200 hover:border-amber-500/50 hover:shadow-md shadow-xs"
                  >
                    {/* Фотография блюда */}
                    <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-secondary/40">
                      <Thumb
                        item={item}
                        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-103 ${
                          item.available ? '' : 'opacity-40 grayscale'
                        }`}
                      />
                      {simpleItemInCart > 0 && (
                        <span className="absolute top-2.5 left-2.5 flex items-center justify-center rounded-lg bg-amber-500 px-2 py-0.5 text-xs font-bold text-black shadow-md font-mono">
                          {simpleItemInCart} шт
                        </span>
                      )}
                      {isConfigurable && (
                        <span
                          title="Выбор опций"
                          className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-xl bg-black/80 text-amber-400 backdrop-blur-md border border-amber-500/40 shadow-xs"
                        >
                          <Utensils className="size-3.5" />
                        </span>
                      )}
                      {item.meta && (
                        <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono text-zinc-200 backdrop-blur-md">
                          {item.meta}
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col p-4 gap-2">
                      <h3 className="text-base font-bold leading-snug text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-border/40">
                        <span className="text-base sm:text-lg font-bold font-mono text-foreground">
                          {item.price}
                        </span>

                        {/* Кнопка добавления / вызова опций */}
                        {item.available && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {isConfigurable ? (
                              <button
                                type="button"
                                onClick={() => setOpenItem(item)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs touch-manipulation"
                              >
                                <Utensils className="size-3.5" />
                                <span>Выбрать</span>
                              </button>
                            ) : simpleItemInCart === 0 ? (
                              <button
                                type="button"
                                onClick={(e) => handleAddSimple(item, e)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
                              >
                                <Plus className="size-3.5" />
                                <span>В заказ</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 rounded-xl bg-amber-500 px-1.5 py-1 text-black font-bold shadow-xs">
                                <button
                                  type="button"
                                  onClick={(e) => handleDecrementCart(item.id, e)}
                                  className="flex size-6 items-center justify-center rounded-lg hover:bg-black/10 cursor-pointer"
                                  aria-label="Уменьшить"
                                >
                                  <Minus className="size-3" />
                                </button>
                                <span className="min-w-5 text-center text-xs font-bold font-mono">
                                  {simpleItemInCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleAddSimple(item, e)}
                                  className="flex size-6 items-center justify-center rounded-lg hover:bg-black/10 cursor-pointer"
                                  aria-label="Увеличить"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {!item.available && (
                          <span className="rounded-md bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                            {labels.soldOut}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {/* Модальное окно просмотра / КОНСТРУКТОР БЛЮДА */}
      {openItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openItem.name}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl border border-border"
          >
            <div className={openItem.image ? 'relative' : 'relative h-12'}>
              {openItem.image && (
                <Thumb
                  item={openItem}
                  className={`aspect-[4/3] w-full rounded-t-2xl ${
                    openItem.available ? '' : 'opacity-40 grayscale'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={close}
                aria-label={labels.close}
                className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-card/90 text-foreground border border-border shadow-xs backdrop-blur-xs cursor-pointer hover:bg-secondary transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl sm:text-2xl font-bold leading-tight">
                  {openItem.name}
                </h3>
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-500">
                  {openItem.id === 'chicken-1kg'
                    ? `${formatNum(chickenWeightKg * 90000)} сум`
                    : openItem.id === 'combo-chicken'
                    ? `${formatNum(30000 + (comboIncludeFries ? 10000 : 0) + (comboIncludeDrink ? 5000 : 0))} сум`
                    : openItem.price}
                </span>
              </div>

              {openItem.meta && (
                <p className="text-xs font-mono text-muted-foreground">{openItem.meta}</p>
              )}

              {/* 1. ВЫБОР СОСТАВА КОМБО */}
              {openItem.id === 'combo-chicken' && (
                <div className="space-y-4 border-t border-border/60 pt-3">
                  {/* Шаг 1: Курица 300г */}
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-2">
                      1. Курица (300 г) — основа комбо:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'mix', label: 'Микс 50/50' },
                        { id: 'wings', label: 'Крылышки' },
                        { id: 'strips', label: 'Стрипсы' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setComboChickenPart(opt.id as any)}
                          className={`rounded-xl py-2.5 px-2 text-xs font-bold border transition text-center cursor-pointer active:scale-95 touch-manipulation ${
                            comboChickenPart === opt.id
                              ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-2xs'
                              : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Шаг 2: Дополнения (Фри и Компот) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground block">
                      2. Дополнения:
                    </label>
                    <button
                      type="button"
                      onClick={() => setComboIncludeFries(!comboIncludeFries)}
                      className={`flex items-center justify-between w-full p-3 rounded-xl border transition text-left cursor-pointer active:scale-98 touch-manipulation ${
                        comboIncludeFries
                          ? 'border-amber-500/80 bg-amber-500/10 text-foreground'
                          : 'border-border bg-secondary/20 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🍟</span>
                        <div>
                          <p className="text-xs font-bold leading-tight">Картофель Фри (100г)</p>
                          <p className="text-[11px] text-muted-foreground">+10 000 сум</p>
                        </div>
                      </div>
                      <span className={`flex size-5 items-center justify-center rounded-lg border ${
                        comboIncludeFries
                          ? 'border-amber-500 bg-amber-500 text-black font-black'
                          : 'border-muted-foreground/40'
                      }`}>
                        {comboIncludeFries && <Check className="size-3.5 stroke-[3]" />}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setComboIncludeDrink(!comboIncludeDrink)}
                      className={`flex items-center justify-between w-full p-3 rounded-xl border transition text-left cursor-pointer active:scale-98 touch-manipulation ${
                        comboIncludeDrink
                          ? 'border-amber-500/80 bg-amber-500/10 text-foreground'
                          : 'border-border bg-secondary/20 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🥤</span>
                        <div>
                          <p className="text-xs font-bold leading-tight">Домашний компот (0.5л)</p>
                          <p className="text-[11px] text-muted-foreground">+5 000 сум</p>
                        </div>
                      </div>
                      <span className={`flex size-5 items-center justify-center rounded-lg border ${
                        comboIncludeDrink
                          ? 'border-amber-500 bg-amber-500 text-black font-black'
                          : 'border-muted-foreground/40'
                      }`}>
                        {comboIncludeDrink && <Check className="size-3.5 stroke-[3]" />}
                      </span>
                    </button>
                  </div>

                  {/* Шаг 3: Соусы (выберите 2) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-foreground">
                        3. Соусы (выберите 2 соуса):
                      </label>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {selectedSauces.length} из 2
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {SAUCES.map((sauce) => {
                        const isSelected = selectedSauces.includes(sauce)
                        return (
                          <button
                            key={sauce}
                            type="button"
                            onClick={() => handleToggleSauce(sauce)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer active:scale-95 touch-manipulation ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-2xs'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>{sauce}</span>
                            {isSelected ? (
                              <Check className="size-3.5 text-amber-600 dark:text-amber-400 stroke-[3]" />
                            ) : (
                              <span className="size-3.5 rounded-full border border-muted-foreground/30" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddCustomCombo(openItem)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm font-black text-black transition active:scale-[0.98] shadow-xs cursor-pointer touch-manipulation"
                  >
                    <Plus className="size-4" />
                    <span>
                      Добавить в заказ · {formatNum(30000 + (comboIncludeFries ? 10000 : 0) + (comboIncludeDrink ? 5000 : 0))} сум
                    </span>
                  </button>
                </div>
              )}

              {/* 2. ВЫБОР ПОРЦИИ КУРИЦЫ НА РАЗВЕС */}
              {openItem.id === 'chicken-1kg' && (
                <div className="space-y-4 border-t border-border/60 pt-3">
                  {/* Выбор состава */}
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-2">
                      1. Состав порции:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'mix', label: 'Микс 50/50' },
                        { id: 'wings', label: 'Только крылья' },
                        { id: 'strips', label: 'Только стрипсы' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setChickenType(opt.id as any)}
                          className={`rounded-xl py-2.5 px-2 text-xs font-bold border transition text-center cursor-pointer active:scale-95 touch-manipulation ${
                            chickenType === opt.id
                              ? 'border-amber-500 bg-amber-500/15 text-foreground shadow-2xs'
                              : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Выбор веса */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-foreground">
                        2. Вес (90 000 сум / кг):
                      </label>
                      <span className="text-sm font-mono font-black text-amber-600 dark:text-amber-400">
                        {chickenWeightKg.toFixed(1)} кг · {formatNum(chickenWeightKg * 90000)} сум
                      </span>
                    </div>

                    {/* Быстрые кнопки веса */}
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[0.5, 1.0, 1.5, 2.0].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setChickenWeightKg(w)}
                          className={`rounded-xl py-2 text-xs font-mono font-bold transition cursor-pointer active:scale-95 touch-manipulation ${
                            chickenWeightKg === w
                              ? 'bg-amber-500 text-black shadow-xs'
                              : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {w} кг
                        </button>
                      ))}
                    </div>

                    {/* Точный регулятор +- 100г */}
                    <div className="flex items-center justify-between gap-3 bg-secondary/30 p-2 rounded-xl border border-border/50">
                      <button
                        type="button"
                        onClick={() => setChickenWeightKg((prev) => Math.max(0.3, Number((prev - 0.1).toFixed(1))))}
                        className="px-4 py-2 bg-secondary rounded-lg text-xs font-bold hover:bg-secondary/80 cursor-pointer active:scale-90 touch-manipulation"
                      >
                        − 100г
                      </button>
                      <span className="text-sm font-mono font-bold">
                        {Math.round(chickenWeightKg * 1000)} грамм
                      </span>
                      <button
                        type="button"
                        onClick={() => setChickenWeightKg((prev) => Number((prev + 0.1).toFixed(1)))}
                        className="px-4 py-2 bg-secondary rounded-lg text-xs font-bold hover:bg-secondary/80 cursor-pointer active:scale-90 touch-manipulation"
                      >
                        + 100г
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddChickenByWeight(openItem)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm font-black text-black transition active:scale-[0.98] shadow-xs cursor-pointer touch-manipulation"
                  >
                    <Plus className="size-4" />
                    <span>Добавить в заказ · {formatNum(chickenWeightKg * 90000)} сум</span>
                  </button>
                </div>
              )}

              {/* 3. ВЫБОР ГАРНИРА ДЛЯ ВТОРЫХ БЛЮД */}
              {openItem.id !== 'combo-chicken' && openItem.id !== 'chicken-1kg' && (
                <div>
                  {openItem.description && (
                    <div className="border-t border-border/50 pt-2 mb-3">
                      <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {labels.ingredients}
                      </p>
                      <p className="leading-relaxed text-sm text-foreground/90">{openItem.description}</p>
                    </div>
                  )}

                  {/* Выбор гарнира */}
                  {hasSideChoice(openItem) && (
                    <div className="mb-4 rounded-2xl bg-secondary/30 border border-border/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground">
                          Гарнир к блюду (включён в стоимость):
                        </label>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          1 на выбор
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {SIDES_4.map((side) => {
                          const isSelected = selectedSide === side.id
                          return (
                            <button
                              key={side.id}
                              type="button"
                              onClick={() => setSelectedSide(side.id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-95 touch-manipulation ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-500/15 text-foreground font-bold shadow-2xs'
                                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base" aria-hidden="true">{side.icon}</span>
                                <span className="text-xs">{side.name}</span>
                              </div>
                              {isSelected ? (
                                <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-black">
                                  <Check className="size-2.5 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="size-4 rounded-full border border-muted-foreground/30" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {openItem.available ? (
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (hasSideChoice(openItem)) {
                            handleAddMainWithSide(openItem)
                          } else {
                            handleAddSimple(openItem)
                            close()
                          }
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 px-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98] shadow-xs cursor-pointer touch-manipulation"
                      >
                        <Plus className="size-4" />
                        <span>Добавить в заказ · {openItem.price}</span>
                      </button>
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm font-medium hover:bg-secondary/80 cursor-pointer touch-manipulation"
                      >
                        Закрыть
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-center text-muted-foreground">
                      {labels.soldOut}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Плавающая плашка корзины */}
      {totalItemsCount > 0 && !showCartDrawer && (
        <div className="fixed bottom-4 inset-x-4 z-40 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            className="flex w-full items-center justify-between rounded-xl bg-zinc-900 text-white dark:bg-amber-500 dark:text-black px-4 py-3.5 font-bold shadow-xl border border-white/10 transition active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-md bg-amber-500 text-black dark:bg-black dark:text-amber-400 text-xs font-mono font-bold">
                {totalItemsCount}
              </span>
              <span className="text-sm">Оформить заказ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{formatNum(totalCartSum)} сум</span>
              <ArrowRight className="size-4" />
            </div>
          </button>
        </div>
      )}

      {/* Шторка оформления заказа */}
      {showCartDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setShowCartDrawer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col max-h-[92vh] w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card border border-border p-5 shadow-2xl text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-amber-500" />
                <h3 className="text-base font-bold">Ваш заказ</h3>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  {totalItemsCount} шт
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCartDrawer(false)}
                className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Выбор типа заказа: В зале / Самовывоз / Доставка */}
            <div className="pt-3 pb-2 border-b border-border/50">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1 mb-3">
                <button
                  type="button"
                  onClick={() => setOrderType('dine_in')}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                    orderType === 'dine_in'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  В зале
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                    orderType === 'takeaway'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Самовывоз
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                    orderType === 'delivery'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Доставка
                </button>
              </div>

              {/* Поля в зависимости от типа заказа */}
              {orderType === 'dine_in' && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground">Выберите стол:</span>
                  <div className="flex gap-1.5 overflow-x-auto pt-1.5 pb-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', 'Бар'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedTable(num)}
                        className={`min-w-8 h-8 rounded-lg text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                          selectedTable === num
                            ? 'bg-amber-500 text-black shadow-xs'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {orderType === 'takeaway' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Ваше имя"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="tel"
                      placeholder="Номер телефона (+998)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                    <MapPin className="size-3.5 text-amber-500 shrink-0" />
                    <input
                      type="text"
                      placeholder="Адрес доставки (улица, дом, квартира)"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="tel"
                      placeholder="Номер телефона (+998)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Список блюд в корзине */}
            <div className="my-2.5 flex-1 space-y-2 overflow-y-auto pr-1">
              {cartList.map((item) => (
                <div key={item.cartKey} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/30 p-2.5 border border-border/40">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs truncate">{item.name}</p>
                    {item.optionsDescription && (
                      <p className="text-[10px] text-muted-foreground truncate">{item.optionsDescription}</p>
                    )}
                    <p className="text-[11px] font-mono text-muted-foreground">{formatNum(item.price * item.qty)} сум</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => handleDecrementCart(item.cartKey)}
                      className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="min-w-4 text-center text-xs font-mono font-bold">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => handleIncrementCart(item.cartKey)}
                      className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Итого и отправка */}
            <div className="border-t border-border/70 pt-3 space-y-3">
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-xs text-muted-foreground">ИТОГО:</span>
                <span className="text-xl font-bold text-foreground">{formatNum(totalCartSum)} сум</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCartItems({})}
                  className="rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Очистить
                </button>
                <button
                  type="button"
                  onClick={handleSendOrderToPOS}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400 active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <Send className="size-3.5" />
                  <span>Отправить заказ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Экран подтверждения отправленного заказа */}
      {orderSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setOrderSuccess(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl text-foreground space-y-4"
          >
            <div className="text-center space-y-2">
              <div className="flex size-12 mx-auto items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <Check className="size-6" />
              </div>
              <h3 className="text-xl font-bold">Заказ принят!</h3>
              <p className="text-xs text-muted-foreground">
                Заказ передан в систему. Номер: <span className="font-mono font-bold text-foreground">{orderSuccess.orderNumber}</span> ({orderSuccess.orderType})
              </p>
            </div>

            {/* Электронная квитанция */}
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2 font-mono text-xs">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="font-bold">ChickenFit · {orderSuccess.table}</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{orderSuccess.orderNumber}</span>
              </div>
              <div className="space-y-1 py-1">
                {orderSuccess.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-muted-foreground">
                    <div>
                      <span>{it.name} × {it.qty}</span>
                      {it.options && <p className="text-[10px] text-muted-foreground/80">{it.options}</p>}
                    </div>
                    <span>{formatNum(it.price * it.qty)} сум</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-border/50 pt-1.5 font-bold text-foreground">
                <span>ИТОГО:</span>
                <span>{formatNum(orderSuccess.total)} сум</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOrderSuccess(null)}
              className="w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-black shadow-xs transition hover:bg-amber-400 cursor-pointer"
            >
              Понятно, спасибо
            </button>
          </div>
        </div>
      )}
    </>
  )
}
