'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  BarChart3,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  ExternalLink,
  Sun,
  Moon,
  Lock,
} from 'lucide-react'
import { AuthGate, useAuth } from '@/components/pos/auth-gate'
import { useTheme } from '@/lib/theme'
import menuJson from '@/content/menu.json'
import type { Localized, MenuItem } from '@/lib/menu'
import { fetchTodayOrders, subscribeToOrders, type Order } from '@/lib/orders'
import { OrdersHistory } from '@/components/pos/orders-history'
import { ShiftReport } from '@/components/pos/shift-report'
import { MenuManager } from '@/components/pos/menu-manager'
import { QrManager } from '@/components/pos/qr-manager'
import { PosTerminal } from '@/components/pos/pos-terminal'
import { ReceiptPrint, type ReceiptProps, type ShiftThermalData, type PrintMode } from '@/components/pos/receipt-print'
import { receiptDateTime, getStoredPaperWidth } from '@/lib/receipt'

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

function AdminContent() {
  const { isDark, toggleTheme } = useTheme()
  const { user, lockScreen } = useAuth()

  const [activeTab, setActiveTab] = useState<'shifts' | 'orders' | 'menu' | 'qr' | 'embedded_pos'>('shifts')
  const [categories, setCategories] = useState<CategoryData[]>(getInitialCategories)
  const [todayOrders, setTodayOrders] = useState<Order[]>([])
  const [receiptData, setReceiptData] = useState<ReceiptProps | null>(null)

  const reloadOrders = useCallback(async () => {
    const orders = await fetchTodayOrders()
    setTodayOrders(orders)
  }, [])

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
    },
    [categories],
  )

  const handleReprint = useCallback((order: Order, mode: PrintMode = 'guest') => {
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
      cashierName: order.cashierName || user?.name || 'Администратор',
      printMode: mode,
      paperWidth: getStoredPaperWidth(),
      showQrCode: true,
    }
    setReceiptData(rData)
    setTimeout(() => {
      window.print()
    }, 150)
  }, [user])

  const handlePrintShiftThermal = useCallback((shiftData: ShiftThermalData) => {
    const rData: ReceiptProps = {
      items: [],
      orderNumber: `S${shiftData.shiftNumber}`,
      dateTime: receiptDateTime(),
      printMode: 'shift',
      paperWidth: getStoredPaperWidth(),
      shiftData,
    }
    setReceiptData(rData)
    setTimeout(() => {
      window.print()
    }, 150)
  }, [])

  const activeKitchenCount = todayOrders.filter(
    (o) => o.status === 'pending' || o.status === 'cooking',
  ).length

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      {/* Верхняя навигационная панель админки */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 sm:px-6 backdrop-blur-md z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-black font-black text-sm shadow-xs">
            CF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-wider uppercase">
                CHICKEN<span className="text-amber-500">FIT</span> ADMIN
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <span>УПРАВЛЕНИЕ</span>
              </span>
            </div>
          </div>
        </div>

        {/* Быстрые кнопки перехода в раздельные интерфейсы */}
        <div className="flex items-center gap-2">
          {/* Ссылка на выделенную Кассу */}
          <Link
            href="/pos"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 text-xs transition active:scale-95 shadow-xs cursor-pointer"
            title="Открыть отдельный экран кассира в новом окне"
          >
            <ShoppingCart className="size-3.5" />
            <span className="hidden sm:inline">Касса</span>
            <ExternalLink className="size-3 opacity-70" />
          </Link>

          {/* Ссылка на выделенный Экран Кухни KDS */}
          <Link
            href="/kds"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold px-3 py-1.5 text-xs transition active:scale-95 shadow-xs cursor-pointer"
            title="Открыть отдельный экран поваров KDS в новом окне"
          >
            <ChefHat className="size-3.5" />
            <span className="hidden sm:inline">Кухня (KDS)</span>
            {activeKitchenCount > 0 && (
              <span className="rounded-full bg-black/30 text-white px-1.5 py-0.2 text-[10px] font-mono">
                {activeKitchenCount}
              </span>
            )}
            <ExternalLink className="size-3 opacity-70" />
          </Link>

          {/* Тема и блокировка */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center size-8 rounded-xl border border-border bg-secondary text-foreground transition hover:border-amber-500 cursor-pointer shadow-2xs"
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-zinc-700" />}
          </button>

          <button
            type="button"
            onClick={lockScreen}
            className="flex items-center justify-center size-8 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-destructive hover:border-destructive transition cursor-pointer shadow-2xs"
            title="Выйти из админки"
          >
            <Lock className="size-3.5" />
          </button>
        </div>
      </header>

      {/* Переключатель разделов управления */}
      <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === 'shifts'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="size-3.5 text-emerald-500" />
          <span>Смены & Отчеты</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('orders')
            reloadOrders()
          }}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === 'orders'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="size-3.5 text-blue-500" />
          <span>Все заказы ({todayOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === 'menu'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UtensilsCrossed className="size-3.5 text-purple-500" />
          <span>Управление меню</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === 'qr'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <QrCode className="size-3.5 text-orange-500" />
          <span>QR Столы & Тейбл-тенты</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('embedded_pos')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === 'embedded_pos'
              ? 'bg-card text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="size-3.5 text-amber-500" />
          <span>Встроенная касса</span>
        </button>
      </div>

      {/* Тело раздела */}
      <main className="flex-1 overflow-hidden p-4 sm:p-6">
        {activeTab === 'shifts' && (
          <div className="h-full max-w-5xl mx-auto overflow-y-auto">
            <ShiftReport orders={todayOrders} onPrintShiftReport={handlePrintShiftThermal} />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="h-full max-w-5xl mx-auto overflow-hidden">
            <OrdersHistory orders={todayOrders} onReprint={handleReprint} onRefresh={reloadOrders} />
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="h-full max-w-5xl mx-auto overflow-hidden">
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
          <div className="h-full max-w-5xl mx-auto overflow-y-auto">
            <QrManager />
          </div>
        )}

        {activeTab === 'embedded_pos' && (
          <div className="h-full -m-4 sm:-m-6">
            <PosTerminal />
          </div>
        )}
      </main>

      {/* Термопечать отчетов смены */}
      {receiptData && (
        <ReceiptPrint
          items={receiptData.items}
          orderNumber={receiptData.orderNumber}
          dateTime={receiptData.dateTime}
          printMode={receiptData.printMode}
          paperWidth={receiptData.paperWidth}
          shiftData={receiptData.shiftData}
        />
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminContent />
    </AuthGate>
  )
}
