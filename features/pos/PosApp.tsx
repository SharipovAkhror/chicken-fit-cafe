'use client'
import { useEffect, useState } from 'react'
import { LayoutGrid, ChefHat, Wallet, BarChart3, LogOut, History, BookOpen, Menu, Settings } from 'lucide-react'
import { useRuntime, useTheme, RuntimeProvider } from '@/features/app/runtime'
import { isActive, type Order } from '@/domain/order'
import { KitchenView } from '@/features/kitchen/KitchenView'
import { useRescueImport } from '@/features/rescue/useRescueImport'
import { RescueBanner } from '@/features/rescue/RescuePanel'
import { SettingsView } from './SettingsView'
import { PinLogin } from './PinLogin'
import { TablesView } from './TablesView'
import { OrderView } from './OrderView'
import { ShiftView } from './ShiftView'
import { ReportsView } from './ReportsView'
import { HistoryView } from './HistoryView'
import { MenuAdminView } from './MenuAdminView'
import { SyncBadge } from './common'
import { PrintArea } from './print'
import { Toaster, toast } from './toast'
import type { Paper } from './receipt-v1'
import { useLiveQuery } from 'dexie-react-hooks'
import { newOrder } from './actions'
import { inter } from '@/features/ui/font'
import { useActiveOrders, useOpenShift } from './useData'

type Tab = 'tables' | 'history' | 'kitchen' | 'menu' | 'shift' | 'reports' | 'settings'

export function PosRoot({ kitchenOnly = false }: { kitchenOnly?: boolean }) {
  return (
    <RuntimeProvider>
      <Themed>{kitchenOnly ? <KitchenGate /> : <Gate />}</Themed>
    </RuntimeProvider>
  )
}

function Themed({ children }: { children: React.ReactNode }) {
  const [theme] = useTheme()
  return <div className={`pos ${inter.variable}`} data-theme={theme}>{children}</div>
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
      <header className="page-head">
        <strong className="text-lg flex items-center gap-2"><img src="/logo-mark.svg" alt="" width={28} height={28} style={{ borderRadius: 7 }} />Кухня · Chicken<span className="brand-mark" style={{ marginLeft: -6 }}>Fit</span></strong>
        <div className="flex gap-2 items-center"><SyncBadge /><button className="btn" onClick={logout}><LogOut size={18} /></button></div>
      </header>
      <KitchenView />
    </div>
  )
}

/** Ширина ленты, выбранная в v1 (chickenfit-pos-paper-width), — только чтение. На кассе кафе было 80mm. */
function legacyPaper(): Paper {
  try { const v = typeof window !== 'undefined' ? window.localStorage.getItem('chickenfit-pos-paper-width') : null; if (v === '58mm' || v === '80mm') return v } catch {}
  return '80mm'
}

function useMedia(q: string) {
  const [c, setC] = useState(false)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setC(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [q])
  return c
}

const TITLE: Record<Tab, string> = { tables: 'Зал', history: 'Заказы', kitchen: 'Кухня', menu: 'Меню', shift: 'Смена', reports: 'Отчёты', settings: 'Настройки' }
const ROLE: Record<string, string> = { admin: 'Администратор', cashier: 'Кассир', kitchen: 'Кухня' }
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Samarkand' })

function PosApp() {
  const { session, logout, deviceId, db } = useRuntime()
  const role = session?.staff.role
  const [tab, setTab] = useState<Tab>(role === 'kitchen' ? 'kitchen' : 'tables')
  const [current, setCurrent] = useState<Order | null>(null)
  const [more, setMore] = useState(false)
  // ширина ленты: выбор на устройстве; по умолчанию — как в v1 на этом устройстве (ключ v1 только читаем), иначе 80 мм
  const paperPref = useLiveQuery(() => db.kv.get('pref:paper'), [db])
  const [paperSel, setPaperSel] = useState<Paper | null>(null)
  const paper: Paper = paperSel ?? (paperPref?.value as Paper | undefined) ?? legacyPaper()
  const setPaper = (p: Paper) => { setPaperSel(p); void db.kv.put({ key: 'pref:paper', value: p }) }
  const orders = useActiveOrders() ?? []
  const shift = useOpenShift()
  const rescue = useRescueImport()
  const compact = useMedia('(max-width: 900px)')
  const wide = useMedia('(min-width: 1200px)')
  const isAdmin = role === 'admin'

  const openTable = (tableId: string) => {
    // открытый (неоплаченный) заказ стола; оплаченные закрыты — стол свободен для нового заказа
    const existing = orders.find((o) => o.type === 'dine_in' && o.tableId === tableId && isActive(o))
    setCurrent(existing ?? newOrder({ type: 'dine_in', tableId, cashierName: session!.staff.name, shiftId: shift?.id, deviceId: deviceId! }))
  }
  const go = (t: Tab) => { setTab(t); setCurrent(null); setMore(false) }
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; show: boolean; primary?: boolean }> = [
    { id: 'tables', label: 'Столы', icon: <LayoutGrid size={22} />, show: role !== 'kitchen', primary: true },
    { id: 'history', label: 'Заказы', icon: <History size={22} />, show: role !== 'kitchen', primary: true },
    { id: 'kitchen', label: 'Кухня', icon: <ChefHat size={22} />, show: true },
    { id: 'menu', label: 'Меню', icon: <BookOpen size={22} />, show: role !== 'kitchen', primary: true },
    { id: 'shift', label: 'Смена', icon: <Wallet size={22} />, show: role !== 'kitchen', primary: true },
    { id: 'reports', label: 'Отчёты', icon: <BarChart3 size={22} />, show: isAdmin },
    { id: 'settings', label: 'Настройки', icon: <Settings size={22} />, show: true },
  ]
  const shown = tabs.filter((t) => t.show)
  const navBtn = (t: (typeof tabs)[number]) => (
    <button key={t.id} className="rail-btn" aria-current={tab === t.id && !current ? 'page' : undefined} onClick={() => go(t.id)}>
      {t.icon}<span>{t.label}</span>
    </button>
  )
  const bottom = shown.length > 5 ? shown.filter((t) => t.primary) : shown
  const extra = shown.filter((t) => !bottom.includes(t))
  const pendingOpen = orders.filter((o) => isActive(o) && o.number).length

  const shiftChip = role === 'kitchen' || tab === 'shift' ? null : shift
    ? <button className="chip chip-ok" onClick={() => go('shift')}><span className="dot" data-state="ok" />{compact ? `с ${hhmm(shift.openedAt)}` : `Смена${shift.number ? ` №${shift.number}` : ''} · с ${hhmm(shift.openedAt)}`}</button>
    : shift === null ? <button className="chip chip-warn" onClick={() => go('shift')}>{compact ? 'Открыть смену' : 'Смена не открыта · Открыть'}</button> : null

  return (
    <div className="shell">
      {!compact && (
        <nav className="app-rail" aria-label="Разделы">
          <img src="/logo-mark.svg" alt="Chicken Fit" width={40} height={40} className="rail-logo" />
          <div className="rail-items">{shown.map(navBtn)}</div>
          <button className="rail-user" onClick={logout} title="Выйти" aria-label={`Выйти (${session?.staff.name})`}>
            <span className="avatar" aria-hidden>{session?.staff.name?.slice(0, 1).toUpperCase()}</span>
            <span className="rail-user-name">{session?.staff.name}</span>
            <LogOut size={16} aria-hidden />
          </button>
        </nav>
      )}
      <div className="shell-main">
        {!current && (
          <header className="page-head">
            {compact && <img src="/logo-mark.svg" alt="" width={32} height={32} style={{ borderRadius: 8 }} />}
            <div className="min-w-0 flex-1">
              <h1 className="page-title">{TITLE[tab]}</h1>
              {!compact && <div className="page-sub">{[session?.staff.name, ROLE[role ?? '']].filter((x, i, a) => x && a.indexOf(x) === i).join(' · ')}{tab === 'tables' && pendingOpen ? ` · открытых заказов: ${pendingOpen}` : ''}</div>}
            </div>
            {shiftChip}
            <SyncBadge compact={compact} />
          </header>
        )}
        <main className="shell-content" style={{ minWidth: 0 }}>
          {!current && (
            <div className="notices empty:hidden">
              <RescueBanner r={rescue} />
            </div>
          )}
          {current ? (
            <OrderView key={current.id} initial={current} compact={compact} wide={wide} onBack={(m?: string) => { setCurrent(null); if (m) toast(m) }} />
          ) : tab === 'tables' ? (
            <TablesView orders={orders} onOpenTable={openTable} onOpenOrder={setCurrent}
              onNew={(type) => setCurrent(newOrder({ type, cashierName: session!.staff.name, shiftId: shift?.id, deviceId: deviceId! }))} />
          ) : tab === 'history' ? <HistoryView onOpen={setCurrent} /> : tab === 'menu' ? <MenuAdminView isAdmin={isAdmin} /> : tab === 'kitchen' ? <KitchenView />
            : tab === 'shift' ? <ShiftView /> : tab === 'reports' ? <ReportsView /> : <SettingsView paper={paper} setPaper={setPaper} rescue={rescue} />}
        </main>
        {compact && !current && (
          <nav className="bottom-nav" aria-label="Разделы">
            {bottom.map(navBtn)}
            {extra.length > 0 && (
              <button className="rail-btn" aria-expanded={more} aria-current={extra.some((t) => t.id === tab) ? 'page' : undefined} onClick={() => setMore(!more)}><Menu size={22} /><span>Ещё</span></button>
            )}
          </nav>
        )}
        {more && (
          <div className="scrim" onClick={() => setMore(false)}>
            <div className="dialog" style={{ maxWidth: 420 }} role="menu" aria-label="Ещё разделы" onClick={(e) => e.stopPropagation()}>
              <div className="grid gap-2">{extra.map((t) => <button key={t.id} role="menuitem" className="btn btn-lg justify-start" onClick={() => go(t.id)}>{t.icon}{t.label}</button>)}</div>
            </div>
          </div>
        )}
      </div>
      <PrintArea paper={paper} shiftNumber={shift?.number} />
      <Toaster />
    </div>
  )
}
