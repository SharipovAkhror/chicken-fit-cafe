/**
 * Печать тестовых чеков «как на принтере»: HTML из tests/unit/receipt-fixtures.test.ts + собранный CSS приложения (.next),
 * Chrome print → PDF (лента 80 мм, а также страница 72 мм — драйвер с «печатной» шириной) → PNG 203 dpi (как термопринтер).
 * Запуск: npm run build && RECEIPT_OUT=/tmp/rc npx vitest run tests/unit/receipt-fixtures.test.ts && node tests/e2e/receipt-render.mjs /tmp/rc <out> [paper=80mm]
 */
import { chromium } from 'playwright'
import { readFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [src = '/tmp/rc', out = 'test-results/receipts', paper = '80mm'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : [] })
const css = walk('.next/static').map((f) => readFileSync(f, 'utf8')).join('\n')
const exe = process.env.CHROME || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const page = await browser.newPage()
for (const f of readdirSync(src).filter((x) => x.endsWith('.html'))) {
  const [name, mode] = f.replace(/\.html$/, '').split('.')
  const body = readFileSync(join(src, f), 'utf8')
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div id="receipt-print-wrapper" class="receipt-hidden print-mode-${mode} paper-${paper}">${body}</div></body></html>`)
  await page.emulateMedia({ media: 'print' })
  const h = await page.evaluate(() => Math.ceil(document.getElementById('receipt-print-wrapper').getBoundingClientRect().height))
  for (const pageW of paper === '80mm' ? ['80mm', '72mm'] : ['58mm', '48mm']) {
    const pdf = join(out, `${name}-${paper}-page${pageW}.pdf`)
    await page.pdf({ path: pdf, width: pageW, height: `${Math.ceil(h * 0.2646) + 6}mm`, margin: { top: 0, right: 0, bottom: 0, left: 0 }, printBackground: true })
    execFileSync('pdftoppm', ['-r', '203', '-png', '-singlefile', pdf, pdf.replace(/\.pdf$/, '')])
    console.log('ok', pdf.replace(/\.pdf$/, '.png'))
  }
}
await browser.close()
