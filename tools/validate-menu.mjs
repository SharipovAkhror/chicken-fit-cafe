#!/usr/bin/env node

/**
 * Проверка content/menu.json перед сборкой.
 *
 * Меню правится руками на github.com, поэтому опечатка неизбежна. Задача скрипта —
 * поймать её на сборке: деплой упадёт, а гости продолжат видеть предыдущую рабочую
 * версию меню. Ошибки блокируют, предупреждения — нет.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const menuPath = join(root, 'content/menu.json')
const publicDir = join(root, 'public')

const errors = []
const warnings = []

const fail = (message) => errors.push(message)
const warn = (message) => warnings.push(message)

const ID_PATTERN = /^[a-z0-9-]+$/
const LOCALES = ['ru', 'uz', 'en']
const CATEGORY_KEYS = new Set(['id', 'title', 'items'])
const ITEM_KEYS = new Set([
  'id',
  'name',
  'description',
  'price',
  'image',
  'available',
  'kcal',
  'weight',
])

if (!existsSync(menuPath)) {
  console.error('\ncontent/menu.json не найден.')
  process.exit(1)
}

let menu
try {
  menu = JSON.parse(readFileSync(menuPath, 'utf8'))
} catch (error) {
  console.error(`\ncontent/menu.json: сломан JSON — ${error.message}`)
  console.error('Чаще всего это лишняя или пропущенная запятая либо кавычка.')
  process.exit(1)
}

/** Локализованное поле: строка на все языки либо объект с обязательным ru. */
function checkLocalized(value, path, { required }) {
  if (value === undefined) {
    if (required) fail(`${path}: обязательное поле отсутствует`)
    return
  }
  if (typeof value === 'string') {
    if (!value.trim()) fail(`${path}: пустая строка`)
    return
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    fail(`${path}: должно быть строкой или объектом { ru, uz, en }`)
    return
  }

  for (const key of Object.keys(value)) {
    if (!LOCALES.includes(key)) fail(`${path}.${key}: неизвестный язык, допустимы ru, uz, en`)
  }
  if (typeof value.ru !== 'string' || !value.ru.trim()) {
    fail(`${path}.ru: русский текст обязателен`)
  }
  for (const locale of ['uz', 'en']) {
    if (value[locale] !== undefined && typeof value[locale] !== 'string') {
      fail(`${path}.${locale}: должно быть строкой`)
    } else if (!value[locale]?.trim()) {
      warn(`${path}: нет перевода ${locale} — гость увидит русский текст`)
    }
  }
}

function checkOptionalInteger(value, path) {
  if (value === undefined) return
  if (!Number.isInteger(value) || value < 0) fail(`${path}: должно быть целым числом ≥ 0`)
}

// Верхний уровень.
if (!/^\d{4}-\d{2}-\d{2}$/.test(menu.updated ?? '')) {
  fail('updated: нужна дата в формате ГГГГ-ММ-ДД')
}
if (menu.currency !== 'UZS') {
  fail('currency: сейчас поддерживается только "UZS"')
}
if (!menu.cafe || typeof menu.cafe.name !== 'string' || !menu.cafe.name.trim()) {
  fail('cafe.name: обязательное поле')
}
if (menu.cafe) checkLocalized(menu.cafe.tagline, 'cafe.tagline', { required: false })

const categoryIds = new Set()
const itemIds = new Set()
let itemCount = 0

if (!Array.isArray(menu.categories) || menu.categories.length === 0) {
  fail('categories: нужен хотя бы один раздел меню')
  report()
}

menu.categories.forEach((category, categoryIndex) => {
  const path = `categories[${categoryIndex}]`

  for (const key of Object.keys(category)) {
    if (!CATEGORY_KEYS.has(key)) fail(`${path}.${key}: неизвестное поле раздела`)
  }

  if (typeof category.id !== 'string' || !ID_PATTERN.test(category.id)) {
    fail(`${path}.id: только латиница в нижнем регистре, цифры и дефис`)
  } else if (categoryIds.has(category.id)) {
    fail(`${path}.id: раздел "${category.id}" уже есть, id должен быть уникальным`)
  } else {
    categoryIds.add(category.id)
  }

  checkLocalized(category.title, `${path}.title`, { required: true })

  if (!Array.isArray(category.items)) {
    fail(`${path}.items: должно быть списком позиций`)
    return
  }
  if (category.items.length === 0) {
    warn(`${path} ("${category.id}"): раздел пустой — он не попадёт на страницу`)
  }

  category.items.forEach((item, itemIndex) => {
    const itemPath = `${path}.items[${itemIndex}]`
    itemCount += 1

    for (const key of Object.keys(item)) {
      if (!ITEM_KEYS.has(key)) fail(`${itemPath}.${key}: неизвестное поле позиции`)
    }

    if (typeof item.id !== 'string' || !ID_PATTERN.test(item.id)) {
      fail(`${itemPath}.id: только латиница в нижнем регистре, цифры и дефис`)
    } else if (itemIds.has(item.id)) {
      fail(`${itemPath}.id: позиция "${item.id}" уже есть, id должен быть уникальным`)
    } else {
      itemIds.add(item.id)
    }

    checkLocalized(item.name, `${itemPath}.name`, { required: true })

    if (item.description === undefined) {
      warn(`${itemPath} ("${item.id}"): нет состава`)
    } else {
      checkLocalized(item.description, `${itemPath}.description`, { required: false })
    }

    if (!Number.isInteger(item.price) || item.price < 0) {
      fail(`${itemPath}.price: целое число в сумах без пробелов, например 45000`)
    }

    if (item.image === undefined || item.image === '') {
      warn(`${itemPath} ("${item.id}"): нет фото — покажем плашку с логотипом`)
    } else if (typeof item.image !== 'string' || !item.image.startsWith('/')) {
      fail(`${itemPath}.image: путь должен начинаться с "/", например /menu/${item.id}.webp`)
    } else if (!existsSync(join(publicDir, item.image))) {
      fail(`${itemPath}.image: файл public${item.image} не найден`)
    }

    if (item.available !== undefined && typeof item.available !== 'boolean') {
      fail(`${itemPath}.available: должно быть true или false без кавычек`)
    }

    checkOptionalInteger(item.kcal, `${itemPath}.kcal`)
    checkOptionalInteger(item.weight, `${itemPath}.weight`)
  })
})

report()

function report() {
  if (warnings.length) {
    console.warn('\nПредупреждения меню (не блокируют деплой):')
    warnings.forEach((warning) => console.warn(`- ${warning}`))
  }

  if (errors.length) {
    console.error('\nМеню не прошло проверку — деплой остановлен:')
    errors.forEach((error) => console.error(`- ${error}`))
    console.error('\nИсправь content/menu.json и закоммить снова. Пока меню на сайте остаётся прежним.')
    process.exit(1)
  }

  console.log(`Меню корректно: ${categoryIds.size} разделов, ${itemCount} позиций.`)
  process.exit(0)
}
