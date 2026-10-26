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

const STEPS = ['Пересчёт', 'Расхождение', 'Z-отчёт', 'Выход'] as const

function Steps({ at }: { at: number }) {
  return (
    <ol className="flex gap-2 flex-wrap text-sm" aria-label="Шаги закрытия смены">
      {STEPS.map((l, i) => (
        <li key={l} className={`chip ${i === at ? 'chip-ok' : ''}`} aria-current={i === at ? 'step' : undefined} style={{ opacity: i > at ? 0.5 : 1 }}>{i + 1}. {l}</li>
      ))}
    </ol>
  )
}

export function ShiftView() {
  const { db, session, deviceId, logout } = useRuntime()
  const [step, setStep] = useState(0)
  const [lastZ, setLastZ] = useState<ShiftSummary | null>(null)
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
        {lastZ ? (
          <div className="panel p-4 grid gap-3">
            <Steps at={3} />
            <h3 className="text-xl font-bold">Смена закрыта, Z-отчёт отправлен на печать</h3>
            <button className="btn" onClick={() => printJob({ kind: 'shift', type: 'Z', summary: lastZ })}>Повторить печать Z</button>
            <button className="btn btn-lg btn-primary" onClick={() => { setLastZ(null); void logout() }}>Выйти из кассы</button>
            <button className="btn" onClick={() => setLastZ(null)}>Остаться и открыть новую смену</button>
          </div>
        ) : null}
        <h2 className="text-2xl font-bold">Открыть смену</h2>
        <p className="muted">Чтобы начать принимать заказы, откройте смену. Введите размен в кассе на начало смены.</p>
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
        <button className="btn btn-lg btn-danger" onClick={async () => { await x(); setCash(''); setStep(0); setClosing(true) }}>Закрыть смену (Z)</button>
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
          <Steps at={step} />
          {step === 0 && (<>
            <h3 className="text-xl font-bold">Пересчитайте наличные в кассе</h3>
            <p className="muted">Посчитайте все купюры в ящике и введите сумму. Ожидаемую сумму покажем на следующем шаге.</p>
            <div className="text-3xl font-bold">{formatUZS(Number(cash || 0))} сум</div>
            <Numpad value={cash} onChange={setCash} />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-lg" onClick={() => { setClosing(false); setCash('') }}>Отмена</button>
              <button className="btn btn-lg btn-primary" disabled={!cash} onClick={() => setStep(1)}>Дальше</button>
            </div>
          </>)}
          {step === 1 && (() => {
            const diff = Number(cash) - rep.s.expected_cash
            return (<>
              <h3 className="text-xl font-bold">Сверка кассы</h3>
              <Line l="Ожидается в кассе" r={formatUZS(rep.s.expected_cash)} />
              <Line l="Посчитано" r={formatUZS(Number(cash))} />
              <div className="text-2xl font-bold" style={{ color: diff === 0 ? 'var(--success)' : 'var(--warning)' }}>
                {diff === 0 ? 'Сходится' : `${diff > 0 ? 'Излишек' : 'Недостача'}: ${formatUZS(Math.abs(diff))} сум`}
              </div>
              {rep.s.unpaid_open_count > 0 && <div className="banner banner-warn">Неоплаченных заказов: {rep.s.unpaid_open_count}. Лучше закрыть их до Z.</div>}
              <input className="input" placeholder={diff === 0 ? 'Комментарий (необязательно)' : 'Почему расхождение? (желательно)'} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-lg" onClick={() => setStep(0)}>Пересчитать</button>
                <button className="btn btn-lg btn-primary" onClick={() => setStep(2)}>Дальше</button>
              </div>
            </>)
          })()}
          {step === 2 && (<>
            <h3 className="text-xl font-bold">Закрыть смену и напечатать Z-отчёт</h3>
            <p className="muted">После закрытия заказы этой смены менять нельзя. Z-отчёт уйдёт на принтер.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-lg" onClick={() => setStep(1)}>Назад</button>
              <button className="btn btn-lg btn-danger" onClick={async () => {
                const closed = await closeShift(db, shift, Number(cash), notes)
                const s = { ...rep.s, counted_cash: Number(cash), closed_at: closed.closedAt }
                printJob({ kind: 'shift', type: 'Z', summary: s })
                setLastZ(s); setClosing(false); setRep(null); setCash(''); setNotes(''); setStep(0)
              }}>Закрыть смену и печатать Z</button>
            </div>
          </>)}
        </div>
      )}
    </div>
  )
}

function Line({ l, r }: { l: string; r: React.ReactNode }) {
  return <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}><span>{l}</span><span>{r}</span></div>
}
