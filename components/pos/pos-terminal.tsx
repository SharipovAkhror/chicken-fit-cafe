'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
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
  ChefHat,
  Lock,
  Printer,
  ArrowRightLeft,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  X,
  FileText,
  CheckCircle2,
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
  type PaperWidth,
  getStoredPaperWidth,
  setStoredPaperWidth,
  getStoredQrEnabled,
  setStoredQrEnabled,
} from '@/lib/receipt'
import {
  createOrder,
  updateOrder,
  reopenOrder,
  transferOrderTable,
  fetchTodayOrders,
  subscribeToOrders,
  getActiveOrdersByTables,
  RESTAURANT_TABLES,
  type Order,
  type OrderType,
  type PaymentMethod,
} from '@/lib/orders'
import { useTheme } from '@/lib/theme'
import { useAuth } from './auth-gate'
import { MenuGrid } from './menu-grid'
import { CartPanel } from './cart-panel'
import {
  ReceiptPrint,
  ReceiptModal,
  type ReceiptProps,
  type PrintMode,
  type ShiftThermalData,
} from './receipt-print'
import { GarnishMixerModal } from './garnish-mixer-modal'
import { OrdersHistory } from './orders-history'
import { ShiftReport } from './shift-report'
import { MenuManager } from './menu-manager'
import { QrManager } from './qr-manager'
import { KdsScreen } from './kds-screen'
import { TablePlan } from './table-plan'

type CategoryData = {
  id: string
  title: string
  items: MenuItem[]
}

const MENU_OVERRIDES_KEY = 'chickenfit_pos_menu_overrides_v1'
const MENU_CUSTOM_ITEMS_KEY = 'chickenfit_pos_custom_items_v1'
const MENU_DELETED_ITEMS_KEY = 'chickenfit_pos_deleted_items_v1'
const TABLE_DRAFTS_KEY = 'chickenfit_pos_table_drafts_v2'

type TableDraft = {
  items: CartItem[]
  discountPercent: number
  customDiscount: number
  paymentMethod: PaymentMethod
  customerPhone?: string
  deliveryAddress?: string
  activeOrderId?: string | null
}

function loadAllDrafts(): Record<string, TableDraft> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(TABLE_DRAFTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveDraft(key: string, draft: TableDraft | null) {
  if (typeof window === 'undefined') return
  try {
    const drafts = loadAllDrafts()
    if (draft && draft.items.length > 0) {
      drafts[key] = draft
    } else {
      delete drafts[key]
    }
    localStorage.setItem(TABLE_DRAFTS_KEY, JSON.stringify(drafts))
  } catch {}
}

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
      // 1. Применяем оверрайды цен, описаний и доступности
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

      // 2. Добавляем созданные вручную пользователем блюда
      const customRaw = localStorage.getItem(MENU_CUSTOM_ITEMS_KEY)
      if (customRaw) {
        const customItems = JSON.parse(customRaw) as Array<{ item: MenuItem; categoryId: string }>
        customItems.forEach(({ item, categoryId }) => {
          const cat = result.find((c) => c.id === categoryId)
          if (cat && !cat.items.some((it) => it.id === item.id)) {
            cat.items.push(item)
          }
        })
      }

      // 3. Фильтруем удаленные блюда
      const deletedRaw = localStorage.getItem(MENU_DELETED_ITEMS_KEY)
      if (deletedRaw) {
        const deletedIds = new Set(JSON.parse(deletedRaw) as string[])
        result.forEach((cat) => {
          cat.items = cat.items.filter((it) => !deletedIds.has(it.id))
        })
      }
    } catch {}
  }

  return result
}

export function PosTerminal() {
  const { isDark, toggleTheme } = useTheme()
  const { user, lockScreen } = useAuth()

  const [categories, setCategories] = useState<CategoryData[]>(getInitialCategories)
  const [activeTab, setActiveTab] = useState<'tables' | 'pos' | 'kds' | 'orders' | 'shift' | 'menu' | 'qr'>(
    user?.role === 'kitchen' ? 'kds' : 'tables',
  )
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? 'chicken')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNumber, setOrderNumber] = useState(() => peekOrderNumber())

  // Настройки печати термо-чеков
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(() => getStoredPaperWidth())
  const [showReceiptQr, setShowReceiptQr] = useState<boolean>(() => getStoredQrEnabled())

  // Параметры текущего заказа и стола (r_keeper / iiko)
  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [tableNumber, setTableNumber] = useState<string>('1')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [transferModalOrder, setTransferModalOrder] = useState<Order | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
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

  // Карта активных открытых счетов по столам (r_keeper / iiko)
  const activeOrdersByTables = useMemo(() => {
    return getActiveOrdersByTables(todayOrders)
  }, [todayOrders])

  const occupiedTablesCount = useMemo(() => {
    return Object.keys(activeOrdersByTables).length
  }, [activeOrdersByTables])

  const currentActiveOrder = useMemo(() => {
    if (orderType !== 'dine_in') return null
    return activeOrdersByTables[tableNumber] || null
  }, [orderType, tableNumber, activeOrdersByTables])

  const isCurrentTableOccupied = Boolean(currentActiveOrder)

  // Данные для печати текущего чека
  const [receiptData, setReceiptData] = useState<ReceiptProps | null>(null)

  const reloadOrders = useCallback(async () => {
    const orders = await fetchTodayOrders()
    setTodayOrders(orders)
  }, [])

  // Realtime подписка на заказы (Supabase + BroadcastChannel)
  useEffect(() => {
    reloadOrders()
    const unsubscribe = subscribeToOrders(() => {
      reloadOrders()
    })
    return () => unsubscribe()
  }, [reloadOrders])

  function persistMenuOverrides(updated: CategoryData[]) {
    setCategories(updated)
    if (typeof window === 'undefined') return
    const map: Record<string, Partial<MenuItem>> = {}
    const customList: Array<{ item: MenuItem; categoryId: string }> = []
    updated.forEach((cat) => {
      cat.items.forEach((it) => {
        map[it.id] = {
          price: it.price,
          available: it.available,
          name: it.name,
          description: it.description,
          calories: it.calories,
          protein: it.protein,
          fat: it.fat,
          carbs: it.carbs,
          image: it.image,
        }
        if (it.id.startsWith('item-') || it.id.startsWith('custom-')) {
          customList.push({ item: it, categoryId: cat.id })
        }
      })
    })
    localStorage.setItem(MENU_OVERRIDES_KEY, JSON.stringify(map))
    localStorage.setItem(MENU_CUSTOM_ITEMS_KEY, JSON.stringify(customList))
  }

  const handleToggleAvailable = useCallback(
    (itemId: string, available: boolean) => {
      const updated = categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) => (it.id === itemId ? { ...it, available } : it)),
      }))
      persistMenuOverrides(updated)
    },
    [categories],
  )

  const handleUpdatePrice = useCallback(
    (itemId: string, price: number) => {
      const updated = categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) => (it.id === itemId ? { ...it, price } : it)),
      }))
      persistMenuOverrides(updated)
    },
    [categories],
  )

  const handleAddNewItem = useCallback(
    (item: {
      id: string
      categoryId: string
      name: string
      price: number
      description: string
      calories?: number
      protein?: number
      fat?: number
      carbs?: number
      image?: string
    }) => {
      const newItem: MenuItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        image: item.image,
        available: true,
      }
      const updated = categories.map((cat) =>
        cat.id === item.categoryId ? { ...cat, items: [...cat.items, newItem] } : cat,
      )
      persistMenuOverrides(updated)
      setToastMessage(`Позиция "${item.name}" добавлена в меню!`)
      setTimeout(() => setToastMessage(null), 3000)
    },
    [categories],
  )

  const handleEditItem = useCallback(
    (item: MenuItem, categoryId: string) => {
      const updated = categories.map((cat) => {
        let items = cat.items.filter((it) => it.id !== item.id)
        if (cat.id === categoryId) {
          items = [...items, item]
        }
        return { ...cat, items }
      })
      persistMenuOverrides(updated)
      setToastMessage(
        `Блюдо "${typeof item.name === 'string' ? item.name : item.name.ru ?? ''}" обновлено`,
      )
      setTimeout(() => setToastMessage(null), 3000)
    },
    [categories],
  )

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      const updated = categories.map((cat) => ({
        ...cat,
        items: cat.items.filter((it) => it.id !== itemId),
      }))
      persistMenuOverrides(updated)
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(MENU_DELETED_ITEMS_KEY)
          const deleted = raw ? (JSON.parse(raw) as string[]) : []
          if (!deleted.includes(itemId)) {
            deleted.push(itemId)
            localStorage.setItem(MENU_DELETED_ITEMS_KEY, JSON.stringify(deleted))
          }
        } catch {}
      }
      setToastMessage(`Позиция удалена из меню`)
      setTimeout(() => setToastMessage(null), 3000)
    },
    [categories],
  )

  // Автосохранение набранного черновика стола / заказа (не теряется при переключении)
  useEffect(() => {
    const key = orderType === 'dine_in' ? `table_${tableNumber}` : orderType
    if (!activeOrderId) {
      if (cart.length > 0) {
        saveDraft(key, {
          items: cart,
          discountPercent,
          customDiscount,
          paymentMethod,
          customerPhone,
          deliveryAddress,
          activeOrderId: null,
        })
      } else {
        saveDraft(key, null)
      }
    }
  }, [
    cart,
    orderType,
    tableNumber,
    activeOrderId,
    discountPercent,
    customDiscount,
    paymentMethod,
    customerPhone,
    deliveryAddress,
  ])

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
    const key = orderType === 'dine_in' ? `table_${tableNumber}` : orderType
    saveDraft(key, null)
    setCart(clearCart())
    setActiveOrderId(null)
    setCashReceived(0)
    setDiscountPercent(0)
    setCustomDiscount(0)
    setDeliveryFee(0)
    setShowMobileCart(false)
  }, [orderType, tableNumber])

  const handlePrintWithMode = useCallback(
    (mode: PrintMode, width?: PaperWidth) => {
      if (!receiptData) return
      const targetWidth = width || paperWidth
      setReceiptData((prev) => (prev ? { ...prev, printMode: mode, paperWidth: targetWidth } : null))
      setTimeout(() => {
        window.print()
      }, 150)
    },
    [receiptData, paperWidth],
  )

  // ─── ВЫБОР СТОЛА И ЗАКАЗОВ (r_keeper / iiko) ────────────────
  const handleSelectTable = useCallback((tableId: string, activeOrder?: Order) => {
    setOrderType('dine_in')
    setTableNumber(tableId)
    if (activeOrder) {
      setCart([...activeOrder.items])
      setActiveOrderId(activeOrder.id)
      setDiscountPercent(activeOrder.discountPercent || 0)
      setCustomDiscount(activeOrder.discountAmount || 0)
      setPaymentMethod(activeOrder.paymentMethod || 'cash')
    } else {
      const drafts = loadAllDrafts()
      const draft = drafts[`table_${tableId}`]
      if (draft && draft.items.length > 0) {
        setCart([...draft.items])
        setActiveOrderId(null)
        setDiscountPercent(draft.discountPercent || 0)
        setCustomDiscount(draft.customDiscount || 0)
        setPaymentMethod(draft.paymentMethod || 'cash')
      } else {
        setCart([])
        setActiveOrderId(null)
        setDiscountPercent(0)
        setCustomDiscount(0)
      }
    }
    setActiveTab('pos')
  }, [])

  const handleSelectFastOrder = useCallback((type: 'takeaway' | 'delivery') => {
    setOrderType(type)
    const drafts = loadAllDrafts()
    const draft = drafts[type]
    if (draft && draft.items.length > 0) {
      setCart([...draft.items])
      setActiveOrderId(null)
      setDiscountPercent(draft.discountPercent || 0)
      setCustomDiscount(draft.customDiscount || 0)
      setPaymentMethod(draft.paymentMethod || 'cash')
      setCustomerPhone(draft.customerPhone || '')
      setDeliveryAddress(draft.deliveryAddress || '')
    } else {
      setCart([])
      setActiveOrderId(null)
      setDiscountPercent(0)
      setCustomDiscount(0)
      setCustomerPhone('')
      setDeliveryAddress('')
    }
    setActiveTab('pos')
  }, [])

  const handleSetTableNumber = useCallback((num: string) => {
    setTableNumber(num)
    const existing = activeOrdersByTables[num]
    if (existing) {
      setCart([...existing.items])
      setActiveOrderId(existing.id)
      setDiscountPercent(existing.discountPercent || 0)
      setCustomDiscount(existing.discountAmount || 0)
      setPaymentMethod(existing.paymentMethod || 'cash')
    } else {
      const drafts = loadAllDrafts()
      const draft = drafts[`table_${num}`]
      if (draft && draft.items.length > 0) {
        setCart([...draft.items])
        setActiveOrderId(null)
        setDiscountPercent(draft.discountPercent || 0)
        setCustomDiscount(draft.customDiscount || 0)
        setPaymentMethod(draft.paymentMethod || 'cash')
      } else {
        setCart([])
        setActiveOrderId(null)
        setDiscountPercent(0)
        setCustomDiscount(0)
      }
    }
  }, [activeOrdersByTables])

  const handleSetOrderType = useCallback((type: OrderType) => {
    setOrderType(type)
    if (type !== 'dine_in') {
      const drafts = loadAllDrafts()
      const draft = drafts[type]
      if (draft && draft.items.length > 0) {
        setCart([...draft.items])
        setActiveOrderId(null)
        setDiscountPercent(draft.discountPercent || 0)
        setCustomDiscount(draft.customDiscount || 0)
        setPaymentMethod(draft.paymentMethod || 'cash')
      } else {
        setActiveOrderId(null)
        setCart([])
      }
    } else {
      const existing = activeOrdersByTables[tableNumber]
      if (existing) {
        setCart([...existing.items])
        setActiveOrderId(existing.id)
      } else {
        const drafts = loadAllDrafts()
        const draft = drafts[`table_${tableNumber}`]
        if (draft && draft.items.length > 0) {
          setCart([...draft.items])
          setActiveOrderId(null)
        } else {
          setCart([])
          setActiveOrderId(null)
        }
      }
    }
  }, [activeOrdersByTables, tableNumber])

  // ─── ВОЗОБНОВЛЕНИЕ ЗАКРЫТОГО СТОЛА ─────────────────────────
  const handleReopenTable = useCallback(
    async (order: Order) => {
      const reopened = await reopenOrder(order.id)
      if (reopened) {
        setToastMessage(
          `Стол №${reopened.tableNumber ?? ''} снова открыт (дозаказ / корректировка)`,
        )
        setTimeout(() => setToastMessage(null), 3500)
        await reloadOrders()
        if (reopened.tableNumber) {
          setOrderType('dine_in')
          setTableNumber(reopened.tableNumber)
        } else {
          setOrderType(reopened.type)
        }
        setCart([...reopened.items])
        setActiveOrderId(reopened.id)
        setDiscountPercent(reopened.discountPercent || 0)
        setCustomDiscount(reopened.discountAmount || 0)
        setPaymentMethod(reopened.paymentMethod || 'cash')
        setActiveTab('pos')
      }
    },
    [reloadOrders],
  )

  const handleReopenCurrentOrder = useCallback(async () => {
    if (activeOrderId) {
      const ord = todayOrders.find((o) => o.id === activeOrderId)
      if (ord) {
        await handleReopenTable(ord)
        return
      }
    }
    const lastClosed = todayOrders.find(
      (o) => o.tableNumber === tableNumber && o.status === 'completed',
    )
    if (lastClosed) {
      await handleReopenTable(lastClosed)
    }
  }, [activeOrderId, todayOrders, tableNumber, handleReopenTable])

  // Стадия текущего заказа
  const currentOrderStatus = useMemo((): 'draft' | 'pending' | 'cooking' | 'ready' | 'precheck' | 'completed' | 'cancelled' => {
    if (!activeOrderId) return 'draft'
    const ord = todayOrders.find((o) => o.id === activeOrderId)
    if (!ord) return 'draft'
    if (ord.status === 'completed') return 'completed'
    if (ord.precheckPrintedAt) return 'precheck'
    return ord.status
  }, [activeOrderId, todayOrders])

  const handleOpenTransferModal = useCallback((order: Order) => {
    setTransferModalOrder(order)
  }, [])

  const handleConfirmTransfer = useCallback(async (newTableId: string) => {
    if (!transferModalOrder) return
    const orderId = transferModalOrder.id
    const prevTable = transferModalOrder.tableNumber
    await transferOrderTable(orderId, newTableId)
    setTransferModalOrder(null)
    if (activeOrderId === orderId) {
      setTableNumber(newTableId)
    }
    await reloadOrders()
    setToastMessage(`Счёт #${transferModalOrder.orderNumber} перенесён: Стол ${prevTable} → Стол ${newTableId}`)
    setTimeout(() => setToastMessage(null), 3500)
  }, [transferModalOrder, activeOrderId, reloadOrders])

  const handleDirectPay = useCallback((order: Order) => {
    setOrderType('dine_in')
    setTableNumber(order.tableNumber || '1')
    setCart([...order.items])
    setActiveOrderId(order.id)
    setDiscountPercent(order.discountPercent || 0)
    setCustomDiscount(order.discountAmount || 0)
    setPaymentMethod(order.paymentMethod || 'cash')
    setActiveTab('pos')
  }, [])

  // ─── ОТПРАВИТЬ НА КУХНЮ / СОХРАНИТЬ ДОЗАКАЗ ──────────────────
  const handleSaveToKitchen = useCallback(async () => {
    if (cart.length === 0) return

    const dt = receiptDateTime()
    const subtotal = cartTotal(cart)
    const pctDiscount =
      discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : 0
    const totalDiscount = Math.round(pctDiscount + (customDiscount || 0))
    const activeDelivery = orderType === 'delivery' ? deliveryFee : 0
    const finalTotal = Math.max(0, Math.round(subtotal - totalDiscount + activeDelivery))

    if (activeOrderId) {
      // Дозаказ к существующему открытому столу
      const existing = todayOrders.find((o) => o.id === activeOrderId)
      await updateOrder(activeOrderId, {
        items: [...cart],
        subtotal,
        discountAmount: totalDiscount,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        total: finalTotal,
      })

      const kitchenTicket: ReceiptProps = {
        items: [...cart],
        orderNumber: existing?.orderNumber || peekOrderNumber(),
        dateTime: dt,
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        subtotal,
        total: finalTotal,
        cashierName: user?.name || 'Кассир',
        printMode: 'kitchen',
        paperWidth,
      }
      setReceiptData(kitchenTicket)
      setTimeout(() => {
        window.print()
      }, 150)

      setToastMessage(`Дозаказ на Стол №${tableNumber} отправлен на кухню!`)
      setTimeout(() => setToastMessage(null), 3500)
    } else {
      // Открытие нового заказа на стол
      const num = nextOrderNumber()
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
        cashierName: user?.name || 'Кассир',
        status: 'pending',
      })

      const kitchenTicket: ReceiptProps = {
        items: [...cart],
        orderNumber: num,
        dateTime: dt,
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        subtotal,
        total: finalTotal,
        cashierName: user?.name || 'Кассир',
        printMode: 'kitchen',
        paperWidth,
      }
      setReceiptData(kitchenTicket)
      setTimeout(() => {
        window.print()
      }, 150)

      setOrderNumber(peekOrderNumber())
      setToastMessage(`Стол №${tableNumber} открыт! Заказ передан на кухню.`)
      setTimeout(() => setToastMessage(null), 3500)
    }

    handleClear()
    setActiveOrderId(null)
    reloadOrders()
    setActiveTab('tables')
  }, [
    cart,
    activeOrderId,
    todayOrders,
    discountPercent,
    customDiscount,
    orderType,
    deliveryFee,
    tableNumber,
    customerPhone,
    deliveryAddress,
    paymentMethod,
    user,
    paperWidth,
    handleClear,
    reloadOrders,
  ])

  // ─── ПРЕЧЕК / ПРЕДВАРИТЕЛЬНЫЙ СЧЁТ ───────────────────────────
  const handlePrintPrecheck = useCallback(async () => {
    if (cart.length === 0) return
    const subtotal = cartTotal(cart)
    const pctDiscount =
      discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : 0
    const totalDiscount = Math.round(pctDiscount + (customDiscount || 0))
    const finalTotal = Math.max(0, Math.round(subtotal - totalDiscount))

    const activeOrderObj = activeOrderId ? todayOrders.find((o) => o.id === activeOrderId) : null
    const num = activeOrderObj ? activeOrderObj.orderNumber : orderNumber
    const nowIso = new Date().toISOString()

    if (activeOrderId) {
      await updateOrder(activeOrderId, {
        items: [...cart],
        subtotal,
        discountAmount: totalDiscount,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        total: finalTotal,
        precheckPrintedAt: nowIso,
      })
      await reloadOrders()
    } else {
      const created = await createOrder({
        orderNumber: num,
        type: orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        customerPhone: orderType === 'delivery' ? customerPhone : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
        items: [...cart],
        subtotal,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
        deliveryFee: orderType === 'delivery' ? deliveryFee : undefined,
        total: finalTotal,
        paymentMethod,
        cashierName: user?.name || 'Кассир',
        status: 'cooking',
        precheckPrintedAt: nowIso,
      })
      setActiveOrderId(created.id)
      saveDraft(orderType === 'dine_in' ? `table_${tableNumber}` : orderType, null)
      await reloadOrders()
    }

    const precheckData: ReceiptProps = {
      items: [...cart],
      orderNumber: num,
      dateTime: receiptDateTime(),
      orderType: 'dine_in',
      tableNumber,
      subtotal,
      discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      total: finalTotal,
      cashierName: user?.name || 'Кассир',
      printMode: 'precheck',
      paperWidth,
      showQrCode: false,
    }

    setReceiptData(precheckData)
    setTimeout(() => {
      window.print()
    }, 150)

    setToastMessage(`Пречек для Стола №${tableNumber} отправлен на печать!`)
    setTimeout(() => setToastMessage(null), 3500)
  }, [
    cart,
    discountPercent,
    customDiscount,
    activeOrderId,
    todayOrders,
    orderNumber,
    orderType,
    tableNumber,
    customerPhone,
    deliveryAddress,
    deliveryFee,
    paymentMethod,
    user,
    paperWidth,
    reloadOrders,
  ])

  // ─── ОПЛАТИТЬ И ЗАКРЫТЬ СТОЛ ────────────────────────────────
  const handleSubmitOrder = useCallback(async () => {
    if (cart.length === 0) return

    const dt = receiptDateTime()
    const subtotal = cartTotal(cart)
    const pctDiscount =
      discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : 0
    const totalDiscount = Math.round(pctDiscount + (customDiscount || 0))
    const activeDelivery = orderType === 'delivery' ? deliveryFee : 0
    const finalTotal = Math.max(0, Math.round(subtotal - totalDiscount + activeDelivery))
    const change = Math.max(0, (cashReceived || finalTotal) - finalTotal)

    let num = orderNumber
    if (activeOrderId) {
      const existing = todayOrders.find((o) => o.id === activeOrderId)
      num = existing?.orderNumber || num
      await updateOrder(activeOrderId, {
        items: [...cart],
        subtotal,
        discountAmount: totalDiscount,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        deliveryFee: activeDelivery > 0 ? activeDelivery : undefined,
        total: finalTotal,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived || finalTotal : undefined,
        changeAmount: paymentMethod === 'cash' ? change : undefined,
        status: 'completed',
      })
    } else {
      num = nextOrderNumber()
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
        cashierName: user?.name || 'Кассир',
        status: 'completed',
      })
    }

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
      cashierName: user?.name || 'Кассир',
      printMode: 'guest',
      paperWidth,
      showQrCode: showReceiptQr,
    }

    setReceiptData(rData)
    setShowReceiptModal(true)
    setOrderNumber(peekOrderNumber())
    handleClear()
    setActiveOrderId(null)
    reloadOrders()
  }, [
    cart,
    activeOrderId,
    todayOrders,
    orderNumber,
    orderType,
    tableNumber,
    customerPhone,
    deliveryAddress,
    discountPercent,
    customDiscount,
    deliveryFee,
    paymentMethod,
    cashReceived,
    user,
    paperWidth,
    showReceiptQr,
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
        cashierName: order.cashierName || user?.name || 'Кассир',
        printMode: mode,
        paperWidth,
        showQrCode: showReceiptQr,
      }

      setReceiptData(rData)
      setShowReceiptModal(true)
    },
    [paperWidth, showReceiptQr, user],
  )

  const handlePrintShiftThermal = useCallback(
    (shiftData: ShiftThermalData) => {
      const rData: ReceiptProps = {
        items: [],
        orderNumber: `S${shiftData.shiftNumber}`,
        dateTime: receiptDateTime(),
        printMode: 'shift',
        paperWidth,
        shiftData,
      }
      setReceiptData(rData)
      setTimeout(() => {
        window.print()
      }, 150)
    },
    [paperWidth],
  )

  const totalCartCount = cartCount(cart)
  const currentSubtotal = cartTotal(cart)
  const currentDiscountAmount =
    discountPercent > 0 ? Math.round((currentSubtotal * discountPercent) / 100) : 0
  const currentDelivery = orderType === 'delivery' ? deliveryFee : 0
  const currentFinalTotal = Math.max(
    0,
    Math.round(currentSubtotal - currentDiscountAmount - (customDiscount || 0) + currentDelivery),
  )

  // Количество активных заказов на кухне (pending + cooking)
  const activeKitchenOrdersCount = todayOrders.filter(
    (o) => o.status === 'pending' || o.status === 'cooking',
  ).length

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
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>ОНЛАЙН</span>
            </span>
          </div>

          {/* Центральная часть: переключатель вкладок терминала */}
          <nav className="flex items-center gap-1 overflow-x-auto rounded-xl bg-secondary/60 p-1 border border-border">
            {/* 1. Столы / План зала */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('tables')
                reloadOrders()
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-amber-500 text-black shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Столы (8)</span>
              {occupiedTablesCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                    activeTab === 'tables' ? 'bg-black text-amber-400' : 'bg-amber-500 text-black'
                  }`}
                >
                  {occupiedTablesCount}
                </span>
              )}
            </button>

            {/* 2. Меню и набор заказа */}
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
              <span>Заказ</span>
              {orderType === 'dine_in' ? (
                <span className="text-[10px] text-amber-500 font-mono font-bold">№{tableNumber}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  ({orderType === 'takeaway' ? 'С собой' : 'Доставка'})
                </span>
              )}
            </button>

            {/* Вкладка KDS (Кухня) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('kds')
                reloadOrders()
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'kds'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ChefHat className="size-3.5 text-orange-500" />
              <span>Кухня (KDS)</span>
              {activeKitchenOrdersCount > 0 && (
                <span className="rounded-full bg-orange-500 text-white px-1.5 py-0.2 text-[10px] font-mono animate-pulse">
                  {activeKitchenOrdersCount}
                </span>
              )}
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

          {/* Правая часть: кассир, лента, тема, блокировка */}
          <div className="flex items-center gap-2">
            {/* Переключатель ленты принтера в шапке */}
            <div className="hidden md:flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5 text-xs">
              <Printer className="size-3.5 text-muted-foreground ml-1.5" />
              <button
                type="button"
                onClick={() => {
                  const next: PaperWidth = paperWidth === '80mm' ? '58mm' : '80mm'
                  setPaperWidth(next)
                  setStoredPaperWidth(next)
                }}
                className="rounded-md px-2 py-0.5 text-[11px] font-bold text-amber-500 hover:text-amber-400 cursor-pointer"
                title="Нажмите для переключения ширины термоленты"
              >
                {paperWidth === '80mm' ? '80 мм' : '58 мм'}
              </button>
            </div>

            {/* Имя пользователя */}
            {user && (
              <span className="hidden lg:inline text-xs font-bold text-muted-foreground">
                {user.name}
              </span>
            )}

            {/* Кнопка темы */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center size-8 rounded-lg border border-border bg-secondary text-foreground transition hover:border-amber-500 cursor-pointer shadow-2xs"
              title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-zinc-700" />}
            </button>

            {/* Быстрая блокировка экрана кассы */}
            <button
              type="button"
              onClick={lockScreen}
              className="flex items-center justify-center size-8 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-destructive hover:border-destructive transition cursor-pointer shadow-2xs"
              title="Заблокировать кассу (Выход)"
            >
              <Lock className="size-3.5" />
            </button>
          </div>
        </header>

        {/* Индикатор внешнего табло покупателя (Customer Pole Display) */}
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
          {/* 1. ПЛАН ЗАЛА И СТОЛОВ (r_keeper / iiko) */}
          {activeTab === 'tables' && (
            <div className="flex-1 overflow-hidden p-3 sm:p-4 pb-16 lg:pb-4 w-full">
              <TablePlan
                orders={todayOrders}
                onSelectTable={handleSelectTable}
                onSelectFastOrder={handleSelectFastOrder}
                onOpenTransferModal={handleOpenTransferModal}
                onDirectPay={handleDirectPay}
                onReopenTable={handleReopenTable}
              />
            </div>
          )}

          {/* 2. ТЕРМИНАЛ / МЕНЮ И ЧЕК */}
          {activeTab === 'pos' && (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row w-full">
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Лаконичная строка стола */}
                <div className="flex items-center justify-between border-b border-border/80 bg-secondary/30 px-3.5 py-1.5 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('tables')}
                      className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Карта зала</span>
                    </button>
                    <span>·</span>
                    <span className="font-black text-foreground">
                      {orderType === 'dine_in'
                        ? `Стол №${tableNumber}${tableNumber > '6' ? ' (1.5 эт)' : ''}`
                        : orderType === 'takeaway'
                        ? 'С собой'
                        : 'Доставка'}
                    </span>
                    {activeOrderId && (
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                        (Чек #{todayOrders.find((o) => o.id === activeOrderId)?.orderNumber || orderNumber})
                      </span>
                    )}
                  </div>

                  {activeOrderId && (
                    <button
                      type="button"
                      onClick={() => {
                        const ord = todayOrders.find((o) => o.id === activeOrderId)
                        if (ord) handleOpenTransferModal(ord)
                      }}
                      className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      <ArrowRightLeft className="size-3 text-amber-500" />
                      <span>Перенести</span>
                    </button>
                  )}
                </div>

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
              </div>

              {/* Панель оформления и корзины (справа) */}
              <aside className="hidden lg:flex flex-col w-full lg:w-[25rem] xl:w-[27rem] shrink-0 border-l border-border p-2.5 sm:p-3 overflow-hidden bg-card/50 h-full">
                <CartPanel
                  items={cart}
                  orderNumber={
                    activeOrderId
                      ? todayOrders.find((o) => o.id === activeOrderId)?.orderNumber || orderNumber
                      : orderNumber
                  }
                  orderType={orderType}
                  tableNumber={tableNumber}
                  customerPhone={customerPhone}
                  deliveryAddress={deliveryAddress}
                  paymentMethod={paymentMethod}
                  cashReceived={cashReceived}
                  discountPercent={discountPercent}
                  customDiscount={customDiscount}
                  deliveryFee={deliveryFee}
                  activeOrderId={activeOrderId}
                  isTableOccupied={isCurrentTableOccupied}
                  orderStatus={currentOrderStatus}
                  onReopenOrder={handleReopenCurrentOrder}
                  onSaveToKitchen={handleSaveToKitchen}
                  onPrintPrecheck={handlePrintPrecheck}
                  onOpenTransferModal={() => {
                    const ord = activeOrderId ? todayOrders.find((o) => o.id === activeOrderId) : null
                    if (ord) handleOpenTransferModal(ord)
                  }}
                  onBackToTables={() => setActiveTab('tables')}
                  onSetOrderType={handleSetOrderType}
                  onSetTableNumber={handleSetTableNumber}
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
                      orderNumber={
                        activeOrderId
                          ? todayOrders.find((o) => o.id === activeOrderId)?.orderNumber || orderNumber
                          : orderNumber
                      }
                      orderType={orderType}
                      tableNumber={tableNumber}
                      customerPhone={customerPhone}
                      deliveryAddress={deliveryAddress}
                      paymentMethod={paymentMethod}
                      cashReceived={cashReceived}
                      discountPercent={discountPercent}
                      customDiscount={customDiscount}
                      deliveryFee={deliveryFee}
                      activeOrderId={activeOrderId}
                      isTableOccupied={isCurrentTableOccupied}
                      orderStatus={currentOrderStatus}
                      onReopenOrder={handleReopenCurrentOrder}
                      onSaveToKitchen={handleSaveToKitchen}
                      onPrintPrecheck={handlePrintPrecheck}
                      onOpenTransferModal={() => {
                        const ord = activeOrderId ? todayOrders.find((o) => o.id === activeOrderId) : null
                        if (ord) handleOpenTransferModal(ord)
                      }}
                      onBackToTables={() => setActiveTab('tables')}
                      onSetOrderType={handleSetOrderType}
                      onSetTableNumber={handleSetTableNumber}
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
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>{formatNum(currentFinalTotal)} сум</span>
                      <ArrowRight className="size-3.5" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Вкладка KDS (Экран кухни) */}
          {activeTab === 'kds' && (
            <div className="flex-1 p-4 sm:p-6 overflow-hidden w-full">
              <KdsScreen orders={todayOrders} onRefresh={reloadOrders} />
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="flex-1 p-4 sm:p-6 overflow-hidden max-w-5xl mx-auto w-full">
              <OrdersHistory
                orders={todayOrders}
                onReprint={handleReprint}
                onRefresh={reloadOrders}
                onReopenOrder={handleReopenTable}
              />
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-4xl mx-auto w-full">
              <ShiftReport
                orders={todayOrders}
                onPrintShiftReport={handlePrintShiftThermal}
              />
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="flex-1 p-4 sm:p-6 overflow-hidden max-w-5xl mx-auto w-full">
              <MenuManager
                categories={categories}
                onToggleAvailable={handleToggleAvailable}
                onUpdatePrice={handleUpdatePrice}
                onAddItem={handleAddNewItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
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
          onUpdateSettings={(w, q) => {
            setPaperWidth(w)
            setShowReceiptQr(q)
          }}
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
          cashierName={receiptData.cashierName}
          printMode={receiptData.printMode}
          paperWidth={receiptData.paperWidth || paperWidth}
          showQrCode={receiptData.showQrCode ?? showReceiptQr}
          shiftData={receiptData.shiftData}
        />
      )}

      {/* Модальное окно переноса стола (r_keeper / iiko style) */}
      {transferModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="size-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">
                  Перенос счёта #{transferModalOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOrder(null)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Текущий стол: <span className="font-bold text-foreground">Стол {transferModalOrder.tableNumber}</span>
                <br />
                Выберите новый свободный стол для переноса:
              </p>

              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {RESTAURANT_TABLES.filter(
                  (t) =>
                    t.id !== transferModalOrder.tableNumber &&
                    !activeOrdersByTables[t.id],
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleConfirmTransfer(t.id)}
                    className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 p-3 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <span className="text-sm font-black text-foreground">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.zone}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span>Свободен</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setTransferModalOrder(null)}
                className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Всплывающее уведомление (Toast) */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 rounded-xl bg-emerald-600 text-white font-bold px-4 py-3 shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  )
}
