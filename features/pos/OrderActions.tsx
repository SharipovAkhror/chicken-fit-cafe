'use client'
/**
 * Отмена и возобновление заказа — одно красное подтверждение, без PIN (решение владельца 06.10.2026).
 *  — отмена: причина необязательна (одно нажатие на готовый вариант), сервер пишет в журнал кто/когда/сумму (order_events);
 *  — возобновление оплаченного: только онлайн и в открытую смену заказа. Сервер сторнирует оплату (reopen_paid_*),
 *    при повторной оплате касса берёт только разницу — двойной оплаты не будет.
 */
import { useState } from 'react'
import { AlertTriangle, Ban, Loader2, RotateCcw } from 'lucide-react'
import { useRuntime } from '@/features/app/runtime'
import type { Order } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { reopenOrderOnline } from '@/data/online'
import { orderFromRow } from '@/data/mappers'
import { Modal } from './common'
import { cancelOrder } from './actions'

const CANCEL_REASONS = ['Гость ушёл', 'Ошибка кассира', 'Нет продукта', 'Тестовый заказ']
const REOPEN_REASONS = ['Добавить позиции', 'Ошибка в оплате', 'Не тот способ оплаты']
const REOPEN_ERR: Record<string, string> = {
  shift_closed: 'Смена этого заказа уже закрыта — возобновить нельзя. Оформите новый заказ.',
  not_paid: 'Заказ уже не оплачен', not_found: 'Заказ ещё не дошёл до сервера — подождите минуту', forbidden: 'Недостаточно прав',
}

/** Необязательная причина: одно нажатие (повторное — снять выбор). */
function Reasons({ list, value, onChange }: { list: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm muted">Причина — по желанию, одним нажатием:</span>
      <div className="flex flex-wrap gap-2">
        {list.map((x) => <button key={x} type="button" className="cat-chip" aria-pressed={value === x} onClick={() => onChange(value === x ? '' : x)}>{x}</button>)}
      </div>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return <div className="danger-note" role="alert"><AlertTriangle size={26} aria-hidden /><div>{children}</div></div>
}

export function CancelOrderDialog({ order, initialReason = '', onClose, onDone }: { order: Order; initialReason?: string; onClose: () => void; onDone: () => void }) {
  const { db } = useRuntime()
  const [reason, setReason] = useState(initialReason)
  const [busy, setBusy] = useState(false)
  const qty = order.items.reduce((s, i) => s + (i.weightKg ? 1 : i.qty), 0)
  const done = async () => { setBusy(true); await cancelOrder(db, order, reason); onDone() }
  return (
    <Modal title={order.number ? `Отменить заказ №${order.number}?` : 'Удалить черновик?'} onClose={onClose}>
      <div className="grid gap-4">
        <Warn>
          <b>{order.items.length ? `${qty} поз. на ${formatUZS(order.total)} сум` : 'Пустой заказ'}</b>
          <span className="block">{order.number ? 'Заказ закроется, стол освободится. Отмена запишется в журнал с вашим именем.' : 'Черновик не отправлялся — просто удалим его.'}</span>
        </Warn>
        {!!order.number && <Reasons list={CANCEL_REASONS} value={reason} onChange={setReason} />}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-lg" onClick={onClose}>Не отменять</button>
          <button className="btn btn-lg btn-danger-solid" disabled={busy} onClick={() => void done()}><Ban size={20} aria-hidden />Да, отменить</button>
        </div>
      </div>
    </Modal>
  )
}

export function ReopenOrderDialog({ order, onClose, onReopened }: { order: Order; onClose: () => void; onReopened: (o: Order) => void }) {
  const { db, session } = useRuntime()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const run = async () => {
    setErr(null); setBusy(true)
    try {
      const r = await reopenOrderOnline(session!.token, order.id, reason)
      if ('error' in r) { setErr(REOPEN_ERR[r.error] ?? r.error); return }
      const o = orderFromRow(r.order)
      await db.orders.put({ ...o, dirty: false })
      onReopened(o)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title={`Возобновить заказ №${order.number}?`} onClose={onClose}>
      <div className="grid gap-4">
        <Warn>
          <b>Оплата {formatUZS(order.total)} сум будет снята</b>
          <span className="block">Заказ снова откроется. При новой оплате касса попросит только разницу — дважды гость не заплатит. Нужна связь с сервером.</span>
        </Warn>
        <Reasons list={REOPEN_REASONS} value={reason} onChange={setReason} />
        {err && <p className="field-error" role="alert">{err}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-lg" onClick={onClose}>Оставить как есть</button>
          <button className="btn btn-lg btn-danger-solid" disabled={busy} onClick={() => void run()}>{busy ? <Loader2 className="spin" size={20} aria-hidden /> : <RotateCcw size={20} aria-hidden />}Да, возобновить</button>
        </div>
      </div>
    </Modal>
  )
}
