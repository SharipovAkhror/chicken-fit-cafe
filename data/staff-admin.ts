/** Сотрудники и устройства (миграция 0015): название устройства, список сотрудников и смена PIN (только админ). */
import { rpc } from './api'

export type StaffRow = { id: string; name: string; role: 'admin' | 'cashier' | 'kitchen'; pin_changed_at: string | null }
type Err = { error: string }

export const setDeviceLabel = (token: string, label: string) =>
  rpc<{ ok: true; label: string } | Err>('pos_set_device_label', { p_token: token, p_label: label })
export const adminStaff = (token: string) => rpc<{ staff: StaffRow[] } | Err>('pos_admin_staff', { p_token: token })
export const adminSetPin = (token: string, staffId: string, pin: string) =>
  rpc<{ ok: true; sessions_revoked?: number } | Err>('pos_admin_set_pin', { p_token: token, p_staff_id: staffId, p_new_pin: pin })
/** Миграция 0016: завершить все сеансы сотрудника на всех устройствах (кроме текущего сеанса админа). */
export const adminLogoutEverywhere = (token: string, staffId: string) =>
  rpc<{ ok: true; sessions_revoked: number } | Err>('pos_admin_logout_everywhere', { p_token: token, p_staff_id: staffId })

const KEY = 'pos:deviceLabel'
export function storedDeviceLabel(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export function storeDeviceLabel(v: string) {
  try { localStorage.setItem(KEY, v) } catch { /* приватный режим */ }
}
/** «iPhone Кассир 1» — понятное имя по умолчанию. */
export function defaultDeviceLabel(staffName: string): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const kind = /iPad/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in globalThis) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone'
    : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Планшет') : /Windows/.test(ua) ? 'Компьютер' : /Mac/.test(ua) ? 'Mac' : 'Устройство'
  return `${kind} ${staffName}`.slice(0, 40)
}
export const PIN_ERR: Record<string, string> = {
  forbidden: 'Менять PIN может только администратор',
  bad_pin: 'PIN — от 4 до 8 цифр',
  weak_pin: 'Слишком простой PIN (1234, 1111 и т. п.)',
  pin_taken: 'Такой PIN уже у другого сотрудника',
  not_found: 'Сотрудник не найден',
}
