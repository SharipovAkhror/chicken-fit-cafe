import { describe, expect, it, beforeEach } from 'vitest'
import { captureSnapshot } from '@/features/rescue/snapshot'
import { parseLegacy } from '@/features/rescue/parse'
import { captureAndStore, enqueueImport, reconcileMenu, uploadPending, verifyImport } from '@/features/rescue/rescue'
import { buildBackup, restoreBackup } from '@/features/rescue/backup'
import { LocalDb } from '@/data/local-db'
import type { Api } from '@/data/api'
import { flushOutbox } from '@/data/outbox'
import { RecordingStorage, buildFixture, baseMenu } from './fixtures'

const NOW = new Date('2026-10-04T04:00:00Z')

/** Мини-сервер в памяти, повторяющий семантику RPC (идемпотентность, legacy skip-if-exists). */
function fakeApi() {
  const applied = new Set<string>()
  const orders = new Map<string, Record<string, unknown>>()
  const shifts = new Map<string, Record<string, unknown>>()
  const snapshots = new Map<string, unknown>()
  const calls: string[] = []
  const api: Api = {
    login: async () => ({ error: 'invalid_pin' }),
    logout: async () => {},
    async applyMutation(_t, id, kind, payload) {
      calls.push(kind)
      if (applied.has(id)) return { duplicate: true, result: null }
      applied.add(id)
      const p = payload as Record<string, unknown>
      if (kind === 'legacy.order' && !orders.has(p.id as string)) {
        const shiftOk = !p.shiftId || shifts.has(p.shiftId as string)
        if (!shiftOk) throw new Error('shift fk')
        orders.set(p.id as string, p)
      }
      if (kind === 'legacy.shift' && !shifts.has(p.id as string)) shifts.set(p.id as string, p)
      return { duplicate: false, result: null }
    },
    pull: async () => ({ server_time: NOW.toISOString(), staff: { id: '1', name: 'A', role: 'admin' }, orders: [], shifts: [], menu: [], categories: [], tables: [] }),
    async storeSnapshot(s) {
      const sha = (s as { sha256: string }).sha256
      const dup = snapshots.has(sha)
      snapshots.set(sha, s)
      return { id: sha, duplicate: dup }
    },
    saveRescueReport: async () => {},
    async rescueVerify() {
      const byDay: Record<string, { count: number; total: number }> = {}
      for (const o of orders.values()) {
        const sh = o.shiftId ? shifts.get(o.shiftId as string) : null
        const ts = (sh ? sh.openedAt : o.createdAt) as string
        const d = new Date(Date.parse(ts) + 5 * 3600_000).toISOString().slice(0, 10)
        byDay[d] = { count: (byDay[d]?.count ?? 0) + 1, total: (byDay[d]?.total ?? 0) + (o.total as number) }
      }
      return { orders_by_day: byDay, orders: orders.size, shifts: shifts.size }
    },
    reportShift: async () => ({}),
    reportSales: async () => ({}),
    subscribe: () => () => {},
  }
  return { api, orders, shifts, snapshots, calls }
}

describe('snapshot', () => {
  it('только читает localStorage, берёт все cf/chickenfit ключи и маскирует PIN', async () => {
    const init = buildFixture()
    const st = new RecordingStorage(init)
    const snap = await captureSnapshot(st, { deviceId: 'dev1', origin: 'test', userAgent: 'ua' })
    expect(st.writes).toEqual([])
    expect(st.dump()).toEqual(init)
    expect(snap!.keys.unrelated_key).toBeUndefined()
    expect(snap!.keys.chickenfit_outbox_menu_v1).toBe('{broken json') // сырые данные как есть, даже битые
    expect(snap!.keys['cf-pos-user']).not.toContain('1234')
    expect(Object.keys(snap!.keys)).toHaveLength(Object.keys(init).length - 1)
    const again = await captureSnapshot(st, { deviceId: 'dev1', origin: 'test', userAgent: 'ua' })
    expect(again!.sha256).toBe(snap!.sha256)
  })
  it('пустое хранилище — нет снимка', async () => {
    expect(await captureSnapshot(new RecordingStorage({ other: '1' }), { deviceId: 'd', origin: '', userAgent: '' })).toBeNull()
  })
})

describe('parseLegacy', () => {
  it('объединяет 500 последних заказов и outbox: восстанавливает старые заказы сверх лимита', async () => {
    const p = await parseLegacy(buildFixture(), { baseMenu, now: NOW })
    const real = p.orders.filter((o) => !o.dataQuality?.includes('legacy_draft'))
    expect(real).toHaveLength(620)
    expect(p.report.ordersFromMainKey).toBe(500)
    expect(p.report.mainKeyAtCap).toBe(true)
    expect(p.report.ordersOnlyInOutbox).toBe(120)
    expect(new Set(real.map((o) => o.id)).size).toBe(620)
    expect(p.report.errors.some((e) => e.includes('chickenfit_outbox_menu_v1'))).toBe(true)
    expect(p.report.flags.shift_inferred).toBe(10)
    const sum = real.reduce((s, o) => s + o.total, 0)
    expect(Object.values(p.report.byDay).reduce((s, d) => s + d.total, 0)).toBe(sum)
  })
  it('черновики: свободный -> открытый заказ, привязанный к заказу -> только в отчёт', async () => {
    const p = await parseLegacy(buildFixture(), { baseMenu, now: NOW })
    const drafts = p.orders.filter((o) => o.dataQuality?.includes('legacy_draft'))
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({ tableId: '3', status: 'open', paymentStatus: 'unpaid', total: 16000 })
    expect(p.report.draftsLinked).toEqual([{ key: 'table_5', activeOrderId: 'order_x', items: 1 }])
  })
  it('меню: menu.json + правки + свои позиции − удалённые', async () => {
    const p = await parseLegacy(buildFixture(), { baseMenu, now: NOW })
    const byId = Object.fromEntries(p.menu.map((m) => [m.id, m]))
    expect(byId['combo-chicken'].price).toBe(47000)
    expect(byId['combo-chicken'].isKitchen).toBe(true)
    expect(byId['cola'].isKitchen).toBe(false)
    expect(byId['custom-1']).toMatchObject({ nameRu: 'Лаваш домашний', categoryId: 'chicken' })
    expect(byId['db-only-item']).toEqual({ id: 'db-only-item', available: false })
    expect(byId['old-item']).toEqual({ id: 'old-item', isDeleted: true })
  })
  it('старые незакрытые кухонные статусы не всплывают на кухне', async () => {
    const keys = { chickenfit_pos_orders_v1: JSON.stringify([{ id: 'order_1', orderNumber: '#1', createdAt: '2026-09-20T10:00:00Z', items: [], total: 1000, status: 'pending' }]) }
    const p = await parseLegacy(keys, { now: NOW })
    expect(p.orders[0]).toMatchObject({ status: 'served', paymentStatus: 'paid' })
    expect(p.orders[0].dataQuality).toEqual(expect.arrayContaining(['kitchen_status_stale', 'payment_inferred', 'shift_inferred', 'cashier_unknown']))
  })
})

describe('rescue flow (IndexedDB + outbox)', () => {
  let db: LocalDb
  beforeEach(async () => {
    db = new LocalDb(`t-${Math.random()}`)
    await db.open()
  })

  it('полный цикл идемпотентен: повторный запуск не создаёт дублей и не трогает localStorage', async () => {
    const init = buildFixture()
    const st = new RecordingStorage(init)
    const { api, orders, shifts, snapshots } = fakeApi()

    const r1 = await captureAndStore(db, st, 'dev1')
    const r2 = await captureAndStore(db, st, 'dev1')
    expect(r2!.sha256).toBe(r1!.sha256)
    expect(await db.rescue.count()).toBe(1)

    await uploadPending(db, api)
    await uploadPending(db, api)
    expect(snapshots.size).toBe(1)

    await enqueueImport(db, r1!.sha256, { baseMenu, deviceId: 'dev1', now: NOW })
    const queued1 = await db.outbox.count()
    await enqueueImport(db, r1!.sha256, { baseMenu, deviceId: 'dev1', now: NOW })
    expect(await db.outbox.count()).toBe(queued1)

    const fr = await flushOutbox(db, api, 'tok')
    expect(fr.blocked).toBe(0)
    expect(await db.outbox.count()).toBe(0)
    expect(orders.size).toBe(621) // 620 + 1 черновик
    expect(shifts.size).toBe(2)

    // ещё раз всё с нуля: тот же результат на сервере
    await enqueueImport(db, r1!.sha256, { baseMenu, deviceId: 'dev1', now: NOW })
    await flushOutbox(db, api, 'tok')
    expect(orders.size).toBe(621)

    const v = await verifyImport(db, api, 'tok', r1!.sha256)
    expect(v.ok).toBe(true)
    expect(v.diff).toEqual([])

    expect(st.writes).toEqual([])
    expect(st.dump()).toEqual(init)
    expect(await db.orders.count()).toBe(621)
  })

  it('сверка ловит недостающие на сервере дни', async () => {
    const st = new RecordingStorage(buildFixture())
    const { api, orders } = fakeApi()
    const r = await captureAndStore(db, st, 'dev1')
    await enqueueImport(db, r!.sha256, { baseMenu, deviceId: 'dev1', now: NOW })
    await flushOutbox(db, api, 'tok')
    const first = [...orders.keys()][0]
    orders.delete(first)
    const v = await verifyImport(db, api, 'tok', r!.sha256)
    expect(v.ok).toBe(false)
    expect(v.diff).toHaveLength(1)
  })

  it('сетевая ошибка: очередь сохраняется целиком, порядок не нарушается', async () => {
    const st = new RecordingStorage(buildFixture())
    const { api } = fakeApi()
    const r = await captureAndStore(db, st, 'dev1')
    await enqueueImport(db, r!.sha256, { baseMenu, deviceId: 'dev1', now: NOW })
    const total = await db.outbox.count()
    const broken: Api = { ...api, applyMutation: async () => { throw new TypeError('Failed to fetch') } }
    const fr = await flushOutbox(db, broken, 'tok')
    expect(fr.stoppedBy).toBe('network')
    expect(await db.outbox.count()).toBe(total)
  })

  it('reconcileMenu скрывает позиции сервера, которых не было на кассе (один раз)', async () => {
    const st = new RecordingStorage(buildFixture())
    const r = await captureAndStore(db, st, 'dev1')
    await enqueueImport(db, r!.sha256, { baseMenu, deviceId: 'dev1', now: NOW })
    await db.menu.put({ id: 'seed-extra', categoryId: 'x', nameRu: 'Лишнее', price: 1, available: true, isDeleted: false, isKitchen: null, unit: 'portion', sortOrder: 0, needsReview: false })
    expect(await reconcileMenu(db)).toBe(1)
    expect((await db.menu.get('seed-extra'))!.needsReview).toBe(true)
    expect(await reconcileMenu(db)).toBe(0)
  })

  it('бэкап: экспорт и восстановление на чистом устройстве', async () => {
    const st = new RecordingStorage(buildFixture())
    const r = await captureAndStore(db, st, 'dev1')
    await enqueueImport(db, r!.sha256, { baseMenu, deviceId: 'dev1', now: NOW })
    const file = JSON.parse(JSON.stringify(await buildBackup(db)))
    const db2 = new LocalDb(`t2-${Math.random()}`)
    const res = await restoreBackup(db2, file)
    expect(res.snapshots).toEqual([r!.sha256])
    await enqueueImport(db2, r!.sha256, { baseMenu, deviceId: 'dev2', now: NOW })
    expect(await db2.outbox.count()).toBe(await db.outbox.count())
    await expect(restoreBackup(db2, { foo: 1 })).rejects.toThrow()
  })
})
