import type { Staff } from './api'
import { kvGet, kvSet, type LocalDb } from './local-db'

export type Session = { token: string; expiresAt: string; staff: Staff }

export async function loadSession(db: LocalDb): Promise<Session | null> {
  const s = await kvGet<Session>(db, 'session')
  if (!s) return null
  if (new Date(s.expiresAt).getTime() <= Date.now()) return null
  return s
}
export const saveSession = (db: LocalDb, s: Session | null) => kvSet(db, 'session', s)
