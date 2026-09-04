/**
 * Утилиты для генерации чеков и настроек термопечати.
 *
 * Номер заказа — автоинкремент за текущий день.
 * Поддержка форматов ленты: 58 мм (узкая) и 80 мм (стандарт).
 */

export type PaperWidth = '58mm' | '80mm'

const STORAGE_KEY = 'chickenfit-pos-order'
const PAPER_WIDTH_KEY = 'chickenfit-pos-paper-width'
const QR_ENABLED_KEY = 'chickenfit-pos-receipt-qr'

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

/** Получить сохраненную ширину ленты термопринтера (по умолчанию 80mm). */
export function getStoredPaperWidth(): PaperWidth {
  if (typeof window === 'undefined') return '80mm'
  try {
    const val = localStorage.getItem(PAPER_WIDTH_KEY)
    if (val === '58mm' || val === '80mm') return val
  } catch {}
  return '80mm'
}

/** Сохранить ширину ленты термопринтера. */
export function setStoredPaperWidth(width: PaperWidth): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PAPER_WIDTH_KEY, width)
  } catch {}
}

/** Включен ли QR-код на гостевом чеке (по умолчанию true). */
export function getStoredQrEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const val = localStorage.getItem(QR_ENABLED_KEY)
    if (val !== null) return val === 'true'
  } catch {}
  return true
}

/** Сохранить настройку QR-кода на чеке. */
export function setStoredQrEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QR_ENABLED_KEY, String(enabled))
  } catch {}
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

/** Время и дата для чека: «13.08.2026 12:45:30» */
export function receiptDateTime(date?: Date): string {
  const d = date || new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  return `${day}.${mon}.${year} ${h}:${min}:${sec}`
}

/** Дата для чека: «13.08.2026» */
export function receiptDateOnly(date?: Date): string {
  const d = date || new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${mon}.${year}`
}

/** Время для чека с секундами: «12:45:30» */
export function receiptTimeOnly(date?: Date): string {
  const d = date || new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${min}:${sec}`
}

/** Форматирование суммы для чека: 158000 → «158 000» */
export function receiptPrice(price: number): string {
  return String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Умный подбор и группировка позиций чека:
 * Объединяет одинаковые товары с одинаковой ценой и модификаторами/гарниром,
 * суммируя их количество (qty), чтобы чек был компактным и понятным.
 */
export function aggregateReceiptItems<T extends { id: string; name: string; price: number; qty: number; notes?: string }>(
  items: T[],
): T[] {
  const map = new Map<string, T>()
  for (const item of items) {
    const key = `${item.id}__${item.name}__${item.price}__${(item.notes || '').trim()}`
    const existing = map.get(key)
    if (existing) {
      existing.qty += item.qty
    } else {
      map.set(key, { ...item })
    }
  }
  return Array.from(map.values())
}

