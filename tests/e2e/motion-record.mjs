/** Запись ключевых анимаций v2.3 (Playwright recordVideo, мок RPC). Нужен next start на :3100. Видео в $SHOTS (по умолчанию test-results/motion); GIF — ffmpeg. */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
function fakeServer() {
  const st = { applied: [], snapshots: [], orders: new Map(), shifts: new Map(), legacyOrders: 0 }
  const tables = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), name: `Стол ${i + 1}`, zone: i < 6 ? '1 этаж' : 'Антресоль', capacity: 4, sort_order: i + 1 }))
  const handle = (fn, a) => {
    switch (fn) {
      case 'pos_login': return a.p_pin === '12345678' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff: { id: 's', name: 'Администратор', role: 'admin' } }
        : a.p_pin === '1234' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff: { id: 'c', name: 'Кассир 1', role: 'cashier' } } : { error: 'invalid_pin' }
      case 'pos_apply_mutation': st.applied.push(a.p_kind); (st.payloads ||= []).push({ kind: a.p_kind, payload: a.p_payload }); if (a.p_kind === 'table.upsert') { const t = a.p_payload, i = tables.findIndex((x) => x.id === t.id); if (t.isActive === false) { if (i >= 0) tables.splice(i, 1) } else { const row = { id: t.id, name: t.name, zone: t.zone, capacity: t.capacity, sort_order: t.sortOrder }; if (i >= 0) tables[i] = row; else tables.push(row) } } if (a.p_kind === 'legacy.order') st.legacyOrders++; return { duplicate: false, result: {} }
      case 'pos_pull': return { server_time: new Date().toISOString(), staff: { id: 's', name: 'A', role: 'admin' }, orders: [], shifts: [], menu: [], categories: [], tables }
      case 'rescue_store_snapshot': st.snapshots.push(a.p_snapshot.sha256); return { id: 'x', duplicate: false }
      case 'rescue_verify': return { orders_by_day: {}, orders: st.legacyOrders, shifts: 0 }
      case 'rescue_save_report': case 'pos_logout': return null
      case 'report_shift': return { number: 1, cashier_name: 'Кассир 1', opened_at: new Date().toISOString(), initial_cash: 100000, orders_count: 1, total_revenue: 61000, cash_revenue: 61000, click_revenue: 0, discount_total: 0, expected_cash: 161000, dine_in: 1, takeaway: 0, delivery: 0, cancelled_count: 0, unpaid_open_count: 0, top_items: [{ name: 'Супер Комбо Chicken', qty: 1, revenue: 45000 }] }
      case 'report_sales': return { totals: { orders: 42, revenue: 2350000, cash: 1800000, click: 550000, discounts: 45000, cancelled: 1, unpaid_open: 0 },
        by_day: [{ day: '2026-10-02', orders: 20, revenue: 1100000, cash: 800000, click: 300000, legacy_orders: 20, flagged_orders: 3 }, { day: '2026-10-03', orders: 22, revenue: 1250000, cash: 1000000, click: 250000, legacy_orders: 0, flagged_orders: 0 }],
        by_item: [{ name: 'Супер Комбо Chicken', qty: 30, gross: 1350000, net: 1320000 }, { name: 'Компот 0.5', qty: 25, gross: 250000, net: 245000 }],
        by_cashier: [{ cashier: 'Кассир 1', orders: 30, revenue: 1700000 }, { cashier: 'Кассир 2', orders: 12, revenue: 650000 }],
        quality: { legacy_orders: 20, flagged_orders: 3, flags: { shift_inferred: 3 }, unknown_cashier: 0, earliest_legacy_day: '2026-09-12', earliest_any_day: '2026-09-12' } }
      default: throw new Error('unknown rpc ' + fn)
    }
  }
  return { st, handle }
}
const VID = process.env.SHOTS || 'test-results/motion'
const exe = process.env.CHROME || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined) // иначе chromium Playwright (npx playwright install chromium)
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
async function session(vp, fn) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, recordVideo: { dir: VID, size: vp } })
  const { handle } = fakeServer()
  await ctx.route('**/rest/v1/rpc/**', async (route) => {
    const f = route.request().url().split('/rpc/')[1].split('?')[0]
    const body = JSON.parse(route.request().postData() || '{}')
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(handle(f, body)) }) }
    catch (e) { await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: String(e) }) }) }
  })
  await ctx.route('**/realtime/**', (r) => r.abort())
  const page = await ctx.newPage()
  await page.goto('http://localhost:3100/pos')
  await page.getByText('Введите PIN сотрудника').waitFor()
  for (const d of '12345678') await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByText('Столы').first().waitFor()
  await page.waitForTimeout(1500)
  const t0 = Date.now()
  await fn(page)
  const v = page.video()
  await ctx.close()
  return { path: await v.path(), t0 }
}
const W = (p, ms = 650) => p.waitForTimeout(ms)
const r1 = await session({ width: 1366, height: 768 }, async (p) => {
  await p.getByRole('button', { name: /^Стол 2,/ }).click(); await W(p, 900)
  const cards = p.locator('.pcard:not(.pcard-new)')
  for (const i of [0, 2, 3, 0]) { await cards.nth(i).click(); await W(p, 150); if (await p.getByRole('dialog').count()) { await p.getByRole('dialog').getByRole('button', { name: 'Пюре + Рис' }).first().click().catch(() => {}) } await W(p) }
  await p.getByRole('tab', { name: /Напитки/ }).click(); await W(p, 500)
  await p.locator('.pcard:not(.pcard-new)').nth(4).click(); await W(p, 800)
  await p.locator('.line-main').nth(1).click(); await W(p, 900)
  await p.getByRole('button', { name: 'Удалить' }).click(); await W(p, 1100)
  await p.getByRole('button', { name: 'Оплатить' }).click(); await W(p, 1000)
  await p.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click(); await W(p, 800)
  await p.getByRole('button', { name: 'Пречек' }).click(); await W(p, 800)
  await p.getByRole('button', { name: 'Столы' }).first().click(); await W(p, 1800)
})
console.log('desktop', r1.path)
const r2 = await session({ width: 390, height: 844 }, async (p) => {
  await p.getByRole('button', { name: /^Стол 3,/ }).click(); await W(p, 900)
  const cards = p.locator('.pcard:not(.pcard-new)')
  for (const i of [2, 3]) { await cards.nth(i).click(); await W(p, 150); if (await p.getByRole('dialog').count()) { await p.getByRole('dialog').getByRole('button', { name: 'Пюре + Рис' }).first().click().catch(() => {}) } await W(p) }
  await p.getByRole('button', { name: /^Заказ ·/ }).click(); await W(p, 900)
  await p.locator('.line-main').first().click(); await W(p, 1000)
  await p.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click(); await W(p, 900)
  await p.getByRole('button', { name: 'Оплатить' }).click(); await W(p, 1100)
  await p.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click(); await W(p, 1000)
})
console.log('phone', r2.path)
await b.close()
