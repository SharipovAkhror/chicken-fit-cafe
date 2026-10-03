'use client'
/** Рантайм клиента: локальная БД, движок синхронизации, сессия. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { getDb, getDeviceId, type LocalDb } from '@/data/local-db'
import { supabaseApi, supabaseConfigured, type Api } from '@/data/api'
import { SyncEngine, type SyncState } from '@/data/sync'
import { loadSession, saveSession, type Session } from '@/data/session'

let engine: SyncEngine | null = null
export function getEngine(): SyncEngine {
  if (!engine) engine = new SyncEngine(getDb(), supabaseApi, supabaseConfigured())
  return engine
}
export const api: Api = supabaseApi

const SERVER_STATE: SyncState = { configured: false, online: true, syncing: false, pending: 0, blocked: 0, lastSyncAt: null, lastError: null, sessionExpired: false }
export function useSyncState(): SyncState {
  const e = typeof window === 'undefined' ? null : getEngine()
  return useSyncExternalStore(e ? e.subscribe : () => () => {}, e ? e.getState : () => SERVER_STATE, () => SERVER_STATE)
}

type Ctx = {
  db: LocalDb
  deviceId: string | null
  session: Session | null
  ready: boolean
  login: (pin: string) => Promise<string | null>
  logout: () => Promise<void>
}
const SessionCtx = createContext<Ctx | null>(null)

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const db = getDb()
  const [session, setSession] = useState<Session | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const sync = useSyncState()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [s, d] = await Promise.all([loadSession(db), getDeviceId(db)])
      if (!alive) return
      setSession(s)
      setDeviceId(d)
      setReady(true)
      getEngine().start()
    })()
    return () => { alive = false }
  }, [db])

  useEffect(() => {
    if (sync.sessionExpired) setSession(null)
  }, [sync.sessionExpired])

  const login = useCallback(async (pin: string) => {
    if (!supabaseConfigured()) return 'Сервер не настроен: нет переменных NEXT_PUBLIC_SUPABASE_*'
    try {
      const r = await api.login(pin, deviceId ?? 'unknown')
      if ('error' in r) return r.error === 'too_many_attempts' ? 'Слишком много попыток. Подождите 5 минут.' : 'Неверный PIN'
      const s: Session = { token: r.token, expiresAt: r.expires_at, staff: r.staff }
      await saveSession(db, s)
      setSession(s)
      void getEngine().sync()
      return null
    } catch (e) {
      return navigator.onLine ? `Ошибка входа: ${(e as Error).message}` : 'Нет интернета. Вход по PIN требует связи (один раз за смену).'
    }
  }, [db, deviceId])

  const logout = useCallback(async () => {
    const s = session
    await saveSession(db, null)
    setSession(null)
    if (s) api.logout(s.token).catch(() => {})
  }, [db, session])

  const value = useMemo(() => ({ db, deviceId, session, ready, login, logout }), [db, deviceId, session, ready, login, logout])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useRuntime(): Ctx {
  const c = useContext(SessionCtx)
  if (!c) throw new Error('RuntimeProvider missing')
  return c
}

export function useTheme(): ['light' | 'dark', () => void] {
  const [t, setT] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    getDb().kv.get('theme').then((r) => r?.value === 'dark' && setT('dark'))
  }, [])
  const toggle = useCallback(() => {
    setT((p) => {
      const n = p === 'dark' ? 'light' : 'dark'
      void getDb().kv.put({ key: 'theme', value: n })
      return n
    })
  }, [])
  return [t, toggle]
}
