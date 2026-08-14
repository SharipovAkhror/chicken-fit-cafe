import fs from 'node:fs'
import path from 'node:path'
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

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Base64 helper
  function toBase64(filename) {
    const filePath = path.join(UPLOAD_DIR, filename)
    const data = fs.readFileSync(filePath)
    return `data:image/jpeg;base64,${data.toString('base64')}`
  }

  const posterCombo = toBase64('media_1786735047972.jpg')
  const posterLunch = toBase64('media_1786735078652.jpg')
  const posterBreakfast = toBase64('media_1786735082916.jpg')

  // Helper to crop image rectangle on white canvas
  async function cropImage(srcBase64, crop, outFilename) {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#ffffff;display:flex;align-items:center;justify-content:center;width:600px;height:600px;overflow:hidden;">
        <canvas id="c" width="600" height="600"></canvas>
        <script>
          const canvas = document.getElementById('c');
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 600, 600);
          const img = new Image();
          img.onload = () => {
            // Source crop percentages
            const sx = img.naturalWidth * ${crop.sx};
            const sy = img.naturalHeight * ${crop.sy};
            const sw = img.naturalWidth * ${crop.sw};
            const sh = img.naturalHeight * ${crop.sh};
            ctx.drawImage(img, sx, sy, sw, sh, 10, 10, 580, 580);
            window.__done = true;
          };
          img.src = "${srcBase64}";
        </script>
      </body>
      </html>
    `)

    await page.waitForFunction('window.__done === true', { timeout: 10000 })
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 600, height: 600 } })
    fs.writeFileSync(path.join(MENU_DIR, outFilename), screenshot)
    console.log(`✓ Cropped ${outFilename}`)
  }

  // 1. Realistic Chicken from Poster 2 / 3 (The absolute reference from user)
  await cropImage(posterCombo, { sx: 0.05, sy: 0.40, sw: 0.90, sh: 0.45 }, 'combo-chicken.jpg')
  await cropImage(posterCombo, { sx: 0.38, sy: 0.42, sw: 0.38, sh: 0.34 }, 'chicken-strips.jpg')
  await cropImage(posterCombo, { sx: 0.75, sy: 0.40, sw: 0.22, sh: 0.45 }, 'compote.jpg')
  await cropImage(posterCombo, { sx: 0.07, sy: 0.48, sw: 0.32, sh: 0.30 }, 'fries-plate.jpg')

  // 2. Soups from Lunch Poster
  await cropImage(posterLunch, { sx: 0.03, sy: 0.35, sw: 0.23, sh: 0.12 }, 'shchi-green.jpg')
  await cropImage(posterLunch, { sx: 0.25, sy: 0.35, sw: 0.24, sh: 0.12 }, 'borscht.jpg')
  await cropImage(posterLunch, { sx: 0.49, sy: 0.35, sw: 0.24, sh: 0.12 }, 'chicken-noodles.jpg')
  await cropImage(posterLunch, { sx: 0.73, sy: 0.35, sw: 0.24, sh: 0.12 }, 'meatball-soup.jpg')

  // 3. Mains from Lunch Poster
  await cropImage(posterLunch, { sx: 0.03, sy: 0.58, sw: 0.32, sh: 0.13 }, 'cutlet-homemade.jpg')
  await cropImage(posterLunch, { sx: 0.35, sy: 0.58, sw: 0.32, sh: 0.13 }, 'kiev-cutlet.jpg')
  await cropImage(posterLunch, { sx: 0.67, sy: 0.58, sw: 0.32, sh: 0.13 }, 'kupaty.jpg')
  await cropImage(posterLunch, { sx: 0.67, sy: 0.13, sw: 0.22, sh: 0.15 }, 'chicken-kfc-1kg.jpg')

  // 4. Breakfast Poster items
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.12, sw: 0.28, sh: 0.08 }, 'pirozhki-potatoes.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.20, sw: 0.28, sh: 0.08 }, 'sosiska-v-teste.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.28, sw: 0.28, sh: 0.08 }, 'pirozhki-meat.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.35, sw: 0.28, sh: 0.08 }, 'blinchiki-meat.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.43, sw: 0.28, sh: 0.08 }, 'blini-cottage-cheese.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.50, sw: 0.28, sh: 0.08 }, 'canadian-sausage.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.57, sw: 0.28, sh: 0.08 }, 'boiled-egg.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.64, sw: 0.28, sh: 0.08 }, 'fried-egg.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.72, sw: 0.28, sh: 0.08 }, 'maccoffee-pack.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.77, sw: 0.28, sh: 0.08 }, 'torabika-pack.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.83, sw: 0.28, sh: 0.08 }, 'americano-cup.jpg')
  await cropImage(posterBreakfast, { sx: 0.04, sy: 0.88, sw: 0.32, sh: 0.10 }, 'tea-pot-glass.jpg')

  await browser.close()
  console.log('All real menu assets successfully processed!')
}

main()
