import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const brainDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\4cb991bd-0743-4ff5-9761-69df3acee95e'
const targetDir = 'c:\\Users\\User\\Documents\\GitHub\\chicken-fit-cafe\\public\\menu'

const mappings = [
  ['strips_menu_1786722439398.jpg', 'strips-5.jpg'],
  ['wings_menu_1786722451919.jpg', 'wings-6.jpg'],
  ['combo_strips_menu_1786722552388.jpg', 'combo-strips.jpg'],
  ['combo_wings_menu_1786722566832.jpg', 'combo-wings.jpg'],
  ['pirozhki_menu_1786722482823.jpg', 'pirozhki.jpg'],
  ['belyash_menu_1786722466057.jpg', 'belyashi.jpg'],
  ['cheburek_menu_1786722424819.jpg', 'cheburek.jpg'],
  ['blinchiki_menu_1786722496015.jpg', 'blinchiki.jpg'],
  ['chicken_soup_menu_1786722509600.jpg', 'chicken-soup.jpg'],
  ['lentil_soup_menu_1786722522676.jpg', 'lentil-soup.jpg'],
  ['fries_menu_1786722538038.jpg', 'fries.jpg'],
  ['house_sauce_menu_1786722581828.jpg', 'house-sauce.jpg'],
  ['garlic_sauce_menu_1786722594838.jpg', 'garlic-sauce.jpg'],
]

for (const [src, dst] of mappings) {
  const srcPath = join(brainDir, src)
  const dstPath = join(targetDir, dst)
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, dstPath)
    console.log(`Copied ${src} -> ${dst}`)
  } else {
    console.warn(`File missing: ${srcPath}`)
  }
}
