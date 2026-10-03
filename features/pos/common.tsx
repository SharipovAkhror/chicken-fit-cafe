'use client'
import { Cloud, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { useSyncState, getEngine } from '@/features/app/runtime'
import { retryBlocked } from '@/data/outbox'
import { getDb } from '@/data/local-db'
import { formatUZS } from '@/domain/money'
import type { ReactNode } from 'react'

export function Money({ v, className }: { v: number; className?: string }) {
  return <span className={className}>{formatUZS(v)}<span className="muted" style={{ fontSize: '.8em' }}>&nbsp;сум</span></span>
}

export function SyncBadge() {
  const s = useSyncState()
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

export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="panel" style={{ width: '100%', maxWidth: width, maxHeight: '92dvh', overflow: 'auto', padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Закрыть">✕</button>
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
          <button key={k} className="btn numkey" onClick={() => press(k)}>{k}</button>
        ))}
      </div>
    </div>
  )
}
