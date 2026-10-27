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

/** Подсказка размена: сколько оставили в кассе при закрытии прошлой смены (посчитано, иначе ожидалось). Кассир всё равно подтверждает нажатием. */
export function suggestOpeningCash(prev?: Shift): { amount: number; from?: string } {
  if (!prev) return { amount: 0 }
  if (prev.countedCash != null) return { amount: prev.countedCash, from: 'как при закрытии прошлой смены' }
  if (prev.zSnapshot?.expected_cash != null) return { amount: prev.zSnapshot.expected_cash, from: 'ожидалось при закрытии прошлой смены' }
  return { amount: prev.initialCash ?? 0, from: 'как в прошлой смене' }
}

export function ShiftView() {
  const { db, session, deviceId, logout } = useRuntime()
  const [editCount, setEditCount] = useState(false)
  const [lastZ, setLastZ] = useState<ShiftSummary | null>(null)
  const shift = useOpenShift()
  const [cash, setCash] = useState('')
  const [rep, setRep] = useState<{ s: ShiftSummary; local: boolean } | null>(null)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState('')
  const last = useLiveQuery(() => db.shifts.where('status').equals('closed').reverse().sortBy('openedAt'), [db])
  const [editing, setEditing] = useState(false)
  const suggested = suggestOpeningCash(last?.[0])
  const openAmount = editing ? Number(cash || 0) : suggested.amount

  if (shift === undefined) return null
  if (!shift)
    return (
      <div className="page grid gap-4" style={{ maxWidth: 420 }}>
        {lastZ ? (
          <div className="panel p-4 grid gap-3">
            
            <h3 className="text-xl font-bold">Смена закрыта, Z-отчёт отправлен на печать</h3>
            <button className="btn" onClick={() => printJob({ kind: 'shift', type: 'Z', summary: lastZ })}>Повторить печать Z</button>
            <button className="btn btn-lg btn-primary" onClick={() => { setLastZ(null); void logout() }}>Выйти из кассы</button>
            <button className="btn" onClick={() => setLastZ(null)}>Остаться и открыть новую смену</button>
          </div>
        ) : null}
        <h2 className="text-2xl font-bold">Начало дня</h2>
        <p className="muted">Проверьте размен в кассе. Если сумма верная — одно нажатие.</p>
        <div className="panel p-4 grid gap-1">
          <span className="muted">Размен на начало смены{suggested.from ? ` (${suggested.from})` : ''}</span>
          <div className="text-3xl font-bold" data-testid="open-cash">{formatUZS(openAmount)} сум</div>
        </div>
        {editing && <Numpad value={cash} onChange={setCash} presets={[0, 50000, 100000, 200000]} />}
        <button className="btn btn-lg btn-primary" style={{ minHeight: 64, fontSize: '1.25rem' }} onClick={() => openShift(db, session!.staff.name, openAmount, deviceId!)}>Открыть смену · {formatUZS(openAmount)} сум</button>
        {!editing && <button className="btn" onClick={() => { setCash(String(suggested.amount || '')); setEditing(true) }}>Изменить сумму</button>}
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
        <button className="btn btn-lg btn-danger" onClick={async () => { await x(); setCash(''); setEditCount(false); setClosing(true) }}>Закрыть смену (Z)</button>
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
          {(() => {
            const counted = cash === '' ? rep.s.expected_cash : Number(cash)
            const diff = counted - rep.s.expected_cash
            return (<>
              <h3 className="text-xl font-bold">Пересчитайте наличные в кассе</h3>
              <Line l="Ожидается в кассе" r={<strong>{formatUZS(rep.s.expected_cash)}</strong>} />
              <div className="muted">Посчитано (если совпадает — ничего не вводите):</div>
              <div className="text-3xl font-bold" data-testid="counted-cash">{formatUZS(counted)} сум</div>
              {editCount
                ? <Numpad value={cash} onChange={setCash} />
                : <button className="btn" onClick={() => { setCash(String(rep.s.expected_cash)); setEditCount(true) }}>В кассе другая сумма</button>}
              <div className="text-xl font-bold" style={{ color: diff === 0 ? 'var(--success)' : 'var(--warning)' }}>
                {diff === 0 ? 'Сходится' : `${diff > 0 ? 'Излишек' : 'Недостача'}: ${formatUZS(Math.abs(diff))} сум`}
              </div>
              {diff !== 0 && <input className="input" placeholder="Почему расхождение?" value={notes} onChange={(e) => setNotes(e.target.value)} />}
              {rep.s.unpaid_open_count > 0 && <div className="banner banner-warn">Неоплаченных заказов: {rep.s.unpaid_open_count}. Лучше закрыть их до Z.</div>}
              <p className="muted text-sm">После закрытия заказы этой смены менять нельзя.</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-lg" onClick={() => { setClosing(false); setCash(''); setEditCount(false) }}>Отмена</button>
                <button className="btn btn-lg btn-danger" onClick={async () => {
                  const closed = await closeShift(db, shift, counted, diff === 0 ? '' : notes)
                  const s = { ...rep.s, counted_cash: counted, closed_at: closed.closedAt }
                  printJob({ kind: 'shift', type: 'Z', summary: s })
                  setLastZ(s); setClosing(false); setRep(null); setCash(''); setNotes(''); setEditCount(false)
                }}>Закрыть смену и напечатать Z</button>
              </div>
            </>)
          })()}
        </div>
      )}
    </div>
  )
}

function Line({ l, r }: { l: string; r: React.ReactNode }) {
  return <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}><span>{l}</span><span>{r}</span></div>
}
