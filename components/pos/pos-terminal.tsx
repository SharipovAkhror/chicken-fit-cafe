'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import menuJson from '@/content/menu.json'
import type { Localized, MenuItem } from '@/lib/menu'
import {
  addItem,
  removeItem,
  setQty,
  setPrice,
  clearCart,
  cartTotal,
  cartCount,
  type CartItem,
  type GarnishIngredient,
} from '@/lib/cart'
import {
  nextOrderNumber,
  peekOrderNumber,
  receiptDateTime,
} from '@/lib/receipt'
import {
  createOrder,
  fetchTodayOrders,
  type Order,
  type OrderType,
  type PaymentMethod,
} from '@/lib/orders'
import { useTheme } from '@/lib/theme'
import { MenuGrid } from './menu-grid'
import { CartPanel } from './cart-panel'
import {
  ReceiptPrint,
  ReceiptModal,
  type ReceiptProps,
  type PrintMode,
} from './receipt-print'
import { GarnishMixerModal } from './garnish-mixer-modal'
import { OrdersHistory } from './orders-history'
import { ShiftReport } from './shift-report'
import { MenuManager } from './menu-manager'
import { QrManager } from './qr-manager'

type CategoryData = {
  id: string
  title: string
  items: MenuItem[]
}

const MENU_OVERRIDES_KEY = 'chickenfit_pos_menu_overrides_v1'

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function getInitialCategories(): CategoryData[] {
  const base = menuJson as {
    categories: Array<{
      id: string
      title: Localized
      items: MenuItem[]
    }>
  }

  const result = base.categories.map((c) => ({
    id: c.id,
    title: typeof c.title === 'string' ? c.title : c.title.ru ?? '',
    items: [...c.items],
  }))

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(MENU_OVERRIDES_KEY)
      if (raw) {
        const overrides = JSON.parse(raw) as Record<string, Partial<MenuItem>>
        result.forEach((cat) => {
          cat.items = cat.items.map((it) => {
            if (overrides[it.id]) {
              return { ...it, ...overrides[it.id] }
            }
            return it
          })
        })
      }
    } catch {}
  }

  return result
}

export function PosTerminal() {
  const { isDark, toggleTheme } = useTheme()
  const [categories, setCategories] = useState<CategoryData[]>(getInitialCategories)
  const [activeTab, setActiveTab] = useState<'pos' | 'orders' | 'shift' | 'menu' | 'qr'>('pos')
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? 'chicken')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNumber, setOrderNumber] = useState(() => peekOrderNumber())

  // Параметры текущего заказа
  const [orderType, setOrderType] = useState<OrderType>('takeaway')
  const [tableNumber, setTableNumber] = useState<string>('1')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [deliveryAddress, setDeliveryAddress] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [customDiscount, setCustomDiscount] = useState<number>(0)
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [showMobileCart, setShowMobileCart] = useState<boolean>(false)
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false)

  // Модальное окно микшера гарниров
  const [showGarnishModal, setShowGarnishModal] = useState<boolean>(false)
  const [garnishInitialSize, setGarnishInitialSize] = useState<'half' | 'full'>('half')

  // История заказов за сегодня
  const [todayOrders, setTodayOrders] = useState<Order[]>([])

  // Данные для печати текущего чека
  const [receiptData, setReceiptData] = useState<ReceiptProps | null>(null)

  const reloadOrders = useCallback(async () => {
    const orders = await fetchTodayOrders()
    setTodayOrders(orders)
  }, [])

  useEffect(() => {
    reloadOrders()
    // Периодическая фоновая синхронизация заказов каждые 10 секунд
    const interval = setInterval(() => {
      reloadOrders()
    }, 10000)
    return () => clearInterval(interval)
  }, [reloadOrders])

  // Сохранение изменений меню в локальное хранилище
  function persistMenuOverrides(updated: CategoryData[]) {
    setCategories(updated)
    if (typeof window === 'undefined') return
    const map: Record<string, Partial<MenuItem>> = {}
    updated.forEach((cat) => {
      cat.items.forEach((it) => {
        map[it.id] = {
          price: it.price,
          available: it.available,
          name: it.name,
          description: it.description,
        }
      })
    })
    localStorage.setItem(MENU_OVERRIDES_KEY, JSON.stringify(map))
  }

  const handleAddItem = useCallback(
    (item: {
      id: string
      name: string
      price: number
      category?: string
      isKitchen?: boolean
      notes?: string
    }) => {
      setCart((prev) => addItem(prev, item))
    },
    [],
  )

  const handleOpenGarnishMixer = useCallback((initialSize?: 'half' | 'full') => {
    setGarnishInitialSize(initialSize || 'half')
    setShowGarnishModal(true)
  }, [])

  const handleAddGarnish = useCallback(
    (garnishItem: {
      id: string
      name: string
      price: number
      category: string
      isKitchen: boolean
      notes: string
      garnishMix: GarnishIngredient[]
      qty: number
    }) => {
      setCart((prev) => {
        let updated = prev
        for (let i = 0; i < garnishItem.qty; i++) {
          updated = addItem(updated, {
            id: garnishItem.id,
            name: garnishItem.name,
            price: garnishItem.price,
            category: garnishItem.category,
            isKitchen: true,
            notes: garnishItem.notes,
            garnishMix: garnishItem.garnishMix,
          })
        }
        return updated
      })
    },
    [],
  )

  const handleAddCustomItem = useCallback(
    (item: { name: string; price: number }) => {
      const id = `custom-${Date.now()}`
      setCart((prev) =>
        addItem(prev, {
          id,
          name: item.name,
          price: item.price,
          isKitchen: false,
        }),
      )
    },
    [],
  )

  const handleSetQty = useCallback((id: string, qty: number) => {
    setCart((prev) => setQty(prev, id, qty))
  }, [])

  const handleSetPrice = useCallback((id: string, price: number) => {
    setCart((prev) => setPrice(prev, id, price))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setCart((prev) => removeItem(prev, id))
  }, [])

  const handleClear = useCallback(() => {
    setCart(clearCart())
    setCashReceived(0)
    setDiscountPercent(0)
    setCustomDiscount(0)
    setDeliveryFee(0)
    setShowMobileCart(false)
  }, [])

  // Печать с заданным режимом ('guest' | 'kitchen' | 'both')
  const handlePrintWithMode = useCallback(
    (mode: PrintMode) => {
      if (!receiptData) return
      setReceiptData((prev) => (prev ? { ...prev, printMode: mode } : null))
      requestAnimationFrame(() => {
        window.print()
      })
    },
    [receiptData],
  )

  // Оформление заказа и печать
  const handleSubmitOrder = useCallback(async () => {
    if (cart.length === 0) return

    const num = nextOrderNumber()
    const dt = receiptDateTime()
    const subtotal = cartTotal(cart)
    const pctDiscount =
      discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0
    const totalDiscount = pctDiscount + (customDiscount || 0)
    const activeDelivery = orderType === 'delivery' ? deliveryFee : 0
    const finalTotal = Math.max(0, subtotal - totalDiscount + activeDelivery)
    const change = Math.max(0, (cashReceived || finalTotal) - finalTotal)

    const rData: ReceiptProps = {
      items: [...cart],
      orderNumber: num,
      dateTime: dt,
      orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      customerPhone: orderType === 'delivery' ? customerPhone : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      subtotal,
      discountAmount: totalDiscount,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      deliveryFee: activeDelivery,
      total: finalTotal,
      paymentMethod,
      cashReceived:
        paymentMethod === 'cash' ? cashReceived || finalTotal : undefined,
      changeAmount: paymentMethod === 'cash' ? change : undefined,
      printMode: 'guest',
    }

    // 1. Сохраняем заказ в базу / локальное хранилище
    await createOrder({
      orderNumber: num,
      type: orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      customerPhone: orderType === 'delivery' ? customerPhone : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      items: [...cart],
      subtotal,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
      deliveryFee: activeDelivery > 0 ? activeDelivery : undefined,
      total: finalTotal,
      paymentMethod,
      cashReceived:
        paymentMethod === 'cash' ? cashReceived || finalTotal : undefined,
      changeAmount: paymentMethod === 'cash' ? change : undefined,
    })

    // 2. Формируем данные чека и открываем экран
    setReceiptData(rData)
    setShowReceiptModal(true)

    // 3. Открываем окно печати чека
    requestAnimationFrame(() => {
      window.print()

      // Сброс корзины и подготовка следующего заказа
      setCart(clearCart())
      setOrderNumber(peekOrderNumber())
      setCashReceived(0)
      setDiscountPercent(0)
      setCustomDiscount(0)
      setDeliveryFee(0)
      setShowMobileCart(false)
      reloadOrders()
    })
  }, [
    cart,
    orderType,
    tableNumber,
    customerPhone,
    deliveryAddress,
    paymentMethod,
    cashReceived,
    discountPercent,
    customDiscount,
    deliveryFee,
    reloadOrders,
  ])

  // Повторная печать чека из истории
  const handleReprint = useCallback(
    (order: Order, mode: PrintMode = 'guest') => {
      const rData: ReceiptProps = {
        items: order.items,
        orderNumber: order.orderNumber,
        dateTime: receiptDateTime(),
        orderType: order.type,
        tableNumber: order.tableNumber,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        subtotal: order.subtotal ?? order.total,
        discountAmount: order.discountAmount ?? 0,
        discountPercent: order.discountPercent,
        deliveryFee: order.deliveryFee ?? 0,
        total: order.total,
        paymentMethod: order.paymentMethod,
        cashReceived: order.cashReceived,
        changeAmount: order.changeAmount,
        printMode: mode,
      }

      setReceiptData(rData)
      setShowReceiptModal(true)

      requestAnimationFrame(() => {
        window.print()
      })
    },
    [],
  )

  // Функции управления меню
  const handleToggleAvailable = useCallback(
    (itemId: string, available: boolean) => {
      const updated = categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) =>
          it.id === itemId ? { ...it, available } : it,
        ),
      }))
      persistMenuOverrides(updated)
    },
    [categories],
  )

  const handleUpdatePrice = useCallback(
    (itemId: string, price: number) => {
      const updated = categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) =>
          it.id === itemId ? { ...it, price } : it,
        ),
      }))
      persistMenuOverrides(updated)
    },
    [categories],
  )

  const handleAddNewItem = useCallback(
    (categoryId: string, item: Omit<MenuItem, 'id'>) => {
      const id = `item-${Date.now()}`
      const newItem: MenuItem = { ...item, id }
      const updated = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, items: [...cat.items, newItem] } : cat,
      )
      persistMenuOverrides(updated)
    },
    [categories],
  )

  const totalCartCount = cartCount(cart)
  const currentSubtotal = cartTotal(cart)
  const currentDiscountAmount =
    discountPercent > 0 ? (currentSubtotal * discountPercent) / 100 : 0
  const currentDelivery = orderType === 'delivery' ? deliveryFee : 0
  const currentFinalTotal = Math.max(
    0,
    currentSubtotal - currentDiscountAmount - customDiscount + currentDelivery,
  )

  return (
    <>
      <div className="flex h-screen w-full flex-col bg-zinc-100 dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-100 overflow-hidden select-none">
        {/* Верхняя панель навигации POS */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/90 px-3 sm:px-5 backdrop-blur-md z-10 shadow-2xs">
          {/* Левая часть: логотип и статус */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-black tracking-wider text-black dark:text-white group"
              title="Перейти на клиентский сайт меню"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500 font-black text-black text-sm shadow-xs group-hover:scale-105 transition">
                CF
              </span>
              <span className="hidden sm:inline font-black text-base">
                CHICKEN<span className="text-amber-600 dark:text-amber-400">FIT</span>
              </span>
            </Link>
            <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              ● КАССА ОНЛАЙН
            </span>
          </div>

          {/* Центральная часть: переключатель вкладок терминала */}
          <nav className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-zinc-100 dark:bg-zinc-950/80 p-1 border border-zinc-200/60 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              🛒 Терминал
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders')
                reloadOrders()
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              📋 Заказы ({todayOrders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('shift')
                reloadOrders()
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'shift'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              📊 Смена
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              🍱 Меню
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              📱 QR & Столы
            </button>
          </nav>

          {/* Правая часть: кнопка темы */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center size-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-200 transition hover:bg-amber-500 hover:text-black cursor-pointer shadow-xs"
              title={
                isDark
                  ? 'Переключить на светлую тему'
                  : 'Переключить на тёмную тему'
              }
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Главная рабочая область */}
        <div className="flex min-h-0 flex-1 overflow-hidden relative">
          {activeTab === 'pos' && (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row w-full">
              {/* Сетка меню */}
              <div className="flex-1 overflow-hidden p-3 sm:p-5 pb-20 lg:pb-5">
                <MenuGrid
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  onAddItem={handleAddItem}
                  onOpenGarnishMixer={handleOpenGarnishMixer}
                />
              </div>

              {/* Панель оформления и корзины (на ПК справа) */}
              <aside className="hidden lg:block w-full lg:w-[26rem] xl:w-[28rem] shrink-0 border-l border-zinc-200 dark:border-zinc-800 p-3 sm:p-5 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950">
                <CartPanel
                  items={cart}
                  orderNumber={orderNumber}
                  orderType={orderType}
                  tableNumber={tableNumber}
                  customerPhone={customerPhone}
                  deliveryAddress={deliveryAddress}
                  paymentMethod={paymentMethod}
                  cashReceived={cashReceived}
                  discountPercent={discountPercent}
                  customDiscount={customDiscount}
                  deliveryFee={deliveryFee}
                  onSetOrderType={setOrderType}
                  onSetTableNumber={setTableNumber}
                  onSetCustomerPhone={setCustomerPhone}
                  onSetDeliveryAddress={setDeliveryAddress}
                  onSetPaymentMethod={setPaymentMethod}
                  onSetCashReceived={setCashReceived}
                  onSetDiscountPercent={setDiscountPercent}
                  onSetCustomDiscount={setCustomDiscount}
                  onSetDeliveryFee={setDeliveryFee}
                  onSetQty={handleSetQty}
                  onSetPrice={handleSetPrice}
                  onRemove={handleRemove}
                  onAddCustomItem={handleAddCustomItem}
                  onClear={handleClear}
                  onSubmitOrder={handleSubmitOrder}
                />
              </aside>

              {/* Мобильная всплывающая корзина */}
              {showMobileCart && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm lg:hidden">
                  <div className="h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white dark:bg-zinc-950 p-4 border-t border-zinc-200 dark:border-zinc-800 shadow-2xl">
                    <CartPanel
                      items={cart}
                      orderNumber={orderNumber}
                      orderType={orderType}
                      tableNumber={tableNumber}
                      customerPhone={customerPhone}
                      deliveryAddress={deliveryAddress}
                      paymentMethod={paymentMethod}
                      cashReceived={cashReceived}
                      discountPercent={discountPercent}
                      customDiscount={customDiscount}
                      deliveryFee={deliveryFee}
                      onSetOrderType={setOrderType}
                      onSetTableNumber={setTableNumber}
                      onSetCustomerPhone={setCustomerPhone}
                      onSetDeliveryAddress={setDeliveryAddress}
                      onSetPaymentMethod={setPaymentMethod}
                      onSetCashReceived={setCashReceived}
                      onSetDiscountPercent={setDiscountPercent}
                      onSetCustomDiscount={setCustomDiscount}
                      onSetDeliveryFee={setDeliveryFee}
                      onSetQty={handleSetQty}
                      onSetPrice={handleSetPrice}
                      onRemove={handleRemove}
                      onAddCustomItem={handleAddCustomItem}
                      onClear={handleClear}
                      onSubmitOrder={handleSubmitOrder}
                      onCloseMobile={() => setShowMobileCart(false)}
                    />
                  </div>
                </div>
              )}

              {/* Плавающая кнопка корзины на мобильных экранах */}
              {totalCartCount > 0 && !showMobileCart && (
                <div className="fixed bottom-3 inset-x-3 z-40 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setShowMobileCart(true)}
                    className="flex w-full items-center justify-between rounded-2xl bg-amber-500 p-4 text-black font-extrabold shadow-2xl shadow-amber-500/30 active:scale-98 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-xl bg-black text-amber-400 text-xs font-black">
                        {totalCartCount}
                      </span>
                      <span>Оформить чек</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{formatNum(currentFinalTotal)} сум</span>
                      <span>➔</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="flex-1 p-4 sm:p-6 overflow-hidden max-w-4xl mx-auto w-full">
              <OrdersHistory
                orders={todayOrders}
                onReprint={handleReprint}
                onRefresh={reloadOrders}
              />
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-4xl mx-auto w-full">
              <ShiftReport orders={todayOrders} />
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="flex-1 p-4 sm:p-6 overflow-hidden max-w-4xl mx-auto w-full">
              <MenuManager
                categories={categories}
                onToggleAvailable={handleToggleAvailable}
                onUpdatePrice={handleUpdatePrice}
                onAddItem={handleAddNewItem}
              />
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-5xl mx-auto w-full">
              <QrManager />
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно микшера гарниров */}
      <GarnishMixerModal
        isOpen={showGarnishModal}
        initialSize={garnishInitialSize}
        onClose={() => setShowGarnishModal(false)}
        onAddGarnish={handleAddGarnish}
      />

      {/* Экранный модальный предпросмотр чека */}
      {showReceiptModal && receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => setShowReceiptModal(false)}
          onPrint={handlePrintWithMode}
        />
      )}

      {/* Чек для печати на термопринтере */}
      {receiptData && (
        <ReceiptPrint
          items={receiptData.items}
          orderNumber={receiptData.orderNumber}
          dateTime={receiptData.dateTime}
          orderType={receiptData.orderType}
          tableNumber={receiptData.tableNumber}
          customerPhone={receiptData.customerPhone}
          deliveryAddress={receiptData.deliveryAddress}
          subtotal={receiptData.subtotal}
          discountAmount={receiptData.discountAmount}
          discountPercent={receiptData.discountPercent}
          deliveryFee={receiptData.deliveryFee}
          total={receiptData.total}
          paymentMethod={receiptData.paymentMethod}
          cashReceived={receiptData.cashReceived}
          changeAmount={receiptData.changeAmount}
          printMode={receiptData.printMode}
        />
      )}
    </>
  )
}
