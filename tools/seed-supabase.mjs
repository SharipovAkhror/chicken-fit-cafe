import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const url = 'https://ikvontqurgzopdmsdmla.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrdm9udHF1cmd6b3BkbXNkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzgzNzIsImV4cCI6MjEwMjI1NDM3Mn0.URw3FfSKNXm1LdXtf6rCUQL-EITRObj-zd5oJmQFqq0'

const supabase = createClient(url, key)

async function seed() {
  const menuPath = path.resolve('content/menu.json')
  const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'))

  console.log('Seeding Supabase with menu items...')

  // 1. Seed categories
  for (let i = 0; i < menu.categories.length; i++) {
    const cat = menu.categories[i]
    const { error } = await supabase.from('categories').upsert({
      id: cat.id,
      title_ru: typeof cat.title === 'string' ? cat.title : cat.title.ru,
      title_uz: typeof cat.title === 'object' ? cat.title.uz : null,
      title_en: typeof cat.title === 'object' ? cat.title.en : null,
      sort_order: i + 1,
    })
    if (error) console.error('Category error:', cat.id, error.message)
  }

  // 2. Seed items
  let itemOrder = 1
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      const { error } = await supabase.from('menu_items').upsert({
        id: item.id,
        category_id: cat.id,
        name_ru: typeof item.name === 'string' ? item.name : item.name.ru,
        name_uz: typeof item.name === 'object' ? item.name.uz : null,
        name_en: typeof item.name === 'object' ? item.name.en : null,
        description_ru: item.description ? (typeof item.description === 'string' ? item.description : item.description.ru) : null,
        description_uz: item.description && typeof item.description === 'object' ? item.description.uz : null,
        description_en: item.description && typeof item.description === 'object' ? item.description.en : null,
        price: item.price,
        image_url: item.image || '',
        available: item.available !== false,
        sort_order: itemOrder++,
      })
      if (error) console.error('Item error:', item.id, error.message)
    }
  }

  console.log('Seed completed successfully!')
  const { data: cats } = await supabase.from('categories').select('*')
  const { data: items } = await supabase.from('menu_items').select('*')
  console.log(`Total categories in Supabase: ${cats?.length}, total items: ${items?.length}`)
}

seed()
