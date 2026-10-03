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
    // скриншоты — в конечном состоянии анимаций (v2.3: появление строк, диалоги)
    { const shot = page.screenshot.bind(page); page.screenshot = (o = {}) => shot({ animations: 'disabled', ...o }) }
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
      check('количество 2 и своя цена 30 000 → 60 000, пометка «своя цена»', /^2×Гуляш с гарниром своя цена Гарнир: Гречка, Без лука 60 000$/.test(gl.trim()) || (gl.includes('2×') && gl.includes('своя цена') && gl.includes('60 000')))
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
    await page.evaluate(() => { window.__prints = []; window.print = () => { window.__printed = (window.__printed || 0) + 1; window.__prints.push(document.getElementById('v2-print').outerHTML) } })
    await page.getByRole('button', { name: 'Кухня' }).last().click()
    // после отправки на кухню касса сама возвращается к столам (как в v1)
    await page.getByRole('button', { name: /^Стол 1, занят/ }).waitFor()
    await page.screenshot({ path: `${OUT}/${vp.tag}-04b-tables-busy.png` })
    if (vp.tag === 'pos-1366') {
      await page.getByRole('button', { name: 'Перенести счёт Стол 1' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Стол 3', exact: true }).click()
      await page.getByRole('button', { name: /^Стол 3, занят/ }).waitFor()
      await page.waitForTimeout(800)
      check('перенос счёта со стола 1 на 3 (order.upsert tableId=3)', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.tableId === '3'))
      await page.getByRole('button', { name: /^Стол 3, занят/ }).click()
    } else await page.getByRole('button', { name: /^Стол 1, занят/ }).click()
    if (vp.tag === 'phone-390') await page.getByRole('button', { name: /^Заказ ·/ }).click()
    await page.getByRole('button', { name: 'Оплатить' }).click()
    if (vp.tag === 'pos-1366') await page.getByRole('radio', { name: '10%' }).click()
    await page.getByRole('button', { name: '1', exact: true }).click()
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '0', exact: true }).click()
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
      check('доли микса сохранены для кухни (notes), в чеке на экране скрыты', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.items?.some((i) => i.notes === 'Пюре 44% + Рис 28% + Гречка 28% (180г)')))
      check('своя цена уходит на сервер (price ≠ originalPrice → аудит)', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.items?.some((i) => i.name === 'Гуляш с гарниром' && i.price === 30000 && i.originalPrice === 35000 && i.qty === 2)))
      check('скидка 10% из окна оплаты в заказе', (st.payloads || []).some((x) => x.kind === 'order.upsert' && x.payload.paymentStatus === 'paid' && Number(x.payload.discountPercent) === 10))
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
      // новое блюдо
      await page.getByRole('button', { name: 'Добавить блюдо' }).click()
      const f = page.getByRole('dialog')
      await f.getByLabel('Название').fill('Тестовый салат')
      await f.getByLabel('Категория').selectOption({ label: 'Салаты' })
      await f.getByLabel('Цена, сум').fill('27000')
      await f.getByText('Дополнительно').click()
      await f.getByLabel(/Фото/).fill('/logo-mark.svg')
      await page.screenshot({ path: `${OUT}/pos-1366-14-menu-add.png` })
      await f.getByRole('button', { name: 'Сохранить' }).click()
      await page.waitForTimeout(1200)
      const added = (st.payloads || []).find((x) => x.kind === 'menu.upsert' && x.payload.nameRu === 'Тестовый салат')
      check('новое блюдо: menu.upsert с категорией, ценой и фото', !!added && added.payload.price === 27000 && added.payload.categoryId === 'salads' && added.payload.imageUrl === '/logo-mark.svg' && /^custom-/.test(added.payload.id) && added.payload.kind === 'portion')
      await page.getByRole('button', { name: 'Изменить Тестовый салат' }).click()
      await page.getByRole('dialog').getByLabel('Название').fill('Салат дня')
      await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
      await page.waitForTimeout(1200)
      check('редактирование блюда отправлено', (st.payloads || []).some((x) => x.kind === 'menu.upsert' && x.payload.nameRu === 'Салат дня' && x.payload.id === added?.payload.id))
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
      // столы
      await page.getByRole('tab', { name: 'Столы' }).click()
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
    await page.getByRole('button', { name: 'Меню' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/pos-1366-20-menu-admin-dark.png` })
    await ctx.close()
  }
  await browser.close()
  const failed = results.filter(([, ok]) => !ok)
  console.log(`${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
}
run().catch((e) => { console.error(e); process.exit(1) })
