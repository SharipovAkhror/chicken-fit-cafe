'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
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

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
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
        className={`flex items-center justify-center bg-secondary ${className ?? ''}`}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mark.svg"
          alt=""
          className="size-1/3 max-w-16 opacity-25"
        />
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
  const [guestCart, setGuestCart] = useState<Record<string, number>>({})
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [selectedTable, setSelectedTable] = useState('1')
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string
    table: string
    total: number
    items: Array<{ name: string; qty: number; price: number }>
    time: string
  } | null>(null)

  const close = useCallback(() => setOpenItem(null), [])

  // Чтение параметра стола из URL (?table=2)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('table')
      if (t) setSelectedTable(t)
    }
  }, [])

  // Карта всех блюд
  const allItemsMap = useMemo(() => {
    const map: Record<string, ViewItem> = {}
    categories.forEach((cat) => {
      cat.items.forEach((it) => {
        map[it.id] = it
      })
    })
    return map
  }, [categories])

  const cartEntries = useMemo(() => {
    return Object.entries(guestCart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        item: allItemsMap[id],
        qty,
      }))
      .filter((e) => Boolean(e.item))
  }, [guestCart, allItemsMap])

  const totalItemsCount = useMemo(() => {
    return cartEntries.reduce((sum, e) => sum + e.qty, 0)
  }, [cartEntries])

  const totalCartSum = useMemo(() => {
    return cartEntries.reduce((sum, e) => sum + (e.item?.rawPrice || 0) * e.qty, 0)
  }, [cartEntries])

  function handleAddToCart(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setGuestCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }))
  }

  function handleRemoveFromCart(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setGuestCart((prev) => {
      const cur = prev[id] || 0
      if (cur <= 1) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return {
        ...prev,
        [id]: cur - 1,
      }
    })
  }

  // Отправка заказа прямо на кассу и официанту
  async function handleSendOrderToPOS() {
    if (cartEntries.length === 0) return

    const num = nextOrderNumber()
    const dt = receiptDateTime()
    const orderItems = cartEntries.map((e) => ({
      id: e.item.id,
      name: e.item.name,
      price: e.item.rawPrice,
      originalPrice: e.item.rawPrice,
      qty: e.qty,
    }))

    await createOrder({
      orderNumber: num,
      type: 'dine_in',
      tableNumber: selectedTable,
      items: orderItems,
      total: totalCartSum,
      paymentMethod: 'cash',
    })

    setOrderSuccess({
      orderNumber: num,
      table: selectedTable,
      total: totalCartSum,
      items: orderItems.map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
      time: dt,
    })

    setGuestCart({})
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
          <h2 className="mb-4 text-2xl font-black tracking-tight md:text-3xl text-foreground">
            {category.title}
          </h2>

          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {category.items.map((item) => {
              const inCart = guestCart[item.id] || 0

              return (
                <li key={item.id} className="flex">
                  <div
                    onClick={() => setOpenItem(item)}
                    className="flex h-full w-full cursor-pointer gap-3.5 overflow-hidden rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-amber-500/40 hover:bg-secondary/40 sm:flex-col sm:gap-0 sm:p-0 shadow-xs"
                  >
                    <div className="relative shrink-0 sm:w-full">
                      <Thumb
                        item={item}
                        className={`size-24 rounded-xl sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none ${
                          item.available ? '' : 'opacity-40 grayscale'
                        }`}
                      />
                      {inCart > 0 && (
                        <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black shadow">
                          {inCart}
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:p-4">
                      <h3 className="text-base leading-snug font-bold text-balance sm:text-lg text-foreground">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="line-clamp-2 text-xs sm:text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div>
                          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 sm:text-lg">
                            {item.price}
                          </span>
                          {item.meta && (
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              {item.meta}
                            </span>
                          )}
                        </div>

                        {/* Кнопка быстрого добавления в корзину */}
                        {item.available && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {inCart === 0 ? (
                              <button
                                type="button"
                                onClick={(e) => handleAddToCart(item.id, e)}
                                className="flex items-center gap-1 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-black px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 transition cursor-pointer active:scale-95"
                              >
                                <span>+</span>
                                <span>Выбрать</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 rounded-xl bg-amber-500 px-1 py-0.5 text-black font-bold shadow-sm">
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveFromCart(item.id, e)}
                                  className="flex size-6 items-center justify-center rounded-lg hover:bg-black/10 text-sm font-bold cursor-pointer"
                                >
                                  −
                                </button>
                                <span className="min-w-4 text-center text-xs">
                                  {inCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleAddToCart(item.id, e)}
                                  className="flex size-6 items-center justify-center rounded-lg hover:bg-black/10 text-sm font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {!item.available && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
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

      {/* Модалка подробного просмотра карточки блюда */}
      {openItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openItem.name}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl border border-border/50"
          >
            <div className={openItem.image ? 'relative' : 'relative h-14'}>
              {openItem.image && (
                <Thumb
                  item={openItem}
                  className={`aspect-[4/3] w-full rounded-t-3xl ${
                    openItem.available ? '' : 'opacity-40 grayscale'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={close}
                aria-label={labels.close}
                autoFocus
                className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-card/90 text-xl leading-none font-medium shadow-md backdrop-blur focus-visible:outline-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-2xl leading-tight font-black text-balance">
                  {openItem.name}
                </h3>
                <span className="text-2xl font-extrabold text-amber-500">
                  {openItem.price}
                </span>
              </div>

              {openItem.meta && (
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground">{openItem.meta}</p>
              )}

              {openItem.description && (
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {labels.ingredients}
                  </p>
                  <p className="leading-relaxed text-sm">{openItem.description}</p>
                </div>
              )}

              {openItem.available ? (
                <div className="pt-2 flex items-center gap-3">
                  {(guestCart[openItem.id] || 0) > 0 ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-amber-500 px-4 py-2 text-black font-bold shadow">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(openItem.id)}
                        className="flex size-8 items-center justify-center rounded-xl bg-black/10 text-lg hover:bg-black/20"
                      >
                        −
                      </button>
                      <span className="text-base font-black">
                        {guestCart[openItem.id]} шт
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(openItem.id)}
                        className="flex size-8 items-center justify-center rounded-xl bg-black/10 text-lg hover:bg-black/20"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(openItem.id)}
                      className="flex-1 rounded-2xl bg-amber-500 py-3 text-base font-bold text-black transition hover:bg-amber-400 active:scale-98 shadow"
                    >
                      + Добавить в заказ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-2xl border border-border bg-secondary px-5 py-3 text-sm font-semibold hover:bg-secondary/80"
                  >
                    Закрыть
                  </button>
                </div>
              ) : (
                <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground">
                  {labels.soldOut}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Плавающая плашка корзины заказа (как в Яндекс.Еда / Uzum Tezkor) */}
      {totalItemsCount > 0 && !showCartDrawer && (
        <div className="fixed bottom-4 inset-x-4 z-40 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-amber-500 p-4 text-black font-extrabold shadow-2xl shadow-amber-500/40 transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-xl bg-black text-amber-400 text-xs font-black">
                {totalItemsCount}
              </span>
              <span className="text-sm sm:text-base">Ваш заказ (Стол №{selectedTable})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">{formatNum(totalCartSum)} сум</span>
              <span className="text-sm">➔</span>
            </div>
          </button>
        </div>
      )}

      {/* Шторка оформления заказа гостем */}
      {showCartDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowCartDrawer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col max-h-[90vh] w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-card border border-border p-5 sm:p-6 shadow-2xl text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍗</span>
                <h3 className="text-lg font-black">Ваш заказ</h3>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {totalItemsCount} шт
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCartDrawer(false)}
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold hover:bg-secondary/80"
              >
                ✕
              </button>
            </div>

            {/* Выбор стола */}
            <div className="pt-3 pb-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-muted-foreground">Номер вашего стола:</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', 'Бар'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedTable(num)}
                    className={`min-w-8 h-8 rounded-xl text-xs font-bold transition shrink-0 ${
                      selectedTable === num
                        ? 'bg-amber-500 text-black shadow'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Список выбранных блюд */}
            <div className="my-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
              {cartEntries.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/40 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatNum(item.rawPrice * qty)} сум</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-secondary px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="size-6 text-base font-bold text-muted-foreground hover:text-foreground"
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center text-xs font-black">{qty}</span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item.id)}
                      className="size-6 text-base font-bold text-muted-foreground hover:text-foreground"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Итого и отправка заказа на кассу */}
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-muted-foreground">ИТОГО К ОПЛАТЕ:</span>
                <span className="text-2xl font-black text-amber-500">{formatNum(totalCartSum)} сум</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGuestCart({})}
                  className="rounded-xl bg-secondary px-4 py-3 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Очистить
                </button>
                <button
                  type="button"
                  onClick={handleSendOrderToPOS}
                  className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-black text-black transition hover:bg-amber-400 active:scale-98 shadow-lg shadow-amber-500/20"
                >
                  🔔 Отправить заказ на кассу (Стол №{selectedTable})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Экран подтверждения отправленного заказа */}
      {orderSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setOrderSuccess(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-foreground space-y-4"
          >
            <div className="text-center space-y-2">
              <div className="flex size-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl">
                ✅
              </div>
              <h3 className="text-2xl font-black text-foreground">Заказ принят!</h3>
              <p className="text-sm text-muted-foreground">
                Заказ отправлен на кассу. Официант уже готовит чек и подходит к столу №{orderSuccess.table}.
              </p>
            </div>

            {/* Электронный чек на экране телефона гостя */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-bold">ChickenFit · Стол №{orderSuccess.table}</span>
                <span className="text-amber-500 font-bold">{orderSuccess.orderNumber}</span>
              </div>
              <div className="space-y-1.5 py-1">
                {orderSuccess.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.name} × {it.qty}</span>
                    <span>{formatNum(it.price * it.qty)} сум</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-black text-amber-500">
                <span>ИТОГО:</span>
                <span>{formatNum(orderSuccess.total)} сум</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOrderSuccess(null)}
              className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-black text-black shadow transition hover:bg-amber-400"
            >
              Отлично, спасибо!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
