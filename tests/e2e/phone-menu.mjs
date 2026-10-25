/**
 * Меню на телефоне (390×844), вход кассиром: карточки блюд редактируются, есть «Добавить», фото (камера/галерея), «Отмена/Сохранить».
 * Поддельный сервер, реальную БД не трогает. Запуск: BASE=http://localhost:3100 SHOTS=dir node tests/e2e/phone-menu.mjs
 */
import { chromium } from 'playwright'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = process.env.SHOTS || 'test-results/shots/phone-menu'
const EXPECT = process.env.EXPECT !== '0'
mkdirSync(OUT, { recursive: true })
const exe = process.env.CHROME || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)
const fx = JSON.parse(readFileSync(new URL('./fixtures-menu.json', import.meta.url), 'utf8'))
const applied = []
const handle = (fn, a) => {
  if (fn === 'pos_login') return a.p_pin === '1234' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff: { id: 'c', name: 'Кассир 1', role: 'cashier' } } : { error: 'invalid_pin' }
  if (fn === 'pos_pull') return { server_time: new Date().toISOString(), staff: { id: 'c', name: 'Кассир 1', role: 'cashier' }, orders: [], shifts: [], menu: fx.menu, categories: fx.categories, tables: [] }
  if (fn === 'pos_apply_mutation') { applied.push(a); return { ok: true } }
  return {}
}
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await ctx.route(/\.supabase\.co\//, async (route) => {
  const url = route.request().url()
  if (!url.includes('/rest/v1/rpc/')) return route.abort()
  const fn = url.split('/rpc/')[1].split('?')[0]
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(handle(fn, JSON.parse(route.request().postData() || '{}'))) })
})
const page = await ctx.newPage()
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, animations: 'disabled' })
const res = []
const check = (n, ok) => { res.push(ok); console.log(ok ? 'PASS' : 'FAIL', n) }
await page.goto(`${BASE}/pos`)
await page.getByText('Введите PIN сотрудника').waitFor()
for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click()
await page.getByRole('button', { name: 'Войти' }).click()
await page.getByText('Столы').first().waitFor()
await page.waitForTimeout(1500)
await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Меню', exact: true }).click()
await page.waitForTimeout(800)
await shot('01-menu-list')
const first = fx.menu.find((m) => !m.is_deleted && !m.needs_review)
const editBtn = page.getByRole('button', { name: `Изменить ${first.name_ru}` })
check('кассир видит редактируемую карточку', await editBtn.count() > 0 && await editBtn.first().isEnabled())
check('кнопка «Добавить» видна', await page.getByRole('button', { name: /Добавить блюдо|^Добавить$/ }).first().isVisible().catch(() => false))
if (EXPECT) {
  await editBtn.first().click()
  await page.waitForTimeout(500)
  await shot('02-edit-top')
  check('фото: камера и галерея сразу видны', await page.getByRole('button', { name: /Камера/ }).isVisible() && await page.getByRole('button', { name: /Галерея/ }).isVisible())
  check('камера: capture=environment', await page.locator('input[type=file][capture]').count() === 1)
  check('кассир не видит «Убрать из меню»', await page.getByRole('button', { name: /Убрать из меню/ }).count() === 0)
  const save = page.getByRole('button', { name: 'Сохранить' })
  check('«Сохранить» в зоне видимости без прокрутки', await save.isVisible() && (await save.boundingBox()).y + 40 <= 844)
  check('есть «Отмена»', await page.getByRole('button', { name: 'Отмена' }).isVisible())
  const w = await page.evaluate(() => document.documentElement.scrollWidth)
  check('нет горизонтальной прокрутки', w <= 390)
  await page.getByRole('textbox', { name: /Цена/ }).fill('99000')
  await save.click()
  await page.waitForTimeout(1500)
  check('правка ушла на сервер', applied.some((a) => JSON.stringify(a).includes('99000')))
  await page.getByRole('button', { name: /Добавить блюдо|^Добавить$/ }).first().click()
  await page.waitForTimeout(400)
  await shot('03-new')
}
await browser.close()
if (res.includes(false)) { console.log('FAILED'); process.exit(1) }
console.log('OK', res.length)
