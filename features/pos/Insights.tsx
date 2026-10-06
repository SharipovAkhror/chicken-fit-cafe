'use client'
/**
 * Показатели «на сегодня» для экрана «Зал» и заказа (паттерны Toast/Square/Poster: полоса KPI, спарклайн, хиты дня,
 * загрузка зала, наличные/Click). Всё считается из локальных заказов (domain/metrics.ts); единственный запрос к серверу —
 * итог того же дня неделю назад (report_sales, раз в день на устройство, кэш в IndexedDB; без сети — просто не показываем).
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Banknote, CreditCard, Flame, Minus, Receipt, ShoppingBasket, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react'
import { addDays, dayOf, daySales, delta, floorOf, minuteOfDay, shiftSales, shortSum, type Sales, type TopItem } from '@/domain/metrics'
import { formatUZS } from '@/domain/money'
import type { Order, Shift } from '@/domain/order'
import { api, useRuntime } from '@/features/app/runtime'

/** Текущее время, обновляется раз в `ms` (таймеры столов, «на это время вчера»). */
export function useNow(ms = 30000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

const WEEKDAY = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу']
const LAST = ['прошлое', 'прошлый', 'прошлый', 'прошлую', 'прошлый', 'прошлую', 'прошлую']

/** Итог того же дня недели неделю назад (для подписи «в прошлый вторник за день»). */
function useLastWeek(day: string): { revenue: number; orders: number } | null {
  const { db, session } = useRuntime()
  const [v, setV] = useState<{ revenue: number; orders: number } | null>(null)
  useEffect(() => {
    if (!session) return
    let off = false
    const d7 = addDays(day, -7)
    const key = `kpi:week:${d7}`
    void (async () => {
      const cached = (await db.kv.get(key))?.value as { revenue: number; orders: number } | undefined
      if (cached) { if (!off) setV(cached); return }
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      try {
        const r = (await api.reportSales(session.token, d7, d7)) as { totals?: { revenue?: number; orders?: number } }
        const t = { revenue: Number(r?.totals?.revenue ?? 0), orders: Number(r?.totals?.orders ?? 0) }
        await db.kv.put({ key, value: t })
        if (!off) setV(t)
      } catch { /* нет прав или сети — подпись просто не показываем */ }
    })()
    return () => { off = true }
  }, [db, session, day])
  return v
}

export function Sparkline({ values, label }: { values: number[]; label?: string }) {
  const max = Math.max(1, ...values)
  const n = Math.max(2, values.length)
  const pts = values.map((v, i) => [(i / (n - 1)) * 100, 34 - (v / max) * 30] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg className="spark" viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label={label ?? 'Выручка по часам'}>
      <polygon points={`0,36 ${line} 100,36`} className="spark-area" />
      <polyline points={line} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function DeltaChip({ pct, what = 'чем вчера к этому времени' }: { pct: number | null; what?: string }) {
  if (pct === null) return <span className="delta" data-dir="flat"><Minus size={14} aria-hidden />нет данных</span>
  const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus
  return (
    <span className="delta" data-dir={dir} aria-label={`${dir === 'up' ? 'больше' : dir === 'down' ? 'меньше' : 'столько же'}, ${what}: ${Math.abs(pct)}%`}>
      <Icon size={14} aria-hidden />{Math.abs(pct)}%
    </span>
  )
}

function Ring({ pct }: { pct: number }) {
  const r = 22, c = 2 * Math.PI * r
  return (
    <svg className="occ-ring" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={r} className="occ-ring-bg" />
      {pct > 0 && <circle cx="28" cy="28" r={r} className="occ-ring-fg" strokeDasharray={`${(c * Math.min(100, pct)) / 100} ${c}`} transform="rotate(-90 28 28)" />}
      <text x="28" y="33" textAnchor="middle" className="occ-ring-text">{pct}%</text>
    </svg>
  )
}

/** Часы для графиков: с 8:00 (или первой продажи) до текущего часа. */
function hourRange(s: Sales, nowHour: number): [number, number] {
  const first = s.byHour.findIndex((v) => v > 0)
  const from = Math.min(8, first >= 0 ? first : 8)
  return [from, Math.max(from + 3, nowHour)]
}

export type DayKpi = { today: Sales; yesterday: Sales; day: string; nowHour: number }
export function useDayKpi(orders: Order[], now: number): DayKpi {
  return useMemo(() => {
    const iso = new Date(now).toISOString()
    const day = dayOf(iso)
    const minute = minuteOfDay(iso)
    return { day, nowHour: Math.floor(minute / 60), today: daySales(orders, day), yesterday: daySales(orders, addDays(day, -1), minute) }
  }, [orders, now])
}

export function KpiStrip({ orders, tableIds, shift, now, kpi }: { orders: Order[]; tableIds: string[]; shift: Shift | null | undefined; now: number; kpi: DayKpi }) {
  const { today: t, yesterday: y, day, nowHour } = kpi
  const floor = useMemo(() => floorOf(orders, tableIds, now), [orders, tableIds, now])
  const sh = useMemo(() => shiftSales(orders, shift?.id), [orders, shift?.id])
  const week = useLastWeek(day)
  const wd = new Date(`${addDays(day, -7)}T12:00:00Z`).getUTCDay()
  const [from, to] = hourRange(t, nowHour)
  const spark = t.byHour.slice(from, to + 1)
  const cashPct = t.revenue ? Math.round((t.cash / t.revenue) * 100) : 0
  return (
    <section className="kpis" aria-label="Показатели за сегодня">
      <article className="kpi kpi-hero">
        <header className="kpi-head"><span className="kpi-ico"><TrendingUp size={18} aria-hidden /></span>Выручка сегодня</header>
        <div className="kpi-value" data-testid="kpi-revenue">{formatUZS(t.revenue)}<small> сум</small></div>
        <div className="kpi-foot">
          {t.revenue || y.revenue ? <><DeltaChip pct={delta(t.revenue, y.revenue)} /><span>к вчера на это время</span></> : <span><Sparkles size={14} aria-hidden /> Первая продажа ещё впереди</span>}
        </div>
        <Sparkline values={spark.length > 1 ? spark : [0, 0]} label={`Выручка по часам с ${from}:00`} />
        {week && week.revenue > 0 && <div className="kpi-note">{LAST[wd]} {WEEKDAY[wd]} за весь день: {shortSum(week.revenue)}</div>}
      </article>
      <article className="kpi">
        <header className="kpi-head"><span className="kpi-ico" data-tone="info"><Receipt size={18} aria-hidden /></span>Чеков</header>
        <div className="kpi-value">{t.orders}</div>
        <div className="kpi-foot"><DeltaChip pct={delta(t.orders, y.orders)} /><span>вчера {y.orders}</span></div>
        <div className="kpi-note">зал {t.byType.dine_in} · с собой {t.byType.takeaway} · доставка {t.byType.delivery}</div>
      </article>
      <article className="kpi">
        <header className="kpi-head"><span className="kpi-ico" data-tone="accent"><ShoppingBasket size={18} aria-hidden /></span>Средний чек</header>
        <div className="kpi-value">{formatUZS(t.avg)}<small> сум</small></div>
        <div className="kpi-foot"><DeltaChip pct={delta(t.avg, y.avg)} /><span>вчера {shortSum(y.avg)}</span></div>
      </article>
      <article className="kpi kpi-row">
        <Ring pct={floor.occupancy} />
        <div className="min-w-0">
          <header className="kpi-head"><span className="kpi-ico" data-tone="brand"><Users size={18} aria-hidden /></span>Зал сейчас</header>
          <div className="kpi-value kpi-value-sm">{floor.busy} из {floor.tables} <small>столов</small></div>
          <div className="kpi-note">{floor.openSum ? `в открытых чеках ${shortSum(floor.openSum)}` : 'все столы свободны'}</div>
        </div>
      </article>
      <article className="kpi">
        <header className="kpi-head"><span className="kpi-ico" data-tone="success"><Banknote size={18} aria-hidden /></span>Наличные / Click</header>
        <div className="split" role="img" aria-label={`Наличные ${cashPct}%, Click/Payme ${t.revenue ? 100 - cashPct : 0}%`}>
          <i style={{ width: `${t.revenue ? cashPct : 50}%` }} data-empty={!t.revenue || undefined} /><b style={{ width: `${t.revenue ? 100 - cashPct : 50}%` }} data-empty={!t.revenue || undefined} />
        </div>
        <div className="split-legend">
          <span><Banknote size={14} aria-hidden />{shortSum(t.cash)}</span>
          <span><CreditCard size={14} aria-hidden />{shortSum(t.card)}</span>
        </div>
      </article>
      <article className="kpi">
        <header className="kpi-head"><span className="kpi-ico" data-tone="warning"><Wallet size={18} aria-hidden /></span>{shift ? `Смена${shift.number ? ` №${shift.number}` : ''}` : 'Смена'}</header>
        {shift ? (
          <>
            <div className="kpi-value kpi-value-sm">{formatUZS(sh.revenue)}<small> сум</small></div>
            <div className="kpi-note">с {new Date(shift.openedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Samarkand' })} · {sh.orders} чек.</div>
          </>
        ) : <div className="kpi-note kpi-note-warn">Смена не открыта — откройте её в разделе «Смена»</div>}
      </article>
    </section>
  )
}

/** Хиты дня: топ-5 блюд с полосками; onPick — добавить в заказ одним нажатием. */
export function TopDishes({ top, onPick, title = 'Хиты сегодня', compact = false }: { top: TopItem[]; onPick?: (t: TopItem) => void; title?: string; compact?: boolean }) {
  const max = Math.max(1, ...top.map((t) => t.qty))
  return (
    <section className={`panel side-card${compact ? ' side-card-compact' : ''}`} aria-label={title}>
      <h2 className="side-title"><Flame size={18} aria-hidden />{title}</h2>
      {top.length === 0 ? (
        <div className="side-empty"><span className="empty-ico"><Flame size={22} aria-hidden /></span>Хиты появятся после первых продаж</div>
      ) : (
        <ol className="top-list">
          {top.map((t, i) => {
            const body = (
              <>
                <span className="top-rank" data-first={i === 0 || undefined}>{i + 1}</span>
                <span className="top-main">
                  <span className="top-name">{t.name}</span>
                  <span className="top-bar"><i style={{ width: `${Math.max(6, (t.qty / max) * 100)}%` }} /></span>
                </span>
                <span className="top-qty">{t.qty}<small> шт</small></span>
              </>
            )
            return <li key={t.id + t.name}>{onPick ? <button type="button" className="top-row" onClick={() => onPick(t)} aria-label={`Добавить: ${t.name} (сегодня ${t.qty} шт)`}>{body}</button> : <div className="top-row">{body}</div>}</li>
          })}
        </ol>
      )}
    </section>
  )
}

/** Выручка по часам — столбики (текущий час подсвечен). */
export function HourChart({ kpi }: { kpi: DayKpi }) {
  const [from, to] = hourRange(kpi.today, kpi.nowHour)
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const max = Math.max(1, ...hours.map((h) => kpi.today.byHour[h]))
  const best = hours.reduce((b, h) => (kpi.today.byHour[h] > kpi.today.byHour[b] ? h : b), hours[0])
  return (
    <section className="panel side-card" aria-label="Выручка по часам">
      <h2 className="side-title"><TrendingUp size={18} aria-hidden />По часам</h2>
      <div className="hours" role="img" aria-label={kpi.today.revenue ? `Больше всего продаж в ${best}:00 — ${formatUZS(kpi.today.byHour[best])} сум` : 'Продаж пока нет'}>
        {hours.map((h) => (
          <span key={h} className="hour" data-now={h === kpi.nowHour || undefined} title={`${h}:00 — ${formatUZS(kpi.today.byHour[h])} сум`}>
            <i style={{ height: `${Math.max(4, (kpi.today.byHour[h] / max) * 100)}%` }} data-zero={!kpi.today.byHour[h] || undefined} />
            <small>{h % 2 === 0 || hours.length <= 8 ? h : ''}</small>
          </span>
        ))}
      </div>
      <p className="side-note">{kpi.today.revenue ? `Пик: ${best}:00–${best + 1}:00 · ${shortSum(kpi.today.byHour[best])}` : 'Продаж пока нет — график заполнится сам'}</p>
    </section>
  )
}
