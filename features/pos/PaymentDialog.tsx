'use client'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRuntime } from '@/features/app/runtime'
import type { Order, PaymentMethod } from '@/domain/order'
import { formatUZS } from '@/domain/money'
import { Banknote, Check, ChefHat, Printer, Smartphone } from 'lucide-react'
import { Modal, Money, Numpad } from './common'

export function PaymentDialog({ order, prepaid = 0, onClose, onPaid, onDiscount }: {
  order: Order; prepaid?: number; onClose: () => void; onPaid: (m: PaymentMethod, cash: number | null, print: { receipt: boolean; kitchen: boolean }) => void; onDiscount?: (percent: number) => void
}) {
  const { db } = useRuntime()
  const [method, setMethod] = useState<PaymentMethod>('cash')
  // что печатать — выбор кассира, запоминается на устройстве: чек гостю (по умолчанию да), бегунок на кухню (по умолчанию нет)
  const prefs = useLiveQuery(async () => ({ r: (await db.kv.get('pref:printReceipt'))?.value, k: (await db.kv.get('pref:printKitchen'))?.value }), [db])
  const [sel, setSel] = useState<{ receipt?: boolean; kitchen?: boolean }>({})
  const receipt = sel.receipt ?? (prefs?.r as boolean | undefined) ?? true
  const kitchen = sel.kitchen ?? (prefs?.k as boolean | undefined) ?? false
  const hasKitchen = order.items.some((i) => i.isKitchen)
  const toggle = (k: 'receipt' | 'kitchen', v: boolean) => { setSel((s) => ({ ...s, [k]: v })); void db.kv.put({ key: k === 'receipt' ? 'pref:printReceipt' : 'pref:printKitchen', value: v }) }
  const [cash, setCash] = useState('')
  const received = Number(cash || 0)
  // возобновлённый заказ: ранее принятое уже в кассе — просим только разницу (или возвращаем излишек)
  const due = order.total - prepaid
  const toPay = Math.max(0, due)
  const change = received - toPay
  const presets = [toPay, Math.ceil(toPay / 10000) * 10000, Math.ceil(toPay / 50000) * 50000, Math.ceil(toPay / 100000) * 100000]
    .filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4)
  const ok = toPay === 0 || method === 'click_payme' || cash === '' || received >= toPay
  return (
    <Modal title={`Оплата · заказ №${order.number || 'новый'}`} onClose={onClose} width={560}>
      <div className="pay-due mb-3">
        <span className="muted">{prepaid ? 'К доплате' : 'К оплате'}{order.discountAmount > 0 ? ` (скидка −${formatUZS(order.discountAmount)})` : ''}</span>
        <Money v={toPay} className="pay-due-sum" />
      </div>
      {prepaid > 0 && (
        <div className="banner banner-info mb-3">Итого {formatUZS(order.total)} · ранее оплачено {formatUZS(prepaid)}{due < 0 ? ` · вернуть гостю ${formatUZS(-due)} сум` : ''}</div>
      )}
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
      {/* способ оплаты — переключатель; бренд-цвет только у «Оплачено» */}
      <div className="seg seg-fill seg-lg mb-4" role="radiogroup" aria-label="Способ оплаты">
        {(['cash', 'click_payme'] as const).map((m) => (
          <button key={m} role="radio" aria-checked={method === m} onClick={() => setMethod(m)}>
            {m === 'cash' ? <><Banknote size={20} aria-hidden />Наличные</> : <><Smartphone size={20} aria-hidden />Click / Payme</>}
          </button>
        ))}
      </div>
      {method === 'cash' && toPay > 0 && (
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
      <div className="flex flex-wrap gap-x-6 mt-4">
        <label className="flex items-center gap-3" style={{ minHeight: 44, cursor: 'pointer' }}>
          <input type="checkbox" checked={receipt} onChange={(e) => toggle('receipt', e.target.checked)} style={{ width: 22, height: 22 }} />
          <Printer size={18} aria-hidden className="muted" />Печатать чек
        </label>
        {hasKitchen && (
          <label className="flex items-center gap-3" style={{ minHeight: 44, cursor: 'pointer' }}>
            <input type="checkbox" checked={kitchen} onChange={(e) => toggle('kitchen', e.target.checked)} style={{ width: 22, height: 22 }} />
            <ChefHat size={18} aria-hidden className="muted" />Бегунок на кухню
          </label>
        )}
      </div>
      <button className="btn btn-lg btn-primary w-full mt-2" disabled={!ok} onClick={() => onPaid(method, method === 'cash' && cash ? received : null, { receipt, kitchen: hasKitchen && kitchen })}>
        <Check size={20} aria-hidden />Оплачено
      </button>
      <p className="muted text-sm mt-2 text-center">Заказ закроется, стол освободится</p>
    </Modal>
  )
}
