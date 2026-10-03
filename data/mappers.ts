/** Строки БД (snake_case из pos_pull) -> локальные типы. */
import type { Order, Shift, ShiftSummary } from '@/domain/order'
import type { CategoryRow, MenuItemRow, TableRow } from './local-db'

type Row = Record<string, any>  
const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0)

export function orderFromRow(r: Row): Order {
  return {
    id: r.id,
    number: r.order_number,
    type: r.order_type,
    tableId: r.table_id ?? r.table_number ?? null,
    customerPhone: r.customer_phone,
    deliveryAddress: r.delivery_address,
    items: Array.isArray(r.items) ? r.items : [],
    subtotal: n(r.subtotal ?? r.total_amount),
    discountPercent: n(r.discount_percent),
    discountAmount: n(r.discount_amount),
    deliveryFee: n(r.delivery_fee),
    total: n(r.total_amount),
    status: r.status,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    paidAt: r.paid_at,
    cashReceived: r.cash_received,
    changeAmount: r.change_amount,
    shiftId: r.shift_id,
    cashierName: r.cashier_name,
    notes: r.notes,
    deviceId: r.device_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    source: r.source,
    dataQuality: r.data_quality ?? [],
  }
}

export function shiftFromRow(r: Row): Shift {
  return {
    id: r.id,
    number: r.number,
    cashierName: r.cashier_name,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    initialCash: n(r.initial_cash),
    countedCash: r.counted_cash,
    status: r.status,
    notes: r.notes,
    zSnapshot: (r.z_snapshot ?? null) as ShiftSummary | null,
    source: r.source,
  }
}

export function menuFromRow(r: Row): MenuItemRow {
  return {
    id: r.id,
    categoryId: r.category_id,
    nameRu: r.name_ru,
    nameUz: r.name_uz,
    nameEn: r.name_en,
    descriptionRu: r.description_ru,
    price: n(r.price),
    available: r.available !== false,
    isDeleted: r.is_deleted === true,
    isKitchen: typeof r.is_kitchen === 'boolean' ? r.is_kitchen : null,
    unit: r.unit ?? 'portion',
    pricePerKg: r.price_per_kg,
    imageUrl: r.image_url,
    weight: r.weight,
    kcal: r.kcal,
    sortOrder: n(r.sort_order),
    needsReview: r.needs_review === true,
  }
}

export const categoryFromRow = (r: Row): CategoryRow => ({
  id: r.id, titleRu: r.title_ru, titleUz: r.title_uz, titleEn: r.title_en, sortOrder: n(r.sort_order), isActive: r.is_active !== false,
})
export const tableFromRow = (r: Row): TableRow => ({
  id: r.id, label: r.name, zone: r.zone, seats: r.capacity ?? null, sortOrder: n(r.sort_order),
})

/** Локальный пункт меню -> payload menu.upsert */
export const menuToPayload = (m: MenuItemRow) => ({
  id: m.id, categoryId: m.categoryId, nameRu: m.nameRu, price: m.price, available: m.available, isDeleted: m.isDeleted,
  isKitchen: m.isKitchen, unit: m.unit, pricePerKg: m.pricePerKg, sortOrder: m.sortOrder, needsReview: m.needsReview,
})

/** Локальный заказ -> payload order.upsert (только серверные поля). */
export function orderToPayload(o: Order, extra: Record<string, unknown> = {}) {
  const { dirty: _d, updatedAt: _u, source: _s, ...rest } = o  
  return { ...rest, ...extra }
}
export function shiftToPayload(s: Shift) {
  return {
    id: s.id, number: s.number, openedAt: s.openedAt, closedAt: s.closedAt ?? null, initialCash: s.initialCash,
    countedCash: s.countedCash ?? null, status: s.status, cashierName: s.cashierName, notes: s.notes ?? null,
  }
}
