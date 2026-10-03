'use client'
/** Печать чека/пречека/кухонного тикета/X-Z через window.print и @media print (58/80 мм). */
import { useEffect, useState } from 'react'
import { lineTotal } from '@/domain/cart'
import { formatUZS } from '@/domain/money'
import { PAYMENT_LABEL, TYPE_LABEL, type Order, type ShiftSummary } from '@/domain/order'

export type PrintJob =
  | { kind: 'receipt' | 'precheck' | 'kitchen'; order: Order; tableLabel?: string }
  | { kind: 'shift'; type: 'X' | 'Z'; summary: ShiftSummary }

type Paper = '58mm' | '80mm'
let setJobGlobal: ((j: PrintJob | null) => void) | null = null

export function printJob(job: PrintJob) {
  setJobGlobal?.(job)
}

export function getPaper(): Paper {
  if (typeof document === 'undefined') return '80mm'
  return (document.documentElement.dataset.paper as Paper) || '80mm'
}

const dt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Samarkand', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export function PrintArea({ paper }: { paper: Paper }) {
  const [job, setJob] = useState<PrintJob | null>(null)
  useEffect(() => {
    setJobGlobal = setJob
    return () => { setJobGlobal = null }
  }, [])
  useEffect(() => {
    if (!job) return
    const t = setTimeout(() => {
      window.print()
      setJob(null)
    }, 50)
    return () => clearTimeout(t)
  }, [job])
  if (!job) return <div id="v2-print" data-paper={paper} />
  return (
    <div id="v2-print" data-paper={paper}>
      {job.kind === 'shift' ? <ShiftSlip type={job.type} s={job.summary} /> : <OrderSlip job={job} />}
    </div>
  )
}

function Row({ l, r, b }: { l: string; r: string; b?: boolean }) {
  return <div className={`r-row${b ? ' r-b' : ''}`}><span>{l}</span><span>{r}</span></div>
}

function OrderSlip({ job }: { job: Extract<PrintJob, { order: Order }> }) {
  const o = job.order
  const kitchen = job.kind === 'kitchen'
  const items = kitchen ? o.items.filter((i) => i.isKitchen) : o.items
  return (
    <div>
      {!kitchen && <div className="r-c r-big">CHICKEN FIT</div>}
      {!kitchen && <div className="r-c">Самарканд</div>}
      <div className="r-c r-b">{kitchen ? 'КУХНЯ' : job.kind === 'precheck' ? 'ПРЕЧЕК (не оплачено)' : 'ЧЕК'}</div>
      <div className="r-hr" />
      <Row l={`Заказ №${o.number}`} r={TYPE_LABEL[o.type]} b />
      {o.tableId && <Row l="Стол" r={job.tableLabel ?? o.tableId} />}
      <Row l="Время" r={dt(job.kind === 'receipt' ? o.paidAt ?? o.createdAt : new Date().toISOString())} />
      {o.cashierName && <Row l="Кассир" r={o.cashierName} />}
      {o.customerPhone && <Row l="Телефон" r={o.customerPhone} />}
      {o.deliveryAddress && <div>Адрес: {o.deliveryAddress}</div>}
      <div className="r-hr" />
      {items.map((i, idx) => (
        <div key={idx} style={{ marginBottom: 2 }}>
          {kitchen ? (
            <div className="r-big">{i.qty} × {i.name}</div>
          ) : (
            <>
              <div>{i.name}</div>
              <Row l={`  ${i.weightKg ? `${i.weightKg} кг` : i.qty} × ${formatUZS(i.price)}`} r={formatUZS(lineTotal(i))} />
            </>
          )}
          {i.garnishMix?.length ? <div>  микс: {i.garnishMix.map((g) => `${g.ingredient} ${g.percent}%`).join(', ')}</div> : null}
          {i.notes && <div className="r-b">  ! {i.notes}</div>}
        </div>
      ))}
      {!kitchen && (
        <>
          <div className="r-hr" />
          <Row l="Подытог" r={formatUZS(o.subtotal)} />
          {o.discountAmount > 0 && <Row l={`Скидка${o.discountPercent ? ` ${o.discountPercent}%` : ''}`} r={`−${formatUZS(o.discountAmount)}`} />}
          {o.deliveryFee > 0 && <Row l="Доставка" r={formatUZS(o.deliveryFee)} />}
          <div className="r-row r-big"><span>ИТОГО</span><span>{formatUZS(o.total)} сум</span></div>
          {job.kind === 'receipt' && o.paymentMethod && <Row l="Оплата" r={PAYMENT_LABEL[o.paymentMethod]} />}
          {job.kind === 'receipt' && o.cashReceived ? <Row l="Получено" r={formatUZS(o.cashReceived)} /> : null}
          {job.kind === 'receipt' && o.changeAmount ? <Row l="Сдача" r={formatUZS(o.changeAmount)} /> : null}
          <div className="r-hr" />
          <div className="r-c">Спасибо! Приятного аппетита</div>
          <div className="r-c">chicken-fit-cafe.vercel.app</div>
        </>
      )}
    </div>
  )
}

function ShiftSlip({ type, s }: { type: 'X' | 'Z'; s: ShiftSummary }) {
  return (
    <div>
      <div className="r-c r-big">{type}-ОТЧЁТ</div>
      <div className="r-c">{type === 'Z' ? 'Закрытие смены' : 'Промежуточный'}</div>
      <div className="r-hr" />
      <Row l="Смена №" r={String(s.number ?? '—')} />
      <Row l="Кассир" r={s.cashier_name ?? '—'} />
      <Row l="Открыта" r={dt(s.opened_at)} />
      <Row l={type === 'Z' ? 'Закрыта' : 'Сейчас'} r={dt(s.closed_at ?? new Date().toISOString())} />
      <div className="r-hr" />
      <Row l="Заказов" r={String(s.orders_count)} />
      <Row l="Выручка" r={formatUZS(s.total_revenue)} b />
      <Row l="  Наличные" r={formatUZS(s.cash_revenue)} />
      <Row l="  Click/Payme" r={formatUZS(s.click_revenue)} />
      <Row l="Скидки" r={formatUZS(s.discount_total)} />
      <Row l="Отмен" r={String(s.cancelled_count)} />
      <div className="r-hr" />
      <Row l="Размен" r={formatUZS(s.initial_cash)} />
      <Row l="Ожидается в кассе" r={formatUZS(s.expected_cash)} b />
      {s.counted_cash != null && <Row l="Пересчитано" r={formatUZS(s.counted_cash)} />}
      {s.counted_cash != null && <Row l="Расхождение" r={formatUZS(s.counted_cash - s.expected_cash)} b />}
      <div className="r-hr" />
      {s.top_items?.slice(0, 10).map((t) => <Row key={t.name} l={`${t.qty} × ${t.name}`} r={formatUZS(t.revenue)} />)}
    </div>
  )
}
