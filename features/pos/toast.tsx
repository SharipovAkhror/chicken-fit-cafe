'use client'
/** Всплывающие подсказки (toast) снизу по центру: «Заказ оплачен», «Стол свободен»… Сами исчезают через 4 с, не мешают работе. */
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastTone = 'success' | 'info' | 'warn'
type T = { id: number; text: string; tone: ToastTone }
let push: ((t: T) => void) | null = null
let seq = 0

export function toast(text: string, tone: ToastTone = 'success') {
  push?.({ id: ++seq, text, tone })
}

export function Toaster() {
  const [list, setList] = useState<T[]>([])
  useEffect(() => {
    push = (t) => {
      setList((l) => [...l.slice(-2), t])
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 4000)
    }
    return () => { push = null }
  }, [])
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'warn' ? AlertTriangle : Info
        return (
          <div key={t.id} className="toast" data-tone={t.tone} role="status">
            <Icon size={20} aria-hidden /><span>{t.text}</span>
            <button type="button" aria-label="Скрыть" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}><X size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}
