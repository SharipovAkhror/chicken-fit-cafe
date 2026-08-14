/**
 * Утилиты для генерации чеков.
 *
 * Номер заказа — автоинкремент за текущий день.
 * Хранится в localStorage, сбрасывается при смене даты.
 */

const STORAGE_KEY = 'chickenfit-pos-order'

type StoredCounter = {
  date: string // YYYY-MM-DD
  seq: number
}

/** Текущая дата в формате YYYY-MM-DD (локальная). */
function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Получить следующий номер заказа (#001, #002...). Сбрасывается каждый день. */
export function nextOrderNumber(): string {
  const today = todayISO()
  let stored: StoredCounter = { date: today, seq: 0 }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredCounter
      if (parsed.date === today) {
        stored = parsed
      }
    }
  } catch {
    // corrupted — reset
  }

  stored.seq += 1
  stored.date = today
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

  return `#${String(stored.seq).padStart(3, '0')}`
}

/** Текущий номер заказа без инкремента (для отображения). */
export function peekOrderNumber(): string {
  const today = todayISO()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredCounter
      if (parsed.date === today) {
        return `#${String(parsed.seq + 1).padStart(3, '0')}`
      }
    }
  } catch {
    // ignore
  }
  return '#001'
}

/** Время и дата для чека: «13.08.2026  12:45» */
export function receiptDateTime(): string {
  const d = new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${mon}.${year}  ${h}:${min}`
}

/** Форматирование суммы для чека: 158000 → «158 000» */
export function receiptPrice(price: number): string {
  return String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
