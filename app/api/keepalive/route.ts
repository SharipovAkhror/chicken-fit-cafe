import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Пинг Supabase (бесплатный план засыпает без активности). Только чтение публичной таблицы. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return NextResponse.json({ status: 'error', message: 'Supabase env missing' }, { status: 503 })
  const started = Date.now()
  const { error } = await createClient(url, key, { auth: { persistSession: false } }).from('categories').select('id').limit(1)
  if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 502 })
  return NextResponse.json({ status: 'ok', latencyMs: Date.now() - started, timestamp: new Date().toISOString() })
}
