/**
 * Синхронизация: outbox -> сервер, затем pull изменений.
 * Триггеры: локальная запись (debounce), broadcast-сигнал cf-sync, polling 15 с, online, возврат на вкладку.
 * Заказы с неотправленными мутациями не перезаписываются данными сервера.
 */
import type { Api } from './api'
import { ServerError } from './api'
import { categoryFromRow, menuFromRow, orderFromRow, shiftFromRow, tableFromRow } from './mappers'
import { flushOutbox, pendingEntityIds } from './outbox'
import { kvGet, kvSet, type LocalDb } from './local-db'
import { loadSession, saveSession } from './session'

export type SyncState = {
  configured: boolean
  online: boolean
  syncing: boolean
  pending: number
  blocked: number
  lastSyncAt: string | null
  lastError: string | null
  sessionExpired: boolean
}

export async function applyPull(db: LocalDb, data: Awaited<ReturnType<Api['pull']>>): Promise<void> {
  const pending = await pendingEntityIds(db)
  await db.transaction('rw', [db.orders, db.shifts, db.menu, db.categories, db.diningTables], async () => {
    for (const r of data.orders) {
      if (pending.has(String(r.id))) continue
      await db.orders.put(orderFromRow(r))
    }
    for (const r of data.shifts) {
      if (pending.has(String(r.id))) continue
      await db.shifts.put(shiftFromRow(r))
    }
    for (const r of data.menu) {
      if (pending.has(String(r.id))) continue
      await db.menu.put(menuFromRow(r))
    }
    for (const r of data.categories) await db.categories.put(categoryFromRow(r))
    if (data.tables.length) {
      await db.diningTables.clear()
      await db.diningTables.bulkPut(data.tables.map(tableFromRow))
    }
  })
}

export class SyncEngine {
  state: SyncState
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private debounce: ReturnType<typeof setTimeout> | null = null
  private running: Promise<void> | null = null
  private again = false
  private unsub: (() => void) | null = null
  private cleanup: Array<() => void> = []

  constructor(private db: LocalDb, private api: Api, configured: boolean, private pollMs = 15_000) {
    this.state = {
      configured,
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      syncing: false, pending: 0, blocked: 0, lastSyncAt: null, lastError: null, sessionExpired: false,
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => void this.listeners.delete(fn)
  }
  getState = () => this.state
  private set(p: Partial<SyncState>) {
    this.state = { ...this.state, ...p }
    this.listeners.forEach((l) => l())
  }

  start() {
    if (this.timer || !this.state.configured) return
    this.timer = setInterval(() => void this.sync(), this.pollMs)
    if (typeof window !== 'undefined') {
      const on = () => { this.set({ online: true }); void this.sync() }
      const off = () => this.set({ online: false })
      const vis = () => { if (document.visibilityState === 'visible') void this.sync() }
      window.addEventListener('online', on)
      window.addEventListener('offline', off)
      document.addEventListener('visibilitychange', vis)
      this.cleanup.push(() => window.removeEventListener('online', on), () => window.removeEventListener('offline', off),
        () => document.removeEventListener('visibilitychange', vis))
    }
    try {
      this.unsub = this.api.subscribe(() => this.kick(200))
    } catch {
      /* realtime недоступен — работаем на polling */
    }
    void this.sync()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.unsub?.()
    this.cleanup.forEach((c) => c())
    this.cleanup = []
  }

  /** вызвать после локальной записи */
  kick(delay = 300) {
    if (this.debounce) clearTimeout(this.debounce)
    this.debounce = setTimeout(() => void this.sync(), delay)
    void this.refreshCounts()
  }

  async refreshCounts() {
    const all = await this.db.outbox.toArray()
    this.set({ pending: all.length, blocked: all.filter((r) => r.blocked).length })
  }

  sync(): Promise<void> {
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = this.doSync().finally(() => {
      this.running = null
      if (this.again) {
        this.again = false
        void this.sync()
      }
    })
    return this.running
  }

  private async doSync() {
    if (!this.state.configured) return
    const session = await loadSession(this.db)
    if (!session) {
      await this.refreshCounts()
      return
    }
    this.set({ syncing: true })
    try {
      const fr = await flushOutbox(this.db, this.api, session.token)
      if (fr.stoppedBy === 'unauthorized') throw new ServerError('unauthorized', false, 'unauthorized')
      const since = await kvGet<string>(this.db, 'lastPullAt')
      const data = await this.api.pull(session.token, since ?? null)
      await applyPull(this.db, data)
      // запас 5 с на расхождение часов/транзакций; дубли при pull безвредны
      await kvSet(this.db, 'lastPullAt', new Date(new Date(data.server_time).getTime() - 5000).toISOString())
      this.set({ online: true, lastSyncAt: new Date().toISOString(), lastError: fr.stoppedBy === 'network' ? 'Нет связи с сервером' : null, sessionExpired: false })
    } catch (e) {
      const err = e as ServerError
      if (err.code === 'unauthorized') {
        await saveSession(this.db, null)
        this.set({ sessionExpired: true, lastError: 'Сессия истекла — войдите по PIN' })
      } else {
        this.set({ lastError: err.message || 'Ошибка синхронизации', online: typeof navigator === 'undefined' ? false : navigator.onLine })
      }
    } finally {
      await this.refreshCounts()
      this.set({ syncing: false })
    }
  }
}
