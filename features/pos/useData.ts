'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import menuJson from '@/content/menu.json'
import { useRuntime } from '@/features/app/runtime'
import { isKitchenItem } from '@/domain/cart'
import type { CategoryRow, MenuItemRow, TableRow } from '@/data/local-db'
import type { Order, Shift } from '@/domain/order'

type MJ = { categories: Array<{ id: string; title: { ru: string }; items: Array<{ id: string; name: { ru: string }; price: number; available?: boolean; image?: string; weight?: number }> }> }

const FALLBACK_TABLES: TableRow[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1), label: `Стол ${i + 1}`, zone: i < 6 ? '1 этаж' : 'Антресоль', seats: 4, sortOrder: i + 1,
}))

function fallbackMenu(): { items: MenuItemRow[]; categories: CategoryRow[] } {
  const m = menuJson as unknown as MJ
  let sort = 0
  return {
    categories: m.categories.map((c, i) => ({ id: c.id, titleRu: c.title.ru, sortOrder: i, isActive: true })),
    items: m.categories.flatMap((c) => c.items.map((it) => ({
      id: it.id, categoryId: c.id, nameRu: it.name.ru, price: it.price, available: it.available !== false, isDeleted: false,
      isKitchen: isKitchenItem({ id: it.id, name: it.name.ru, category: c.id }), unit: 'portion', sortOrder: ++sort, needsReview: false, imageUrl: it.image ?? null, weight: it.weight ?? null,
    }))),
  }
}

export function useMenu() {
  const { db } = useRuntime()
  const items = useLiveQuery(() => db.menu.toArray(), [db])
  const cats = useLiveQuery(() => db.categories.toArray(), [db])
  if (!items || !cats) return null
  if (items.length === 0) return fallbackMenu()
  const visible = items.filter((i) => !i.isDeleted && !i.needsReview).sort((a, b) => a.sortOrder - b.sortOrder)
  // категории, которых ещё нет локально (до первой синхронизации), берём из menu.json или по id
  const fb = fallbackMenu().categories
  const known = new Map(cats.filter((c) => c.isActive).map((c) => [c.id, c]))
  for (const id of new Set(visible.map((i) => i.categoryId).filter(Boolean) as string[]))
    if (!known.has(id)) known.set(id, fb.find((c) => c.id === id) ?? { id, titleRu: id, sortOrder: 99, isActive: true })
  const used = new Set(visible.map((i) => i.categoryId))
  return { items: visible, categories: [...known.values()].filter((c) => used.has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder) }
}

export function useTables(): TableRow[] {
  const { db } = useRuntime()
  const t = useLiveQuery(() => db.diningTables.toArray(), [db])
  return t && t.length ? [...t].sort((a, b) => a.sortOrder - b.sortOrder) : FALLBACK_TABLES
}

export function useActiveOrders(): Order[] | undefined {
  const { db } = useRuntime()
  return useLiveQuery(async () => {
    const since = new Date(Date.now() - 3 * 86400_000).toISOString()
    const recent = await db.orders.where('createdAt').above(since).toArray()
    const unpaid = await db.orders.filter((o) => o.paymentStatus === 'unpaid' && o.status !== 'cancelled').toArray()
    const map = new Map([...recent, ...unpaid].map((o) => [o.id, o]))
    return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [db])
}

export function useOpenShift(): Shift | null | undefined {
  const { db } = useRuntime()
  return useLiveQuery(async () => {
    const open = await db.shifts.where('status').equals('open').toArray()
    open.sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    return open.find((s) => s.source !== 'legacy_rescue') ?? open[0] ?? null
  }, [db])
}
