'use client'

import { useState, useCallback, useEffect } from 'react'
import menuJson from '@/content/menu.json'
import type { Localized, MenuItem } from '@/lib/menu'
import {
  addItem,
  removeItem,
  setQty,
  setPrice,
  clearCart,
  type CartItem,
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
import { MenuGrid } from './menu-grid'
import { CartPanel } from './cart-panel'
import { ReceiptPrint } from './receipt-print'
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

  // История заказов за сегодня
  const [todayOrders, setTodayOrders] = useState<Order[]>([])

  // Данные для печати текущего чека
  const [receiptData, setReceiptData] = useState<{
    items: CartItem[]
    orderNumber: string
    dateTime: string
    orderType: OrderType
    tableNumber?: string
    customerPhone?: string
    deliveryAddress?: string
    paymentMethod: PaymentMethod
    cashReceived?: number
    changeAmount?: number
  } | null>(null)

  const reloadOrders = useCallback(async () => {
    const orders = await fetchTodayOrders()
    setTodayOrders(orders)
  }, [])

  useEffect(() => {
    reloadOrders()
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
    (item: { id: string; name: string; price: number }) => {
      setCart((prev) => addItem(prev, item))
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
  }, [])

  // Оформление заказа и печать
  const handleSubmitOrder = useCallback(async () => {
    if (cart.length === 0) return

    const num = nextOrderNumber()
    const dt = receiptDateTime()
    const totalAmount = cart.reduce((sum, it) => sum + it.price * it.qty, 0)
    const change = Math.max(0, (cashReceived || totalAmount) - totalAmount)

    // 1. Сохраняем заказ в базу / локальное хранилище
    await createOrder({
      orderNumber: num,
      type: orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      customerPhone: orderType === 'delivery' ? customerPhone : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      items: [...cart],
      total: totalAmount,
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? (cashReceived || totalAmount) : undefined,
      changeAmount: paymentMethod === 'cash' ? change : undefined,
    })

    // 2. Формируем данные чека
    setReceiptData({
      items: [...cart],
      orderNumber: num,
      dateTime: dt,
      orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      customerPhone: orderType === 'delivery' ? customerPhone : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? (cashReceived || totalAmount) : undefined,
      changeAmount: paymentMethod === 'cash' ? change : undefined,
    })

    // 3. Открываем окно печати чека
    requestAnimationFrame(() => {
      window.print()

      // Сброс корзины и подготовка следующего заказа
      setCart(clearCart())
      setOrderNumber(peekOrderNumber())
      setCashReceived(0)
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
    reloadOrders,
  ])

  // Повторная печать чека из истории
  const handleReprint = useCallback((order: Order) => {
    setReceiptData({
      items: order.items,
      orderNumber: order.orderNumber,
      dateTime: receiptDateTime(),
      orderType: order.type,
      tableNumber: order.tableNumber,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      cashReceived: order.cashReceived,
      changeAmount: order.changeAmount,
    })

    requestAnimationFrame(() => {
      window.print()
    })
  }, [])

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
    (itemId: string, newPrice: number) => {
      const updated = categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) =>
          it.id === itemId ? { ...it, price: newPrice } : it,
        ),
      }))
      persistMenuOverrides(updated)
    },
    [categories],
  )

  const handleAddNewItem = useCallback(
    (newItem: {
      id: string
      categoryId: string
      name: string
      price: number
      description: string
    }) => {
      const updated = categories.map((cat) => {
        if (cat.id === newItem.categoryId) {
          return {
            ...cat,
            items: [
              ...cat.items,
              {
                id: newItem.id,
                name: { ru: newItem.name },
                price: newItem.price,
                description: newItem.description
                  ? { ru: newItem.description }
                  : undefined,
                available: true,
              },
            ],
          }
        }
        return cat
      })
      persistMenuOverrides(updated)
    },
    [categories],
  )

  return (
    <>
      <div className="flex h-screen flex-col bg-zinc-950 text-white print:hidden">
        {/* Верхняя панель и навигация */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-black tracking-tight">
              Chicken<span className="text-amber-400">Fit</span>
            </h1>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
              Касса & Управление
            </span>
          </div>

          {/* Вкладки админки */}
          <nav className="flex gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              🛒 Касса
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders')
                reloadOrders()
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
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
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              📊 Смена
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              🍱 Меню
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              📱 QR & Столы
            </button>
          </nav>
        </header>

        {/* Главная рабочая область */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {activeTab === 'pos' && (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              {/* Сетка меню */}
              <div className="flex-1 overflow-hidden p-3 sm:p-5">
                <MenuGrid
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  onAddItem={handleAddItem}
                />
              </div>

              {/* Панель оформления и корзины */}
              <aside className="w-full lg:w-[26rem] xl:w-[28rem] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 p-3 sm:p-5 overflow-y-auto">
                <CartPanel
                  items={cart}
                  orderNumber={orderNumber}
                  orderType={orderType}
                  tableNumber={tableNumber}
                  customerPhone={customerPhone}
                  deliveryAddress={deliveryAddress}
                  paymentMethod={paymentMethod}
                  cashReceived={cashReceived}
                  onSetOrderType={setOrderType}
                  onSetTableNumber={setTableNumber}
                  onSetCustomerPhone={setCustomerPhone}
                  onSetDeliveryAddress={setDeliveryAddress}
                  onSetPaymentMethod={setPaymentMethod}
                  onSetCashReceived={setCashReceived}
                  onSetQty={handleSetQty}
                  onSetPrice={handleSetPrice}
                  onRemove={handleRemove}
                  onClear={handleClear}
                  onSubmitOrder={handleSubmitOrder}
                />
              </aside>
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
          paymentMethod={receiptData.paymentMethod}
          cashReceived={receiptData.cashReceived}
          changeAmount={receiptData.changeAmount}
        />
      )}
    </>
  )
}
