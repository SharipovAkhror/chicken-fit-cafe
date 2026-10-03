/**
 * Сервер: только RPC-функции Supabase (прямого доступа к таблицам у anon нет, см. миграцию rls_lockdown).
 * Ключ — publishable (публичный по замыслу), защита — PIN-сессия в БД.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type StaffRole = 'cashier' | 'kitchen' | 'admin'
export type Staff = { id: string; name: string; role: StaffRole }
export type LoginResult = { token: string; expires_at: string; staff: Staff } | { error: 'invalid_pin' | 'too_many_attempts' }
export type PullResult = {
  server_time: string
  staff: Staff
  orders: Record<string, unknown>[]
  shifts: Record<string, unknown>[]
  menu: Record<string, unknown>[]
  categories: Record<string, unknown>[]
  tables: Record<string, unknown>[]
}

export interface Api {
  login(pin: string, deviceId: string): Promise<LoginResult>
  logout(token: string): Promise<void>
  applyMutation(token: string, mutationId: string, kind: string, payload: unknown): Promise<{ duplicate: boolean; result: unknown }>
  pull(token: string, since: string | null): Promise<PullResult>
  storeSnapshot(snapshot: unknown): Promise<{ id: string; duplicate: boolean }>
  saveRescueReport(token: string, sha256: string, report: unknown): Promise<void>
  rescueVerify(token: string): Promise<{ orders_by_day: Record<string, { count: number; total: number }>; orders: number; shifts: number }>
  reportShift(token: string, shiftId: string): Promise<Record<string, unknown>>
  reportSales(token: string, from: string, to: string): Promise<Record<string, unknown>>
  subscribe(onChange: (e: { entity: string; id: string; op: string }) => void): () => void
}

/** Ошибка сервера, которую бесполезно повторять (валидация/данные). Сеть/5xx — повторяем. */
export class ServerError extends Error {
  constructor(message: string, public readonly permanent: boolean, public readonly code?: string) {
    super(message)
  }
}

export const supabaseConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

let client: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) throw new ServerError('Сервер не настроен (нет NEXT_PUBLIC_SUPABASE_URL)', false, 'not_configured')
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error, status } = await sb().rpc(fn, args)
  if (error) {
    const msg = error.message || String(error)
    if (/session_expired|unauthorized/i.test(msg)) throw new ServerError(msg, false, 'unauthorized')
    // PostgREST: 4xx с кодом Postgres (22xxx, 23xxx, P0001) — ошибка данных; 0/5xx/сеть — временная
    const permanent = status >= 400 && status < 500 && status !== 408 && status !== 429
    throw new ServerError(msg, permanent, error.code)
  }
  return data as T
}

export const supabaseApi: Api = {
  login: (pin, deviceId) => rpc('pos_login', { p_pin: pin, p_device_id: deviceId }),
  logout: (token) => rpc('pos_logout', { p_token: token }),
  applyMutation: (token, mutationId, kind, payload) =>
    rpc('pos_apply_mutation', { p_token: token, p_mutation_id: mutationId, p_kind: kind, p_payload: payload }),
  pull: (token, since) => rpc('pos_pull', { p_token: token, p_since: since }),
  storeSnapshot: (snapshot) => rpc('rescue_store_snapshot', { p_snapshot: snapshot }),
  saveRescueReport: (token, sha256, report) => rpc('rescue_save_report', { p_token: token, p_sha256: sha256, p_report: report }),
  rescueVerify: (token) => rpc('rescue_verify', { p_token: token }),
  reportShift: (token, shiftId) => rpc('report_shift', { p_token: token, p_shift_id: shiftId }),
  reportSales: (token, from, to) => rpc('report_sales', { p_token: token, p_from: from, p_to: to }),
  subscribe(onChange) {
    // Broadcast-сигнал без данных (только entity/id/op): по нему делаем pull через RPC.
    const ch = sb()
      .channel('cf-sync')
      .on('broadcast', { event: 'change' }, (msg) => onChange((msg.payload ?? {}) as { entity: string; id: string; op: string }))
      .subscribe()
    return () => {
      void sb().removeChannel(ch)
    }
  },
}
