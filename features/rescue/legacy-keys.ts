/**
 * Ключи localStorage старой версии (v1, коммит cde9b97). Получены grep по коду v1 — см. план, раздел 4.1.
 * ВАЖНО: модуль спасения только ЧИТАЕТ эти ключи. Никогда не пишет и не удаляет их.
 */
export const LEGACY_KEYS = {
  orders: 'chickenfit_pos_orders_v1',
  outboxOrders: 'chickenfit_outbox_orders_v1',
  shifts: 'chickenfit_pos_shifts_v1',
  currentShift: 'chickenfit_pos_current_shift_v1',
  tableDrafts: 'chickenfit_pos_table_drafts_v2',
  menuOverrides: 'chickenfit_pos_menu_overrides_v1',
  customItems: 'chickenfit_pos_custom_items_v1',
  deletedItems: 'chickenfit_pos_deleted_items_v1',
  outboxMenu: 'chickenfit_outbox_menu_v1',
  orderCounter: 'chickenfit-pos-order',
  paperWidth: 'chickenfit-pos-paper-width',
  receiptQr: 'chickenfit-pos-receipt-qr',
  theme: 'chickenfit_theme_v2',
  sessionUser: 'cf-pos-user',
} as const

/** Снимок забирает все ключи с этими префиксами — страховка от пропущенных ключей. */
export const LEGACY_PREFIXES = ['chickenfit', 'cf-', 'cf_'] as const

/** Собственные ключи v2 (в снимок не попадают). */
export const V2_PREFIX = 'cf2_'

export const isLegacyKey = (k: string): boolean =>
  !k.startsWith(V2_PREFIX) && LEGACY_PREFIXES.some((p) => k.startsWith(p))
