/**
 * E2E-смоук UI с поддельным сервером (перехват RPC Supabase в браузере) — реальную БД не трогает.
 * Запуск: BASE=http://localhost:3100 node tests/e2e/smoke.mjs  (нужен собранный и запущенный next start)
 * Скриншоты: $SHOTS (по умолчанию test-results/shots). Браузер: $CHROME, /usr/bin/google-chrome или chromium Playwright.
 */
import { chromium } from 'playwright'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = process.env.SHOTS || 'test-results/shots'
mkdirSync(OUT, { recursive: true })
const exe = process.env.CHROME || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined) // иначе chromium Playwright (npx playwright install chromium)

// Как 17 реальных заказов 04.10.2026: оплачен, но status='sent' (кухонный экран не используется) — должен считаться закрытым.
function stuckPaidOrder() {
  const t = new Date(Date.now() - 3600_000).toISOString()
  return { id: '00000000-0000-4000-8000-000000000013', order_number: '013', order_type: 'dine_in', table_id: '5', table_number: '5',
    items: [{ id: 'combo-chicken', name: 'Супер Комбо Chicken', price: 45000, originalPrice: 45000, qty: 1, isKitchen: true }],
    subtotal: 45000, total_amount: 45000, discount_percent: 0, discount_amount: 0, delivery_fee: 0, status: 'sent', payment_status: 'paid',
    payment_method: 'cash', paid_at: t, cashier_name: 'Кассир 1', created_at: t, updated_at: t, source: 'pos', version: 1 }
}
// Продажи «сегодня» и «вчера» (только оплаченные, в зале) — чтобы показатели «Зала» и хиты были живыми, как в работающем кафе.
// Время — относительно текущего (в пределах сегодняшнего дня по Самарканду), позиции — из меню.
function historyOrders() {
  const dish = [['combo-chicken', 'Супер Комбо Chicken', 45000], ['compote-05', 'Освежающий компот 0.5л', 8000], ['borscht', 'Борщ домашний', 20000],
    ['cutlet-chicken', 'Котлеты куриные с гарниром', 35000], ['tea-pot', 'Чай в чайнике', 5000], ['salad-vinegret', 'Винегрет', 12000], ['somsa', 'Сомса с мясом', 8000]]
  const startOfDay = (ms) => { const d = new Date(ms + 5 * 3600_000); d.setUTCHours(0, 0, 0, 0); return d.getTime() - 5 * 3600_000 }
  const out = []
  let seed = 7
  const rnd = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n) }
  for (const [dayShift, count] of [[0, 26], [1, 22]]) {
    const now = Date.now() - dayShift * 86400_000
    const sod = startOfDay(now) + 8 * 3600_000 // кафе с 8:00
    for (let i = 0; i < count; i++) {
      const t = now - 40 * 60_000 - i * 23 * 60_000
      if (t < sod) break
      const items = []
      for (let k = 0; k < 1 + rnd(3); k++) { const [id, name, price] = dish[(k === 0 ? rnd(3) : rnd(dish.length))]; const qty = 1 + rnd(2); items.push({ id, name, price, originalPrice: price, qty, isKitchen: !/compote|tea/.test(id) }) }
      const total = items.reduce((s, x) => s + x.price * x.qty, 0)
      const iso = new Date(t).toISOString()
      out.push({ id: `00000000-0000-4000-9000-${String(dayShift * 100 + i).padStart(12, '0')}`, order_number: String(100 + dayShift * 100 + i), order_type: 'dine_in', table_id: String(1 + rnd(8)), table_number: null,
        items, subtotal: total, total_amount: total, discount_percent: 0, discount_amount: 0, delivery_fee: 0, status: 'completed', payment_status: 'paid',
        payment_method: rnd(3) === 0 ? 'click_payme' : 'cash', paid_at: iso, cashier_name: 'Кассир 1', created_at: new Date(t - 30 * 60_000).toISOString(), updated_at: iso, source: 'pos', version: 1 })
    }
  }
  return out
}
function fakeServer() {
  const st = { applied: [], snapshots: [], orders: new Map(), shifts: new Map(), legacyOrders: 0 }
  const tables = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), name: `Стол ${i + 1}`, zone: i < 6 ? '1 этаж' : 'Антресоль', capacity: 4, sort_order: i + 1 }))
  const handle = (fn, a) => {
    switch (fn) {
      case 'pos_login': return a.p_pin === '12345678' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff: { id: 's', name: 'Администратор', role: 'admin' } }
        : a.p_pin === '1234' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff: { id: 'c', name: 'Кассир 1', role: 'cashier' } } : { error: 'invalid_pin' }
      case 'pos_apply_mutation': st.applied.push(a.p_kind); (st.payloads ||= []).push({ kind: a.p_kind, payload: a.p_payload }); if (a.p_kind === 'table.upsert') { const t = a.p_payload, i = tables.findIndex((x) => x.id === t.id); if (t.isActive === false) { if (i >= 0) tables.splice(i, 1) } else { const row = { id: t.id, name: t.name, zone: t.zone, capacity: t.capacity, sort_order: t.sortOrder }; if (i >= 0) tables[i] = row; else tables.push(row) } } if (a.p_kind === 'legacy.order') st.legacyOrders++; return { duplicate: false, result: {} }
      case 'pos_pull': return { server_time: new Date().toISOString(), staff: { id: 's', name: 'A', role: 'admin' }, orders: [stuckPaidOrder(), ...(st.history ||= historyOrders())], shifts: [], menu: [], categories: [], tables }
      case 'rescue_store_snapshot': st.snapshots.push(a.p_snapshot.sha256); return { id: 'x', duplicate: false }
      case 'rescue_verify': return { orders_by_day: {}, orders: st.legacyOrders, shifts: 0 }
      case 'rescue_save_report': case 'pos_logout': return null
      case 'report_shift': return { number: 1, cashier_name: 'Кассир 1', opened_at: new Date().toISOString(), initial_cash: 100000, orders_count: 1, total_revenue: 61000, cash_revenue: 61000, click_revenue: 0, discount_total: 0, expected_cash: 161000, dine_in: 1, takeaway: 0, delivery: 0, cancelled_count: 0, unpaid_open_count: 0, top_items: [{ name: 'Супер Комбо Chicken', qty: 1, revenue: 45000 }] }
      case 'report_sales': return { totals: { orders: 42, revenue: 2350000, cash: 1800000, click: 550000, discounts: 45000, cancelled: 1, unpaid_open: 0 },
        by_day: [{ day: '2026-10-02', orders: 20, revenue: 1100000, cash: 800000, click: 300000, legacy_orders: 20, flagged_orders: 3 }, { day: '2026-10-03', orders: 22, revenue: 1250000, cash: 1000000, click: 250000, legacy_orders: 0, flagged_orders: 0 }],
        by_item: [{ name: 'Супер Комбо Chicken', qty: 30, gross: 1350000, net: 1320000 }, { name: 'Компот 0.5', qty: 25, gross: 250000, net: 245000 }],
        by_cashier: [{ cashier: 'Кассир 1', orders: 30, revenue: 1700000 }, { cashier: 'Кассир 2', orders: 12, revenue: 650000 }],
        quality: { legacy_orders: 20, flagged_orders: 3, flags: { shift_inferred: 3 }, unknown_cashier: 0, earliest_legacy_day: '2026-09-12', earliest_any_day: '2026-09-12' } }
      case 'pos_photo_ticket': st.photoTickets = (st.photoTickets || 0) + 1; return { bucket: 'menu-photos', path: `items/0000000${st.photoTickets}-0000-4000-8000-000000000000.${a.p_ext}`, thumb: `items/0000000${st.photoTickets}-0000-4000-8000-000000000000-t.${a.p_ext}` }
      case 'pos_photo_release': (st.released ||= []).push(a.p_url); return { bucket: 'menu-photos', paths: [] }
      case 'pos_reopen_order': {
        const src = (st.payloads || []).filter((x) => x.kind === 'order.upsert' && x.payload.id === a.p_order_id).at(-1)?.payload
        if (!src) return { error: 'not_found' }
        st.reopenedAt = '2026-10-05T10:11:12.345678+00:00'; (st.reopens ||= []).push(a)
        return { order: { id: src.id, order_number: src.number, order_type: src.type, table_id: src.tableId, items: src.items, subtotal: src.subtotal, total_amount: src.total,
          discount_percent: src.discountPercent, discount_amount: src.discountAmount, delivery_fee: src.deliveryFee, status: 'open', payment_status: 'unpaid', payment_method: null,
          shift_id: src.shiftId, cashier_name: src.cashierName, created_at: src.createdAt, updated_at: new Date().toISOString(), source: 'pos', reopened_at: st.reopenedAt,
          reopen_paid_amount: src.total, reopen_paid_method: src.paymentMethod } }
      }
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

/** Все запросы к Supabase перехватываются: RPC — поддельный сервер, REST/realtime — блок. Реальная БД не используется. */
async function mockSupabase(ctx) {
  const server = fakeServer()
  await ctx.route(/\.supabase\.co\//, async (route) => {
    const url = route.request().url()
    if (url.includes('/storage/v1/object/menu-photos/')) { const buf = route.request().postDataBuffer() || Buffer.alloc(0); (server.st.uploads ||= []).push({ url, webp: buf.includes('image/webp'), size: buf.length }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: url.split('/object/')[1] }) }) }
    if (!url.includes('/rest/v1/rpc/')) return route.abort()
    const fn = url.split('/rpc/')[1].split('?')[0]
    const body = JSON.parse(route.request().postData() || '{}')
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(server.handle(fn, body)) }) }
    catch (e) { await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: String(e) }) }) }
  })
  return server
}

async function run() {
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
  const results = []
  const check = (name, ok) => { results.push([name, ok]); console.log(ok ? 'PASS' : 'FAIL', name) }
  for (const vp of [{ w: 1366, h: 768, tag: 'pos-1366' }, { w: 390, h: 844, tag: 'phone-390' }, { w: 1920, h: 1080, tag: 'pos-1920' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
    const { st } = await mockSupabase(ctx)
    // legacy-данные v1 кладём ДО загрузки приложения (как на реальной кассе)
    await ctx.addInitScript((fx) => { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(fx)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1') } }, legacyFixture)
    const page = await ctx.newPage()
    // скриншоты — в конечном состоянии анимаций (v2.3: появление строк, диалоги)
    { const shot = page.screenshot.bind(page); page.screenshot = (o = {}) => shot({ animations: 'disabled', ...o }) }
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.nav = async (name) => {
      const btn = page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name, exact: true })
      if (await btn.count()) return btn.click()
      await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Ещё' }).click()
      await page.getByRole('menuitem', { name }).click()
    }
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
      check('оплаченный заказ со статусом кухни «sent» (прод 04.10) не держит стол 5', await page.getByRole('button', { name: 'Стол 5, свободен' }).count() === 1)
    }
    // смена
    await page.nav('Смена')
    await page.getByRole('button', { name: '100 000' }).click()
    await page.screenshot({ path: `${OUT}/${vp.tag}-03-shift-open.png` })
    await page.getByRole('button', { name: 'Открыть смену' }).click()
    await page.getByText('X-отчёт').waitFor()
    // заказ
    await page.nav('Столы')
    await page.getByRole('button', { name: /^Стол 1,/ }).click()
    const pickGarnishIfAsked = async () => {
      const dlg = page.getByRole('dialog')
      if (await dlg.count()) await dlg.getByRole('button', { name: 'Пюре + Рис' }).first().click()
    }
    await page.locator('.pcard').first().click(); await page.waitForTimeout(150); await pickGarnishIfAsked()
    await page.locator('.pcard').first().click(); await page.waitForTimeout(150); await pickGarnishIfAsked()
    if (vp.tag === 'pos-1366') {
      // смесь гарниров: полпорции, Пюре + Рис + Гречка, Пюре +10%
      await page.getByRole('tab', { name: /Гарниры/ }).click()
      await page.locator('.pcard', { hasText: 'Гарнир (Полпорции)' }).click()
      const dlg = page.getByRole('dialog')
      await dlg.getByRole('button', { name: 'Рис', exact: true }).click()
      await dlg.getByRole('button', { name: 'Гречка', exact: true }).click()
      await dlg.getByRole('button', { name: 'Больше: Пюре' }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-13-garnish-mix.png` })
      await dlg.getByRole('button', { name: /^Добавить/ }).click()
      const line = page.getByLabel('Позиции заказа')
      check('смесь гарниров в заказе', (await line.getByText('Гарнир (Полпорции): Пюре + Рис + Гречка').count()) === 1 && (await line.getByText(/44%/).count()) === 0)
      await page.getByRole('tab', { name: /Вторые/ }).click()
      await page.locator('.pcard', { hasText: 'Гуляш' }).first().click()
      await page.getByRole('dialog').getByRole('button', { name: 'Гречка', exact: true }).first().click()
      check('блюдо с гарниром: выбор записан', (await line.getByText('Гарнир: Гречка').count()) >= 1)
      // курица на вес: сразу ввод граммов вручную (вариант → 7 5 0 → Добавить)
      await page.getByRole('tab', { name: /Хрустящий/ }).click()
      await page.locator('.pcard', { hasText: 'Chicken кг' }).click()
      const wd = page.getByRole('dialog')
      await wd.getByRole('radio', { name: 'Крылья' }).click()
      for (const d of '750') await wd.getByRole('button', { name: d, exact: true }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-16-weight.png` })
      await wd.getByRole('button', { name: /^Добавить/ }).click()
      const chickenLine = line.getByRole('button', { name: /^Изменить: Chicken Крылья/ })
      check('курица: 750 г вручную → 67 500, в чеке название + вес + одна сумма', (await chickenLine.innerText()).replace(/\s+/g, ' ').trim() === 'Chicken Крылья 750 г 67 500')
      // правка веса в чеке: строка → 1 0 0 0 → цена пересчитана (3 нажатия + цифры)
      await chickenLine.click()
      const pane = page.getByLabel('Правка позиции')
      for (const d of '1000') await pane.getByRole('button', { name: d, exact: true }).click()
      check('вес в чеке изменён вручную: 1000 г → 90 000', (await pane.getByLabel('Сумма позиции').innerText()).replace(/\s/g, '') === '90000' && (await line.getByText('1000 г').count()) === 1)
      await pane.getByRole('button', { name: /^Сумма:/ }).click()
      for (const d of ['4', '5', '000']) await pane.getByRole('button', { name: d, exact: true }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-21-edit-weight.png` })
      check('сумма → граммы: 45 000 → 500 г', (await line.getByText('500 г', { exact: true }).count()) === 1)
      await pane.getByRole('button', { name: 'Готово' }).click()
      // правка позиции: количество +1, своя цена, быстрый комментарий
      await line.getByRole('button', { name: /^Изменить: Гуляш/ }).click()
      await pane.getByRole('button', { name: 'Плюс один' }).click()
      await pane.getByRole('button', { name: /^Цена за шт:/ }).click()
      for (const d of ['3', '0', '000']) await pane.getByRole('button', { name: d, exact: true }).click()
      await pane.getByRole('button', { name: 'Без лука' }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-22-edit-line.png` })
      await pane.getByRole('button', { name: 'Готово' }).click()
      const gl = (await line.getByRole('button', { name: /^Изменить: Гуляш/ }).innerText()).replace(/\s+/g, ' ')
      const glQty = (await line.getByRole('group', { name: /^Количество: Гуляш/ }).locator('output').innerText()).trim()
      check('количество 2 (степпер в чеке) и своя цена 30 000 → 60 000, пометка «своя цена»', (glQty === '2' && gl.includes('своя цена') && gl.includes('60 000')) || /^2×Гуляш с гарниром своя цена Гарнир: Гречка, Без лука 60 000$/.test(gl.trim()) || (gl.includes('2×') && gl.includes('своя цена') && gl.includes('60 000')))
      check('комментарий к позиции через редактор строки', (await line.getByText('Гарнир: Гречка, Без лука').count()) === 1)
      // новое блюдо прямо из заказа: «+ Новое» → название, цена → Добавить в заказ
      await page.getByRole('button', { name: 'Новое блюдо', exact: true }).click()
      const qd = page.getByRole('dialog')
      await qd.getByLabel('Название').fill('Самса')
      await qd.getByLabel('Цена, сум').fill('12000')
      await page.screenshot({ path: `${OUT}/pos-1366-23-quick-product.png` })
      await qd.getByRole('button', { name: 'Добавить в заказ' }).click()
      await page.waitForTimeout(1200)
      const qp = (st.payloads || []).find((x) => x.kind === 'menu.upsert' && x.payload.nameRu === 'Самса')?.payload
      check('новое блюдо из заказа: в меню (menu.upsert) и в чеке', !!qp && qp.price === 12000 && qp.kind === 'portion' && /^custom-/.test(qp.id) && (await line.getByText('Самса', { exact: true }).count()) === 1)
      // поиск
      await page.getByLabel('Поиск блюда').fill('борщ')
      check('поиск по всему меню', (await page.locator('.pcard').count()) === 1)
      await page.getByRole('button', { name: 'Очистить поиск' }).click()
    }
    const drinks = page.getByRole('tab', { name: /Напитки|Компот|Drinks/i }).first()
    if (await drinks.count()) { await drinks.click(); await page.locator('.pcard').first().click() }
    if (vp.tag === 'phone-390') { await page.screenshot({ path: `${OUT}/${vp.tag}-04-menu.png` }); await page.getByRole('button', { name: /^Заказ ·/ }).click() }
    await page.screenshot({ path: `${OUT}/${vp.tag}-04-order.png` })
    if (vp.tag === 'phone-390') {
      await page.getByLabel('Позиции заказа').getByRole('button', { name: /^Изменить:/ }).first().click()
      await page.getByLabel('Правка позиции').waitFor()
      await page.screenshot({ path: `${OUT}/phone-390-12-edit-line.png` })
      await page.getByLabel('Правка позиции').getByRole('button', { name: 'Готово' }).click()
    }
    await page.evaluate(() => { window.__prints = []; window.print = () => { window.__printed = (window.__printed || 0) + 1; window.__prints.push(document.getElementById('receipt-print-wrapper').outerHTML) } })
    await page.getByRole('button', { name: 'Кухня' }).last().click()
    // после отправки на кухню касса сама возвращается к столам (как в v1)
    await page.getByRole('button', { name: /^Стол 1, занят/ }).waitFor()
    await page.screenshot({ path: `${OUT}/${vp.tag}-04b-tables-busy.png` })
    if (vp.tag === 'pos-1366') {
      await page.getByRole('button', { name: 'Действия: Стол 1' }).click()
      await page.screenshot({ path: `${OUT}/${vp.tag}-04c-table-actions.png` })
      await page.getByRole('menuitem', { name: 'Перенести на другой стол' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Стол 3', exact: true }).click()
      await page.getByRole('button', { name: /^Стол 3, занят/ }).waitFor()
      await page.waitForTimeout(800)
      check('перенос счёта со стола 1 на 3 (order.upsert tableId=3)', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.tableId === '3'))
      // кухня до оплаты: видит отправленный заказ (оплаченный «зависший» №013 — нет), начинает готовить
      await page.nav('Кухня')
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${vp.tag}-06-kitchen.png` })
      check('заказ виден на кухне, оплаченный №013 — нет', await page.getByRole('button', { name: 'Начать' }).count() === 1)
      await page.getByRole('button', { name: 'Начать' }).first().click()
      await page.waitForTimeout(300)
      check('статус кухни меняется', await page.getByRole('button', { name: 'Готово' }).count() >= 1)
      await page.nav('Столы')
      await page.getByRole('button', { name: /^Стол 3, занят/ }).click()
    } else await page.getByRole('button', { name: /^Стол 1, занят/ }).click()
    if (vp.tag === 'phone-390') await page.getByRole('button', { name: /^Заказ ·/ }).click()
    await page.getByRole('button', { name: 'Оплатить' }).click()
    if (vp.tag === 'pos-1366') await page.getByRole('radio', { name: '10%' }).click()
    await page.getByRole('button', { name: '1', exact: true }).click()
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '0', exact: true }).click()
    await page.screenshot({ path: `${OUT}/${vp.tag}-05-payment.png` })
    check(`${vp.tag} в окне оплаты одна главная кнопка «Оплачено»; чек — да, бегунок — нет (по умолчанию)`, await page.getByRole('button', { name: 'Оплачено', exact: true }).count() === 1
      && await page.getByRole('checkbox', { name: 'Печатать чек' }).isChecked() && !(await page.getByRole('checkbox', { name: 'Бегунок на кухню' }).isChecked()))
    const printsBeforePay = await page.evaluate(() => (window.__prints || []).length)
    await page.getByRole('button', { name: 'Оплачено', exact: true }).click()
    await page.getByRole('status').filter({ hasText: /оплачен и закрыт/ }).waitFor()
    const freed = vp.tag === 'pos-1366' ? 'Стол 3' : 'Стол 1'
    check(`${vp.tag} после оплаты: подтверждение «оплачен и закрыт», ${freed} свободен`, (await page.getByRole('status').filter({ hasText: `${freed} свободен` }).count()) === 1 && (await page.getByRole('button', { name: `${freed}, свободен` }).count()) === 1)
    await page.screenshot({ path: `${OUT}/${vp.tag}-05b-paid-closed.png` })
    await page.waitForTimeout(1000)
    const paidPayload = (st.payloads || []).filter((x) => x.kind === 'order.upsert' && x.payload.paymentStatus === 'paid').at(-1)?.payload
    check(`${vp.tag} на сервер ушло paid + ${vp.tag === 'pos-1366' ? 'cooking (кухня уже готовит)' : 'completed'}`, paidPayload?.status === (vp.tag === 'pos-1366' ? 'cooking' : 'completed'))
    if (vp.tag === 'pos-1366') {
      const prints = await page.evaluate(() => window.__prints)
      const payPrints = prints.slice(printsBeforePay)
      check('при оплате по умолчанию печатается только чек гостю (без бегунка)', payPrints.length === 1 && payPrints[0].includes('data-kind="receipt"') && payPrints[0].includes('КАССОВЫЙ ЧЕК ПРОДАЖИ'))
      check('бегунок печатается только по кнопке «Кухня»', prints.length === 2 && prints[0].includes('data-kind="kitchen"') && prints[0].includes('ЗАКАЗ НА КУХНЮ'))
      check('чек в разметке v1: лента 80 мм (paper-80mm), без QR', prints[1].includes('paper-80mm') && !prints[1].includes('<svg'))
      const css = await page.evaluate(() => [...document.styleSheets].map((ss) => { try { return [...ss.cssRules].map((r) => r.cssText).join('\n') } catch { return '' } }).join('\n'))
      for (const [i, paper] of [[0, '80mm'], [1, '58mm']]) {
        const pp = await ctx.newPage()
        await pp.setViewportSize({ width: 400, height: 900 })
        await pp.setContent(`<html><head><style>${css}</style></head><body>${prints[Math.min(i, prints.length - 1)].replace(/paper-80mm/, `paper-${paper}`)}</body></html>`)
        await pp.emulateMedia({ media: 'print' })
        await pp.screenshot({ path: `${OUT}/print-${i === 0 ? 'kitchen' : 'receipt'}-${paper}.png`, fullPage: true })
        await pp.close()
      }
      const last = prints[prints.length - 1]
      const pp = await ctx.newPage(); await pp.setViewportSize({ width: 400, height: 900 })
      await pp.setContent(`<html><head><style>${css}</style></head><body>${last.replace(/paper-80mm/, 'paper-58mm')}</body></html>`)
      await pp.emulateMedia({ media: 'print' }); await pp.screenshot({ path: `${OUT}/print-receipt-58mm.png`, fullPage: true }); await pp.close()
      check('order.upsert отправлен', st.applied.filter((k) => k === 'order.upsert').length >= 2)
      check('доли микса сохранены для кухни (notes), в чеке на экране скрыты', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.items?.some((i) => i.notes === 'Пюре 44% + Рис 28% + Гречка 28% (180г)')))
      check('своя цена уходит на сервер (price ≠ originalPrice → аудит)', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.items?.some((i) => i.name === 'Гуляш с гарниром' && i.price === 30000 && i.originalPrice === 35000 && i.qty === 2)))
      check('скидка 10% из окна оплаты в заказе', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.paymentStatus === 'paid' && Number(x.payload.discountPercent) === 10))
    }
    // кухня после оплаты: начатый кухней заказ остаётся до «Выдано», оплаченный неначатый — нет
    await page.nav('Кухня')
    await page.waitForTimeout(400)
    if (vp.tag === 'pos-1366') {
      check('кухня: оплаченный, но уже готовящийся заказ остаётся на экране', await page.getByRole('button', { name: 'Готово' }).count() === 1)
      await page.getByRole('button', { name: 'Готово' }).click()
      await page.getByRole('button', { name: 'Выдано' }).click()
      await page.waitForTimeout(300)
    }
    check(`${vp.tag} кухня пуста после оплаты/выдачи`, await page.getByText('Нет заказов на кухне').count() === 1)
    if (vp.tag === 'pos-1366') {
      // как на проде: «С собой» → блюдо → сразу «Оплатить» (без «Кухня»), чек выключен
      await page.nav('Столы')
      await page.getByRole('button', { name: 'С собой' }).click()
      await page.locator('.pcard').first().click(); await page.waitForTimeout(150); await pickGarnishIfAsked()
      const printedBefore = await page.evaluate(() => window.__printed || 0)
      await page.getByRole('button', { name: 'Оплатить' }).click()
      await page.getByRole('checkbox', { name: 'Печатать чек' }).uncheck()
      await page.getByRole('button', { name: 'Оплачено', exact: true }).click()
      await page.getByRole('status').filter({ hasText: /оплачен и закрыт/ }).waitFor()
      await page.waitForTimeout(800)
      check('«С собой» оплачен сразу → закрыт, не висит в «С собой и доставка»', await page.getByText('Сейчас нет заказов навынос').count() === 1)
      check('чек выключен, бегунок не выбран → ничего не печатается', (await page.evaluate(() => window.__printed || 0)) - printedBefore === 0)
    }
    if (vp.tag === 'pos-1366') {
      // v3 столы: пречек → «Счёт выдан», объединение, отмена с причиной (аудит)
      const fill = async (n) => {
        await page.getByRole('button', { name: new RegExp(`^Стол ${n},`) }).click()
        await page.locator('.pcard').first().click(); await page.waitForTimeout(150); await pickGarnishIfAsked()
        await page.getByRole('button', { name: 'Кухня' }).last().click()
        await page.getByRole('button', { name: new RegExp(`^Стол ${n}, занят`) }).waitFor()
      }
      await fill(2); await fill(6)
      await page.getByRole('button', { name: 'Действия: Стол 2' }).click()
      await page.getByRole('menuitem', { name: /Пречек/ }).click()
      await page.getByRole('button', { name: /^Стол 2, счёт выдан/ }).waitFor()
      await page.waitForTimeout(800)
      check('пречек со стола: «Счёт выдан» на плане и precheckAt на сервере (#12)', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.tableId === '2' && x.payload.precheckAt))
      await page.screenshot({ path: `${OUT}/pos-1366-26-tables-states.png` })
      await page.getByRole('button', { name: 'Действия: Стол 6' }).click()
      await page.getByRole('menuitem', { name: 'Объединить с другим столом' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Стол 2, занят', exact: true }).click()
      await page.getByRole('button', { name: 'Стол 6, свободен' }).waitFor()
      await page.waitForTimeout(800)
      const merged = (st.payloads || []).find((x) => x.kind === 'order.cancel' && x.payload.mergedInto)
      check('объединение столов (#9): стол 6 → стол 2, order.cancel с mergedInto', !!merged && /Объединён/.test(merged.payload.reason))
      await page.getByRole('button', { name: 'Действия: Стол 2' }).click()
      await page.getByRole('menuitem', { name: 'Отменить заказ…' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Гость ушёл' }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-27-cancel.png` })
      check('отмена: одно красное подтверждение, без PIN', await page.getByRole('dialog').getByText(/PIN/).count() === 0)
      await page.getByRole('dialog').getByRole('button', { name: 'Да, отменить', exact: true }).click()
      await page.getByRole('button', { name: 'Стол 2, свободен' }).waitFor()
      await page.waitForTimeout(800)
      check('отмена с причиной: order.cancel {reason}', (st.payloads || []).some((x) => x.kind === 'order.cancel' && x.payload.reason === 'Гость ушёл' && !x.payload.mergedInto))
      // возобновление оплаченного (#10): сторно на сервере, при повторной оплате — только доплата
      await page.nav('Заказы')
      await page.getByRole('radio', { name: 'Закрытые' }).click()
      await page.getByRole('row', { name: /С собой/ }).first().click()
      await page.getByRole('button', { name: 'Возобновить' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Добавить позиции' }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-27b-reopen-confirm.png` })
      await page.getByRole('dialog').getByRole('button', { name: 'Да, возобновить', exact: true }).click()
      await page.getByText('Ранее оплачено').waitFor()
      check('возобновление: pos_reopen_order с причиной, касса показывает «Ранее оплачено»', st.reopens?.[0]?.p_reason === 'Добавить позиции')
      await page.locator('.pcard').first().click(); await page.waitForTimeout(150); await pickGarnishIfAsked()
      await page.getByRole('button', { name: 'Оплатить' }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-28-reopen-pay.png` })
      check('окно оплаты возобновлённого заказа: «К доплате»', await page.getByRole('dialog').getByText('К доплате').count() === 1)
      await page.getByRole('checkbox', { name: 'Печатать чек' }).uncheck()
      await page.getByRole('button', { name: 'Оплачено', exact: true }).click()
      await page.getByRole('status').filter({ hasText: /оплачен и закрыт/ }).waitFor()
      await page.waitForTimeout(800)
      check('повторная оплата несёт reopenedAt сервера (защита от двойной оплаты)', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.paymentStatus === 'paid' && x.payload.reopenedAt === st.reopenedAt))
    }
    await page.nav('Смена')
    await page.getByRole('button', { name: 'X-отчёт' }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${vp.tag}-07-xreport.png` })
    await page.nav('Отчёты')
    await page.getByText('По дням').waitFor()
    await page.screenshot({ path: `${OUT}/${vp.tag}-08-reports.png`, fullPage: vp.tag === 'phone-390' })
    await page.nav('Заказы')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/${vp.tag}-10-history.png` })
    if (vp.tag === 'pos-1366') check('оплаченные заказы в истории со статусом «Закрыт»', await page.getByRole('button', { name: /Печать чека/ }).count() >= 2 && await page.getByRole('cell', { name: 'Закрыт' }).count() >= 2)
    await page.nav('Меню')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/${vp.tag}-11-menu-admin.png` })
    if (vp.tag === 'pos-1366') {
      await page.getByRole('switch', { name: /^В продаже:/ }).first().click()
      await page.waitForTimeout(1200)
      check('стоп-лист: menu.upsert отправлен', st.applied.includes('menu.upsert'))
      // новое блюдо
      // проверка формы: пустая — ошибки под полями, ничего не отправлено
      await page.getByRole('button', { name: 'Добавить блюдо' }).click()
      const f = page.getByRole('dialog')
      const menuBefore = st.applied.filter((k) => k === 'menu.upsert').length
      await f.getByLabel('Цена, сум').fill('0')
      await f.getByRole('button', { name: 'Сохранить' }).click()
      await page.screenshot({ path: `${OUT}/pos-1366-14b-menu-validation.png` })
      check('форма блюда: пустое название и цена 0 — ошибки, ничего не отправлено', await f.getByText('Введите название').count() === 1 && await f.getByText('Укажите цену больше нуля').count() === 1 && st.applied.filter((k) => k === 'menu.upsert').length === menuBefore)
      await f.getByLabel('Название').fill('Тестовый салат')
      await f.getByLabel('Категория').selectOption({ label: 'Салаты' })
      await f.getByLabel('Цена, сум').fill('27000')
      await f.getByText('Дополнительно').click()
      await f.getByLabel('Или ссылка на фото').fill('/logo-mark.svg')
      await page.screenshot({ path: `${OUT}/pos-1366-14-menu-add.png` })
      await f.getByRole('button', { name: 'Сохранить' }).click()
      await page.waitForTimeout(1200)
      const added = (st.payloads || []).find((x) => x.kind === 'menu.upsert' && x.payload.nameRu === 'Тестовый салат')
      check('новое блюдо: menu.upsert с категорией, ценой и фото', !!added && added.payload.price === 27000 && added.payload.categoryId === 'salads' && added.payload.imageUrl === '/logo-mark.svg' && /^custom-/.test(added.payload.id) && added.payload.kind === 'portion')
      await page.getByRole('button', { name: 'Изменить Тестовый салат' }).click()
      await page.getByRole('dialog').getByLabel('Название').fill('Салат дня')
      // фото с «камеры/галереи»: JPEG 1.5 МБ → WebP ≤ 800 px, ≤ 150 КБ → Storage по талону
      await page.getByTestId('photo-input').setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: readFileSync('public/menu/belyashi.jpg') })
      await page.getByRole('dialog').getByText(/Готово к загрузке/).waitFor()
      await page.screenshot({ path: `${OUT}/pos-1366-14c-menu-photo.png` })
      await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
      await page.waitForTimeout(1500)
      const edited = (st.payloads || []).filter((x) => x.kind === 'menu.upsert' && x.payload.id === added?.payload.id).at(-1)?.payload
      check('редактирование блюда отправлено', edited?.nameRu === 'Салат дня')
      const up = st.uploads || []
      check('фото: талон, 2 файла WebP в Storage (основное ≤150 КБ + миниатюра), ссылка в блюде', st.photoTickets === 1 && up.length === 2 && up.every((u) => u.webp) && up[0].size <= 150 * 1024 && /menu-photos\/items\/.+\.webp$/.test(edited?.imageUrl || ''))
      // дубль названия в категории — ошибка
      await page.getByRole('button', { name: 'Добавить блюдо' }).click()
      await page.getByRole('dialog').getByLabel('Название').fill('  салат   дня ')
      await page.getByRole('dialog').getByLabel('Категория').selectOption({ label: 'Салаты' })
      await page.getByRole('dialog').getByLabel('Цена, сум').fill('1000')
      await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
      check('форма блюда: дубль названия в категории не сохраняется', await page.getByRole('dialog').getByText('Такое блюдо уже есть в этой категории').count() === 1)
      await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()
      await page.waitForTimeout(300)
      // весовой товар с вариантами
      await page.getByRole('button', { name: 'Добавить блюдо' }).click()
      const f2 = page.getByRole('dialog')
      await f2.getByRole('radio', { name: 'На вес' }).click()
      await f2.getByLabel('Название').fill('Крылья на вес')
      await f2.getByLabel('Цена за 1 кг, сум').fill('95000')
      await f2.getByText('Дополнительно').click()
      await f2.getByLabel('Варианты, через запятую').fill('Классика, BBQ')
      await f2.getByLabel('Добавки без доплаты').fill('Острый')
      await page.screenshot({ path: `${OUT}/pos-1366-17-menu-weighted.png` })
      await f2.getByRole('button', { name: 'Сохранить' }).click()
      await page.waitForTimeout(1200)
      const wk = (st.payloads || []).find((x) => x.kind === 'menu.upsert' && x.payload.nameRu === 'Крылья на вес')?.payload
      check('весовой товар: kind=weighted, unit=kg, цена за кг, варианты', !!wk && wk.kind === 'weighted' && wk.unit === 'kg' && wk.pricePerKg === 95000 && wk.options?.variants?.join() === 'Классика,BBQ' && wk.options?.extras?.join() === 'Острый')
      // столы — в «Настройках»
      await page.nav('Настройки')
      await page.getByRole('button', { name: 'Добавить стол' }).click()
      await page.getByRole('dialog').getByLabel('Название').fill('Терраса 1')
      await page.getByRole('dialog').getByLabel('Зал').fill('Терраса')
      await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
      await page.getByRole('button', { name: 'Переименовать Стол 8' }).click()
      await page.getByRole('dialog').getByLabel('Название').fill('VIP')
      await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
      await page.getByRole('button', { name: 'Удалить Стол 7' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Удалить стол' }).click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${OUT}/pos-1366-15-tables-admin.png` })
      const tp = (st.payloads || []).filter((x) => x.kind === 'table.upsert').map((x) => x.payload)
      check('столы: добавить/переименовать/удалить через table.upsert', tp.some((t) => t.id === '9' && t.name === 'Терраса 1' && t.zone === 'Терраса') && tp.some((t) => t.id === '8' && t.name === 'VIP') && tp.some((t) => t.id === '7' && t.isActive === false))
    }
    await page.nav('Настройки')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/${vp.tag}-09-settings.png`, fullPage: vp.tag !== 'pos-1920' })
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
    await mockSupabase(ctx)
    const page = await ctx.newPage()
    page.nav = (name) => page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name, exact: true }).click()
    { const shot = page.screenshot.bind(page); page.screenshot = (o = {}) => shot({ animations: 'disabled', ...o }) }
    await page.goto(`${BASE}/pos`)
    await page.getByText('Введите PIN сотрудника').waitFor()
    await page.waitForTimeout(500)
    await page.evaluate(async () => {
      await new Promise((res) => { const r = indexedDB.open('cf2'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ key: 'theme', value: 'dark' }); tx.oncomplete = res; tx.onerror = res } ; r.onerror = res })
    })
    await page.reload()
    await page.getByText('Введите PIN сотрудника').waitFor()
    await page.screenshot({ path: `${OUT}/pos-1366-12-pin-dark.png` })
    for (const d of '12345678') await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('button', { name: /^Стол 1,/ }).waitFor()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/pos-1366-18-tables-dark.png` })
    await page.getByRole('button', { name: /^Стол 1,/ }).click()
    await page.locator('.pcard').first().click()
    await page.locator('.pcard').nth(1).click()
    const wd = page.getByRole('dialog'); if (await wd.count()) { for (const d of '650') await wd.getByRole('button', { name: d, exact: true }).click(); await page.screenshot({ path: `${OUT}/pos-1366-24-weight-dark.png` }); await wd.getByRole('button', { name: /^Добавить/ }).click() }
    await page.getByLabel('Позиции заказа').getByRole('button', { name: /^Изменить: Chicken/ }).click()
    await page.screenshot({ path: `${OUT}/pos-1366-25-edit-dark.png` })
    await page.getByLabel('Правка позиции').getByRole('button', { name: 'Готово' }).click()
    await page.screenshot({ path: `${OUT}/pos-1366-19-order-dark.png` })
    await page.nav('Меню')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/pos-1366-20-menu-admin-dark.png` })
    await ctx.close()
  }
  // кассир на планшете 1180×820: отмена отправленного на кухню заказа — без PIN (решение владельца 06.10), одно подтверждение
  {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } })
    const { st } = await mockSupabase(ctx)
    await ctx.addInitScript((fx) => { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(fx)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1') } }, legacyFixture)
    const page = await ctx.newPage()
    { const shot = page.screenshot.bind(page); page.screenshot = (o = {}) => shot({ animations: 'disabled', ...o }) }
    page.nav = (name) => page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name, exact: true }).click()
    await page.goto(`${BASE}/pos`)
    await page.getByText('Введите PIN сотрудника').waitFor()
    await page.screenshot({ path: `${OUT}/tab-1180-01-pin.png` })
    for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('button', { name: /^Стол 1,/ }).waitFor()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/tab-1180-02-tables.png` })
    await page.evaluate(() => { window.print = () => {} })
    await page.getByRole('button', { name: /^Стол 1,/ }).click()
    for (let i = 0; i < 2; i++) { await page.locator('.pcard').first().click(); await page.waitForTimeout(150); const dlg = page.getByRole('dialog'); if (await dlg.count()) await dlg.getByRole('button', { name: 'Пюре + Рис' }).first().click() }
    await page.screenshot({ path: `${OUT}/tab-1180-03-order.png` })
    await page.getByRole('button', { name: 'Кухня' }).last().click()
    await page.getByRole('button', { name: /^Стол 1, занят/ }).waitFor()
    await page.getByRole('button', { name: 'Действия: Стол 1' }).click()
    await page.getByRole('menuitem', { name: 'Отменить заказ…' }).click()
    await page.screenshot({ path: `${OUT}/tab-1180-04-cancel-confirm.png` })
    check('кассир: отмена отправленного заказа — без PIN, только красное подтверждение', await page.getByRole('dialog').getByText(/PIN/).count() === 0)
    await page.getByRole('dialog').getByRole('button', { name: 'Да, отменить', exact: true }).click()
    await page.getByRole('button', { name: 'Стол 1, свободен' }).waitFor()
    await page.waitForTimeout(800)
    check('кассир: отмена без причины → order.cancel (сервер запишет «Без причины»)', (st.payloads || []).some((x) => x.kind === 'order.cancel' && x.payload.reason === '' && !('approvalId' in x.payload)))
    await page.nav('Меню')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/tab-1180-05-menu-cashier.png` })
    check('кассир: в меню только переключатели «В продаже», без «Добавить блюдо»', await page.getByRole('button', { name: 'Добавить блюдо' }).count() === 0 && await page.getByRole('switch').count() > 10)
    await ctx.close()
  }
  await browser.close()
  const failed = results.filter(([, ok]) => !ok)
  console.log(`${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
