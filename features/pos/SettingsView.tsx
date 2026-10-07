'use client'
/** Настройки устройства и кафе: печать, оформление, столы (админ), данные/бэкап, сеанс. Всё, что раньше было иконками в шапке. */
import { useLiveQuery } from 'dexie-react-hooks'
import { LogOut, Moon, Printer, Sun } from 'lucide-react'
import { useRuntime, useTheme } from '@/features/app/runtime'
import { BackupView } from '@/features/rescue/RescuePanel'
import type { RescueView } from '@/features/rescue/useRescueImport'
import type { Paper } from './receipt-v1'
import { TablesAdmin } from './TablesAdmin'
import { SyncBadge } from './common'

const ROLE: Record<string, string> = { admin: 'Администратор', cashier: 'Кассир', kitchen: 'Кухня' }

export function SettingsView({ paper, setPaper, rescue }: { paper: Paper; setPaper: (p: Paper) => void; rescue: RescueView | null }) {
  const { db, session, logout } = useRuntime()
  const [theme, toggleTheme] = useTheme()
  const prefs = useLiveQuery(async () => ({ r: (await db.kv.get('pref:printReceipt'))?.value, k: (await db.kv.get('pref:printKitchen'))?.value }), [db])
  const receipt = (prefs?.r as boolean | undefined) ?? true
  const kitchen = (prefs?.k as boolean | undefined) ?? false
  const isAdmin = session?.staff.role === 'admin'
  return (
    <div className="page grid gap-5" style={{ maxWidth: 820 }}>
      <section className="panel p-4 grid gap-3" aria-labelledby="s-print">
        <h2 id="s-print" className="section-title"><Printer size={20} aria-hidden />Печать</h2>
        <div className="setting-row">
          <span><b>Ширина чековой ленты</b><span className="muted text-sm block">Как у принтера: обычно 80 мм</span></span>
          <div className="seg" role="radiogroup" aria-label="Ширина ленты">
            {(['80mm', '58mm'] as Paper[]).map((p) => <button key={p} role="radio" aria-checked={paper === p} onClick={() => setPaper(p)}>{p.replace('mm', ' мм')}</button>)}
          </div>
        </div>
        <div className="setting-row">
          <span><b>Чек гостю при оплате</b><span className="muted text-sm block">Галочка по умолчанию в окне оплаты</span></span>
          <span className="switch"><input type="checkbox" role="switch" aria-label="Чек гостю при оплате" checked={receipt} onChange={(e) => void db.kv.put({ key: 'pref:printReceipt', value: e.target.checked })} /><span aria-hidden /></span>
        </div>
        <div className="setting-row">
          <span><b>Бегунок на кухню при оплате</b><span className="muted text-sm block">Если кухня не получила заказ раньше</span></span>
          <span className="switch"><input type="checkbox" role="switch" aria-label="Бегунок на кухню при оплате" checked={kitchen} onChange={(e) => void db.kv.put({ key: 'pref:printKitchen', value: e.target.checked })} /><span aria-hidden /></span>
        </div>
      </section>
      <section className="panel p-4 grid gap-3" aria-labelledby="s-look">
        <h2 id="s-look" className="section-title">{theme === 'dark' ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />}Оформление</h2>
        <div className="setting-row">
          <span><b>Тема</b><span className="muted text-sm block">Тёмная удобнее вечером</span></span>
          <div className="seg" role="radiogroup" aria-label="Тема">
            <button role="radio" aria-checked={theme !== 'dark'} onClick={() => theme === 'dark' && toggleTheme()}>Светлая</button>
            <button role="radio" aria-checked={theme === 'dark'} onClick={() => theme !== 'dark' && toggleTheme()}>Тёмная</button>
          </div>
        </div>
      </section>
      {isAdmin && (
        <section className="panel overflow-hidden" aria-labelledby="s-tables">
          <h2 id="s-tables" className="section-title px-4 pt-4">Столы и зоны</h2>
          <TablesAdmin />
        </section>
      )}
      <section className="panel p-4" aria-labelledby="s-data">
        <h2 id="s-data" className="section-title">Данные и бэкап</h2>
        <BackupView r={rescue} embedded />
      </section>
      <section className="panel p-4 grid gap-3" aria-labelledby="s-dev">
        <h2 id="s-dev" className="section-title">Сеанс</h2>
        <div className="setting-row">
          <span><b>{session?.staff.name}</b><span className="muted text-sm block">{ROLE[session?.staff.role ?? ''] ?? ''}</span></span>
          <SyncBadge />
        </div>
        <button className="btn btn-lg" onClick={logout}><LogOut size={20} />Выйти</button>
      </section>
    </div>
  )
}
