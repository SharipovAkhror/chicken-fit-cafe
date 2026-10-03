/**
 * Очередь изменений (outbox). Каждая запись — идемпотентная мутация с mutationId (UUID):
 * повторная отправка безопасна (сервер помнит applied_mutations). Ничего не выбрасывается:
 * постоянные ошибки помечаются blocked и показываются пользователю.
 */
import { uuidv4 } from '@/domain/ids'
import type { Api } from './api'
import { ServerError } from './api'
import type { LocalDb, MutationKind, OutboxRow } from './local-db'

export async function enqueue(
  db: LocalDb,
  kind: MutationKind,
  entityId: string,
  payload: Record<string, unknown>,
  mutationId: string = uuidv4(),
): Promise<boolean> {
  const exists = await db.outbox.where('mutationId').equals(mutationId).count()
  if (exists) return false
  await db.outbox.add({ mutationId, kind, entityId, payload, createdAt: new Date().toISOString(), attempts: 0, nextAttemptAt: 0 })
  return true
}

export const backoffMs = (attempts: number): number => Math.min(60_000, 1000 * 2 ** Math.min(attempts, 6))

export type FlushResult = { sent: number; failed: number; blocked: number; stoppedBy?: 'network' | 'unauthorized' }

export async function flushOutbox(db: LocalDb, api: Api, token: string, now = () => Date.now()): Promise<FlushResult> {
  const res: FlushResult = { sent: 0, failed: 0, blocked: 0 }
  const rows = await db.outbox.orderBy('seq').toArray()
  const blockedEntities = new Set<string>()
  for (const row of rows) {
    // FIFO в пределах сущности: если ранняя мутация заблокирована/ждёт — поздние по той же сущности ждут тоже
    if (row.blocked || row.nextAttemptAt > now() || blockedEntities.has(row.entityId)) {
      blockedEntities.add(row.entityId)
      if (row.blocked) res.blocked++
      continue
    }
    try {
      await api.applyMutation(token, row.mutationId, row.kind, row.payload)
      await db.outbox.delete(row.seq!)
      res.sent++
    } catch (e) {
      const err = e instanceof ServerError ? e : new ServerError(String((e as Error)?.message ?? e), false)
      if (err.code === 'unauthorized') {
        res.stoppedBy = 'unauthorized'
        break
      }
      const attempts = row.attempts + 1
      const permanent = err.permanent && attempts >= 3 // даём шанс: вдруг это гонка (например, смена ещё не создана)
      await db.outbox.update(row.seq!, {
        attempts,
        lastError: err.message,
        nextAttemptAt: now() + backoffMs(attempts),
        blocked: permanent,
      } satisfies Partial<OutboxRow>)
      blockedEntities.add(row.entityId)
      if (permanent) res.blocked++
      else res.failed++
      if (!err.permanent) {
        res.stoppedBy = 'network'
        break
      }
    }
  }
  return res
}

/** Вернуть заблокированные записи в очередь (кнопка «Повторить»). */
export async function retryBlocked(db: LocalDb): Promise<void> {
  await db.outbox.filter((r) => !!r.blocked).modify({ blocked: false, nextAttemptAt: 0, attempts: 0 })
}

export async function pendingEntityIds(db: LocalDb): Promise<Set<string>> {
  const keys = await db.outbox.orderBy('entityId').uniqueKeys()
  return new Set(keys.map(String))
}
