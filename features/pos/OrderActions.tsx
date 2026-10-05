'use client'
/**
 * Действия с заказом, требующие следа в аудите (как в Toast/Square «void» и «reopen»):
 *  — отмена: всегда с причиной; заказ, ушедший на кухню или по выданному счёту, кассир отменяет только с PIN админа;
 *  — возобновление оплаченного: только онлайн, в открытую смену, админ или кассир с PIN админа. Сервер сторнирует
 *    оплату (reopen_paid_*), при повторной оплате касса берёт только разницу — двойной оплаты не будет.
 */
import { useState } from 'react'
import { Ban, KeyRound, RotateCcw } from 'lucide-react'
import { useRuntime } from '@/features/app/runtime'
import { cashierCanCancel, type Order } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { managerApprove, reopenOrderOnline } from '@/data/online'
import { orderFromRow } from '@/data/mappers'
import { Modal, Numpad } from './common'
import { cancelOrder } from './actions'

const CANCEL_REASONS = ['Гость ушёл', 'Ошибка кассира', 'Нет продукта', 'Тестовый заказ']
const REOPEN_REASONS = ['Добавить позиции', 'Ошибка в оплате', 'Не тот способ оплаты']

const PIN_ERR: Record<string, string> = { invalid_pin: 'Неверный PIN администратора', too_many_attempts: 'Слишком много попыток, подождите 15 минут' }
const REOPEN_ERR: Record<string, string> = {
  shift_closed: 'Смена этого заказа уже закрыта — возобновить нельзя. Оформите новый заказ.',
  manager_required: 'Нужен PIN администратора', not_paid: 'Заказ уже не оплачен', not_found: 'Заказ не найден на сервере',
  forbidden: 'Недостаточно прав', reason_required: 'Укажите причину',
}

/** Шаг «PIN администратора»: одноразовое подтверждение на 15 минут для конкретного заказа. */
function AdminPin({ action, orderId, onApproved }: { action: 'cancel' | 'reopen'; orderId: string; onApproved: (id: string) => void }) {
  const { session } = useRuntime()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await managerApprove(session!.token, pin, action, orderId)
      if ('error' in r) { setErr(PIN_ERR[r.error] ?? r.error); setPin('') } else onApproved(r.approval_id)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <div className="grid gap-3">
      <div className="banner banner-info flex items-center gap-2"><KeyRound size={18} aria-hidden />Нужен PIN администратора</div>
      <div className="pin-dots" aria-label={`Введено цифр: ${pin.length}`}>{Array.from({ length: Math.max(4, pin.length) }, (_, i) => <i key={i} data-on={i < pin.length || undefined} />)}</div>
      <Numpad value={pin} onChange={(v) => setPin(v.slice(0, 8))} />
      {err && <p className="field-error" role="alert">{err}</p>}
      <button className="btn btn-lg btn-primary" disabled={pin.length < 4 || busy} onClick={submit}>Подтвердить</button>
    </div>
  )
}

function Reasons({ list, value, onChange }: { list: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <div className="flex flex-wrap gap-2">{list.map((x) => <button key={x} type="button" className="cat-chip" aria-pressed={value === x} onClick={() => onChange(x)}>{x}</button>)}</div>
      <input className="input" placeholder="Причина (обязательно)" maxLength={200} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Причина" />
    </>
  )
}

export function CancelOrderDialog({ order, initialReason = '', onClose, onDone }: { order: Order; initialReason?: string; onClose: () => void; onDone: () => void }) {
  const { db, session } = useRuntime()
  const [reason, setReason] = useState(initialReason)
  const [step, setStep] = useState<'reason' | 'pin'>('reason')
  const needPin = session?.staff.role !== 'admin' && !cashierCanCancel(order) && !!order.number
  const done = async (approvalId?: string) => { await cancelOrder(db, order, reason, { approvalId }); onDone() }
  return (
    <Modal title={order.number ? `Отменить заказ №${order.number}?` : 'Удалить черновик?'} onClose={onClose}>
      {step === 'reason' ? (
        <div className="grid gap-3">
          {order.items.length > 0 && <p className="muted">{order.items.length} поз. на {formatUZS(order.total)} сум. Отмена сохранится в журнале с причиной и вашим именем.</p>}
          <Reasons list={CANCEL_REASONS} value={reason} onChange={setReason} />
          {needPin && <p className="text-sm muted">Заказ уже на кухне или счёт выдан — понадобится PIN администратора.</p>}
          <button className="btn btn-lg btn-danger-solid" disabled={!reason.trim()} onClick={() => (needPin ? setStep('pin') : void done())}><Ban size={20} aria-hidden />Отменить заказ</button>
        </div>
      ) : <AdminPin action="cancel" orderId={order.id} onApproved={(id) => void done(id)} />}
    </Modal>
  )
}

export function ReopenOrderDialog({ order, onClose, onReopened }: { order: Order; onClose: () => void; onReopened: (o: Order) => void }) {
  const { db, session } = useRuntime()
  const [reason, setReason] = useState('')
  const [step, setStep] = useState<'reason' | 'pin'>('reason')
  const [err, setErr] = useState<string | null>(null)
  const isAdmin = session?.staff.role === 'admin'
  const run = async (approval: string | null) => {
    setErr(null)
    try {
      const r = await reopenOrderOnline(session!.token, order.id, reason.trim(), approval)
      if ('error' in r) { setErr(REOPEN_ERR[r.error] ?? r.error); setStep('reason'); return }
      const o = orderFromRow(r.order)
      await db.orders.put({ ...o, dirty: false })
      onReopened(o)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setStep('reason') }
  }
  return (
    <Modal title={`Возобновить заказ №${order.number}?`} onClose={onClose}>
      {step === 'reason' ? (
        <div className="grid gap-3">
          <p className="muted">Оплата {formatUZS(order.total)} сум будет сторнирована. При повторной оплате касса попросит только разницу. Действие попадёт в журнал.</p>
          <Reasons list={REOPEN_REASONS} value={reason} onChange={setReason} />
          {err && <p className="field-error" role="alert">{err}</p>}
          <button className="btn btn-lg btn-primary" disabled={!reason.trim()} onClick={() => (isAdmin ? void run(null) : setStep('pin'))}><RotateCcw size={20} aria-hidden />Возобновить</button>
          {!isAdmin && <p className="text-sm muted">Понадобится PIN администратора. Нужна связь с сервером.</p>}
        </div>
      ) : <AdminPin action="reopen" orderId={order.id} onApproved={(id) => void run(id)} />}
    </Modal>
  )
}
