/**
 * Проверка блюда перед сохранением (форма меню и «новое блюдо» из заказа). Те же правила проверяет сервер (миграция 0012):
 * название 2–80 символов (лишние пробелы убираются), цена 1…50 млн сум, категория обязательна, нет дубля названия
 * в категории (без учёта регистра), варианты/добавки — до 8 штук по 40 символов, ссылка на фото — https:// или /.
 */
import type { ProductKind } from './product'

export const PRICE_MAX = 50_000_000
export const NAME_MAX = 80

export type ProductDraft = { id?: string; name: string; categoryId: string; newCategory?: string; price: number; kind: ProductKind; weight?: number | null; variants?: string[]; extras?: string[]; imageUrl?: string | null }
export type ExistingItem = { id: string; nameRu: string; categoryId: string | null; isDeleted?: boolean }
export type ProductErrors = Partial<Record<'name' | 'category' | 'price' | 'weight' | 'options' | 'image', string>>

export const normalizeName = (s: string) => s.replace(/\s+/g, ' ').trim()

export function validateProduct(d: ProductDraft, existing: ExistingItem[]): ProductErrors {
  const e: ProductErrors = {}
  const name = normalizeName(d.name)
  if (name.length < 2) e.name = 'Введите название (от 2 символов)'
  else if (name.length > NAME_MAX) e.name = `Название длиннее ${NAME_MAX} символов`
  const cat = d.categoryId === '__new' ? normalizeName(d.newCategory ?? '') : d.categoryId
  if (!cat) e.category = 'Выберите категорию'
  else if (d.categoryId === '__new' && (cat.length < 2 || cat.length > 60)) e.category = 'Название категории — от 2 до 60 символов'
  if (!Number.isInteger(d.price) || d.price <= 0) e.price = d.kind === 'weighted' ? 'Укажите цену за 1 кг' : 'Укажите цену больше нуля'
  else if (d.price > PRICE_MAX) e.price = 'Слишком большая цена'
  if (d.weight != null && (d.weight < 0 || d.weight > 100_000)) e.weight = 'Выход — от 0 до 100 000 г'
  const opts = [...(d.variants ?? []), ...(d.extras ?? [])]
  if ((d.variants?.length ?? 0) > 8 || (d.extras?.length ?? 0) > 8 || opts.some((o) => o.length > 40)) e.options = 'До 8 вариантов, каждый до 40 символов'
  const img = d.imageUrl?.trim()
  if (img && !/^(https:\/\/|\/)/.test(img)) e.image = 'Ссылка должна начинаться с https:// или /'
  if (!e.name && d.categoryId !== '__new' && cat) {
    const low = name.toLowerCase()
    const self = existing.find((x) => x.id === d.id)
    const unchanged = !!self && self.categoryId === cat && normalizeName(self.nameRu).toLowerCase() === low // старые дубли можно править
    const dup = unchanged ? undefined : existing.find((x) => !x.isDeleted && x.id !== d.id && x.categoryId === cat && normalizeName(x.nameRu).toLowerCase() === low)
    if (dup) e.name = 'Такое блюдо уже есть в этой категории'
  }
  return e
}
