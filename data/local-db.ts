/**
 * Локальная база устройства (IndexedDB через Dexie). Источник правды для UI на кассе:
 * всё пишется сюда сразу, на сервер уходит через outbox.
 */
import Dexie, { type Table } from 'dexie'
import type { Order, Shift } from '@/domain/order'
import type { LegacySnapshot } from '@/features/rescue/snapshot'

export type MenuItemRow = {
  id: string
  categoryId: string | null
  nameRu: string
  nameUz?: string | null
  nameEn?: string | null
  descriptionRu?: string | null
  price: number
  available: boolean
  isDeleted: boolean
  isKitchen: boolean | null
  unit: string
  pricePerKg?: number | null
  imageUrl?: string | null
  weight?: number | null
  kcal?: number | null
  sortOrder: number
  needsReview: boolean
  dirty?: boolean
}
export type CategoryRow = { id: string; titleRu: string; titleUz?: string | null; titleEn?: string | null; sortOrder: number; isActive: boolean }
export type TableRow = { id: string; label: string; zone: string; seats: number | null; sortOrder: number }

export type MutationKind =
  | 'order.upsert' | 'order.set_status' | 'shift.upsert' | 'menu.upsert' | 'table.upsert'
  | 'legacy.order' | 'legacy.shift' | 'legacy.menu'

export type OutboxRow = {
  seq?: number
  mutationId: string
  kind: MutationKind
  entityId: string
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  nextAttemptAt: number
  lastError?: string | null
  /** ошибка, которую сервер вернул как постоянную (валидация) — не повторяем автоматически, показываем */
  blocked?: boolean
}

export type RescueRow = {
  sha256: string
  capturedAt: string
  snapshot: LegacySnapshot
  uploadedAt?: string | null
  uploadError?: string | null
  enqueuedAt?: string | null
  verifiedAt?: string | null
  report?: unknown
  verify?: unknown
}

export type KvRow = { key: string; value: unknown }

export class LocalDb extends Dexie {
  kv!: Table<KvRow, string>
  menu!: Table<MenuItemRow, string>
  categories!: Table<CategoryRow, string>
  diningTables!: Table<TableRow, string>
  orders!: Table<Order, string>
  shifts!: Table<Shift, string>
  outbox!: Table<OutboxRow, number>
  rescue!: Table<RescueRow, string>

  constructor(name = 'cf2') {
    super(name)
    this.version(1).stores({
      kv: 'key',
      menu: 'id, categoryId',
      categories: 'id',
      diningTables: 'id',
      orders: 'id, createdAt, status, tableId, shiftId, updatedAt',
      shifts: 'id, openedAt, status',
      outbox: '++seq, &mutationId, entityId, nextAttemptAt',
      rescue: 'sha256, capturedAt',
    })
  }
}

let _db: LocalDb | null = null
export function getDb(): LocalDb {
  if (!_db) _db = new LocalDb()
  return _db
}
/** для тестов */
export function setDb(db: LocalDb | null) {
  _db = db
}

export async function kvGet<T>(db: LocalDb, key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}
export async function kvSet(db: LocalDb, key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value })
}

/** Идентификатор устройства: стабилен для браузера (IndexedDB), без localStorage. */
export async function getDeviceId(db: LocalDb): Promise<string> {
  const existing = await kvGet<string>(db, 'deviceId')
  if (existing) return existing
  const { uuidv4 } = await import('@/domain/ids')
  const id = uuidv4()
  await kvSet(db, 'deviceId', id)
  return id
}
