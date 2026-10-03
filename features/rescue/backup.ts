/** JSON-бэкап устройства: legacy-снимки + данные v2. Работает без сети и без PIN. */
import { uuidv5 } from '@/domain/ids'
import type { LocalDb } from '@/data/local-db'
import { getDeviceId } from '@/data/local-db'
import { enqueue } from '@/data/outbox'
import { orderToPayload } from '@/data/mappers'
import type { Order } from '@/domain/order'
import type { LegacySnapshot } from './snapshot'

export type BackupFile = {
  format: 'chickenfit-backup/1'
  exportedAt: string
  deviceId: string
  legacySnapshots: LegacySnapshot[]
  v2: { orders: Order[]; shifts: unknown[]; outbox: unknown[] }
}

export async function buildBackup(db: LocalDb): Promise<BackupFile> {
  return {
    format: 'chickenfit-backup/1',
    exportedAt: new Date().toISOString(),
    deviceId: await getDeviceId(db),
    legacySnapshots: (await db.rescue.toArray()).map((r) => r.snapshot),
    v2: { orders: await db.orders.toArray(), shifts: await db.shifts.toArray(), outbox: await db.outbox.toArray() },
  }
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const backupFilename = (d = new Date()) =>
  `chickenfit-backup-${new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`

/**
 * Загрузка бэкапа: снимки кладутся в IndexedDB (импорт затем идёт обычным идемпотентным путём),
 * заказы v2, которых нет локально, ставятся в очередь (mutationId детерминирован — дублей нет).
 */
export async function restoreBackup(db: LocalDb, file: unknown): Promise<{ snapshots: string[]; orders: number }> {
  const f = file as BackupFile
  if (!f || f.format !== 'chickenfit-backup/1') throw new Error('Это не файл бэкапа ChickenFit')
  const snapshots: string[] = []
  for (const s of f.legacySnapshots ?? []) {
    if (!s?.sha256 || !s.keys) continue
    if (!(await db.rescue.get(s.sha256))) await db.rescue.put({ sha256: s.sha256, capturedAt: s.capturedAt, snapshot: s })
    snapshots.push(s.sha256)
  }
  let orders = 0
  for (const o of f.v2?.orders ?? []) {
    if (!o?.id || o.source === 'legacy_rescue' || (await db.orders.get(o.id))) continue
    await db.orders.put({ ...o, dirty: true })
    await enqueue(db, 'order.upsert', o.id, orderToPayload(o), await uuidv5(`cf:restore:${o.id}:${o.updatedAt}`))
    orders++
  }
  return { snapshots, orders }
}
