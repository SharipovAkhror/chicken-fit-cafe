'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRightLeft, Ban, ChefHat, Minus, MoreHorizontal, Plus, PlusCircle, Printer, Search, X } from 'lucide-react'
import { addItem, cartCount, lineTotal, setQty, updateLine } from '@/domain/cart'
import { STATUS_LABEL, TYPE_LABEL, isActive, type Order, type PaymentMethod } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { kindOf, optionsOf, hasOptions, pricePerKgOf, type ProductOptions } from '@/domain/product'
import { PORTION, portionOf, type PortionSize } from '@/domain/garnish'
import type { MenuItemRow } from '@/data/local-db'
import { useRuntime } from '@/features/app/runtime'
import { Modal, Money } from './common'
import { PaymentDialog } from './PaymentDialog'
import { cancelOrder, markPrecheck, pay, saveDraftLocal, saveOrder, sendToKitchen, withTotals } from './actions'
import { printJob } from './print'
import { useActiveOrders, useMenu, useTables } from './useData'
import { GarnishDialog } from './GarnishDialog'
import { ProductCard } from './ProductCard'
import { CustomItemDialog, LineEditor, OptionsDialog, TransferDialog, WeightDialog } from './ItemDialogs'

type Pending = { kind: 'garnish' | 'portion' | 'weight' | 'options'; item: MenuItemRow } | null

const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000))

export function OrderView({ initial, onBack, compact }: { initial: Order; onBack: () => void; compact: boolean }) {
  const { db } = useRuntime()
  const menu = useMenu()
  const tables = useTables()
  const active = useActiveOrders() ?? []
  const [order, setOrder] = useState<Order>(initial)
  const [cat, setCat] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [paying, setPaying] = useState(false)
  const [lineIdx, setLineIdx] = useState<number | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [dialog, setDialog] = useState<'cancel' | 'custom' | 'transfer' | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const listEnd = useRef<HTMLLIElement>(null)
  const locked = order.paymentStatus === 'paid' || order.status === 'cancelled'
  const wItem = pending?.kind === 'weight' ? pending.item : null
  const wPpk = wItem ? pricePerKgOf(wItem) : 0
  const wOpts: ProductOptions = wItem ? optionsOf(wItem) : {}
  const wBase = wItem ? wItem.nameRu.replace(/\s*кг$/i, '') : ''
  const tableLabel = tables.find((t) => t.id === order.tableId)?.label

  useEffect(() => setOrder(initial), [initial.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (menu && !cat) setCat(menu.categories[0]?.id ?? null) }, [menu, cat])

  const itemCount = order.items.length
  useEffect(() => { listEnd.current?.scrollIntoView({ block: 'nearest' }) }, [itemCount])

  const update = (o: Order) => {
    setOrder(o)
    if (o.items.length > 0 || o.number) void saveDraftLocal(db, o)
  }
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500) }
  const add = (it: Parameters<typeof addItem>[1]) => {
    update(withTotals(order, addItem(order.items, it)))
  }

  const needle = q.trim().toLowerCase()
  const items = useMemo(() => (menu?.items ?? []).filter((i) => (needle ? i.nameRu.toLowerCase().includes(needle) : i.categoryId === cat)), [menu, cat, needle])
  const qtyById = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of order.items) m.set(l.id, (m.get(l.id) ?? 0) + (l.weightKg ? 1 : l.qty))
    return m
  }, [order.items])

  /** Нажатие на карточку: тип товара определяет, нужен ли диалог. Обычная позиция — сразу в чек. */
  const onProduct = (m: MenuItemRow) => {
    if (locked) return
    const k = kindOf(m)
    if (k === 'weighted') return setPending({ kind: 'weight', item: m })
    if (k === 'side_mix') return setPending({ kind: 'portion', item: m })
    if (k === 'with_side') return setPending({ kind: 'garnish', item: m })
    if (hasOptions(m)) return setPending({ kind: 'options', item: m })
    add({ id: m.id, name: m.nameRu, price: m.price, category: m.categoryId ?? undefined, isKitchen: m.isKitchen ?? undefined })
  }

  const toKitchen = async () => {
    const saved = await sendToKitchen(db, order)
    setOrder(saved)
    if (saved.items.some((i) => i.isKitchen)) printJob({ kind: 'kitchen', order: saved, tableLabel })
    // как в v1: после отправки на кухню — обратно к столам
    setTimeout(onBack, 400)
  }
  const precheck = async () => {
    const saved = await saveOrder(db, order)
    setOrder(saved)
    await markPrecheck(db, saved.id)
    printJob({ kind: 'precheck', order: saved, tableLabel })
    flash('Счёт напечатан')
  }
  const onPaid = async (m: PaymentMethod, cash: number | null, print: boolean) => {
    const wasOpen = order.status === 'open'
    const saved = await pay(db, order, m, cash)
    setPaying(false)
    setOrder(saved)
    const needKitchen = wasOpen && saved.items.some((i) => i.isKitchen)
    if (needKitchen) printJob({ kind: 'kitchen', order: saved, tableLabel })
    if (print) setTimeout(() => printJob({ kind: 'receipt', order: saved, tableLabel }), needKitchen ? 400 : 0)
    setTimeout(onBack, print ? 800 : 300)
  }
  const transfer = async (tableId: string) => {
    const moved = { ...order, tableId }
    setDialog(null)
    if (order.number) setOrder(await saveOrder(db, moved))
    else update(moved)
    flash(`Счёт перенесён: ${tables.find((t) => t.id === tableId)?.label ?? tableId}`)
  }
  const busyTables = new Set(active.filter((o) => o.type === 'dine_in' && o.tableId && o.id !== order.id && isActive(o)).map((o) => o.tableId as string))
  const title = order.type === 'dine_in' ? tableLabel ?? `Стол ${order.tableId}` : TYPE_LABEL[order.type]

  const ticket = (
    <aside className="panel flex flex-col relative" style={{ width: compact ? '100%' : 400, height: '100%', borderRadius: compact ? 0 : 12 }}>
      <div className="p-3 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        {compact && <button className="btn" onClick={() => setSheet(false)} aria-label="К меню"><ArrowLeft size={18} /></button>}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate">{title}{order.number && ` · №${order.number}`}</div>
          <div className="text-sm muted">
            {order.number ? `${STATUS_LABEL[order.status]} · ${minutesSince(order.createdAt)} мин` : 'Новый заказ'} · {order.paymentStatus === 'paid' ? 'оплачен' : 'не оплачен'}
          </div>
        </div>
        {!locked && (
          <button className="btn btn-ghost" aria-label="Ещё" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={22} /></button>
        )}
        {moreOpen && (
          <div className="panel menu-pop" role="menu" onClick={() => setMoreOpen(false)}>
            {order.type === 'dine_in' && <button role="menuitem" onClick={() => setDialog('transfer')}><ArrowRightLeft size={18} />Перенести на другой стол</button>}
            <button role="menuitem" onClick={() => setDialog('custom')}><PlusCircle size={18} />Своя позиция</button>
            {order.number && order.paymentStatus === 'unpaid' && <button role="menuitem" className="danger" onClick={() => setDialog('cancel')}><Ban size={18} />Отменить заказ</button>}
          </div>
        )}
      </div>
      {order.type === 'delivery' && !locked && (
        <div className="p-3 grid gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <input className="input" inputMode="tel" placeholder="Телефон" value={order.customerPhone ?? ''} onChange={(e) => update({ ...order, customerPhone: e.target.value })} />
          <input className="input" placeholder="Адрес" value={order.deliveryAddress ?? ''} onChange={(e) => update({ ...order, deliveryAddress: e.target.value })} />
          <input className="input" inputMode="numeric" placeholder="Стоимость доставки" value={order.deliveryFee || ''}
            onChange={(e) => update(withTotals(order, order.items, order.discountPercent, 0, Number(e.target.value.replace(/\D/g, '')) || 0))} />
        </div>
      )}
      <ul className="flex-1 overflow-auto px-2" aria-label="Позиции заказа">
        {order.items.length === 0 && <li className="muted p-6 text-center">Нажмите на блюдо, чтобы добавить</li>}
        {order.items.map((it, idx) => (
          <li key={idx} className="line">
            <button className="line-main" disabled={locked} onClick={() => setLineIdx(idx)} aria-label={`Изменить: ${it.name}`}>
              <span className="min-w-0">
                <span className="font-semibold block">{it.name}{it.isKitchen === false && <span className="muted text-xs font-normal"> · бар</span>}</span>
                {it.notes && <span className="text-sm block" style={{ color: 'var(--primary-ink)' }}>{it.notes}</span>}
                <span className="muted text-sm">{it.weightKg ? (it.pricePerKg ? `${formatUZS(it.pricePerKg)} / кг` : '') : `${it.qty} × ${formatUZS(it.price)}`}</span>
              </span>
              <span className="font-bold whitespace-nowrap">{formatUZS(lineTotal(it))}</span>
            </button>
            {!locked && !it.weightKg && (
              <div className="flex items-center gap-2 mt-1">
                <button className="btn qty-btn" aria-label={`Меньше: ${it.name}`} onClick={() => update(withTotals(order, setQty(order.items, idx, it.qty - 1)))}><Minus size={18} /></button>
                <span className="w-8 text-center font-bold">{it.qty}</span>
                <button className="btn qty-btn" aria-label={`Больше: ${it.name}`} onClick={() => update(withTotals(order, setQty(order.items, idx, it.qty + 1)))}><Plus size={18} /></button>
              </div>
            )}
          </li>
        ))}
        <li ref={listEnd} aria-hidden />
      </ul>
      <div className="p-3 grid gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        {order.discountAmount > 0 && <div className="flex justify-between muted"><span>Скидка {order.discountPercent ? `${order.discountPercent}%` : ''}</span><span>−{formatUZS(order.discountAmount)}</span></div>}
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
      </div>
    </aside>
  )

  return (
    <div className="flex h-full gap-3 p-3" style={{ minHeight: 0 }}>
      {(!compact || !sheet) && (
        <section className="flex-1 flex flex-col gap-3" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <button className="btn shrink-0" onClick={onBack} aria-label="Столы"><ArrowLeft size={18} />{!compact && 'Столы'}</button>
            <label className="relative flex-1" style={{ maxWidth: 360 }}>
              <Search size={18} className="muted" style={{ position: 'absolute', left: 12, top: 15 }} aria-hidden />
              <input className="input" style={{ paddingLeft: 38, paddingRight: q ? 40 : 12 }} placeholder="Поиск блюда" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск блюда" />
              {q && <button className="btn btn-ghost" style={{ position: 'absolute', right: 0, top: 0, minHeight: 48, padding: '0 10px' }} onClick={() => setQ('')} aria-label="Очистить поиск"><X size={18} /></button>}
            </label>
            {compact && <span className="font-bold whitespace-nowrap">{title}</span>}
          </div>
          {!needle && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Категории">
              {menu?.categories.map((c) => (
                <button key={c.id} role="tab" aria-selected={cat === c.id} className="cat-chip" onClick={() => setCat(c.id)}>{c.titleRu}</button>
              ))}
            </div>
          )}
          <div className="grid gap-2 overflow-auto content-start flex-1" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 150 : 180}px, 1fr))`, gridAutoRows: "max-content" }}>
            {items.map((m) => <ProductCard key={m.id} item={m} qty={qtyById.get(m.id) ?? 0} onAdd={() => onProduct(m)} />)}
            {needle && items.length === 0 && <p className="muted p-4">Ничего не найдено</p>}
          </div>
          {compact && (
            <button className="btn btn-lg btn-primary" onClick={() => setSheet(true)}>
              Заказ · {cartCount(order.items)} поз. · {formatUZS(order.total)} сум
            </button>
          )}
        </section>
      )}
      {(!compact || sheet) && ticket}

      {paying && (
        <PaymentDialog order={order} onClose={() => setPaying(false)} onPaid={onPaid}
          onDiscount={(p) => update(withTotals(order, order.items, p))} />
      )}
      {lineIdx !== null && order.items[lineIdx] && (
        <LineEditor line={order.items[lineIdx]} onClose={() => setLineIdx(null)}
          onRemove={() => { update(withTotals(order, setQty(order.items, lineIdx, 0))); setLineIdx(null) }}
          onSave={(u) => { update(withTotals(order, updateLine(order.items, lineIdx, u))); setLineIdx(null) }} />
      )}
      {wItem && (
        <WeightDialog name={wBase} pricePerKg={wPpk} opts={wOpts} onClose={() => setPending(null)} onAdd={(r) => {
          const v = r.variant ? ` ${r.variant}` : ''
          const extrasNote = r.note.split(' · ').filter((x) => x && x !== r.variant).join(' · ')
          add({ id: wItem.id, name: `${wBase}${v} ${r.grams} г`, price: r.price, weightKg: r.grams / 1000, pricePerKg: wPpk, category: wItem.categoryId ?? undefined, isKitchen: wItem.isKitchen ?? true, notes: extrasNote || undefined })
          setPending(null)
        }} />
      )}
      {pending?.kind === 'options' && (
        <OptionsDialog name={pending.item.nameRu} opts={optionsOf(pending.item)} onClose={() => setPending(null)} onAdd={(note) => {
          const m = pending.item
          add({ id: m.id, name: m.nameRu, price: m.price, category: m.categoryId ?? undefined, isKitchen: m.isKitchen ?? undefined, notes: note || undefined })
          setPending(null)
        }} />
      )}
      {(pending?.kind === 'garnish' || pending?.kind === 'portion') && (() => {
        const g = pending.item
        const priceOf = (s: PortionSize) => menu?.items.find((x) => x.id === `side-portion-${s}`)?.price ?? (s === 'full' ? 35000 : 23000)
        const portion = pending.kind === 'portion'
        return (
          <GarnishDialog kind={portion ? 'portion' : 'dish'} title={portion ? 'Гарнир — смесь' : `${g.nameRu} — гарнир`}
            prices={portion ? { half: priceOf('half'), full: priceOf('full') } : undefined}
            initialSize={portion ? portionOf(g) : undefined}
            onClose={() => setPending(null)}
            onPick={(res) => {
              if (portion) {
                const size = res.size ?? 'half'
                add({ id: `side-portion-${size}`, name: `Гарнир (${PORTION[size].label}): ${res.label}`, price: priceOf(size), category: 'sides', isKitchen: true, notes: res.note, garnishMix: res.mix ?? undefined })
              } else {
                add({ id: g.id, name: g.nameRu, price: g.price, category: g.categoryId ?? undefined, isKitchen: g.isKitchen ?? undefined, notes: res.note, garnishMix: res.mix ?? undefined })
              }
              setPending(null)
            }} />
        )
      })()}
      {dialog === 'custom' && (
        <CustomItemDialog onClose={() => setDialog(null)} onAdd={(r) => { add({ id: `custom-${Date.now()}`, name: r.name, price: r.price, isKitchen: r.isKitchen }); setDialog(null) }} />
      )}
      {dialog === 'transfer' && order.tableId && (
        <TransferDialog from={order.tableId} tables={tables} busy={busyTables} onClose={() => setDialog(null)} onPick={transfer} />
      )}
      {dialog === 'cancel' && (
        <CancelDialog onClose={() => setDialog(null)} onConfirm={async (r) => { await cancelOrder(db, order, r); setDialog(null); onBack() }} />
      )}
    </div>
  )
}

function CancelDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [r, setR] = useState('')
  return (
    <Modal title="Отменить заказ?" onClose={onClose}>
      <div className="flex flex-wrap gap-2 mb-3">{['Гость ушёл', 'Ошибка кассира', 'Нет продукта'].map((x) => <button key={x} className="cat-chip" aria-selected={r === x} onClick={() => setR(x)}>{x}</button>)}</div>
      <input className="input mb-3" placeholder="Причина" value={r} onChange={(e) => setR(e.target.value)} />
      <button className="btn btn-lg btn-danger w-full" disabled={!r.trim()} onClick={() => onConfirm(r.trim())}>Отменить заказ</button>
    </Modal>
  )
}
