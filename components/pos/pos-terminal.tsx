'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  ShoppingCart,
  ClipboardList,
  BarChart3,
  UtensilsCrossed,
  QrCode,
  Sun,
  Moon,
  Tv,
} from 'lucide-react'
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
    const interval = setInterval(() => {
      reloadOrders()
    }, 10000)
    return () => clearInterval(interval)
  }, [reloadOrders])

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
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    })

    setReceiptData(rData)
    setShowReceiptModal(true)
    setOrderNumber(peekOrderNumber())
    handleClear()
    reloadOrders()
  }, [
    cart,
    orderType,
    tableNumber,
    customerPhone,
    deliveryAddress,
    discountPercent,
    customDiscount,
    deliveryFee,
    paymentMethod,
    cashReceived,
    handleClear,
    reloadOrders,
  ])

  const handleReprint = useCallback(
    (order: Order, mode: PrintMode = 'guest') => {
      const rData: ReceiptProps = {
        items: order.items,
        orderNumber: order.orderNumber,
        dateTime: receiptDateTime(new Date(order.createdAt)),
        orderType: order.type,
        tableNumber: order.tableNumber,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        subtotal: order.subtotal,
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
    },
    [],
  )

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
      <div className="flex h-screen w-full flex-col bg-background font-sans antialiased text-foreground overflow-hidden select-none">
        {/* Верхняя панель навигации POS */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-5 backdrop-blur-md z-10 shadow-2xs">
          {/* Левая часть: логотип и статус */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-black tracking-wider text-foreground group"
              title="Перейти на клиентский сайт меню"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500 font-black text-black text-sm shadow-xs group-hover:scale-105 transition">
                CF
              </span>
              <span className="hidden sm:inline font-bold text-base">
                CHICKEN<span className="text-amber-500">FIT</span> POS
              </span>
            </Link>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
              ● ОНЛАЙН
            </span>
          </div>

          {/* Центральная часть: переключатель вкладок терминала */}
          <nav className="flex items-center gap-1 overflow-x-auto rounded-xl bg-secondary/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="size-3.5 text-amber-500" />
              <span>Терминал</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders')
                reloadOrders()
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList className="size-3.5 text-blue-500" />
              <span>Заказы ({todayOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('shift')
                reloadOrders()
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'shift'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="size-3.5 text-emerald-500" />
              <span>Смена</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UtensilsCrossed className="size-3.5 text-purple-500" />
              <span>Меню</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <QrCode className="size-3.5 text-orange-500" />
              <span>QR Столы</span>
            </button>
          </nav>

          {/* Правая часть: тема */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center size-8 rounded-lg border border-border bg-secondary text-foreground transition hover:border-amber-500 cursor-pointer shadow-2xs"
              title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-zinc-700" />}
            </button>
          </div>
        </header>

        {/* 📟 Индикатор внешнего табло покупателя (Customer Pole Display) */}
        <div className="bg-zinc-950 text-red-500 border-b border-zinc-800 px-4 py-1 flex items-center justify-between text-xs font-mono select-none">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] text-zinc-400 font-sans font-semibold inline-flex items-center gap-1">
              <Tv className="size-3 text-zinc-400" />
              <span>ТАБЛО ПОКУПАТЕЛЯ:</span>
            </span>
          </div>
          <div className="font-bold tracking-widest text-red-500 bg-black px-3 py-0.5 rounded border border-red-950">
            {currentFinalTotal > 0
              ? `K OPLATE: ${formatNum(currentFinalTotal)} UZS`
              : 'CHICKEN FIT CAFE • 0.00 UZS'}
          </div>
        </div>

        {/* Главная рабочая область */}
        <div className="flex min-h-0 flex-1 overflow-hidden relative">
          {activeTab === 'pos' && (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row w-full">
              {/* Сетка меню */}
              <div className="flex-1 overflow-hidden p-3 sm:p-4 pb-20 lg:pb-4">
                <MenuGrid
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  onAddItem={handleAddItem}
                  onOpenGarnishMixer={handleOpenGarnishMixer}
                />
              </div>

              {/* Панель оформления и корзины (справа) */}
              <aside className="hidden lg:block w-full lg:w-[25rem] xl:w-[27rem] shrink-0 border-l border-border p-3 sm:p-4 overflow-y-auto bg-card/50">
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
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-xs lg:hidden">
                  <div className="h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-4 border-t border-border shadow-2xl">
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
                    className="flex w-full items-center justify-between rounded-xl bg-amber-500 p-4 text-black font-bold shadow-2xl active:scale-98 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-black text-amber-400 text-xs font-mono font-bold">
                        {totalCartCount}
                      </span>
                      <span>Оформить чек</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono">
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
