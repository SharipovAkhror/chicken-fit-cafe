/**
 * Длинный чек не обрезается при печати: гость/пречек/кухня/Z на ленте 80 мм, 120 позиций.
 * Вставляет длинную разметку в #receipt-print-wrapper внутри реального /pos (поддельный сервер),
 * печатает в PDF (лист 80×297 мм, как у драйвера по умолчанию) и проверяет, что последняя строка есть в PDF.
 * Запуск: BASE=http://localhost:3100 SHOTS=dir node tests/e2e/receipt-length.mjs
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = process.env.SHOTS || 'test-results/shots/receipt-length'
mkdirSync(OUT, { recursive: true })
const exe = process.env.CHROME || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)
const staff = { id: 'c', name: 'Кассир 1', role: 'cashier' }
const handle = (fn, a) => fn === 'pos_login' ? (a.p_pin === '1234' ? { token: 't', expires_at: new Date(Date.now() + 36e5).toISOString(), staff } : { error: 'invalid_pin' })
  : fn === 'pos_pull' ? { server_time: new Date().toISOString(), staff, orders: [], shifts: [], menu: [], categories: [], tables: [] } : { ok: true }
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } })
await ctx.route(/\.supabase\.co\//, async (r) => {
  const u = r.request().url(); if (!u.includes('/rest/v1/rpc/')) return r.abort()
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(handle(u.split('/rpc/')[1].split('?')[0], JSON.parse(r.request().postData() || '{}'))) })
})
const page = await ctx.newPage()
await page.goto(`${BASE}/pos`)
await page.getByText('Введите PIN сотрудника').waitFor()
for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click()
await page.getByRole('button', { name: 'Войти' }).click()
await page.getByText('Столы').first().waitFor()
await page.waitForTimeout(800)
const N = 120
const rows = (k) => Array.from({ length: N }, (_, i) => `<div class="flex justify-between border-b border-dashed border-black"><span class="flex-1">${i + 1}. ${k} позиция с длинным названием блюда</span><span class="whitespace-nowrap tabular-nums">${(i + 1) * 1000} сум</span></div>`).join('')
const html = {
  guest: `<div class="receipt-container guest-receipt-print"><div class="receipt"><div class="receipt-brand-title">CHICKENFIT</div>${rows('Гость')}<div>ИТОГО: 7 260 000</div><div>ПОСЛЕДНЯЯ-СТРОКА-guest</div><div class="receipt-tear-off">- - - -</div></div></div>`,
  precheck: `<div class="receipt-container guest-receipt-print"><div class="receipt"><div>ПРЕЧЕК</div>${rows('Пречек')}<div>ПОСЛЕДНЯЯ-СТРОКА-precheck</div></div></div>`,
  kitchen: `<div class="receipt-container kitchen-receipt-print"><div class="receipt receipt--kitchen">${rows('Кухня')}<div>ПОСЛЕДНЯЯ-СТРОКА-kitchen</div><div class="receipt-tear-off">- - - -</div></div></div>`,
  shift: `<div class="receipt-container shift-receipt-print"><div class="receipt"><div>Z-ОТЧЁТ</div>${rows('Z')}<div>ПОСЛЕДНЯЯ-СТРОКА-shift</div></div></div>`,
}
let ok = 0
for (const mode of Object.keys(html)) {
  await page.evaluate(([m, h]) => { const w = document.getElementById('receipt-print-wrapper'); w.className = `receipt-hidden print-mode-${m} paper-80mm`; w.innerHTML = h }, [mode, html[mode]])
  const pdf = `${OUT}/${mode}.pdf`
  writeFileSync(pdf, await page.pdf({ width: '80mm', height: '297mm', printBackground: true }))
  const text = execFileSync('pdftotext', [pdf, '-']).toString()
  const pages = (text.match(/\f/g) || []).length
  const pass = text.includes(`ПОСЛЕДНЯЯ-СТРОКА-${mode}`) && text.includes(`${N}. `)
  execFileSync('pdftoppm', ['-png', '-r', '60', pdf, `${OUT}/${mode}`])
  console.log(pass ? 'PASS' : 'FAIL', mode, `страниц: ${pages}`)
  if (pass) ok++
}
await browser.close()
console.log(`${ok}/4`)
process.exit(ok === 4 ? 0 : 1)
