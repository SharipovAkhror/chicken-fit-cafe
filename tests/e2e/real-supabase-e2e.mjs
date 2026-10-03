// E2E на РЕАЛЬНОМ Supabase через UI v2 под тестовым сотрудником (staff.is_test=true → все записи source='dev_test').
// Запуск: TEST_PIN=xxxxxxxx BASE=http://localhost:3100 node tests/e2e/real-supabase-e2e.mjs  (сборка с .env.local)
// Сценарий: вход (POS + KDS в двух контекстах), открыть смену, заказ на стол, кухня, realtime, оплата, X-отчёт.
// Смену НЕ закрывает (Z-отчёт не делается). Удаление тестовых строк — отдельным SQL после прогона.
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:3100', PIN = process.env.TEST_PIN, OUT = process.env.SHOTS ?? '/workspace/shots', TABLE = process.env.TABLE ?? '2'
if (!PIN) throw new Error('TEST_PIN required')
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const res = [], devices = new Set(), log = []
const check = (n, ok, extra = '') => { res.push(ok); console.log(ok ? 'PASS' : 'FAIL', n, extra) }
const t = () => Date.now()

async function open(path, vp, tag) {
  const ctx = await browser.newContext({ viewport: vp })
  const page = await ctx.newPage()
  const st = { errors: [], rpc: [], wsFrames: 0, ws: 0 }
  page.on('pageerror', (e) => st.errors.push(String(e)))
  page.on('request', (r) => { if (r.url().includes('/rpc/pos_login')) { try { devices.add(JSON.parse(r.postData()).p_device_id) } catch {} } })
  page.on('response', (r) => { if (r.url().includes('/rest/v1/rpc/')) st.rpc.push(`${r.url().split('/rpc/')[1]} ${r.status()}`) })
  page.on('websocket', (ws) => { if (ws.url().includes('/realtime/')) { st.ws++; ws.on('framereceived', (f) => { { const s = typeof f.payload === 'string' ? f.payload : Buffer.from(f.payload).toString('latin1'); if (s.includes('cf-sync') && s.includes('change') && !s.includes('phx_')) st.wsFrames++ } }) } })
  await page.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1 } })
  await page.goto(`${BASE}${path}`)
  await page.getByText('Введите PIN сотрудника').waitFor({ timeout: 30000 })
  for (const d of PIN) await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('button', { name: 'Войти' }).click()
  log.push(`${tag}: login`)
  return { ctx, page, st }
}

const pos = await open('/pos', { width: 1366, height: 768 }, 'pos')
await pos.page.getByText('С собой').waitFor({ timeout: 20000 })
check('POS: вход тестового сотрудника (pos_login 200)', pos.st.rpc.some((r) => r.startsWith('pos_login 200')))
const kds = await open('/kds', { width: 1280, height: 800 }, 'kds')
await kds.page.getByText(/Кухня · Chicken/).waitFor({ timeout: 20000 })
await kds.page.waitForTimeout(3000)
check('KDS: вход и realtime-подключение', kds.st.ws > 0, `ws=${kds.st.ws}`)

// смена
const P = pos.page
await P.getByRole('button', { name: 'Смена' }).click()
await P.getByRole('button', { name: '100 000' }).click()
await P.getByRole('button', { name: 'Открыть смену' }).click()
await P.getByText('X-отчёт').waitFor()
await P.waitForTimeout(2500)
check('смена открыта и отправлена (shift.upsert)', pos.st.rpc.filter((r) => r.startsWith('pos_apply_mutation 200')).length >= 1)

// заказ: Гуляш с гарниром (смесь 50/50) + напиток
await P.getByRole('button', { name: 'Столы' }).click()
await P.getByRole('button', { name: new RegExp(`^Стол ${TABLE},`) }).click()
await P.getByRole('tab', { name: /Вторые/ }).click()
await P.locator('.tile', { hasText: 'Гуляш' }).first().click()
await P.getByRole('dialog').getByRole('button', { name: 'Пюре + Гречка' }).click()
await P.getByRole('tab', { name: /Напитки/ }).click()
await P.locator('.tile').first().click()
await P.screenshot({ path: `${OUT}/real-e2e-01-order.png` })
const framesBefore = kds.st.wsFrames
const t0 = t()
await P.getByRole('button', { name: 'Кухня' }).last().click()
await P.getByText('Отправлено на кухню').waitFor()
// KDS: заказ должен появиться без перезагрузки
const card = kds.page.locator('article', { hasText: `Стол ${TABLE}` })
await card.first().waitFor({ timeout: 30000 })
const dtKitchen = t() - t0
check('realtime: заказ появился на KDS', true, `${(dtKitchen / 1000).toFixed(1)} с; broadcast-кадров: ${kds.st.wsFrames - framesBefore}`)
check('realtime быстрее polling (15 с)', dtKitchen < 10000 && kds.st.wsFrames > framesBefore)
check('KDS показывает гарнир', (await card.getByText('Гарнир: Пюре 50% + Гречка 50%').count()) === 1)
await kds.page.screenshot({ path: `${OUT}/real-e2e-02-kds.png` })

// KDS → POS: статусы
await P.getByRole('button', { name: 'Столы' }).first().click()
const tile = P.getByRole('button', { name: new RegExp(`^Стол ${TABLE}, занят`) })
await tile.waitFor()
const t1 = t()
await card.getByRole('button', { name: 'Начать' }).click()
await tile.getByText('Готовится').waitFor({ timeout: 30000 })
const dtCook = t() - t1
check('realtime: статус «Готовится» с KDS виден на кассе', true, `${(dtCook / 1000).toFixed(1)} с`)
await card.getByRole('button', { name: 'Готово' }).click()
await tile.getByText(/· Готов$/).waitFor({ timeout: 30000 })
await P.screenshot({ path: `${OUT}/real-e2e-03-tables-ready.png` })

// оплата
await tile.click()
await P.getByRole('button', { name: 'Оплатить' }).click()
await P.getByRole('button', { name: '1', exact: true }).click()
for (let i = 0; i < 6; i++) await P.getByRole('button', { name: '0', exact: true }).click()
await P.getByRole('button', { name: 'Оплачено + чек' }).click()
await P.waitForTimeout(3000)
check('оплата: печать чека вызвана', (await P.evaluate(() => window.__printed || 0)) >= 1)
const t2 = t()
await card.first().waitFor({ state: 'detached', timeout: 30000 })
check('realtime: оплаченный (готовый) заказ ушёл с KDS', true, `${((t() - t2) / 1000).toFixed(1)} с`)

// X-отчёт
await P.getByRole('button', { name: 'Смена' }).click()
await P.getByRole('button', { name: 'X-отчёт' }).click()
await P.waitForTimeout(3000)
await P.screenshot({ path: `${OUT}/real-e2e-04-xreport.png` })
check('X-отчёт с сервера (report_shift 200)', pos.st.rpc.some((r) => r.startsWith('report_shift 200')))
const body = await P.locator('body').innerText()
check('X-отчёт: 1 заказ в смене', /Заказов\D{0,20}1\b/.test(body), body.match(/Заказов[^\n]*/)?.[0] ?? '')
await P.waitForTimeout(2000)
const pending = await P.evaluate(() => new Promise((res) => { const r = indexedDB.open('cf2'); r.onsuccess = () => { const tx = r.result.transaction('outbox'); const q = tx.objectStore('outbox').getAll(); q.onsuccess = () => res(q.result.map((o) => ({ kind: o.kind, err: o.lastError, blocked: o.blocked }))) } }))
check('outbox пуст (всё дошло до сервера)', pending.length === 0, JSON.stringify(pending))
check('нет ошибок JS', !pos.st.errors.length && !kds.st.errors.length, [...pos.st.errors, ...kds.st.errors].join(' | '))
console.log('RPC POS:', pos.st.rpc.join(', '))
console.log('DEVICES:', [...devices].join(','))
await browser.close()
console.log(`${res.filter(Boolean).length}/${res.length} passed`)
process.exit(res.every(Boolean) ? 0 : 1)
