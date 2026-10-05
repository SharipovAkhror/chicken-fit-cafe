'use client'
/**
 * План зала (Toast/iiko): три состояния стола — свободен · занят (сумма, время, позиции) · счёт выдан.
 * Нажатие на стол открывает заказ; «⋯» — действия: пречек, перенести, объединить, отменить, освободить.
 */
import { useEffect, useState } from 'react'
import { ArrowRightLeft, Ban, Clock3, Combine, DoorOpen, MoreHorizontal, Printer, ReceiptText, ShoppingBag, SquarePen, Truck, Users } from 'lucide-react'
import { formatUZS } from '@/domain/money'
import { useRuntime } from '@/features/app/runtime'
import { markPrecheck, mergeOrders, saveOrder } from './actions'
import { TransferDialog } from './ItemDialogs'
import { CancelOrderDialog } from './OrderActions'
import { printJob } from './print'
import { isActive, STATUS_LABEL, tableStateOf, type Order, type TableState } from '@/domain/order'
import { baseName } from '@/domain/cart'
import { useTables } from './useData'

const LATE_MIN = 45
const seatsLabel = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'место' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'места' : 'мест'}`
const STATE_LABEL: Record<TableState, string> = { free: 'Свободен', busy: 'Занят', billed: 'Счёт выдан' }

/** Превью заказа (Toast/iiko): первые позиции + «ещё N». */
function preview(os: Order[]): string {
  const items = os.flatMap((o) => o.items)
  if (!items.length) return 'Пустой заказ'
  const names = items.slice(0, 2).map((i) => `${!i.weightKg && i.qty > 1 ? `${i.qty}× ` : ''}${baseName(i)}`)
  return names.join(', ') + (items.length > 2 ? ` и ещё ${items.length - 2}` : '')
}
const kitchenNote = (o: Order) => (o.status === 'sent' || o.status === 'cooking' || o.status === 'ready' ? STATUS_LABEL[o.status] : null)

type Dlg = { kind: 'move' | 'merge' | 'cancel'; order: Order; reason?: string } | null

export function TablesView({ orders, onOpenTable, onNew, onOpenOrder }: {
  orders: Order[]; onOpenTable: (tableId: string) => void; onNew: (type: 'takeaway' | 'delivery') => void; onOpenOrder: (o: Order) => void
}) {
  const { db } = useRuntime()
  const tables = useTables()
  const active = orders.filter(isActive)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) }, [toast])
  useEffect(() => {
    if (!menuFor) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuFor(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [menuFor])
  const mins = (iso: string) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))
  const ordersOf = (tid: string) => active.filter((o) => o.type === 'dine_in' && o.tableId === tid)
  const busyIds = new Set(active.filter((o) => o.type === 'dine_in' && o.tableId).map((o) => o.tableId as string))
  const zones = [...new Set(tables.map((t) => t.zone))]
  const others = active.filter((o) => o.type !== 'dine_in' || !o.tableId)
  const counts = { free: 0, busy: 0, billed: 0 }
  for (const t of tables) counts[tableStateOf(ordersOf(t.id))]++
  const labelOf = (tid?: string | null) => tables.find((t) => t.id === tid)?.label ?? `Стол ${tid}`

  const precheck = async (o: Order) => {
    const saved = await markPrecheck(db, o)
    printJob({ kind: 'precheck', order: saved, tableLabel: labelOf(o.tableId) })
    setToast(`Счёт выдан: ${labelOf(o.tableId)}`)
  }
  const free = async (o: Order) => {
    if (!o.number) { await db.orders.delete(o.id); setToast(`${labelOf(o.tableId)} свободен`); return }
    setDlg({ kind: 'cancel', order: o, reason: 'Стол освобождён вручную' })
  }

  return (
    <div className="page flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="tables-summary" role="status" aria-label="Сводка по столам">
          <span><i className="dot" data-state="free" />Свободно <b>{counts.free}</b></span>
          <span><i className="dot" data-state="busy" />Занято <b>{counts.busy}</b></span>
          <span><i className="dot" data-state="billed" />Счёт выдан <b>{counts.billed}</b></span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-lg" onClick={() => onNew('takeaway')}><ShoppingBag size={20} />С собой</button>
          <button className="btn btn-lg" onClick={() => onNew('delivery')}><Truck size={20} />Доставка</button>
        </div>
      </div>
      {toast && <div className="banner banner-success" role="status">{toast}</div>}
      {zones.map((z) => (
        <section key={z}>
          <h2 className="zone-title">{z}</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
            {tables.filter((t) => t.zone === z).map((t) => {
              const os = ordersOf(t.id)
              const state = tableStateOf(os)
              const busy = state !== 'free'
              const total = os.reduce((s, o) => s + o.total, 0)
              const first = os[0]
              const m = busy ? mins(first.createdAt) : 0
              const kn = busy ? kitchenNote(first) : null
              return (
                <div key={t.id} className="relative">
                  <button className="tcard" data-state={state} onClick={() => onOpenTable(t.id)}
                    aria-label={`${t.label}${busy ? `, ${state === 'billed' ? 'счёт выдан' : 'занят'}, ${formatUZS(total)} сум, ${m} мин` : ', свободен'}`}>
                    <span className="tcard-top">
                      <span className="tcard-num">{t.label.replace('Стол ', '')}</span>
                      <span className="tcard-status">{state === 'billed' && <ReceiptText size={14} aria-hidden />}{STATE_LABEL[state]}</span>
                    </span>
                    {busy ? <span className="tcard-preview">{kn && <b className="tcard-kitchen">{kn} · </b>}{preview(os)}</span>
                      : <span className="tcard-preview inline-flex items-center gap-1"><Users size={14} aria-hidden />{seatsLabel(t.seats ?? 4)}</span>}
                    <span className="tcard-foot">
                      {busy ? (
                        <>
                          <span className={`tcard-time${m >= LATE_MIN ? ' is-late' : ''}`}><Clock3 size={14} aria-hidden />{m} мин</span>
                          <span className="tcard-total">{formatUZS(total)}</span>
                        </>
                      ) : <span className="tcard-open">Открыть заказ</span>}
                    </span>
                  </button>
                  {busy && (
                    <button className="btn btn-ghost tcard-act" aria-label={`Действия: ${t.label}`} aria-expanded={menuFor === t.id} onClick={() => setMenuFor(menuFor === t.id ? null : t.id)}>
                      <MoreHorizontal size={20} />
                    </button>
                  )}
                  {menuFor === t.id && first && (
                    <>
                      <div className="menu-backdrop" onClick={() => setMenuFor(null)} aria-hidden />
                      <div className="panel menu-pop" role="menu" aria-label={`Действия: ${t.label}`} onClick={() => setMenuFor(null)}>
                        <button role="menuitem" onClick={() => onOpenTable(t.id)}><SquarePen size={18} />Открыть заказ</button>
                        {first.items.length > 0 && <button role="menuitem" onClick={() => void precheck(first)}><Printer size={18} />Пречек (счёт гостю)</button>}
                        <button role="menuitem" onClick={() => setDlg({ kind: 'move', order: first })}><ArrowRightLeft size={18} />Перенести на другой стол</button>
                        {busyIds.size > 1 && first.items.length > 0 && <button role="menuitem" onClick={() => setDlg({ kind: 'merge', order: first })}><Combine size={18} />Объединить с другим столом</button>}
                        <hr />
                        {first.number && first.items.length > 0 && <button role="menuitem" className="danger" onClick={() => setDlg({ kind: 'cancel', order: first })}><Ban size={18} />Отменить заказ…</button>}
                        <button role="menuitem" className="danger" onClick={() => void free(first)}><DoorOpen size={18} />Освободить стол</button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      {others.length > 0 && (
        <section>
          <h2 className="zone-title">С собой и доставка</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {others.map((o) => (
              <button key={o.id} className="tcard" data-state={o.precheckAt ? 'billed' : 'busy'} onClick={() => onOpenOrder(o)} aria-label={`${o.type === 'delivery' ? 'Доставка' : 'С собой'} №${o.number}, ${formatUZS(o.total)} сум`}>
                <span className="tcard-top" style={{ paddingRight: 0 }}>
                  <span className="font-bold inline-flex items-center gap-2">{o.type === 'delivery' ? <Truck size={18} aria-hidden /> : <ShoppingBag size={18} aria-hidden />}№{o.number}</span>
                  <span className="tcard-status">{o.type === 'delivery' ? 'Доставка' : 'С собой'}</span>
                </span>
                <span className="tcard-preview">{preview([o])}</span>
                <span className="tcard-foot"><span className="tcard-time"><Clock3 size={14} aria-hidden />{mins(o.createdAt)} мин</span><span className="tcard-total">{formatUZS(o.total)}</span></span>
              </button>
            ))}
          </div>
        </section>
      )}
      {(dlg?.kind === 'move' || dlg?.kind === 'merge') && dlg.order.tableId && (
        <TransferDialog from={dlg.order.tableId} tables={tables} busy={busyIds} mode={dlg.kind} onClose={() => setDlg(null)}
          onPick={async (id) => {
            const o = dlg.order
            setDlg(null)
            if (dlg.kind === 'move') {
              if (o.number) await saveOrder(db, { ...o, tableId: id })
              else await db.orders.put({ ...o, tableId: id })
              setToast(`Счёт перенесён: ${labelOf(o.tableId)} → ${labelOf(id)}`)
            } else {
              const target = ordersOf(id)[0]
              if (!target) return
              await mergeOrders(db, target, o, labelOf(o.tableId))
              setToast(`${labelOf(o.tableId)} объединён с ${labelOf(id)}`)
            }
          }} />
      )}
      {dlg?.kind === 'cancel' && (
        <CancelOrderDialog order={dlg.order} initialReason={dlg.reason} onClose={() => setDlg(null)} onDone={() => { setToast(`${labelOf(dlg.order.tableId)} свободен`); setDlg(null) }} />
      )}
    </div>
  )
}
