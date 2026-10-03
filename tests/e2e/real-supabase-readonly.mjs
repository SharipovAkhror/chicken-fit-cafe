// Запуск: BASE=http://localhost:3100 SHARE=http://localhost:3100/ node tests/e2e/real-supabase-readonly.mjs (сборка с .env.local)
// Смоук превью на реальном Supabase: только вход (создаёт сессию), чтение pull/отчётов, выход. Без заказов и смен.
import { chromium } from 'playwright'
const SHARE = process.env.SHARE, BASE = process.env.BASE, OUT = '/workspace/shots'
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const res = []
const check = (n, ok, extra = '') => { res.push(ok); console.log(ok ? 'PASS' : 'FAIL', n, extra) }
for (const vp of [{ w: 1366, h: 768, tag: 'real-1366' }, { w: 390, h: 844, tag: 'real-390' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
  const page = await ctx.newPage()
  const errors = [], rpc = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('response', (r) => { if (r.url().includes('/rest/v1/rpc/')) rpc.push(`${r.url().split('/rpc/')[1]} ${r.status()}`) })
  await page.goto(SHARE)
  await page.goto(`${BASE}/pos`)
  await page.getByText('Введите PIN сотрудника').waitFor({ timeout: 30000 })
  check(`${vp.tag} PIN-экран`, true)
  for (const d of '12345678') await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByText('С собой').waitFor({ timeout: 20000 })
  await page.waitForTimeout(4000)
  check(`${vp.tag} вход по PIN на реальном Supabase`, rpc.some((r) => r.startsWith('pos_login 200')))
  check(`${vp.tag} pull 200`, rpc.some((r) => r.startsWith('pos_pull 200')), rpc.join(', '))
  check(`${vp.tag} статус синхронизации`, await page.getByText('Синхронизировано').count() > 0)
  await page.screenshot({ path: `${OUT}/${vp.tag}-tables.png` })
  await page.getByRole('button', { name: /^Стол 1,/ }).click()
  await page.waitForTimeout(800)
  const tiles = await page.locator('.tile').count()
  check(`${vp.tag} меню из БД`, tiles > 0, `tiles=${tiles}`)
  await page.screenshot({ path: `${OUT}/${vp.tag}-order-empty.png` })
  await page.getByRole('button', { name: 'Столы' }).first().click()
  if (vp.tag === 'real-1366') {
    await page.getByRole('button', { name: 'Отчёты' }).click()
    await page.waitForTimeout(3000)
    check('отчёт report_sales 200', rpc.some((r) => r.startsWith('report_sales 200')))
    await page.screenshot({ path: `${OUT}/${vp.tag}-reports.png` })
    await page.getByRole('button', { name: 'Смена' }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/${vp.tag}-shift.png` })
    const ka = await page.request.get(`${BASE}/api/keepalive`)
    check('/api/keepalive', ka.status() === 200, String(ka.status()))
  }
  await page.getByRole('button', { name: 'Выйти' }).click()
  await page.waitForTimeout(1500)
  check(`${vp.tag} выход`, await page.getByText('Введите PIN сотрудника').count() > 0)
  check(`${vp.tag} нет JS-ошибок`, errors.length === 0, errors.join(' | '))
  await ctx.close()
}
await browser.close()
console.log(`${res.filter(Boolean).length}/${res.length} passed`)
