'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatUZS } from '@/domain/money'
import { localShiftSummary, type Shift, type ShiftSummary } from '@/domain/order'
import { useRuntime, api } from '@/features/app/runtime'
import { closeShift, openShift } from './actions'
import { Money, Numpad } from './common'
import { printJob } from './print'
import { useOpenShift } from './useData'

async function summary(db: ReturnType<typeof useRuntime>['db'], token: string | undefined, s: Shift): Promise<{ s: ShiftSummary; local: boolean }> {
  const pending = await db.outbox.count()
  if (token && pending === 0 && navigator.onLine) {
    try {
      return { s: (await api.reportShift(token, s.id)) as unknown as ShiftSummary, local: false }
    } catch { /* резерв ниже */ }
  }
  return { s: localShiftSummary(s, await db.orders.toArray()), local: true }
}

export function ShiftView() {
  const { db, session, deviceId } = useRuntime()
  const shift = useOpenShift()
  const [cash, setCash] = useState('')
  const [rep, setRep] = useState<{ s: ShiftSummary; local: boolean } | null>(null)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState('')
  const last = useLiveQuery(() => db.shifts.where('status').equals('closed').reverse().sortBy('openedAt'), [db])

  if (shift === undefined) return null
  if (!shift)
    return (
      <div className="page grid gap-4" style={{ maxWidth: 420 }}>
        <h2 className="text-2xl font-bold">Открыть смену</h2>
        <p className="muted">Размен в кассе на начало смены</p>
        <div className="text-3xl font-bold">{formatUZS(Number(cash || 0))} сум</div>
        <Numpad value={cash} onChange={setCash} presets={[0, 50000, 100000, 200000]} />
        <button className="btn btn-lg btn-primary" onClick={() => openShift(db, session!.staff.name, Number(cash || 0), deviceId!)}>Открыть смену</button>
        {last?.[0]?.zSnapshot && (
          <button className="btn" onClick={() => printJob({ kind: 'shift', type: 'Z', summary: last[0].zSnapshot! })}>Повторить печать последнего Z-отчёта</button>
        )}
      </div>
    )

  const x = async () => setRep(await summary(db, session?.token, shift))
  return (
    <div className="page grid gap-4" style={{ maxWidth: 640 }}>
      <h2 className="text-2xl font-bold">Смена{shift.number ? ` №${shift.number}` : ''} · {shift.cashierName}</h2>
      <p className="muted">Открыта {new Date(shift.openedAt).toLocaleString('ru-RU', { timeZone: 'Asia/Samarkand' })} · размен {formatUZS(shift.initialCash)} сум</p>
      {shift.source === 'legacy_rescue' && <div className="banner banner-warn">Эта смена открыта в старой версии кассы. Закройте её и откройте новую.</div>}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-lg" onClick={x}>X-отчёт</button>
        <button className="btn btn-lg btn-danger" onClick={async () => { await x(); setClosing(true) }}>Закрыть смену (Z)</button>
      </div>
      {rep && (
        <div className="panel p-4 grid gap-1">
          {rep.local && <div className="banner banner-warn mb-2">Посчитано локально (нет связи или есть неотправленные изменения). Финальные цифры — на сервере.</div>}
          <Line l="Заказов" r={String(rep.s.orders_count)} />
          <Line l="Выручка" r={<Money v={rep.s.total_revenue} className="font-bold" />} />
          <Line l="Наличные" r={formatUZS(rep.s.cash_revenue)} />
          <Line l="Click / Payme" r={formatUZS(rep.s.click_revenue)} />
          <Line l="Скидки" r={formatUZS(rep.s.discount_total)} />
          <Line l="Ожидается в кассе" r={<strong>{formatUZS(rep.s.expected_cash)}</strong>} />
          {rep.s.unpaid_open_count > 0 && <div className="banner banner-warn mt-2">Неоплаченных заказов: {rep.s.unpaid_open_count}</div>}
          {!closing && <button className="btn mt-2" onClick={() => printJob({ kind: 'shift', type: 'X', summary: rep.s })}>Печать X-отчёта</button>}
        </div>
      )}
      {closing && rep && (
        <div className="panel p-4 grid gap-3">
          <h3 className="text-xl font-bold">Пересчитайте наличные в кассе</h3>
          <div className="text-3xl font-bold">{formatUZS(Number(cash || 0))} сум</div>
          {cash && <div style={{ color: Number(cash) === rep.s.expected_cash ? 'var(--success)' : 'var(--warning)' }}>Расхождение: {formatUZS(Number(cash) - rep.s.expected_cash)} сум</div>}
          <Numpad value={cash} onChange={setCash} />
          <input className="input" placeholder="Комментарий (необязательно)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="btn btn-lg btn-primary" disabled={!cash} onClick={async () => {
            const closed = await closeShift(db, shift, Number(cash), notes)
            const s = { ...rep.s, counted_cash: Number(cash), closed_at: closed.closedAt }
            printJob({ kind: 'shift', type: 'Z', summary: s })
            setClosing(false); setRep(null); setCash('')
          }}>Закрыть смену и печатать Z</button>
        </div>
      )}
    </div>
  )
}

function Line({ l, r }: { l: string; r: React.ReactNode }) {
  return <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}><span>{l}</span><span>{r}</span></div>
}
