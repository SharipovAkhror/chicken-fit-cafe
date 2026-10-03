/**
 * Оркестратор спасения данных v1.
 *  1) captureAndStore — сразу при открытии приложения (до PIN): снимок -> IndexedDB, persist().
 *  2) uploadPending — сырой снимок на сервер (rescue_store_snapshot, без PIN).
 *  3) enqueueImport — после входа: разбор -> мутации legacy.* в outbox (идемпотентно).
 *  4) verifyImport — сверка по дням с сервером (rescue_verify), отчёт сохраняется на сервере.
 * Legacy-ключи localStorage НИКОГДА не изменяются и не удаляются.
 */
import { uuidv5 } from '@/domain/ids'
import type { Api } from '@/data/api'
import type { LocalDb, RescueRow } from '@/data/local-db'
import { kvGet, kvSet } from '@/data/local-db'
import { enqueue } from '@/data/outbox'
import type { Order } from '@/domain/order'
import { captureSnapshot, type ReadonlyStorage } from './snapshot'
import { parseLegacy, type ParseReport } from './parse'

type BaseMenu = Parameters<typeof parseLegacy>[1] extends infer O ? (O extends { baseMenu?: infer M } ? M : never) : never

export async function captureAndStore(db: LocalDb, storage: ReadonlyStorage, deviceId: string): Promise<RescueRow | null> {
  const snapshot = await captureSnapshot(storage, { deviceId })
  if (!snapshot) return null
  const existing = await db.rescue.get(snapshot.sha256)
  if (existing) return existing
  const row: RescueRow = { sha256: snapshot.sha256, capturedAt: snapshot.capturedAt, snapshot }
  await db.rescue.put(row)
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* не критично */
  }
  return row
}

export async function uploadPending(db: LocalDb, api: Api): Promise<{ uploaded: number; errors: string[] }> {
  const rows = await db.rescue.filter((r) => !r.uploadedAt).toArray()
  const errors: string[] = []
  let uploaded = 0
  for (const r of rows) {
    try {
      await api.storeSnapshot(r.snapshot)
      await db.rescue.update(r.sha256, { uploadedAt: new Date().toISOString(), uploadError: null })
      uploaded++
    } catch (e) {
      const msg = (e as Error).message
      errors.push(msg)
      await db.rescue.update(r.sha256, { uploadError: msg })
    }
  }
  return { uploaded, errors }
}

/** Мутации детерминированы по legacy-id: повторный запуск (и другой снимок тех же данных) не создаёт дублей. */
const mid = (kind: string, legacyId: string) => uuidv5(`cf:rescue:${kind}:${legacyId}`)

export async function enqueueImport(
  db: LocalDb,
  sha256: string,
  opts: { baseMenu?: BaseMenu; deviceId: string; now?: Date },
): Promise<ParseReport> {
  const row = await db.rescue.get(sha256)
  if (!row) throw new Error('snapshot not found')
  const parsed = await parseLegacy(row.snapshot.keys, { baseMenu: opts.baseMenu, deviceId: opts.deviceId, now: opts.now })
  // порядок важен: смены и меню раньше заказов (FK shift_id)
  for (const s of parsed.shifts) await enqueue(db, 'legacy.shift', s.id, s, await mid('shift', s.legacyId))
  for (const m of parsed.menu) await enqueue(db, 'legacy.menu', m.id, m, await mid('menu', `${m.id}:${sha256}`))
  for (const o of parsed.orders) await enqueue(db, 'legacy.order', o.id, o, await mid('order', o.legacyId))

  // локальная копия — чтобы история и открытые столы были видны сразу, даже без сети
  const now = new Date().toISOString()
  await db.transaction('rw', [db.orders, db.shifts, db.menu], async () => {
    for (const o of parsed.orders) {
      if (await db.orders.get(o.id)) continue
      await db.orders.put({ ...(o as unknown as Order), updatedAt: now, source: 'legacy_rescue' })
    }
    for (const s of parsed.shifts) {
      if (await db.shifts.get(s.id)) continue
      await db.shifts.put({
        id: s.id, number: s.number, cashierName: s.cashierName, openedAt: s.openedAt, closedAt: s.closedAt,
        initialCash: s.initialCash, countedCash: s.countedCash, status: s.status, notes: s.notes, source: 'legacy_rescue',
      })
    }
    if ((await db.menu.count()) === 0) {
      for (const m of parsed.menu) {
        if (!m.nameRu) continue
        await db.menu.put({
          id: m.id, categoryId: m.categoryId ?? null, nameRu: m.nameRu, price: m.price ?? 0, available: m.available !== false,
          isDeleted: !!m.isDeleted, isKitchen: m.isKitchen ?? null, unit: 'portion', sortOrder: m.sortOrder ?? 0,
          needsReview: false, imageUrl: m.imageUrl, weight: m.weight, kcal: m.kcal,
        })
      }
    }
  })
  await db.rescue.update(sha256, { enqueuedAt: now, report: parsed.report })
  await kvSet(db, 'deviceMenuIds', parsed.menu.map((m) => m.id))
  return parsed.report
}

export type VerifyDiff = Array<{ day: string; local: { count: number; total: number }; server: { count: number; total: number } | null }>

/** Сверка: каждый день из снимка должен быть на сервере минимум с теми же количеством и суммой. */
export async function verifyImport(db: LocalDb, api: Api, token: string, sha256: string) {
  const row = await db.rescue.get(sha256)
  const report = row?.report as ParseReport | undefined
  if (!row || !report) throw new Error('import not enqueued')
  const pendingLegacy = await db.outbox.filter((r) => r.kind.startsWith('legacy.')).count()
  const server = await api.rescueVerify(token)
  const diff: VerifyDiff = []
  for (const [day, local] of Object.entries(report.byDay)) {
    const s = server.orders_by_day[day] ?? null
    if (!s || s.count < local.count || s.total < local.total) diff.push({ day, local, server: s })
  }
  const ok = pendingLegacy === 0 && diff.length === 0
  const verify = { ok, pendingLegacy, diff, serverOrders: server.orders, serverShifts: server.shifts, at: new Date().toISOString() }
  await db.rescue.update(sha256, { verify, verifiedAt: ok ? verify.at : null })
  if (ok) {
    try {
      await api.saveRescueReport(token, sha256, { ...report, verify })
    } catch {
      /* отчёт локально всё равно есть */
    }
  }
  return verify
}

/**
 * Позиции меню на сервере, которых не было в меню кассы (menu.json + правки устройства), скрываются
 * и помечаются needs_review — администратор решает в разделе «Меню». Выполняется один раз.
 */
export async function reconcileMenu(db: LocalDb): Promise<number> {
  if (await kvGet<boolean>(db, 'menuReconciled')) return 0
  const deviceIds = await kvGet<string[]>(db, 'deviceMenuIds')
  if (!deviceIds?.length) return 0
  const keep = new Set(deviceIds)
  const extra = await db.menu.filter((m) => !keep.has(m.id) && !m.isDeleted && !m.needsReview).toArray()
  for (const m of extra) {
    const payload = { id: m.id, needsReview: true, available: false }
    await db.menu.update(m.id, payload)
    await enqueue(db, 'menu.upsert', m.id, payload, await uuidv5(`cf:reconcile:${m.id}`))
  }
  await kvSet(db, 'menuReconciled', true)
  return extra.length
}
