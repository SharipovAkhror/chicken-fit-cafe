/**
 * Языки QR-меню. Русский — базовый: если для позиции не заполнены uz/en,
 * гость увидит русский текст, а не пустое место.
 */

export const LOCALES = ['ru', 'uz', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ru'

/** Куда ведёт переключатель языка. Русский живёт в корне — это адрес из QR. */
export const LOCALE_PATH: Record<Locale, string> = {
  ru: '/',
  uz: '/uz',
  en: '/en',
}

export const LOCALE_LABEL: Record<Locale, string> = {
  ru: 'RU',
  uz: 'UZ',
  en: 'EN',
}

type Dictionary = {
  menu: string
  ingredients: string
  soldOut: string
  close: string
  priceNote: string
  updated: string
  kcal: string
  gram: string
  currency: string
}

export const UI: Record<Locale, Dictionary> = {
  ru: {
    menu: 'Меню',
    ingredients: 'Состав',
    soldOut: 'Нет в наличии',
    close: 'Закрыть',
    priceNote: 'Цены указаны в сумах',
    updated: 'Обновлено',
    kcal: 'ккал',
    gram: 'г',
    currency: 'сум',
  },
  uz: {
    menu: 'Menyu',
    ingredients: 'Tarkibi',
    soldOut: 'Mavjud emas',
    close: 'Yopish',
    priceNote: "Narxlar so'mda",
    updated: 'Yangilangan',
    kcal: 'kkal',
    gram: 'g',
    currency: "so'm",
  },
  en: {
    menu: 'Menu',
    ingredients: 'Ingredients',
    soldOut: 'Out of stock',
    close: 'Close',
    priceNote: 'Prices in Uzbek soum',
    updated: 'Updated',
    kcal: 'kcal',
    gram: 'g',
    currency: 'UZS',
  },
}

/** 45000 → «45 000 сум». Разделитель — узкий неразрывный пробел, чтобы цена не переносилась. */
export function formatPrice(price: number, locale: Locale): string {
  const grouped = String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped} ${UI[locale].currency}`
}

/** 2026-08-05 → 05.08.2026 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}
