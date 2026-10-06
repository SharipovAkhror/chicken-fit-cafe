/**
 * Показатели для экрана «Зал» и заказа (как дашборды Toast/Square/Poster): выручка, чеки, средний чек, наличные/Click,
 * выручка по часам, хиты дня, загрузка зала, сравнение со вчера на это же время. Чистые функции над локальными
 * заказами (IndexedDB, последние 3 дня — столько касса уже держит для работы): ни одного лишнего запроса к серверу.
 * День — календарный по Самарканду (UTC+5), как business_date на сервере.
 */
import { baseName, lineTotal } from './cart'
import { isActive, type Order } from './order'

const TZ_MS = 5 * 3600_000
const local = (iso: string) => new Date(Date.parse(iso) + TZ_MS)
/** Дата «ГГГГ-ММ-ДД» по Самарканду. */
export const dayOf = (iso: string): string => local(iso).toISOString().slice(0, 10)
export const hourOf = (iso: string): number => local(iso).getUTCHours()
export const minuteOfDay = (iso: string): number => { const d = local(iso); return d.getUTCHours() * 60 + d.getUTCMinutes() }
export const addDays = (day: string, n: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)

/** Продажа = оплаченный и не отменённый заказ с временем оплаты. */
export const isSale = (o: Order): boolean => o.paymentStatus === 'paid' && o.status !== 'cancelled' && !!o.paidAt

export type TopItem = { id: string; name: string; qty: number; revenue: number }
export type Sales = {
  revenue: number; orders: number; avg: number; cash: number; card: number
  byType: { dine_in: number; takeaway: number; delivery: number }
  /** выручка по часам 0…23 */
  byHour: number[]
  top: TopItem[]
}

/** Название для «хитов»: без граммов у весовых и без состава микса («Гарнир (Порция): Пюре + Рис» → «Гарнир (Порция)»). */
const topName = (name: string, weightKg?: number) => baseName({ name, weightKg }).split(':')[0].trim()

export function salesOf(orders: Order[], topN = 5): Sales {
  const s: Sales = { revenue: 0, orders: 0, avg: 0, cash: 0, card: 0, byType: { dine_in: 0, takeaway: 0, delivery: 0 }, byHour: Array(24).fill(0), top: [] }
  const top = new Map<string, TopItem>()
  for (const o of orders) {
    s.revenue += o.total
    s.orders++
    if (o.paymentMethod === 'click_payme') s.card += o.total
    else s.cash += o.total
    s.byType[o.type] = (s.byType[o.type] ?? 0) + 1
    if (o.paidAt) s.byHour[hourOf(o.paidAt)] += o.total
    for (const it of o.items) {
      const key = it.id.startsWith('side-portion-') ? it.id : it.id || it.name
      const t = top.get(key) ?? { id: it.id, name: topName(it.name, it.weightKg), qty: 0, revenue: 0 }
      t.qty += it.weightKg ? 1 : it.qty
      t.revenue += lineTotal(it)
      top.set(key, t)
    }
  }
  s.avg = s.orders ? Math.round(s.revenue / s.orders) : 0
  s.top = [...top.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, topN)
  return s
}

/** Продажи за день (по времени оплаты); untilMinute — только до этой минуты дня (для честного сравнения со вчера). */
export function daySales(orders: Order[], day: string, untilMinute = 24 * 60, topN = 5): Sales {
  return salesOf(orders.filter((o) => isSale(o) && dayOf(o.paidAt!) === day && minuteOfDay(o.paidAt!) < untilMinute), topN)
}

/** Продажи смены. */
export const shiftSales = (orders: Order[], shiftId: string | null | undefined): Sales =>
  salesOf(shiftId ? orders.filter((o) => isSale(o) && o.shiftId === shiftId) : [])

/** Изменение в процентах (null — не с чем сравнить). */
export const delta = (now: number, prev: number): number | null => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : null)

export type Floor = { tables: number; busy: number; billed: number; free: number; occupancy: number; openSum: number; openChecks: number; longestMin: number }
/** Загрузка зала сейчас: занятые столы (в т.ч. «счёт выдан»), сумма открытых чеков, самый долгий стол. */
export function floorOf(orders: Order[], tableIds: string[], nowMs: number): Floor {
  const open = orders.filter(isActive)
  const ids = new Set(tableIds)
  const byTable = new Map<string, Order[]>()
  for (const o of open) if (o.type === 'dine_in' && o.tableId && ids.has(o.tableId)) byTable.set(o.tableId, [...(byTable.get(o.tableId) ?? []), o])
  let billed = 0, longest = 0
  for (const os of byTable.values()) {
    if (os.some((o) => o.precheckAt)) billed++
    for (const o of os) longest = Math.max(longest, Math.floor((nowMs - Date.parse(o.createdAt)) / 60000))
  }
  const busy = byTable.size
  return {
    tables: ids.size, busy, billed, free: Math.max(0, ids.size - busy),
    occupancy: ids.size ? Math.round((busy / ids.size) * 100) : 0,
    openSum: open.reduce((s, o) => s + o.total, 0), openChecks: open.filter((o) => o.items.length > 0).length, longestMin: Math.max(0, longest),
  }
}

/** Цвет таймера стола (Toast/Lightspeed): до 30 мин — спокойно, 30–60 — внимание, от 60 — долго. */
export type TimerTone = 'ok' | 'warn' | 'late'
export const timerTone = (min: number): TimerTone => (min < 30 ? 'ok' : min < 60 ? 'warn' : 'late')
/** Заполнение полоски времени: 90 минут — полная. */
export const timerProgress = (min: number): number => Math.max(0.04, Math.min(1, min / 90))

/** «1 ч 05 мин» / «12 мин». */
export const durationLabel = (min: number): string => (min >= 60 ? `${Math.floor(min / 60)} ч ${String(min % 60).padStart(2, '0')} мин` : `${min} мин`)

/** Короткая сумма для плиток: 4 912 000 → «4,9 млн», 254 000 → «254 тыс». */
export function shortSum(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace('.', ',').replace(',0', '')} млн`
  if (a >= 10_000) return `${Math.round(n / 1000)} тыс`
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
