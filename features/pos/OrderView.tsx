'use client'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChefHat, Minus, Plus, Printer, Trash2, MessageSquare, Ban } from 'lucide-react'
import { addItem, cartCount, lineTotal, setQty, updateLine } from '@/domain/cart'
import { STATUS_LABEL, TYPE_LABEL, type Order, type PaymentMethod } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { useRuntime } from '@/features/app/runtime'
import { Modal, Money, Numpad } from './common'
import { PaymentDialog } from './PaymentDialog'
import { cancelOrder, pay, saveDraftLocal, saveOrder, sendToKitchen, withTotals } from './actions'
import { printJob } from './print'
import { useMenu, useTables } from './useData'

export function OrderView({ initial, onBack, compact }: { initial: Order; onBack: () => void; compact: boolean }) {
  const { db } = useRuntime()
  const menu = useMenu()
  const tables = useTables()
  const [order, setOrder] = useState<Order>(initial)
  const [cat, setCat] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [noteIdx, setNoteIdx] = useState<number | null>(null)
  const [cancelAsk, setCancelAsk] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [weighItem, setWeighItem] = useState<{ id: string; name: string; pricePerKg: number; category?: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const locked = order.paymentStatus === 'paid' || order.status === 'cancelled'
  const tableLabel = tables.find((t) => t.id === order.tableId)?.label

  useEffect(() => setOrder(initial), [initial.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (menu && !cat) setCat(menu.categories[0]?.id ?? null)
  }, [menu, cat])

  const update = (o: Order) => {
    setOrder(o)
    if (o.items.length > 0 || o.number) void saveDraftLocal(db, o)
  }
  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 2500)
  }
  const items = useMemo(() => (menu?.items ?? []).filter((i) => i.categoryId === cat), [menu, cat])

  const toKitchen = async () => {
    const saved = await sendToKitchen(db, order)
    setOrder(saved)
    if (saved.items.some((i) => i.isKitchen)) printJob({ kind: 'kitchen', order: saved, tableLabel })
    flash('Отправлено на кухню')
  }
  const precheck = async () => {
    const saved = await saveOrder(db, order)
    setOrder(saved)
    printJob({ kind: 'precheck', order: saved, tableLabel })
  }
  const onPaid = async (m: PaymentMethod, cash: number | null, print: boolean) => {
    const wasOpen = order.status === 'open'
    const saved = await pay(db, order, m, cash)
    setPaying(false)
    setOrder(saved)
    const needKitchen = wasOpen && saved.items.some((i) => i.isKitchen)
    if (needKitchen) printJob({ kind: 'kitchen', order: saved, tableLabel })
    if (print) setTimeout(() => printJob({ kind: 'receipt', order: saved, tableLabel }), needKitchen ? 400 : 0)
    flash('Оплачено')
    setTimeout(onBack, print ? 800 : 300)
  }

  const ticket = (
    <aside className="panel flex flex-col" style={{ width: compact ? '100%' : 400, height: '100%', borderRadius: compact ? 0 : 12 }}>
      <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="font-bold text-lg">{order.type === 'dine_in' ? tableLabel ?? `Стол ${order.tableId}` : TYPE_LABEL[order.type]}{order.number && ` · №${order.number}`}</div>
          <div className="text-sm muted">{STATUS_LABEL[order.status]} · {order.paymentStatus === 'paid' ? 'оплачен' : 'не оплачен'}</div>
        </div>
        {compact && <button className="btn" onClick={() => setSheet(false)}>Меню</button>}
      </div>
      {order.type === 'delivery' && !locked && (
        <div className="p-3 grid gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <input className="input" inputMode="tel" placeholder="Телефон" value={order.customerPhone ?? ''} onChange={(e) => update({ ...order, customerPhone: e.target.value })} />
          <input className="input" placeholder="Адрес" value={order.deliveryAddress ?? ''} onChange={(e) => update({ ...order, deliveryAddress: e.target.value })} />
          <input className="input" inputMode="numeric" placeholder="Стоимость доставки" value={order.deliveryFee || ''}
            onChange={(e) => update(withTotals(order, order.items, order.discountPercent, 0, Number(e.target.value.replace(/\D/g, '')) || 0))} />
        </div>
      )}
      <ul className="flex-1 overflow-auto p-2" aria-label="Позиции заказа">
        {order.items.length === 0 && <li className="muted p-4 text-center">Добавьте блюда из меню</li>}
        {order.items.map((it, idx) => (
          <li key={idx} className="p-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex justify-between gap-2">
              <span className="font-semibold">{it.name}{it.isKitchen === false && <span className="muted text-xs"> · бар</span>}</span>
              <span className="font-bold">{formatUZS(lineTotal(it))}</span>
            </div>
            {it.notes && <div className="text-sm" style={{ color: 'var(--accent)' }}>{it.notes}</div>}
            {!locked && (
              <div className="flex items-center gap-2 mt-1">
                <button className="btn" aria-label="Меньше" onClick={() => update(withTotals(order, setQty(order.items, idx, it.qty - 1)))}><Minus size={18} /></button>
                <span className="w-8 text-center font-bold">{it.qty}</span>
                <button className="btn" aria-label="Больше" onClick={() => update(withTotals(order, setQty(order.items, idx, it.qty + 1)))}><Plus size={18} /></button>
                <span className="muted text-sm flex-1">× {formatUZS(it.price)}</span>
                <button className="btn btn-ghost" aria-label="Комментарий" onClick={() => setNoteIdx(idx)}><MessageSquare size={18} /></button>
                <button className="btn btn-ghost" aria-label="Удалить" onClick={() => update(withTotals(order, setQty(order.items, idx, 0)))}><Trash2 size={18} /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="p-3 grid gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        {!locked && (
          <div className="flex gap-1" role="group" aria-label="Скидка">
            {[0, 5, 10, 15, 20].map((p) => (
              <button key={p} className={`btn flex-1${order.discountPercent === p ? ' btn-primary' : ''}`} style={{ padding: 0 }} onClick={() => update(withTotals(order, order.items, p))}>
                {p ? `−${p}%` : 'без скидки'}
              </button>
            ))}
          </div>
        )}
        {order.discountAmount > 0 && <div className="flex justify-between muted"><span>Скидка</span><span>−{formatUZS(order.discountAmount)}</span></div>}
        <div className="flex justify-between items-baseline"><span className="text-lg">Итого</span><Money v={order.total} className="text-2xl font-bold" /></div>
        {msg && <div className="banner banner-info" role="status">{msg}</div>}
        {!locked ? (
          <div className="grid grid-cols-3 gap-2">
            <button className="btn btn-lg" disabled={!order.items.length} onClick={toKitchen}><ChefHat size={20} />Кухня</button>
            <button className="btn btn-lg" disabled={!order.items.length} onClick={precheck}><Printer size={20} />Пречек</button>
            <button className="btn btn-lg btn-primary" disabled={!order.items.length} onClick={() => setPaying(true)}>Оплатить</button>
          </div>
        ) : (
          <button className="btn btn-lg" onClick={() => printJob({ kind: 'receipt', order, tableLabel })}><Printer size={20} />Печать чека</button>
        )}
        {order.number && order.status !== 'cancelled' && order.paymentStatus === 'unpaid' && (
          <button className="btn btn-danger" onClick={() => setCancelAsk(true)}><Ban size={18} />Отменить заказ</button>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-full gap-3 p-3" style={{ minHeight: 0 }}>
      {(!compact || !sheet) && (
        <section className="flex-1 flex flex-col gap-3" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <button className="btn shrink-0" onClick={onBack}><ArrowLeft size={18} />Столы</button>
            <div className="flex gap-2 overflow-x-auto flex-1 min-w-0" role="tablist" aria-label="Категории">
              {menu?.categories.map((c) => (
                <button key={c.id} role="tab" aria-selected={cat === c.id} className={`btn${cat === c.id ? ' btn-primary' : ''}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setCat(c.id)}>
                  {c.titleRu}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 overflow-auto content-start" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 150 : 170}px, 1fr))` }}>
            {items.map((m) => (
              <button key={m.id} className="tile" aria-disabled={!m.available || locked}
                onClick={() => {
                  if (locked || !m.available) return
                  if (m.unit === 'kg' || /(^|\s)кг$/i.test(m.nameRu)) return setWeighItem({ id: m.id, name: m.nameRu, pricePerKg: m.pricePerKg ?? m.price, category: m.categoryId ?? undefined })
                  update(withTotals(order, addItem(order.items, { id: m.id, name: m.nameRu, price: m.price, category: m.categoryId ?? undefined, isKitchen: m.isKitchen ?? undefined })))
                }}>
                <span className="font-semibold leading-tight">{m.nameRu}</span>
                <span className="flex justify-between items-end w-full">
                  <span className="font-bold">{formatUZS(m.price)}</span>
                  {!m.available && <span className="text-xs" style={{ color: 'var(--danger)' }}>нет</span>}
                </span>
              </button>
            ))}
          </div>
          {compact && (
            <button className="btn btn-lg btn-primary" onClick={() => setSheet(true)}>
              Заказ · {cartCount(order.items)} поз. · {formatUZS(order.total)} сум
            </button>
          )}
        </section>
      )}
      {(!compact || sheet) && ticket}
      {paying && <PaymentDialog order={order} onClose={() => setPaying(false)} onPaid={onPaid} />}
      {noteIdx !== null && (
        <NoteDialog initial={order.items[noteIdx]?.notes ?? ''} onClose={() => setNoteIdx(null)}
          onSave={(n) => { update(withTotals(order, updateLine(order.items, noteIdx, { notes: n || undefined }))); setNoteIdx(null) }} />
      )}
      {weighItem && (
        <WeightDialog item={weighItem} onClose={() => setWeighItem(null)} onAdd={(g) => {
          const kg = g / 1000
          update(withTotals(order, addItem(order.items, { id: weighItem.id, name: `${weighItem.name.replace(/\s*кг$/i, '')} ${g} г`, price: Math.round(weighItem.pricePerKg * kg), weightKg: kg, pricePerKg: weighItem.pricePerKg, category: weighItem.category, isKitchen: true })))
          setWeighItem(null)
        }} />
      )}
      {cancelAsk && (
        <CancelDialog onClose={() => setCancelAsk(false)} onConfirm={async (r) => { await cancelOrder(db, order, r); setCancelAsk(false); onBack() }} />
      )}
    </div>
  )
}

function NoteDialog({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (n: string) => void }) {
  const [v, setV] = useState(initial)
  const quick = ['Без лука', 'Острое', 'Не острое', 'Без соуса', 'С собой', 'Двойной соус']
  return (
    <Modal title="Комментарий для кухни" onClose={onClose}>
      <div className="flex flex-wrap gap-2 mb-3">{quick.map((q) => <button key={q} className="btn" onClick={() => setV(v ? `${v}, ${q}` : q)}>{q}</button>)}</div>
      <input className="input mb-3" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      <button className="btn btn-lg btn-primary w-full" onClick={() => onSave(v.trim())}>Сохранить</button>
    </Modal>
  )
}

function CancelDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [r, setR] = useState('')
  return (
    <Modal title="Отменить заказ?" onClose={onClose}>
      <div className="flex flex-wrap gap-2 mb-3">{['Гость ушёл', 'Ошибка кассира', 'Нет продукта'].map((q) => <button key={q} className="btn" onClick={() => setR(q)}>{q}</button>)}</div>
      <input className="input mb-3" placeholder="Причина" value={r} onChange={(e) => setR(e.target.value)} />
      <button className="btn btn-lg btn-danger w-full" disabled={!r.trim()} onClick={() => onConfirm(r.trim())}>Отменить заказ</button>
    </Modal>
  )
}

function WeightDialog({ item, onClose, onAdd }: { item: { name: string; pricePerKg: number }; onClose: () => void; onAdd: (grams: number) => void }) {
  const [g, setG] = useState('')
  const grams = Number(g || 0)
  return (
    <Modal title={`${item.name} — вес`} onClose={onClose}>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-3xl font-bold">{grams} г</span>
        <span className="muted">{formatUZS(item.pricePerKg)} сум/кг → <strong>{formatUZS(Math.round((item.pricePerKg * grams) / 1000))}</strong></span>
      </div>
      <Numpad value={g} onChange={setG} presets={[250, 500, 750, 1000]} />
      <button className="btn btn-lg btn-primary w-full mt-3" disabled={grams <= 0} onClick={() => onAdd(grams)}>Добавить</button>
    </Modal>
  )
}
