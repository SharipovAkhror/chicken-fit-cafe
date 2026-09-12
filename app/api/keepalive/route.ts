import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const startedAt = Date.now()

  if (!supabase) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Supabase client not configured (missing env variables)',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }

  try {
    // 1. Keep-alive ping to categories & menu_items
    const [catRes, itemRes, orderRes] = await Promise.all([
      supabase.from('categories').select('id').limit(1),
      supabase.from('menu_items').select('id').limit(1),
      supabase.from('orders').select('id').limit(1),
    ])

    const latencyMs = Date.now() - startedAt

    const results = {
      categories: catRes.error ? `error: ${catRes.error.message}` : 'ok',
      menu_items: itemRes.error ? `error: ${itemRes.error.message}` : 'ok',
      orders: orderRes.error ? `error: ${orderRes.error.message}` : 'ok',
    }

    const hasErrors = Boolean(catRes.error || itemRes.error)

    return NextResponse.json(
      {
        status: hasErrors ? 'degraded' : 'alive',
        timestamp: new Date().toISOString(),
        latencyMs,
        database: 'Supabase PostgreSQL (ikvontqurgzopdmsdmla.supabase.co)',
        tables: results,
      },
      { status: hasErrors ? 500 : 200 },
    )
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        status: 'unreachable',
        error: errorMsg,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return GET()
}
