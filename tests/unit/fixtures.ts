/** Фикстура localStorage v1: >500 заказов в основном ключе, outbox со «старыми» заказами, смены, черновики, правки меню. */
export class RecordingStorage {
  writes: string[] = []
  private m = new Map<string, string>()
  constructor(init: Record<string, string>) {
    for (const [k, v] of Object.entries(init)) this.m.set(k, v)
  }
  get length() { return this.m.size }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string) { this.writes.push(`set:${k}`) }
  removeItem(k: string) { this.writes.push(`remove:${k}`) }
  clear() { this.writes.push('clear') }
  dump() { return Object.fromEntries(this.m) }
}

const T0 = Date.parse('2026-09-12T13:00:00Z') // 12.09 18:00 UTC+5

export function legacyOrder(i: number, extra: Record<string, unknown> = {}) {
  const createdAt = new Date(T0 + i * 40 * 60_000).toISOString()
  return {
    id: i % 2 ? `order_${T0 + i}` : `0b5f${String(i).padStart(4, '0')}-1111-4111-8111-${String(i).padStart(12, '0')}`,
    orderNumber: `#${String(i).padStart(3, '0')}`,
    createdAt,
    type: i % 3 === 0 ? 'takeaway' : 'dine_in',
    tableNumber: i % 3 === 0 ? undefined : String((i % 8) + 1),
    items: [
      { id: 'combo-chicken', name: 'Супер Комбо Chicken', price: 45000, originalPrice: 45000, qty: 1 },
      { id: 'cola', name: 'Coca-Cola 0.5', price: 8000, originalPrice: 8000, qty: (i % 2) + 1, category: 'drinks' },
    ],
    subtotal: 45000 + 8000 * ((i % 2) + 1),
    discountPercent: 0,
    discountAmount: 0,
    total: 45000 + 8000 * ((i % 2) + 1),
    paymentMethod: i % 4 === 0 ? 'click_payme' : 'cash',
    shiftId: i < 10 ? undefined : 'shift_1757682000000',
    cashierName: 'Кассир 1',
    status: 'completed',
    isPaid: true,
    ...extra,
  }
}

export function buildFixture() {
  const all = Array.from({ length: 620 }, (_, i) => legacyOrder(i))
  const mainKey = all.slice(120).reverse() // основной ключ хранит только 500 последних (новые первыми)
  const outbox = all.map((o) => ({ id: o.id, orderNumber: o.orderNumber, payload: o, type: 'create', attempts: 0, createdAt: o.createdAt }))
  const shifts = [
    { id: 'shift_1757682000000', shiftNumber: 1, cashierName: 'Кассир 1', cashierRole: 'cashier', openedAt: '2026-09-12T13:00:00Z',
      closedAt: '2026-09-30T18:00:00Z', initialCash: 100000, finalCash: 2500000, totalRevenue: 1, cashRevenue: 1, cardRevenue: 0,
      discountTotal: 0, ordersCount: 1, status: 'closed' },
  ]
  const current = { id: 'shift_1759300000000', shiftNumber: 2, cashierName: 'Кассир 2', openedAt: '2026-10-01T04:00:00Z', initialCash: 50000, status: 'open' }
  return {
    chickenfit_pos_orders_v1: JSON.stringify(mainKey),
    chickenfit_outbox_orders_v1: JSON.stringify(outbox),
    chickenfit_pos_shifts_v1: JSON.stringify(shifts),
    chickenfit_pos_current_shift_v1: JSON.stringify(current),
    chickenfit_pos_table_drafts_v2: JSON.stringify({
      table_3: { items: [{ id: 'cola', name: 'Coca-Cola 0.5', price: 8000, originalPrice: 8000, qty: 2 }], discountPercent: 0, customDiscount: 0, paymentMethod: 'cash' },
      table_5: { items: [{ id: 'combo-chicken', name: 'Комбо', price: 45000, originalPrice: 45000, qty: 1 }], discountPercent: 0, customDiscount: 0, paymentMethod: 'cash', activeOrderId: 'order_x' },
      takeaway: { items: [], discountPercent: 0, customDiscount: 0, paymentMethod: 'cash' },
    }),
    chickenfit_pos_menu_overrides_v1: JSON.stringify({ 'combo-chicken': { price: 47000 }, 'db-only-item': { available: false } }),
    chickenfit_pos_custom_items_v1: JSON.stringify([{ item: { id: 'custom-1', name: 'Лаваш домашний', price: 5000 }, categoryId: 'chicken' }]),
    chickenfit_pos_deleted_items_v1: JSON.stringify(['old-item']),
    chickenfit_outbox_menu_v1: '{broken json',
    'chickenfit-pos-order': JSON.stringify({ date: '2026-10-01', seq: 12 }),
    'cf-pos-user': JSON.stringify({ name: 'Кассир 1', role: 'cashier', pin: '1234' }),
    unrelated_key: 'x',
  } as Record<string, string>
}

export const baseMenu = {
  categories: [
    { id: 'chicken', title: { ru: 'Хрустящий Chicken' }, items: [
      { id: 'combo-chicken', name: { ru: 'Супер Комбо Chicken', uz: 'Super', en: 'Super' }, price: 45000, weight: 550, kcal: 820, available: true },
    ] },
    { id: 'drinks', title: { ru: 'Напитки' }, items: [{ id: 'cola', name: { ru: 'Coca-Cola 0.5' }, price: 8000 }] },
  ],
}
