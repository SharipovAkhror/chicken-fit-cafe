'use client'
import { Cloud, CloudOff, Delete, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSyncState, getEngine } from '@/features/app/runtime'
import { retryBlocked } from '@/data/outbox'
import { getDb } from '@/data/local-db'
import { formatUZS } from '@/domain/money'
import type { ReactNode } from 'react'

export function Money({ v, className }: { v: number; className?: string }) {
  return <span className={className}>{formatUZS(v)}<span className="muted" style={{ fontSize: '.8em' }}>&nbsp;сум</span></span>
}

/** Состояние синхронизации. compact — только значок (телефон), текст остаётся в aria-label/title. */
export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const s = useSyncState()
  if (compact && s.blocked === 0) {
    const [Icon, color, label] = !s.configured ? [CloudOff, 'var(--warning)', 'Только локально'] : !s.online || s.lastError ? [CloudOff, 'var(--warning)', `Офлайн${s.pending ? ` · в очереди ${s.pending}` : ''}`]
      : s.pending > 0 || s.syncing ? [RefreshCw, 'var(--info)', 'Отправка'] : [Cloud, 'var(--success)', 'Синхронизировано']
    return <span className="chip" role="status" style={{ color, minHeight: 36, padding: '0 8px' }} aria-label={label} title={label}><Icon size={16} aria-hidden /></span>
  }
  if (!s.configured) return <span className="chip" style={{ color: 'var(--warning)' }}><CloudOff size={14} />&nbsp;Только локально</span>
  if (s.blocked > 0)
    return (
      <button className="chip" style={{ color: 'var(--danger)', minHeight: 36 }} onClick={() => retryBlocked(getDb()).then(() => getEngine().sync())}
        title="Есть изменения, которые сервер не принял. Нажмите, чтобы повторить.">
        <TriangleAlert size={14} />&nbsp;Ошибка синхр.: {s.blocked} — повторить
      </button>
    )
  if (!s.online || s.lastError)
    return <span className="chip" style={{ color: 'var(--warning)' }} title={s.lastError ?? ''}><CloudOff size={14} />&nbsp;Офлайн{s.pending ? ` · в очереди ${s.pending}` : ''}</span>
  if (s.pending > 0 || s.syncing)
    return <span className="chip" style={{ color: 'var(--info)' }}><RefreshCw size={14} />&nbsp;Отправка{s.pending ? ` · ${s.pending}` : ''}</span>
  return <span className="chip" style={{ color: 'var(--success)' }}><Cloud size={14} />&nbsp;Синхронизировано</span>
}

/** Диалог: появление 180 мс; на телефоне — нижний лист. Закрытие крестиком/фоном/Esc — с короткой анимацией (140 мс). */
export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  const [closing, setClosing] = useState(false)
  const close = () => { if (closing) return; setClosing(true); setTimeout(onClose, 140) }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  return (
    <div className={`scrim${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={close}>
      <div className="dialog" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={close} aria-label="Закрыть"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Numpad({ value, onChange, presets }: { value: string; onChange: (v: string) => void; presets?: number[] }) {
  const press = (k: string) => {
    if (k === '⌫') onChange(value.slice(0, -1))
    else if (k === 'C') onChange('')
    else if (value.length < 9) onChange((value + k).replace(/^0+(?=\d)/, ''))
  }
  return (
    <div>
      {presets && (
        <div className="grid grid-cols-4 gap-2 mb-2">
          {presets.map((p) => <button key={p} className="btn" onClick={() => onChange(String(p))}>{formatUZS(p)}</button>)}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
          <button key={k} className="btn numkey" onClick={() => press(k)} aria-label={k === '⌫' ? 'Стереть' : undefined}>{k === '⌫' ? <Delete size={24} /> : k}</button>
        ))}
      </div>
    </div>
  )
}
