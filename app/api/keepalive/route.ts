import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Пинг Supabase (бесплатный план засыпает без активности) + уборка (RPC housekeeping, 0011: не чаще раза в 6 ч
 * чистит истёкшие сессии, старые попытки входа, журналы идемпотентности и талоны фото — БД не растёт).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return NextResponse.json({ status: 'error', message: 'Supabase env missing' }, { status: 503 })
  const started = Date.now()
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await sb.from('categories').select('id').limit(1)
  if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 502 })
  const latencyMs = Date.now() - started
  const hk = await sb.rpc('housekeeping') // до применения 0011 функции нет — это не ошибка пинга
  return NextResponse.json({ status: 'ok', latencyMs, housekeeping: hk.error ? 'skipped' : hk.data, timestamp: new Date().toISOString() })
}
