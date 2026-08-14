import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { chromium } from 'playwright'

const UPLOAD_DIR = 'C:/Users/User/.gemini/antigravity-ide/brain/4cb991bd-0743-4ff5-9761-69df3acee95e/.user_uploaded'
const MENU_DIR = path.resolve('public/menu')
const BANNERS_DIR = path.resolve('public/assets/banners')

async function main() {
  if (!fs.existsSync(MENU_DIR)) fs.mkdirSync(MENU_DIR, { recursive: true })
  if (!fs.existsSync(BANNERS_DIR)) fs.mkdirSync(BANNERS_DIR, { recursive: true })

  // 1. Copy full promotional banners
  fs.copyFileSync(path.join(UPLOAD_DIR, 'media_1786735042755.jpg'), path.join(BANNERS_DIR, 'brand-hero.jpg'))
  fs.copyFileSync(path.join(UPLOAD_DIR, 'media_1786735051464.jpg'), path.join(BANNERS_DIR, 'super-combo.jpg'))
  fs.copyFileSync(path.join(UPLOAD_DIR, 'media_1786735078652.jpg'), path.join(BANNERS_DIR, 'lunch-menu.jpg'))
  fs.copyFileSync(path.join(UPLOAD_DIR, 'media_1786735082916.jpg'), path.join(BANNERS_DIR, 'breakfast-menu.jpg'))
  console.log('✓ Banners copied to public/assets/banners/')

  // Tiny local HTTP server to serve images cleanly
  const server = http.createServer((req, res) => {
    const filename = req.url.replace(/^\//, '')
    const filepath = path.join(UPLOAD_DIR, filename)
    if (fs.existsSync(filepath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' })
      res.end(fs.readFileSync(filepath))
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  await new Promise((resolve) => server.listen(8999, resolve))

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;background:#ffffff;">
        <canvas id="canvas" width="600" height="600"></canvas>
      </body>
    </html>
  `)

  async function cropAndSave(sourceFilename, crop, outFilename) {
    const url = `http://localhost:8999/${sourceFilename}`

    const resultBase64 = await page.evaluate(async ({ url, crop }) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.getElementById('canvas')
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, 600, 600)

          const sx = img.naturalWidth * crop.sx
          const sy = img.naturalHeight * crop.sy
          const sw = img.naturalWidth * crop.sw
          const sh = img.naturalHeight * crop.sh

          ctx.drawImage(img, sx, sy, sw, sh, 10, 10, 580, 580)
          resolve(canvas.toDataURL('image/jpeg', 0.88))
        }
        img.onerror = (e) => reject(new Error('Image failed to load: ' + url))
        img.src = url
      })
    }, { url, crop })

    const buffer = Buffer.from(resultBase64.replace(/^data:image\/jpeg;base64,/, ''), 'base64')
    fs.writeFileSync(path.join(MENU_DIR, outFilename), buffer)
    console.log(`✓ Generated ${outFilename} (${buffer.length} bytes)`)
  }

  // 1. Realistic Chicken from Poster 2 / 3 (The absolute reference from user)
  await cropAndSave('media_1786735047972.jpg', { sx: 0.05, sy: 0.40, sw: 0.90, sh: 0.45 }, 'combo-chicken.jpg')
  await cropAndSave('media_1786735047972.jpg', { sx: 0.38, sy: 0.42, sw: 0.38, sh: 0.34 }, 'chicken-strips.jpg')
  await cropAndSave('media_1786735047972.jpg', { sx: 0.75, sy: 0.40, sw: 0.22, sh: 0.45 }, 'compote.jpg')
  await cropAndSave('media_1786735047972.jpg', { sx: 0.07, sy: 0.48, sw: 0.32, sh: 0.30 }, 'fries-plate.jpg')

  // 2. Soups from Lunch Poster
  await cropAndSave('media_1786735078652.jpg', { sx: 0.03, sy: 0.35, sw: 0.23, sh: 0.12 }, 'shchi-green.jpg')
  await cropAndSave('media_1786735078652.jpg', { sx: 0.25, sy: 0.35, sw: 0.24, sh: 0.12 }, 'borscht.jpg')
  await cropAndSave('media_1786735078652.jpg', { sx: 0.49, sy: 0.35, sw: 0.24, sh: 0.12 }, 'chicken-noodles.jpg')
  await cropAndSave('media_1786735078652.jpg', { sx: 0.73, sy: 0.35, sw: 0.24, sh: 0.12 }, 'meatball-soup.jpg')

  // 3. Mains from Lunch Poster
  await cropAndSave('media_1786735078652.jpg', { sx: 0.03, sy: 0.58, sw: 0.32, sh: 0.13 }, 'cutlet-homemade.jpg')
  await cropAndSave('media_1786735078652.jpg', { sx: 0.35, sy: 0.58, sw: 0.32, sh: 0.13 }, 'kiev-cutlet.jpg')
  await cropAndSave('media_1786735078652.jpg', { sx: 0.67, sy: 0.58, sw: 0.32, sh: 0.13 }, 'kupaty.jpg')
  await cropAndSave('media_1786735078652.jpg', { sx: 0.67, sy: 0.13, sw: 0.22, sh: 0.15 }, 'chicken-kfc-1kg.jpg')

  // 4. Breakfast Poster items
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.12, sw: 0.28, sh: 0.08 }, 'pirozhki-potatoes.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.20, sw: 0.28, sh: 0.08 }, 'sosiska-v-teste.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.28, sw: 0.28, sh: 0.08 }, 'pirozhki-meat.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.35, sw: 0.28, sh: 0.08 }, 'blinchiki-meat.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.43, sw: 0.28, sh: 0.08 }, 'blini-cottage-cheese.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.50, sw: 0.28, sh: 0.08 }, 'canadian-sausage.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.57, sw: 0.28, sh: 0.08 }, 'boiled-egg.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.64, sw: 0.28, sh: 0.08 }, 'fried-egg.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.72, sw: 0.28, sh: 0.08 }, 'maccoffee-pack.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.77, sw: 0.28, sh: 0.08 }, 'torabika-pack.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.83, sw: 0.28, sh: 0.08 }, 'americano-cup.jpg')
  await cropAndSave('media_1786735082916.jpg', { sx: 0.04, sy: 0.88, sw: 0.32, sh: 0.10 }, 'tea-pot-glass.jpg')

  await browser.close()
  server.close()
  console.log('✓ All dishes successfully generated with real image bytes!')
}

main()
