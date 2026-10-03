/**
 * Разбор снимка v1 в мутации v2. Чистая функция (без IO), покрыта unit-тестами.
 * Источники заказов: chickenfit_pos_orders_v1 (до 500 последних, актуальное состояние)
 * + chickenfit_outbox_orders_v1 (на проде не очищался: снимок каждого заказа на момент создания).
 */
import { isUuid, uuidv5 } from '@/domain/ids'
import { businessDate } from '@/domain/order'
import { isKitchenItem, type CartItem } from '@/domain/cart'
import { roundUZS } from '@/domain/money'
import { LEGACY_KEYS } from './legacy-keys'

type Json = any  

export type LegacyOrderPayload = Record<string, Json> & { id: string; legacyId: string; total: number; createdAt: string }
export type LegacyShiftPayload = Record<string, Json> & { id: string; legacyId: string }
export type LegacyMenuPayload = Record<string, Json> & { id: string }

export type ParseReport = {
  ordersTotal: number
  ordersFromMainKey: number
  ordersOnlyInOutbox: number
  mainKeyAtCap: boolean
  shifts: number
  menuItems: number
  menuDeleted: number
  draftsImported: number
  draftsLinked: Array<{ key: string; activeOrderId: string; items: number }>
  dateFrom: string | null
  dateTo: string | null
  /** по бизнес-дате: все импортируемые заказы (как считает rescue_verify на сервере) */
  byDay: Record<string, { count: number; total: number }>
  /** выручка (оплачено и не отменено) по дням — для человека */
  revenueByDay: Record<string, number>
  flags: Record<string, number>
  errors: string[]
}

export type ParsedLegacy = {
  orders: LegacyOrderPayload[]
  shifts: LegacyShiftPayload[]
  menu: LegacyMenuPayload[]
  report: ParseReport
}

type MenuJson = { categories: Array<{ id: string; title: Json; items: Array<Record<string, Json>> }> }

function safeParse<T>(keys: Record<string, string>, key: string, fallback: T, errors: string[]): T {
  const raw = keys[key]
  if (raw === undefined) return fallback
  try {
    const v = JSON.parse(raw)
    return (v ?? fallback) as T
  } catch (e) {
    errors.push(`${key}: повреждённый JSON (${(e as Error).message}); сырые данные сохранены в снимке`)
    return fallback
  }
}

const num = (v: Json): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const int = (v: Json): number | null => { const n = num(v); return n === null ? null : Math.round(n) }
const str = (v: Json): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const loc = (v: Json, lang: 'ru' | 'uz' | 'en'): string | null => (typeof v === 'string' ? (lang === 'ru' ? v : null) : v && typeof v === 'object' ? str(v[lang]) : null)

export async function legacyShiftUuid(legacyId: string): Promise<string> {
  return isUuid(legacyId) ? legacyId : uuidv5(`cf:shift:${legacyId}`)
}
export async function legacyOrderUuid(legacyId: string): Promise<string> {
  return isUuid(legacyId) ? legacyId : uuidv5(`cf:order:${legacyId}`)
}

function normalizeItems(items: Json): CartItem[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((i) => i && typeof i === 'object')
    .map((i) => ({
      id: String(i.id ?? 'unknown'),
      name: String(i.name ?? i.id ?? '?'),
      price: num(i.price) ?? 0,
      originalPrice: num(i.originalPrice) ?? num(i.price) ?? 0,
      qty: num(i.qty) ?? 1,
      category: str(i.category) ?? undefined,
      isKitchen: typeof i.isKitchen === 'boolean' ? i.isKitchen : isKitchenItem(i),
      notes: str(i.notes) ?? undefined,
      garnishMix: Array.isArray(i.garnishMix) ? i.garnishMix : undefined,
      weightKg: num(i.weightKg) ?? undefined,
      pricePerKg: num(i.pricePerKg) ?? undefined,
      unit: str(i.unit) ?? undefined,
    }))
}

export async function parseLegacy(
  keys: Record<string, string>,
  opts: { baseMenu?: MenuJson; now?: Date; deviceId?: string } = {},
): Promise<ParsedLegacy> {
  const errors: string[] = []
  const flags: Record<string, number> = {}
  const flag = (list: string[], f: string) => {
    list.push(f)
    flags[f] = (flags[f] ?? 0) + 1
  }
  const now = opts.now ?? new Date()

  // ── Смены ──
  const shiftsRaw = safeParse<Json[]>(keys, LEGACY_KEYS.shifts, [], errors)
  const current = safeParse<Json>(keys, LEGACY_KEYS.currentShift, null, errors)
  const shiftList: Json[] = Array.isArray(shiftsRaw) ? [...shiftsRaw] : []
  if (current && typeof current === 'object' && current.id && !shiftList.some((s) => s?.id === current.id)) shiftList.push(current)
  const shiftById = new Map<string, LegacyShiftPayload>()
  for (const s of shiftList) {
    if (!s || typeof s !== 'object' || !str(s.id) || !str(s.openedAt)) continue
    const legacyId = String(s.id)
    shiftById.set(legacyId, {
      id: await legacyShiftUuid(legacyId),
      legacyId,
      number: num(s.shiftNumber) ?? undefined,
      cashierName: str(s.cashierName) ?? 'неизвестен',
      openedAt: s.openedAt,
      closedAt: str(s.closedAt),
      initialCash: roundUZS(num(s.initialCash) ?? 0),
      countedCash: int(s.finalCash),
      status: s.status === 'open' && !s.closedAt ? 'open' : 'closed',
      notes: str(s.notes),
      legacyTotals: {
        totalRevenue: num(s.totalRevenue), cashRevenue: num(s.cashRevenue), cardRevenue: num(s.cardRevenue),
        discountTotal: num(s.discountTotal), ordersCount: num(s.ordersCount),
      },
    })
  }

  // ── Заказы: объединение основного ключа и outbox ──
  const mainRaw = safeParse<Json[]>(keys, LEGACY_KEYS.orders, [], errors)
  const outboxRaw = safeParse<Json[]>(keys, LEGACY_KEYS.outboxOrders, [], errors)
  const main = Array.isArray(mainRaw) ? mainRaw.filter((o) => o && typeof o === 'object' && o.id) : []
  const byLegacyId = new Map<string, { o: Json; fromOutbox: boolean }>()
  for (const o of main) byLegacyId.set(String(o.id), { o, fromOutbox: false })
  if (Array.isArray(outboxRaw)) {
    for (const rec of outboxRaw) {
      const p = rec?.payload
      const id = p?.id ?? rec?.id
      if (!p || typeof p !== 'object' || !id || byLegacyId.has(String(id))) continue
      byLegacyId.set(String(id), { o: { ...p, id }, fromOutbox: true })
    }
  }

  const orders: LegacyOrderPayload[] = []
  const byDay: ParseReport['byDay'] = {}
  const revenueByDay: Record<string, number> = {}
  let ordersOnlyInOutbox = 0
  for (const [legacyId, { o, fromOutbox }] of byLegacyId) {
    const dq: string[] = []
    if (fromOutbox) { flag(dq, 'outbox_snapshot'); ordersOnlyInOutbox++ }
    const createdAt = str(o.createdAt) ?? now.toISOString()
    if (!str(o.createdAt)) flag(dq, 'created_at_unknown')
    const items = normalizeItems(o.items)
    const linesSum = items.reduce((s, i) => s + roundUZS(i.price * i.qty), 0)
    const total = roundUZS(num(o.total) ?? linesSum)
    if (num(o.total) === null) flag(dq, 'total_from_lines')

    const legacyStatus = String(o.status ?? 'completed')
    let status: string
    const ageH = (now.getTime() - new Date(createdAt).getTime()) / 3600000
    if (legacyStatus === 'completed' || legacyStatus === 'cancelled') status = legacyStatus
    else if (['pending', 'cooking', 'ready'].includes(legacyStatus)) {
      if (ageH > 12) { status = 'served'; flag(dq, 'kitchen_status_stale') }
      else status = legacyStatus === 'pending' ? 'sent' : legacyStatus
    } else { status = 'completed'; flag(dq, 'status_unknown') }

    let paymentStatus: 'paid' | 'unpaid'
    if (o.isPaid === true || legacyStatus === 'completed' || str(o.paidAt)) paymentStatus = 'paid'
    else if (o.isPaid === false) paymentStatus = 'unpaid'
    else if (legacyStatus === 'cancelled') paymentStatus = 'unpaid'
    else { paymentStatus = 'paid'; flag(dq, 'payment_inferred') }
    // неоплаченный старый заказ (>12ч) — висящий стол из старой версии
    if (paymentStatus === 'unpaid' && status !== 'cancelled' && ageH > 12) flag(dq, 'unpaid_stale')

    const legacyShift = str(o.shiftId)
    const shift = legacyShift ? shiftById.get(legacyShift) : undefined
    if (!shift) flag(dq, 'shift_inferred')
    if (!str(o.cashierName)) flag(dq, 'cashier_unknown')

    const payload: LegacyOrderPayload = {
      id: await legacyOrderUuid(legacyId),
      legacyId,
      number: str(o.orderNumber) ?? '?',
      type: ['dine_in', 'takeaway', 'delivery'].includes(o.type) ? o.type : 'dine_in',
      tableId: str(o.tableNumber) ?? (num(o.tableNumber) !== null ? String(o.tableNumber) : null),
      customerPhone: str(o.customerPhone),
      deliveryAddress: str(o.deliveryAddress),
      items,
      subtotal: roundUZS(num(o.subtotal) ?? linesSum),
      discountPercent: int(o.discountPercent),
      discountAmount: int(o.discountAmount),
      deliveryFee: int(o.deliveryFee),
      total,
      status,
      paymentStatus,
      paymentMethod: o.paymentMethod === 'cash' || o.paymentMethod === 'click_payme' ? o.paymentMethod : paymentStatus === 'paid' ? 'cash' : null,
      paidAt: paymentStatus === 'paid' ? (str(o.paidAt) ?? str(o.completedAt) ?? createdAt) : null,
      cashReceived: int(o.cashReceived),
      changeAmount: int(o.changeAmount),
      shiftId: shift?.id ?? null,
      cashierName: str(o.cashierName),
      createdAt,
      deviceId: opts.deviceId,
      dataQuality: dq,
    }
    if (payload.paymentMethod === 'cash' && !(o.paymentMethod === 'cash') && paymentStatus === 'paid') flag(dq, 'payment_method_inferred')
    orders.push(payload)

    const day = shift ? businessDate(shift.openedAt) : businessDate(createdAt)
    byDay[day] = { count: (byDay[day]?.count ?? 0) + 1, total: (byDay[day]?.total ?? 0) + total }
    if (paymentStatus === 'paid' && status !== 'cancelled') revenueByDay[day] = (revenueByDay[day] ?? 0) + total
  }
  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  // ── Черновики столов → открытые заказы (если не привязаны к существующему заказу) ──
  const drafts = safeParse<Record<string, Json>>(keys, LEGACY_KEYS.tableDrafts, {}, errors)
  const draftsLinked: ParseReport['draftsLinked'] = []
  let draftsImported = 0
  if (drafts && typeof drafts === 'object') {
    for (const [key, d] of Object.entries(drafts)) {
      const items = normalizeItems(d?.items)
      if (items.length === 0) continue
      if (str(d.activeOrderId)) { draftsLinked.push({ key, activeOrderId: d.activeOrderId, items: items.length }); continue }
      const m = /^table_(.+)$/.exec(key)
      const subtotal = items.reduce((s, i) => s + roundUZS(i.price * i.qty), 0)
      const pct = int(d.discountPercent) ?? 0
      const discount = Math.min(subtotal, Math.max(roundUZS((subtotal * pct) / 100), roundUZS(num(d.customDiscount) ?? 0)))
      orders.push({
        id: await uuidv5(`cf:draft:${key}:${JSON.stringify(items)}`),
        legacyId: `draft:${key}:${items.length}:${subtotal}`,
        number: 'Черновик',
        type: m ? 'dine_in' : key === 'delivery' ? 'delivery' : 'takeaway',
        tableId: m ? m[1] : null,
        customerPhone: str(d.customerPhone),
        deliveryAddress: str(d.deliveryAddress),
        items, subtotal, discountPercent: pct, discountAmount: discount, deliveryFee: 0,
        total: subtotal - discount,
        status: 'open', paymentStatus: 'unpaid', paymentMethod: null,
        createdAt: now.toISOString(), deviceId: opts.deviceId, dataQuality: ['legacy_draft'],
      })
      flags.legacy_draft = (flags.legacy_draft ?? 0) + 1
      draftsImported++
    }
  }

  // ── Меню: menu.json + overrides + custom − deleted (то, что кассир видит на устройстве) ──
  const overrides = safeParse<Record<string, Json>>(keys, LEGACY_KEYS.menuOverrides, {}, errors)
  const custom = safeParse<Json[]>(keys, LEGACY_KEYS.customItems, [], errors)
  const deleted = safeParse<string[]>(keys, LEGACY_KEYS.deletedItems, [], errors)
  // очередь меню v1 не импортируем (правки уже отражены в overrides), но проверяем целостность
  safeParse<Json>(keys, LEGACY_KEYS.outboxMenu, null, errors)
  const deletedSet = new Set(Array.isArray(deleted) ? deleted.map(String) : [])
  const menu: LegacyMenuPayload[] = []
  const toPayload = (it: Record<string, Json>, categoryId: string | null, sort: number): LegacyMenuPayload => ({
    id: String(it.id),
    categoryId,
    nameRu: loc(it.name, 'ru') ?? String(it.id),
    nameUz: loc(it.name, 'uz'),
    nameEn: loc(it.name, 'en'),
    descriptionRu: loc(it.description, 'ru'),
    price: roundUZS(num(it.price) ?? 0),
    imageUrl: str(it.image) ?? str(it.image_url),
    available: typeof it.available === 'boolean' ? it.available : true,
    weight: num(it.weight) === null ? null : Math.round(num(it.weight)!),
    kcal: (() => { const k = num(it.kcal) ?? num(it.calories); return k === null ? null : Math.round(k) })(),
    sortOrder: sort,
    isKitchen: isKitchenItem({ id: String(it.id), name: loc(it.name, 'ru') ?? '', category: categoryId ?? '' }),
    isDeleted: false,
    needsReview: false,
  })
  const seen = new Set<string>()
  let sort = 0
  for (const cat of opts.baseMenu?.categories ?? []) {
    for (const it of cat.items) {
      sort++
      const ov = overrides && typeof overrides === 'object' ? overrides[it.id] : undefined
      const merged = ov && typeof ov === 'object' ? { ...it, ...ov } : it
      const p = toPayload(merged, cat.id, sort)
      p.categoryTitle = loc(cat.title, 'ru')
      if (deletedSet.has(p.id)) p.isDeleted = true
      menu.push(p)
      seen.add(p.id)
    }
  }
  if (Array.isArray(custom)) {
    for (const c of custom) {
      if (!c?.item?.id || seen.has(String(c.item.id))) continue
      sort++
      const p = toPayload(c.item, str(c.categoryId), sort)
      if (deletedSet.has(p.id)) p.isDeleted = true
      menu.push(p)
      seen.add(p.id)
    }
  }
  // overrides для позиций, которых нет в menu.json (например, созданных из БД) — применяем частично
  if (overrides && typeof overrides === 'object') {
    for (const [id, ov] of Object.entries(overrides)) {
      if (seen.has(id) || !ov || typeof ov !== 'object') continue
      const p: LegacyMenuPayload = { id }
      if (num(ov.price) !== null) p.price = roundUZS(num(ov.price)!)
      if (typeof ov.available === 'boolean') p.available = ov.available
      if (loc(ov.name, 'ru')) p.nameRu = loc(ov.name, 'ru')
      if (deletedSet.has(id)) p.isDeleted = true
      menu.push(p)
      seen.add(id)
    }
  }
  for (const id of deletedSet) if (!seen.has(id)) menu.push({ id, isDeleted: true })

  const days = Object.keys(byDay).sort()
  return {
    orders,
    shifts: [...shiftById.values()],
    menu,
    report: {
      ordersTotal: orders.length,
      ordersFromMainKey: main.length,
      ordersOnlyInOutbox,
      mainKeyAtCap: main.length >= 500,
      shifts: shiftById.size,
      menuItems: menu.filter((m) => !m.isDeleted).length,
      menuDeleted: menu.filter((m) => m.isDeleted).length,
      draftsImported,
      draftsLinked,
      dateFrom: days[0] ?? null,
      dateTo: days[days.length - 1] ?? null,
      byDay,
      revenueByDay,
      flags,
      errors,
    },
  }
}
