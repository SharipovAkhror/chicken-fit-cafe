'use client'
import { useEffect, useState } from 'react'
import { LayoutGrid, ChefHat, Wallet, BarChart3, HardDriveDownload, LogOut, Moon, Sun, History, BookOpen, Printer } from 'lucide-react'
import { useRuntime, useTheme, RuntimeProvider } from '@/features/app/runtime'
import type { Order } from '@/domain/order'
import { KitchenView } from '@/features/kitchen/KitchenView'
import { useRescueImport } from '@/features/rescue/useRescueImport'
import { BackupView, RescueBanner } from '@/features/rescue/RescuePanel'
import { PinLogin } from './PinLogin'
import { TablesView } from './TablesView'
import { OrderView } from './OrderView'
import { ShiftView } from './ShiftView'
import { ReportsView } from './ReportsView'
import { HistoryView } from './HistoryView'
import { MenuAdminView } from './MenuAdminView'
import { SyncBadge } from './common'
import { PrintArea } from './print'
import { newOrder } from './actions'
import { inter } from '@/features/ui/font'
import { useActiveOrders, useOpenShift } from './useData'

type Tab = 'tables' | 'history' | 'kitchen' | 'menu' | 'shift' | 'reports' | 'backup'

export function PosRoot({ kitchenOnly = false }: { kitchenOnly?: boolean }) {
  return (
    <RuntimeProvider>
      <Themed>{kitchenOnly ? <KitchenGate /> : <Gate />}</Themed>
    </RuntimeProvider>
  )
}

function Themed({ children }: { children: React.ReactNode }) {
  const [theme] = useTheme()
  return <div className={`v2 ${inter.variable}`} data-theme={theme}>{children}</div>
}

function Gate() {
  const { ready, session } = useRuntime()
  if (!ready) return null
  return session ? <PosApp /> : <PinLogin />
}
function KitchenGate() {
  const { ready, session, logout } = useRuntime()
  if (!ready) return null
  if (!session) return <PinLogin />
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-4" style={{ height: 56, borderBottom: '1px solid var(--border)' }}>
        <strong className="text-lg flex items-center gap-2"><img src="/logo-mark.svg" alt="" width={28} height={28} style={{ borderRadius: 7 }} />Кухня · Chicken<span className="brand-mark" style={{ marginLeft: -6 }}>Fit</span></strong>
        <div className="flex gap-2 items-center"><SyncBadge /><button className="btn" onClick={logout}><LogOut size={18} /></button></div>
      </header>
      <KitchenView />
    </div>
  )
}

function useCompact() {
  const [c, setC] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 900px)')
    const f = () => setC(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return c
}

function PosApp() {
  const { session, logout, deviceId } = useRuntime()
  const [theme, toggleTheme] = useTheme()
  const [tab, setTab] = useState<Tab>(session?.staff.role === 'kitchen' ? 'kitchen' : 'tables')
  const [current, setCurrent] = useState<Order | null>(null)
  const [paper, setPaper] = useState<'58mm' | '80mm'>('80mm')
  const orders = useActiveOrders() ?? []
  const shift = useOpenShift()
  const rescue = useRescueImport()
  const compact = useCompact()
  const isAdmin = session?.staff.role === 'admin'

  const openTable = (tableId: string) => {
    const existing = orders.find((o) => o.type === 'dine_in' && o.tableId === tableId && o.paymentStatus === 'unpaid' && o.status !== 'cancelled')
      ?? orders.find((o) => o.type === 'dine_in' && o.tableId === tableId && o.status !== 'cancelled' && ['sent', 'cooking', 'ready'].includes(o.status))
    setCurrent(existing ?? newOrder({ type: 'dine_in', tableId, cashierName: session!.staff.name, shiftId: shift?.id, deviceId: deviceId! }))
  }
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; show: boolean }> = [
    { id: 'tables', label: 'Столы', icon: <LayoutGrid size={20} />, show: session?.staff.role !== 'kitchen' },
    { id: 'history', label: 'Заказы', icon: <History size={20} />, show: session?.staff.role !== 'kitchen' },
    { id: 'kitchen', label: 'Кухня', icon: <ChefHat size={20} />, show: true },
    { id: 'menu', label: 'Меню', icon: <BookOpen size={20} />, show: session?.staff.role !== 'kitchen' },
    { id: 'shift', label: 'Смена', icon: <Wallet size={20} />, show: session?.staff.role !== 'kitchen' },
    { id: 'reports', label: 'Отчёты', icon: <BarChart3 size={20} />, show: isAdmin },
    { id: 'backup', label: 'Бэкап', icon: <HardDriveDownload size={20} />, show: session?.staff.role !== 'kitchen' },
  ]
  const nav = tabs.filter((t) => t.show).map((t) => (
    <button key={t.id} className="rail-btn" aria-current={tab === t.id && !current ? 'page' : undefined} onClick={() => { setTab(t.id); setCurrent(null) }}>
      {t.icon}{t.label}
    </button>
  ))

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <header className="app-bar flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo-mark.svg" alt="Chicken Fit" width={28} height={28} className="shrink-0" style={{ borderRadius: 7 }} />{!compact && <strong className="text-lg whitespace-nowrap">Chicken<span className="brand-mark">Fit</span></strong>}
          {!compact && <span className="muted text-sm truncate">{session?.staff.name}{shift ? ` · смена${shift.number ? ` №${shift.number}` : ''} открыта` : ' · смена не открыта'}</span>}
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge />
          {!compact && (
            <button className="btn btn-ghost" style={{ minHeight: 40, fontSize: 14 }} onClick={() => { const p = paper === '80mm' ? '58mm' : '80mm'; setPaper(p) }} title="Ширина чековой ленты"><Printer size={18} />{paper}</button>
          )}
          <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Тема">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
          <button className="btn btn-ghost btn-icon" onClick={logout} aria-label="Выйти"><LogOut size={20} /></button>
        </div>
      </header>
      <div className="flex flex-1" style={{ minHeight: 0 }}>
        {!compact && <nav className="app-rail flex flex-col gap-1 p-1" aria-label="Разделы">{nav}</nav>}
        <main className="flex-1 overflow-auto flex flex-col" style={{ minWidth: 0 }}>
          <div className="px-3 pt-3 grid gap-2 empty:hidden">
            <RescueBanner r={rescue} />
            {shift === null && tab === 'tables' && !current && <div className="banner banner-warn">Смена не открыта. Откройте смену в разделе «Смена», чтобы итоги считались по смене.</div>}
          </div>
          {current ? (
            <OrderView key={current.id} initial={current} compact={compact} onBack={() => setCurrent(null)} />
          ) : tab === 'tables' ? (
            <TablesView orders={orders} onOpenTable={openTable} onOpenOrder={setCurrent}
              onNew={(type) => setCurrent(newOrder({ type, cashierName: session!.staff.name, shiftId: shift?.id, deviceId: deviceId! }))} />
          ) : tab === 'history' ? <HistoryView onOpen={setCurrent} /> : tab === 'menu' ? <MenuAdminView isAdmin={isAdmin} /> : tab === 'kitchen' ? <KitchenView /> : tab === 'shift' ? <ShiftView /> : tab === 'reports' ? <ReportsView /> : <BackupView r={rescue} />}
        </main>
      </div>
      {compact && !current && <nav className="bottom-nav flex justify-around" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }} aria-label="Разделы">{nav}</nav>}
      <PrintArea paper={paper} />
    </div>
  )
}
