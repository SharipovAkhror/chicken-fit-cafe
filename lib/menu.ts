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
  /** 'kg' — цена указана за 1 кг */
  unit?: 'kg'
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

type DbCategory = { id: string; title_ru: string; title_uz?: string | null; title_en?: string | null; sort_order: number }
type DbItem = {
  id: string; category_id: string; name_ru: string; name_uz?: string | null; name_en?: string | null; description_ru?: string | null
  price: number; price_per_kg?: number | null; unit?: string | null; image_url?: string | null; available?: boolean | null
  weight?: number | null; kcal?: number | null; sort_order: number
}

/**
 * Склейка меню из БД с content/menu.json (#8): цены, наличие, новые блюда и фото — из БД (их правит касса);
 * переводы, описания и КБЖУ — из JSON, если в БД пусто. Весовые блюда — цена за кг (unit = 'kg').
 */
export function mergeLiveMenu(base: Menu, db: { categories: DbCategory[]; items: DbItem[] }): Menu {
  const jsonItems = new Map(base.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const)))
  const jsonCats = new Map(base.categories.map((c) => [c.id, c] as const))
  const loc = (ru: string, uz?: string | null, en?: string | null, fb?: Localized): Localized => {
    const f = typeof fb === 'object' ? fb : undefined
    return { ru, uz: uz || f?.uz || undefined, en: en || f?.en || undefined }
  }
  const categories: MenuCategory[] = db.categories.map((c) => ({
    id: c.id, title: loc(c.title_ru, c.title_uz, c.title_en, jsonCats.get(c.id)?.title), sort_order: c.sort_order, items: [],
  }))
  const byId = new Map(categories.map((c) => [c.id, c] as const))
  for (const m of db.items) {
    const cat = byId.get(m.category_id)
    if (!cat) continue
    const j = jsonItems.get(m.id)
    const kg = m.unit === 'kg'
    cat.items.push({
      ...(j ?? {}),
      id: m.id,
      name: loc(m.name_ru, m.name_uz, m.name_en, j?.name),
      description: m.description_ru ? { ru: m.description_ru } : j?.description,
      price: kg ? Number(m.price_per_kg ?? m.price) : Number(m.price),
      unit: kg ? 'kg' : undefined,
      image: m.image_url || j?.image || '',
      available: m.available !== false,
      weight: m.weight ?? j?.weight,
      kcal: m.kcal ?? j?.kcal,
      sort_order: m.sort_order,
    })
  }
  return { ...base, updated: new Date().toISOString().slice(0, 10), categories: categories.filter((c) => c.items.length > 0) }
}

/**
 * Актуальное меню из Supabase (RPC public_menu, 0014). Нет подключения, ошибка или пустой ответ — меню из JSON.
 */
export async function getLiveMenu(): Promise<Menu> {
  const baseMenu = getMenu()
  if (!supabase) return baseMenu
  try {
    const { data, error } = await supabase.rpc('public_menu')
    const d = data as { categories?: DbCategory[]; items?: DbItem[] } | null
    if (error || !d?.items?.length || !d.categories?.length) return baseMenu
    return mergeLiveMenu(baseMenu, { categories: d.categories, items: d.items })
  } catch (err) {
    console.warn('live menu fallback to menu.json:', err)
    return baseMenu
  }
}
