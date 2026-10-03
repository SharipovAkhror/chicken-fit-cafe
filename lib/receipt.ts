/** Время и дата: «13.08.2026 12:45:30» (гостевое меню — экран «показать официанту»). */
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
