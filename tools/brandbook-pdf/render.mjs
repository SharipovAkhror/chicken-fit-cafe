import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = process.cwd()
const source = path.join(root, 'tools/brandbook-pdf/brandbook.html')
const output = path.join(root, 'ChickenFit-Brandbook-v1.pdf')

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } })
await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.pdf({
  path: output,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: true,
})
await browser.close()
console.log(output)
