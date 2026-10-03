/**
 * E2E-смоук UI с поддельным сервером (перехват RPC Supabase в браузере) — реальную БД не трогает.
 * Запуск: BASE=http://localhost:3100 node tests/e2e/smoke.mjs  (нужен собранный и запущенный next start)
 * Скриншоты: /workspace/shots/*.png
 */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = process.env.SHOTS || '/workspace/shots'
const exe = process.env.CHROME || '/usr/bin/google-chrome'

function fakeServer() {
  const st = { applied: [], snapshots: [], orders: new Map(), shifts: new Map(), legacyOrders: 0 }
  const tables = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), name: `Стол ${i + 1}`, zone: i < 6 ? '1 этаж' : 'Антресоль', capacity: 4, sort_order: i + 1 }))
  const handle = (fn, a) => {
    switch (fn) {
      case 'pos_login': return a.p_pin === '12345678' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff: { id: 's', name: 'Администратор', role: 'admin' } }
        : a.p_pin === '1234' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff: { id: 'c', name: 'Кассир 1', role: 'cashier' } } : { error: 'invalid_pin' }
      case 'pos_apply_mutation': st.applied.push(a.p_kind); if (a.p_kind === 'legacy.order') st.legacyOrders++; return { duplicate: false, result: {} }
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

const legacyFixture = {
  chickenfit_pos_orders_v1: JSON.stringify([{ id: 'order_1', orderNumber: '#001', createdAt: '2026-10-02T10:00:00Z', type: 'dine_in', tableNumber: '2',
    items: [{ id: 'combo-chicken', name: 'Супер Комбо Chicken', price: 45000, originalPrice: 45000, qty: 1 }], total: 45000, paymentMethod: 'cash', status: 'completed', isPaid: true, cashierName: 'Кассир 1' }]),
  chickenfit_pos_table_drafts_v2: JSON.stringify({ table_4: { items: [{ id: 'cola', name: 'Coca-Cola', price: 8000, originalPrice: 8000, qty: 2 }], discountPercent: 0, customDiscount: 0, paymentMethod: 'cash' } }),
  'cf-pos-user': JSON.stringify({ name: 'Кассир 1', role: 'cashier', pin: '1234' }),
}

async function run() {
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
  const results = []
  const check = (name, ok) => { results.push([name, ok]); console.log(ok ? 'PASS' : 'FAIL', name) }
  for (const vp of [{ w: 1366, h: 768, tag: 'pos-1366' }, { w: 390, h: 844, tag: 'phone-390' }, { w: 1920, h: 1080, tag: 'pos-1920' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
    const { st, handle } = fakeServer()
    await ctx.route('**/rest/v1/rpc/**', async (route) => {
      const fn = route.request().url().split('/rpc/')[1].split('?')[0]
      const body = JSON.parse(route.request().postData() || '{}')
      try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(handle(fn, body)) }) }
      catch (e) { await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: String(e) }) }) }
    })
    await ctx.route('**/realtime/**', (r) => r.abort())
    // legacy-данные v1 кладём ДО загрузки приложения (как на реальной кассе)
    await ctx.addInitScript((fx) => { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(fx)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1') } }, legacyFixture)
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`${BASE}/pos`)
    await page.getByText('Введите PIN сотрудника').waitFor()
    await page.waitForTimeout(800)
    if (vp.tag === 'pos-1366') check('снимок legacy отправлен до входа', st.snapshots.length === 1)
    await page.screenshot({ path: `${OUT}/${vp.tag}-01-pin.png` })
    for (const d of '0000') await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByText('Неверный PIN').waitFor()
    for (const d of '12345678') await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByText('Столы').first().waitFor()
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${OUT}/${vp.tag}-02-tables.png` })
    if (vp.tag === 'pos-1366') {
      check('legacy-импорт поставлен в очередь и отправлен', st.legacyOrders >= 2)
      const ls = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])))
      const same = Object.keys(legacyFixture).every((k) => ls[k] === legacyFixture[k]) && Object.keys(ls).length === Object.keys(legacyFixture).length
      if (!same) console.log('localStorage now:', ls)
      check('legacy-ключи localStorage не изменены, новых ключей нет', same)
      check('черновик стола 4 показан как занятый стол', await page.getByRole('button', { name: /Стол 4, занят/ }).count() === 1)
    }
    // смена
    await page.getByRole('button', { name: 'Смена' }).click()
    await page.getByRole('button', { name: '100 000' }).click()
    await page.screenshot({ path: `${OUT}/${vp.tag}-03-shift-open.png` })
    await page.getByRole('button', { name: 'Открыть смену' }).click()
    await page.getByText('X-отчёт').waitFor()
    // заказ
    await page.getByRole('button', { name: 'Столы' }).click()
    await page.getByRole('button', { name: /^Стол 1,/ }).click()
    await page.locator('.tile').first().click()
    await page.locator('.tile').first().click()
    const drinks = page.getByRole('tab', { name: /Напитки|Компот|Drinks/i }).first()
    if (await drinks.count()) { await drinks.click(); await page.locator('.tile').first().click() }
    if (vp.tag === 'phone-390') { await page.screenshot({ path: `${OUT}/${vp.tag}-04-menu.png` }); await page.getByRole('button', { name: /^Заказ ·/ }).click() }
    await page.screenshot({ path: `${OUT}/${vp.tag}-04-order.png` })
    await page.evaluate(() => { window.__prints = []; window.print = () => { window.__printed = (window.__printed || 0) + 1; window.__prints.push(document.getElementById('v2-print').outerHTML) } })
    await page.getByRole('button', { name: 'Кухня' }).last().click()
    await page.getByText('Отправлено на кухню').waitFor()
    await page.getByRole('button', { name: 'Оплатить' }).click()
    await page.getByRole('button', { name: '1', exact: true }).click()
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '0', exact: true }).click()
    await page.screenshot({ path: `${OUT}/${vp.tag}-05-payment.png` })
    await page.getByRole('button', { name: 'Оплачено + чек' }).click()
    await page.waitForTimeout(1500)
    if (vp.tag === 'pos-1366') {
      check('печать вызвана (кухня + чек)', (await page.evaluate(() => window.__printed)) >= 2)
      const prints = await page.evaluate(() => window.__prints)
      const css = await page.evaluate(() => [...document.styleSheets].map((ss) => { try { return [...ss.cssRules].map((r) => r.cssText).join('\n') } catch { return '' } }).join('\n'))
      for (const [i, paper] of [[0, '80mm'], [1, '58mm']]) {
        const pp = await ctx.newPage()
        await pp.setViewportSize({ width: 400, height: 900 })
        await pp.setContent(`<html><head><style>${css}</style></head><body>${prints[Math.min(i, prints.length - 1)].replace(/data-paper="[^"]+"/, `data-paper="${paper}"`)}</body></html>`)
        await pp.emulateMedia({ media: 'print' })
        await pp.screenshot({ path: `${OUT}/print-${i === 0 ? 'kitchen' : 'receipt'}-${paper}.png`, fullPage: true })
        await pp.close()
      }
      const last = prints[prints.length - 1]
      const pp = await ctx.newPage(); await pp.setViewportSize({ width: 400, height: 900 })
      await pp.setContent(`<html><head><style>${css}</style></head><body>${last.replace(/data-paper="[^"]+"/, 'data-paper="58mm"')}</body></html>`)
      await pp.emulateMedia({ media: 'print' }); await pp.screenshot({ path: `${OUT}/print-receipt-58mm.png`, fullPage: true }); await pp.close()
      check('order.upsert отправлен', st.applied.filter((k) => k === 'order.upsert').length >= 2)
    }
    // кухня
    await page.getByRole('button', { name: 'Кухня' }).first().click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/${vp.tag}-06-kitchen.png` })
    if (vp.tag === 'pos-1366') {
      check('заказ виден на кухне', await page.getByRole('button', { name: 'Начать' }).count() >= 1)
      await page.getByRole('button', { name: 'Начать' }).first().click()
      await page.waitForTimeout(300)
      check('статус кухни меняется', await page.getByRole('button', { name: 'Готово' }).count() >= 1)
    }
    await page.getByRole('button', { name: 'Смена' }).click()
    await page.getByRole('button', { name: 'X-отчёт' }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${vp.tag}-07-xreport.png` })
    await page.getByRole('button', { name: 'Отчёты' }).click()
    await page.getByText('По дням').waitFor()
    await page.screenshot({ path: `${OUT}/${vp.tag}-08-reports.png`, fullPage: vp.tag === 'phone-390' })
    await page.getByRole('button', { name: 'Заказы' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/${vp.tag}-10-history.png` })
    if (vp.tag === 'pos-1366') check('оплаченный заказ в истории', await page.getByRole('button', { name: /Печать чека/ }).count() >= 1)
    await page.getByRole('button', { name: 'Меню' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/${vp.tag}-11-menu-admin.png` })
    if (vp.tag === 'pos-1366') {
      await page.getByRole('button', { name: 'В продаже' }).first().click()
      await page.waitForTimeout(1200)
      check('стоп-лист: menu.upsert отправлен', st.applied.includes('menu.upsert'))
    }
    await page.getByRole('button', { name: 'Бэкап' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/${vp.tag}-09-backup.png` })
    if (vp.tag === 'pos-1366') {
      await page.emulateMedia({ media: 'print' })
      await page.evaluate(() => { document.documentElement.dataset.x = '1' })
      check('нет ошибок JS', errors.length === 0)
      if (errors.length) console.log(errors)
    }
    await ctx.close()
  }
  // тёмная тема
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/pos`)
    await page.getByText('Введите PIN сотрудника').waitFor()
    await page.waitForTimeout(500)
    await page.evaluate(async () => {
      await new Promise((res) => { const r = indexedDB.open('cf2'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ key: 'theme', value: 'dark' }); tx.oncomplete = res; tx.onerror = res } ; r.onerror = res })
    })
    await page.reload()
    await page.getByText('Введите PIN сотрудника').waitFor()
    await page.screenshot({ path: `${OUT}/pos-1366-12-pin-dark.png` })
    await ctx.close()
  }
  await browser.close()
  const failed = results.filter(([, ok]) => !ok)
  console.log(`${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
