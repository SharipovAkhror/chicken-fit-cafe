'use client'
import { useEffect, useState } from 'react'
import { formatUZS } from '@/domain/money'
import { useRuntime, api } from '@/features/app/runtime'

type Sales = {
  totals: { orders: number; revenue: number; cash: number; click: number; discounts: number; cancelled: number; unpaid_open: number }
  by_day: Array<{ day: string; orders: number; revenue: number; cash: number | null; click: number | null; legacy_orders: number; flagged_orders: number }>
  by_item: Array<{ name: string; qty: number; gross: number; net: number }>
  by_cashier: Array<{ cashier: string; orders: number; revenue: number }>
  quality: { legacy_orders: number; flagged_orders: number; flags: Record<string, number>; unknown_cashier: number; earliest_legacy_day: string | null; earliest_any_day: string | null }
}
const today = () => new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10)
const shift = (d: string, days: number) => new Date(Date.parse(d) + days * 86400_000).toISOString().slice(0, 10)
const FLAG: Record<string, string> = {
  outbox_snapshot: 'восстановлены из очереди старой версии (состояние на момент создания)',
  shift_inferred: 'смена определена по времени', payment_inferred: 'факт оплаты определён косвенно',
  cashier_unknown: 'кассир неизвестен', kitchen_status_stale: 'кухонный статус не был закрыт', legacy_draft: 'черновик стола',
  payment_method_inferred: 'способ оплаты не записан (считается наличными)', unpaid_stale: 'старый неоплаченный заказ',
}

export function ReportsView() {
  const { session } = useRuntime()
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [data, setData] = useState<Sales | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (!session) return
    api.reportSales(session.token, from, to).then((d) => { setErr(null); setData(d as unknown as Sales) }).catch((e) => setErr(navigator.onLine ? e.message : 'Отчёты доступны только при наличии интернета'))
  }, [session, from, to])
  const preset = (a: string, b: string) => { setFrom(a); setTo(b) }
  return (
    <div className="page grid gap-4">
      <div className="flex flex-wrap gap-2 items-center">
        <button className="btn" onClick={() => preset(today(), today())}>Сегодня</button>
        <button className="btn" onClick={() => preset(shift(today(), -1), shift(today(), -1))}>Вчера</button>
        <button className="btn" onClick={() => preset(shift(today(), -6), today())}>7 дней</button>
        <button className="btn" onClick={() => preset(today().slice(0, 8) + '01', today())}>Месяц</button>
        <input type="date" className="input" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="С" />
        <input type="date" className="input" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="По" />
      </div>
      {err && <div className="banner banner-danger">{err}</div>}
      {data && (
        <>
          {data.quality.earliest_any_day && from < data.quality.earliest_any_day && (
            <div className="banner banner-warn">Данных раньше {data.quality.earliest_any_day} нет: старая версия кассы хранила историю только на устройстве.</div>
          )}
          {data.quality.flagged_orders > 0 && (
            <div className="banner banner-warn">
              {data.quality.flagged_orders} заказ(ов) перенесены из старой версии с пометками:{' '}
              {Object.entries(data.quality.flags).map(([f, n]) => `${FLAG[f] ?? f} — ${n}`).join('; ')}
            </div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
            {[['Выручка', data.totals.revenue], ['Наличные', data.totals.cash], ['Click / Payme', data.totals.click], ['Скидки', data.totals.discounts]].map(([l, v]) => (
              <div key={l as string} className="panel p-3"><div className="muted text-sm">{l}</div><div className="text-2xl font-bold">{formatUZS(v as number)}</div></div>
            ))}
            <div className="panel p-3"><div className="muted text-sm">Заказов</div><div className="text-2xl font-bold">{data.totals.orders}</div>
              <div className="text-sm muted">отмен {data.totals.cancelled} · не оплачено {data.totals.unpaid_open}</div></div>
          </div>
          <section className="panel p-3 overflow-auto">
            <h3 className="font-bold mb-2">По дням</h3>
            <table className="data"><thead><tr><th>День</th><th className="num">Заказов</th><th className="num">Выручка</th><th className="num">Наличные</th><th className="num">Click</th><th className="num">Из старой версии</th></tr></thead>
              <tbody>{data.by_day.map((d) => <tr key={d.day}><td>{d.day}</td><td className="num">{d.orders}</td><td className="num">{formatUZS(d.revenue)}</td><td className="num">{formatUZS(d.cash ?? 0)}</td><td className="num">{formatUZS(d.click ?? 0)}</td><td className="num">{d.legacy_orders || ''}</td></tr>)}</tbody></table>
          </section>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <section className="panel p-3 overflow-auto">
              <h3 className="font-bold mb-2">Блюда</h3>
              <table className="data"><thead><tr><th>Блюдо</th><th className="num">Кол-во</th><th className="num">Выручка (со скидкой)</th></tr></thead>
                <tbody>{data.by_item.slice(0, 50).map((i) => <tr key={i.name}><td>{i.name}</td><td className="num">{i.qty}</td><td className="num">{formatUZS(i.net)}</td></tr>)}</tbody></table>
            </section>
            <section className="panel p-3 overflow-auto">
              <h3 className="font-bold mb-2">Кассиры</h3>
              <table className="data"><thead><tr><th>Кассир</th><th className="num">Заказов</th><th className="num">Выручка</th></tr></thead>
                <tbody>{data.by_cashier.map((c) => <tr key={c.cashier}><td>{c.cashier}</td><td className="num">{c.orders}</td><td className="num">{formatUZS(c.revenue)}</td></tr>)}</tbody></table>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
