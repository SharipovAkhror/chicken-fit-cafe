'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

/** Короткая подсказка после входа (1–2 строки), своя для роли. Скрывается на этом устройстве до следующего дня. */
export const ROLE_TIPS: Record<string, string> = {
  cashier: 'Начните с «Смена → Открыть смену». Заказ: «Столы» → стол → блюда → «Оплата». В конце дня: «Смена → Закрыть смену (Z)».',
  admin: 'Проверьте, открыта ли смена. Отчёты — в «Отчётах», сотрудники и PIN — в «Настройках».',
  kitchen: 'Новые заказы появляются здесь сами. Нажмите «Готово», когда блюдо отдано.',
}
const key = (role: string) => `pos:tipHidden:${role}`
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Samarkand' })

export function RoleTip({ role }: { role?: string }) {
  const [hidden, setHidden] = useState(() => {
    if (!role) return true
    try { return localStorage.getItem(key(role)) === today() } catch { return false }
  })
  const text = role ? ROLE_TIPS[role] : undefined
  if (hidden || !text || !role) return null
  return (
    <div className="banner banner-info flex items-center gap-2" role="note">
      <span className="flex-1">{text}</span>
      <button className="btn" aria-label="Скрыть подсказку" onClick={() => {
        try { localStorage.setItem(key(role), today()) } catch { /* приватный режим */ }
        setHidden(true)
      }}><X size={18} /></button>
    </div>
  )
}
