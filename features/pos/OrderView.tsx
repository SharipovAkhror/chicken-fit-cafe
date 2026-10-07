'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRightLeft, Ban, CheckCircle2, ChefHat, Clock3, Flame, HandPlatter, Minus, MoreHorizontal, Plus, PlusCircle, Printer, ReceiptText, RotateCcw, Search, ShoppingBasket, StickyNote, X } from 'lucide-react'
import { addItem, baseName, cartCount, gramsOf, isPriceOverridden, lineTotal, setQty, updateLine } from '@/domain/cart'
import { PAYMENT_LABEL, TYPE_LABEL, amountDue, displayStatus, isActive, isClosed, prepaidOf, type Order, type PaymentMethod } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { kindOf, optionsOf, hasOptions, pricePerKgOf, type ProductOptions } from '@/domain/product'
import { PORTION, portionOf, type PortionSize } from '@/domain/garnish'
import type { MenuItemRow } from '@/data/local-db'
import { useRuntime } from '@/features/app/runtime'
import { Modal, Money } from './common'
import { PaymentDialog } from './PaymentDialog'
import { markPrecheck, pay, saveDraftLocal, saveMenuItem, saveOrder, sendToKitchen, withTotals } from './actions'
import { printJob } from './print'
import { useActiveOrders, useMenu, useTables } from './useData'
import { GarnishDialog } from './GarnishDialog'
import { NewProductTile, ProductCard } from './ProductCard'
import { LinePanel, OptionsDialog, QuickProductDialog, TransferDialog, WeightAdd, type QuickProduct } from './ItemDialogs'
import { uuidv4 } from '@/domain/ids'
import { CancelOrderDialog, ReopenOrderDialog } from './OrderActions'
import { TopDishes, useNow } from './Insights'
import { toast } from './toast'
import { daySales, dayOf, durationLabel, timerTone, type TopItem } from '@/domain/metrics'

const NO_ORDERS: Order[] = []

type Pending = { kind: 'garnish' | 'portion' | 'weight' | 'options'; item: MenuItemRow } | null

/** В чеке на экране — без процентов и граммов микса (они нужны кухне и печатаются в тикете). */
const shortNote = (name: string, notes?: string, mix?: boolean) => {
  if (!notes || !mix) return notes
  const t = notes.split(', ').map((p) => p.replace(/\s\d+%/g, '').replace(/\s*\(\d+\s?г\)/g, '').trim()).filter((p) => p && !name.includes(p)).join(', ')
  return t || undefined
}

export function OrderView({ initial, onBack, compact, wide = false }: { initial: Order; onBack: (notice?: string) => void; compact: boolean; wide?: boolean }) {
  const { db, session } = useRuntime()
  const menu = useMenu()
  const tables = useTables()
  const active = useActiveOrders() ?? NO_ORDERS
  const [order, setOrder] = useState<Order>(initial)
  const [catSel, setCat] = useState<string | null>(null)
  const cat = catSel ?? menu?.categories[0]?.id ?? null
  const [q, setQ] = useState('')
  const [paying, setPaying] = useState(false)
  const [lineIdx, setLineIdx] = useState<number | null>(null)
  // Анимации чека: новые строки проявляются только после первого рендера (не при открытии стола),
  // удаляемая строка схлопывается 180 мс, потом реально удаляется.
  const [leaving, setLeaving] = useState<number | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [dialog, setDialog] = useState<'cancel' | 'new' | 'transfer' | 'reopen' | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  // последнее добавленное блюдо: карточка мигает и показывает «+1», итог «подпрыгивает»
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null)
  const now = useNow(30000)
  const listEnd = useRef<HTMLLIElement>(null)
  const locked = order.paymentStatus === 'paid' || order.status === 'cancelled'
  const wItem = pending?.kind === 'weight' ? pending.item : null
  const wPpk = wItem ? pricePerKgOf(wItem) : 0
  const wOpts: ProductOptions = wItem ? optionsOf(wItem) : {}
  const wBase = wItem ? wItem.nameRu.replace(/\s*кг$/i, '') : ''
  const tableLabel = tables.find((t) => t.id === order.tableId)?.label


  const itemCount = order.items.length
  useEffect(() => { listEnd.current?.scrollIntoView({ block: 'nearest' }) }, [itemCount])

  const orderRef = useRef(order)
  useEffect(() => { orderRef.current = order }, [order])
  const update = (o: Order) => {
    // позиции изменились после выданного счёта — отметка «Счёт выдан» снимается (на сервере тоже, precheckAt: null)
    if (o.precheckAt && o.items !== order.items) o = { ...o, precheckAt: null }
    setOrder(o)
    if (o.items.length > 0 || o.number) void saveDraftLocal(db, o)
  }
  const flash = (m: string) => toast(m, 'info')
  const add = (it: Parameters<typeof addItem>[1]) => {
    update(withTotals(order, addItem(order.items, it)))
    setPulse((p) => ({ id: it.id, n: (p?.n ?? 0) + 1 }))
  }

  const needle = q.trim().toLowerCase()
  const items = useMemo(() => (menu?.items ?? []).filter((i) => (needle ? i.nameRu.toLowerCase().includes(needle) : i.categoryId === cat)), [menu, cat, needle])
  // хиты сегодня (топ-5 по количеству) — из тех же локальных заказов, что и экран «Зал»
  const top = useMemo(() => daySales(active, dayOf(new Date(now).toISOString())).top, [active, now])
  const hitById = useMemo(() => new Map(top.map((t) => [t.id, t.qty])), [top])
  const pickTop = (t: TopItem) => { const m = menu?.items.find((x) => x.id === t.id); if (m && m.available) onProduct(m) }
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

  /** Новое блюдо из заказа: (по желанию) сохраняем в меню и сразу добавляем как обычное нажатие на карточку. */
  const onQuick = async (p: QuickProduct) => {
    setDialog(null)
    const weighted = p.kind === 'weighted'
    const row = {
      id: `custom-${uuidv4().slice(0, 8)}`, nameRu: p.name, categoryId: p.categoryId, price: p.price, kind: p.kind, unit: weighted ? 'kg' : 'portion',
      pricePerKg: weighted ? p.price : null, isKitchen: p.isKitchen, available: true, imageUrl: null, weight: null, options: null,
    }
    const item: MenuItemRow = p.saveToMenu ? await saveMenuItem(db, row, p.categoryTitle, null) : { ...row, isDeleted: false, needsReview: false, sortOrder: 0 }
    if (p.saveToMenu) { setQ(''); setCat(p.categoryId) }
    onProduct(item)
    if (p.saveToMenu) flash(`«${p.name}» сохранено в меню`)
  }
  const catList = (menu?.categories ?? []).map((c) => ({ id: c.id, title: c.titleRu }))

  const toKitchen = async () => {
    const saved = await sendToKitchen(db, order)
    setOrder(saved)
    if (saved.items.some((i) => i.isKitchen)) printJob({ kind: 'kitchen', order: saved, tableLabel })
    // как в v1: после отправки на кухню — обратно к столам
    setTimeout(() => onBack(), 400)
  }
  const precheck = async () => {
    const saved = await markPrecheck(db, order)
    setOrder(saved)
    printJob({ kind: 'precheck', order: saved, tableLabel })
    flash('Счёт напечатан')
  }
  const onPaid = async (m: PaymentMethod, cash: number | null, print: { receipt: boolean; kitchen: boolean }) => {
    // возобновлённый: «получено» — это доплата; в заказ пишем полную сумму (ранее принятое + сейчас), сдача не меняется
    const saved = await pay(db, order, m, cash === null ? null : cash + prepaidOf(order))
    setPaying(false)
    setOrder(saved)
    // печать — только то, что выбрал кассир: по умолчанию чек гостю; бегунок на кухню — если включён
    if (print.receipt) printJob({ kind: 'receipt', order: saved, tableLabel })
    if (print.kitchen && saved.items.some((i) => i.isKitchen)) printJob({ kind: 'kitchen', order: saved, tableLabel })
    const where = saved.type === 'dine_in' ? ` · ${tableLabel ?? `Стол ${saved.tableId}`} свободен` : ''
    setTimeout(() => onBack(`Заказ №${saved.number} оплачен и закрыт${where}`), print.receipt || print.kitchen ? 800 : 300)
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

  const editLine = lineIdx !== null && !locked ? order.items[lineIdx] : undefined
  const editor = editLine && lineIdx !== null && (
    <LinePanel key={lineIdx} line={editLine} onClose={() => setLineIdx(null)}
      onChange={(l) => update(withTotals(order, updateLine(order.items, lineIdx, l)))}
      onRemove={() => {
        const idx = lineIdx
        setLineIdx(null)
        const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (reduce) { update(withTotals(order, setQty(order.items, idx, 0))); return }
        setLeaving(idx)
        setTimeout(() => { setLeaving(null); const o = orderRef.current; update(withTotals(o, setQty(o.items, idx, 0))) }, 180)
      }} />
  )

  const due = amountDue(order)
  const prepaid = prepaidOf(order)
  const canReopen = isClosed(order) && !!order.number && session?.staff.role !== 'kitchen'
  const ticket = (
    <aside className="ticket panel flex flex-col relative" style={{ width: compact ? '100%' : wide ? 420 : 380, height: '100%', borderRadius: compact ? 0 : undefined }}>
      <div className="ticket-head p-3 flex items-center justify-between gap-2">
        {compact && <button className="btn" onClick={() => setSheet(false)} aria-label="К меню"><ArrowLeft size={18} /></button>}
        <div className="flex-1 min-w-0">
          <div className="ticket-title truncate">{title}{order.number && <span className="muted"> · №{order.number}</span>}</div>
          <div className="ticket-chips">
            {!order.number ? <span className="tchip" data-state="free">Новый заказ</span>
              : isClosed(order) ? <span className="tchip" data-state="paid"><CheckCircle2 size={14} aria-hidden />Оплачен{order.paymentMethod ? ` · ${PAYMENT_LABEL[order.paymentMethod]}` : ''}</span>
              : order.precheckAt && !locked ? <span className="tchip" data-state="billed"><ReceiptText size={14} aria-hidden />Счёт выдан</span>
              : <span className="tchip" data-state="busy">{displayStatus(order)}</span>}
            {order.number && !locked && (() => { const m = Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000)); return <span className="tmini" data-tone={timerTone(m)}><Clock3 size={14} aria-hidden />{durationLabel(m)}</span> })()}
            {order.items.length > 0 && <span key={cartCount(order.items)} className="tmini tmini-count" aria-label={`В заказе ${cartCount(order.items)} шт`}><ShoppingBasket size={14} aria-hidden />{cartCount(order.items)} шт</span>}
          </div>
        </div>
        {!locked && (
          <button className="btn btn-ghost" aria-label="Ещё" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={22} /></button>
        )}
        {moreOpen && (
          <div className="panel menu-pop" role="menu" onClick={() => setMoreOpen(false)}>
            {order.type === 'dine_in' && <button role="menuitem" onClick={() => setDialog('transfer')}><ArrowRightLeft size={18} />Перенести на другой стол</button>}
            <button role="menuitem" onClick={() => setDialog('new')}><PlusCircle size={18} />Новое блюдо / своя позиция</button>
            {order.paymentStatus === 'unpaid' && (order.number || order.items.length > 0) && <button role="menuitem" className="danger" onClick={() => setDialog('cancel')}><Ban size={18} />{order.number ? 'Отменить заказ…' : 'Очистить заказ'}</button>}
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
      <LineList className="flex-1 overflow-auto px-2" aria-label="Позиции заказа">
        {order.items.length === 0 && (
          <li className="ticket-empty">
            <span className="empty-ico empty-ico-lg"><HandPlatter size={30} aria-hidden /></span>
            <b>Чек пока пуст</b>
            <span className="muted">Нажмите на блюдо — оно сразу появится здесь</span>
            {!wide && !locked && top.length > 0 && <TopDishes top={top} onPick={pickTop} title="Хиты сегодня — нажмите, чтобы добавить" compact />}
          </li>
        )}
        {order.items.map((it, idx) => {
          const sub = it.weightKg ? `${gramsOf(it)} г` : null
          const changed = isPriceOverridden(it)
          const note = shortNote(it.name, it.notes, !!it.garnishMix?.length)
          return (
            <li key={idx} className={`line${leaving === idx ? ' is-leaving' : ''}`}>
              <div className="line-row">
                <button className="line-main" disabled={locked} aria-current={lineIdx === idx} onClick={() => setLineIdx(lineIdx === idx ? null : idx)} aria-label={`Изменить: ${it.name}`}>
                  <span className="min-w-0">
                    <span className="line-name">
                      {it.qty > 1 && !it.weightKg && (locked || compact) && <span className="line-qty">{it.qty}×</span>}{baseName(it)}
                    </span>
                    {(sub || changed) && <span className="line-sub">{[sub, changed ? 'своя цена' : null].filter(Boolean).join(' · ')}</span>}
                    {note && <span className="line-note">{note}</span>}
                  </span>
                  <span className="line-price">{formatUZS(lineTotal(it))}</span>
                </button>
                {!locked && !compact && !it.weightKg && (
                  <span className="stepper" role="group" aria-label={`Количество: ${baseName(it)}`}>
                    <button type="button" onClick={() => update(withTotals(order, setQty(order.items, idx, it.qty - 1)))} aria-label={`Меньше: ${baseName(it)}`}><Minus size={18} /></button>
                    <output aria-live="polite">{it.qty}</output>
                    <button type="button" onClick={() => update(withTotals(order, setQty(order.items, idx, it.qty + 1)))} aria-label={`Больше: ${baseName(it)}`}><Plus size={18} /></button>
                  </span>
                )}
              </div>
            </li>
          )
        })}
        {!wide && !locked && order.items.length > 0 && order.items.length <= 5 && (() => {
          const inOrder = new Set(order.items.map((it) => it.id))
          const more = top.filter((t) => !inOrder.has(t.id) && menu?.items.some((m) => m.id === t.id && m.available)).slice(0, 3)
          return more.length > 0 && (
            <li className="ticket-suggest">
              <span className="ticket-suggest-title"><Flame size={15} aria-hidden />Часто берут сегодня</span>
              {more.map((t) => (
                <button key={t.id + t.name} type="button" className="ticket-suggest-row" onClick={() => pickTop(t)} aria-label={`Добавить: ${t.name}`}>
                  <Plus size={16} aria-hidden /><span className="truncate">{t.name}</span><small>{t.qty} шт</small>
                </button>
              ))}
            </li>
          )
        })()}
        <li ref={listEnd} aria-hidden />
      </LineList>
      {order.notes && <div className="ticket-notes"><StickyNote size={16} aria-hidden /><span>{order.notes}</span></div>}
      <div className="ticket-foot p-3 grid gap-2">
        {order.discountAmount > 0 && <div className="flex justify-between muted"><span>Скидка {order.discountPercent ? `${order.discountPercent}%` : ''}</span><span>−{formatUZS(order.discountAmount)}</span></div>}
        {order.deliveryFee > 0 && <div className="flex justify-between muted"><span>Доставка</span><span>{formatUZS(order.deliveryFee)}</span></div>}
        <div className="flex justify-between items-baseline">
          <span className="text-lg font-semibold">Итого{order.items.length > 0 && <span className="ticket-count"> · {order.items.length} поз.</span>}</span>
          <span key={order.total} className="ticket-total-wrap"><Money v={order.total} className="ticket-total" /></span>
        </div>
        {prepaid > 0 && !locked && <div className="flex justify-between text-sm"><span className="muted">Ранее оплачено</span><span>{formatUZS(prepaid)} · {due >= 0 ? `к доплате ${formatUZS(due)}` : `вернуть ${formatUZS(-due)}`}</span></div>}
        {!locked ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-lg" disabled={!order.items.length} onClick={toKitchen}><ChefHat size={20} />Кухня</button>
              <button className="btn btn-lg" disabled={!order.items.length} onClick={precheck}><Printer size={20} />Пречек</button>
            </div>
            <button className="btn btn-xl btn-primary" disabled={!order.items.length} onClick={() => setPaying(true)}>
              <span>Оплатить</span>{order.items.length > 0 && <span className="btn-xl-sum">{formatUZS(prepaid ? Math.max(0, due) : order.total)} сум</span>}
            </button>
          </>
        ) : (
          <>
            {isClosed(order) && <div className="banner banner-success" role="status"><CheckCircle2 size={18} aria-hidden />Заказ закрыт и оплачен</div>}
            <div className={`grid gap-2 ${canReopen ? 'grid-cols-2' : ''}`}>
              <button className="btn btn-lg" onClick={() => printJob({ kind: 'receipt', order, tableLabel })}><Printer size={20} />Печать чека</button>
              {canReopen && <button className="btn btn-lg" onClick={() => setDialog('reopen')}><RotateCcw size={20} />Возобновить</button>}
            </div>
          </>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-full gap-3 p-3" style={{ minHeight: 0 }}>
      {!compact && editLine && (
        <section className="flex-1 flex justify-center items-start overflow-auto" style={{ minWidth: 0 }}>
          <div className="edit-pane">{editor}</div>
        </section>
      )}
      {(compact ? !sheet : !editLine) && (
        <section className="flex-1 flex flex-col gap-3" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <button className="btn shrink-0" onClick={() => onBack()} aria-label="Столы"><ArrowLeft size={18} />{!compact && 'Столы'}</button>
            <label className="relative flex-1" style={{ maxWidth: 360 }}>
              <Search size={18} className="muted" style={{ position: 'absolute', left: 12, top: 15 }} aria-hidden />
              <input className="input" style={{ paddingLeft: 38, paddingRight: q ? 40 : 12 }} placeholder="Поиск блюда" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск блюда" />
              {q && <button className="btn btn-ghost" style={{ position: 'absolute', right: 0, top: 0, minHeight: 48, padding: '0 10px' }} onClick={() => setQ('')} aria-label="Очистить поиск"><X size={18} /></button>}
            </label>
            {!locked && <button className="btn shrink-0" onClick={() => setDialog('new')} aria-label="Новое блюдо"><Plus size={18} />{!compact && 'Новое'}</button>}
            {compact && <span className="font-bold whitespace-nowrap">{title}</span>}
          </div>
          {!needle && !wide && (
            <div className="cat-wrap" role="tablist" aria-label="Категории">
              {menu?.categories.map((c) => (
                <button key={c.id} role="tab" aria-selected={cat === c.id} className="cat-chip" onClick={() => setCat(c.id)}>{c.titleRu}</button>
              ))}
            </div>
          )}
          <div className="flex gap-3 flex-1" style={{ minHeight: 0 }}>
          {!needle && wide && (
            <div className="cat-col">
            <div className="cat-rail" role="tablist" aria-label="Категории" aria-orientation="vertical">
              {menu?.categories.map((c) => (
                <button key={c.id} role="tab" aria-selected={cat === c.id} className="cat-rail-btn" onClick={() => setCat(c.id)}>
                  <span>{c.titleRu}</span><span className="cat-count">{menu.items.filter((i) => i.categoryId === c.id).length}</span>
                </button>
              ))}
            </div>
            {!locked && <TopDishes top={top} onPick={pickTop} title="Хиты сегодня" compact />}
            </div>
          )}
          <div className="pgrid grid gap-3 overflow-auto content-start flex-1" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 148 : 176}px, 1fr))`, gridAutoRows: "max-content" }}>
            {items.map((m) => <ProductCard key={m.id} item={m} qty={qtyById.get(m.id) ?? 0} onAdd={() => onProduct(m)} hit={hitById.get(m.id)} pulse={pulse?.id === m.id ? pulse.n : undefined} />)}
            {!needle && !locked && items.length > 0 && <NewProductTile onClick={() => setDialog('new')} />}
            {needle && items.length === 0 && <p className="muted p-4">Ничего не найдено</p>}
          </div>
          </div>
          {compact && (
            <button className="btn btn-xl btn-primary" onClick={() => setSheet(true)} disabled={!order.items.length && !order.number}>
              <span>Заказ · {cartCount(order.items)} поз.</span><span className="btn-xl-sum">{formatUZS(order.total)} сум</span>
            </button>
          )}
        </section>
      )}
      {(!compact || sheet) && ticket}

      {paying && (
        <PaymentDialog order={order} prepaid={prepaid} onClose={() => setPaying(false)} onPaid={onPaid}
          onDiscount={(p) => update(withTotals(order, order.items, p))} />
      )}
      {compact && editLine && <Modal title="Позиция" onClose={() => setLineIdx(null)}>{editor}</Modal>}
      {wItem && (
        <WeightAdd name={wBase} pricePerKg={wPpk} opts={wOpts} onClose={() => setPending(null)} onAdd={(r) => {
          const v = r.variant ? ` ${r.variant}` : ''
          const extrasNote = r.note.split(' · ').filter((x) => x && x !== r.variant).join(' · ')
          add({ id: wItem.id, name: `${wBase}${v} ${r.grams} г`, price: r.price, originalPrice: r.price, weightKg: r.grams / 1000, pricePerKg: wPpk, listPricePerKg: wPpk, category: wItem.categoryId ?? undefined, isKitchen: wItem.isKitchen ?? true, notes: extrasNote || undefined })
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
      {dialog === 'new' && (
        <QuickProductDialog cats={catList} defaultCat={cat} canSave existing={menu?.items ?? []} onClose={() => setDialog(null)} onDone={(p) => void onQuick(p)} />
      )}
      {dialog === 'transfer' && order.tableId && (
        <TransferDialog from={order.tableId} tables={tables} busy={busyTables} onClose={() => setDialog(null)} onPick={transfer} />
      )}
      {dialog === 'cancel' && (
        <CancelOrderDialog order={order} onClose={() => setDialog(null)} onDone={() => { setDialog(null); onBack(order.number ? `Заказ №${order.number} отменён` : undefined) }} />
      )}
      {dialog === 'reopen' && (
        <ReopenOrderDialog order={order} onClose={() => setDialog(null)} onReopened={(o) => { setDialog(null); setOrder(o); flash('Заказ возобновлён — можно менять позиции') }} />
      )}
    </div>
  )
}

/** Список строк чека: новые строки проявляются (180 мс), но не при открытии стола/шторки — data-ready ставится после первого кадра. */
function LineList({ children, ...rest }: React.ComponentProps<'ul'>) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(t) }, [])
  return <ul {...rest} data-ready={ready || undefined}>{children}</ul>
}
