import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

// High-resolution studio food photography URLs
const IMAGE_SOURCES = [
  {
    filename: 'sweet-sour-sauce.jpg',
    url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#fef3c7',
  },
  {
    filename: 'uzbek-soup.jpg',
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#fff7ed',
  },
  {
    filename: 'chuchvara-soup.jpg',
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#fffbeb',
  },
  {
    filename: 'chicken-basket-1kg.jpg',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#fef3c7',
  },
  {
    filename: 'eggplant-salad.jpg',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#f4f4f5',
  },
  {
    filename: 'fresh-salad.jpg',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#f4f4f5',
  },
  {
    filename: 'teapot.jpg',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#fafafa',
  },
  {
    filename: 'maccoffee.jpg',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#fffbeb',
  },
  {
    filename: 'torabika.jpg',
    url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&auto=format&fit=crop&q=80',
    fallbackBg: '#fffbeb',
  },
]

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const outDir = path.resolve('public/menu')

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  for (const item of IMAGE_SOURCES) {
    const target = path.join(outDir, item.filename)
    console.log(`Processing ${item.filename}...`)

    try {
      // Load image into canvas, center it on crisp white background and export at 600x600 JPEG
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: #ffffff; display: flex; align-items: center; justify-content: center; width: 600px; height: 600px; overflow: hidden; }
            img { width: 560px; height: 560px; object-fit: cover; border-radius: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
          </style>
        </head>
        <body>
          <img src="${item.url}" crossorigin="anonymous" />
        </body>
        </html>
      `)

      await page.waitForTimeout(1500)
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 600, height: 600 } })
      fs.writeFileSync(target, screenshot)
      console.log(`✓ Saved ${item.filename} (${screenshot.length} bytes)`)
    } catch (err) {
      console.error(`Failed ${item.filename}:`, err)
    }
  }

  await browser.close()
  console.log('All extra menu images generated and optimized!')
}

main()
