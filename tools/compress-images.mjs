import { chromium } from 'playwright'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'c:/Users/User/Documents/GitHub/chicken-fit-cafe/public/menu'

async function compress() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  const files = readdirSync(dir).filter(f => f.endsWith('.jpg'))
  
  for (const file of files) {
    const filePath = join(dir, file)
    const data = readFileSync(filePath)
    const base64 = `data:image/jpeg;base64,${data.toString('base64')}`
    
    const compressedBase64 = await page.evaluate(async ({ src }) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxDim = 600
          let w = img.width
          let h = img.height
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w)
              w = maxDim
            } else {
              w = Math.round((w * maxDim) / h)
              h = maxDim
            }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }
        img.src = src
      })
    }, { src: base64 })
    
    const base64Data = compressedBase64.replace(/^data:image\/jpeg;base64,/, '')
    writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
    console.log(`Compressed ${file}`)
  }
  
  await browser.close()
}

compress().catch(console.error)
