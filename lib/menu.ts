import menuJson from '@/content/menu.json'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

/** Строка либо объект переводов. ru обязателен, uz/en могут отсутствовать. */
export type Localized = string | { ru: string; uz?: string; en?: string }

export type MenuItem = {
  id: string
  name: Localized
  description?: Localized
  price: number
  image?: string
  available?: boolean
  kcal?: number
  weight?: number
  sort_order?: number
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
}

export type MenuCategory = {
  id: string
  title: Localized
  items: MenuItem[]
  sort_order?: number
}

export type Menu = {
  updated: string
  currency: string
  cafe: { name: string; tagline?: Localized }
  categories: MenuCategory[]
}

/**
 * Текст на нужном языке. Пустой или отсутствующий перевод откатывается на русский.
 */
export function t(value: Localized | undefined, locale: Locale): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale]?.trim() || value[DEFAULT_LOCALE] || ''
}

/**
 * Меню по умолчанию из локального JSON (для SSR / офлайн-режима).
 */
export function getMenu(): Menu {
  const menu = menuJson as unknown as Menu
  return {
    ...menu,
    categories: menu.categories.filter((category) => category.items.length > 0),
  }
}

/**
 * Загрузка актуального меню из Supabase (в реальном времени).
 * Если Supabase не подключен или произошла ошибка — вернёт базовое меню getMenu().
 */
export async function getLiveMenu(): Promise<Menu> {
  const baseMenu = getMenu()
  if (!supabase) return baseMenu

  try {
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('*').order('sort_order', { ascending: true }),
    ])

    if (catsRes.error || itemsRes.error || !catsRes.data || !itemsRes.data) {
      return baseMenu
    }

    const categoriesMap: Record<string, MenuCategory> = {}

    catsRes.data.forEach((c) => {
      categoriesMap[c.id] = {
        id: c.id,
        title: {
          ru: c.title_ru,
          uz: c.title_uz || undefined,
          en: c.title_en || undefined,
        },
        items: [],
        sort_order: c.sort_order,
      }
    })

    itemsRes.data.forEach((item) => {
      const catId = item.category_id
      if (catId && categoriesMap[catId]) {
        categoriesMap[catId].items.push({
          id: item.id,
          name: {
            ru: item.name_ru,
            uz: item.name_uz || undefined,
            en: item.name_en || undefined,
          },
          description: item.description_ru
            ? {
                ru: item.description_ru,
                uz: item.description_uz || undefined,
                en: item.description_en || undefined,
              }
            : undefined,
          price: item.price,
          image: item.image_url || '',
          available: item.available !== false,
          weight: item.weight || undefined,
          kcal: item.kcal || undefined,
          sort_order: item.sort_order,
        })
      }
    })

    const categories = Object.values(categoriesMap).filter((c) => c.items.length > 0)

    return {
      updated: new Date().toISOString().split('T')[0],
      currency: 'UZS',
      cafe: {
        name: 'ChickenFit',
        tagline: {
          ru: 'Кафе домашней кухни. Самарканд',
          uz: 'Uy taomlari kafesi. Samarqand',
          en: 'Home cooking cafe. Samarkand',
        },
      },
      categories,
    }
  } catch (err) {
    console.warn('Error fetching live menu from Supabase:', err)
    return baseMenu
  }
}
