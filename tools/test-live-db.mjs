import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ikvontqurgzopdmsdmla.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrdm9udHF1cmd6b3BkbXNkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzgzNzIsImV4cCI6MjEwMjI1NDM3Mn0.URw3FfSKNXm1LdXtf6rCUQL-EITRObj-zd5oJmQFqq0'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  console.log('=== TESTING RESTORED SUPABASE DATABASE ===')
  console.log('Target:', SUPABASE_URL)

  // 1. Check categories
  const { data: cats, error: catErr, count: catCount } = await sb
    .from('categories')
    .select('*', { count: 'exact' })
  console.log('\n[1] categories:', catErr ? `ERROR: ${catErr.message} (code ${catErr.code})` : `OK: ${cats?.length} items (total: ${catCount})`)

  // 2. Check menu_items
  const { data: items, error: itemErr, count: itemCount } = await sb
    .from('menu_items')
    .select('*', { count: 'exact' })
  console.log('[2] menu_items:', itemErr ? `ERROR: ${itemErr.message} (code ${itemErr.code})` : `OK: ${items?.length} items (total: ${itemCount})`)

  // 3. Check orders
  const { data: orders, error: orderErr, count: orderCount } = await sb
    .from('orders')
    .select('*', { count: 'exact' })
  console.log('[3] orders:', orderErr ? `ERROR: ${orderErr.message} (code ${orderErr.code})` : `OK: ${orders?.length} items (total: ${orderCount})`)
  if (orders && orders.length > 0) {
    console.log('Recent order columns:', Object.keys(orders[0]))
    console.log('Latest 3 orders:', orders.slice(0, 3).map(o => ({ no: o.order_number, total: o.total_amount, status: o.status, date: o.created_at })))
  }

  // 4. Check shifts
  const { data: shifts, error: shiftErr, count: shiftCount } = await sb
    .from('shifts')
    .select('*', { count: 'exact' })
  console.log('[4] shifts:', shiftErr ? `ERROR: ${shiftErr.message} (code ${shiftErr.code})` : `OK: ${shifts?.length} items (total: ${shiftCount})`)

  console.log('=== CHECK COMPLETE ===')
}

test().catch(console.error)
