'use client'
import { useState } from 'react'
import type { Order, PaymentMethod } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { Modal, Money, Numpad } from './common'

export function PaymentDialog({ order, onClose, onPaid, onDiscount }: {
  order: Order; onClose: () => void; onPaid: (m: PaymentMethod, cash: number | null, print: boolean) => void; onDiscount?: (percent: number) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [cash, setCash] = useState('')
  const received = Number(cash || 0)
  const change = received - order.total
  const presets = [order.total, Math.ceil(order.total / 10000) * 10000, Math.ceil(order.total / 50000) * 50000, Math.ceil(order.total / 100000) * 100000]
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)
  const ok = method === 'click_payme' || cash === '' || received >= order.total
  return (
    <Modal title={`Оплата · заказ №${order.number || 'новый'}`} onClose={onClose} width={560}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="muted">К оплате{order.discountAmount > 0 ? ` (скидка −${formatUZS(order.discountAmount)})` : ''}</span>
        <Money v={order.total} className="text-3xl font-bold" />
      </div>
      {onDiscount && (
        <div className="flex items-center gap-2 mb-4">
          <span className="muted text-sm">Скидка</span>
          <div className="seg seg-fill" role="radiogroup" aria-label="Скидка">
            {[0, 5, 10, 15, 20].map((p) => (
              <button key={p} role="radio" aria-checked={order.discountPercent === p} onClick={() => { onDiscount(p); setCash('') }}>{p ? `${p}%` : 'нет'}</button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Способ оплаты">
        {(['cash', 'click_payme'] as const).map((m) => (
          <button key={m} role="radio" aria-checked={method === m} className={`btn btn-lg${method === m ? ' btn-primary' : ''}`} onClick={() => setMethod(m)}>
            {m === 'cash' ? 'Наличные' : 'Click / Payme'}
          </button>
        ))}
      </div>
      {method === 'cash' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="muted">Получено</span>
            <span className="text-2xl font-bold">{cash ? formatUZS(received) : '—'}</span>
          </div>
          <Numpad value={cash} onChange={setCash} presets={presets} />
          <div className="flex items-center justify-between mt-3 text-xl" aria-live="polite">
            <span>Сдача</span>
            <strong style={{ color: change < 0 && cash ? 'var(--danger)' : 'var(--success)' }}>
              {cash ? (change < 0 ? `не хватает ${formatUZS(-change)}` : formatUZS(change)) : '—'}
            </strong>
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-2 mt-5">
        <button className="btn btn-lg" disabled={!ok} onClick={() => onPaid(method, method === 'cash' && cash ? received : null, false)}>Оплачено без чека</button>
        <button className="btn btn-lg btn-primary" disabled={!ok} onClick={() => onPaid(method, method === 'cash' && cash ? received : null, true)}>Оплачено + чек</button>
      </div>
    </Modal>
  )
}
