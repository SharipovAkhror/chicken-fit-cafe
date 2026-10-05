import { describe, expect, it } from 'vitest'
import { mergeCarts, type CartItem } from '@/domain/cart'
import { amountDue, cashierCanCancel, prepaidOf, tableStateOf, type Order } from '@/domain/order'
import { normalizeName, validateProduct, type ProductDraft } from '@/domain/product-form'
import { fitSize, thumbOf } from '@/features/pos/photo'
import { orderFromRow, orderToPayload } from '@/data/mappers'

const line = (id: string, qty: number, extra: Partial<CartItem> = {}): CartItem => ({ id, name: id, price: 10000, originalPrice: 10000, qty, ...extra })
const order = (p: Partial<Order> = {}): Order => ({
  id: 'o1', number: '001', type: 'dine_in', tableId: 't1', items: [], subtotal: 0, discountPercent: 0, discountAmount: 0, deliveryFee: 0, total: 50000,
  status: 'open', paymentStatus: 'unpaid', paymentMethod: null, cashierName: 'К', createdAt: '2026-10-05T09:00:00Z', updatedAt: '2026-10-05T09:00:00Z', ...p,
})

describe('mergeCarts (объединение столов)', () => {
  it('складывает одинаковые простые позиции и добавляет остальные', () => {
    const r = mergeCarts([line('a', 1), line('b', 2)], [line('a', 2), line('c', 1), line('w', 1, { weightKg: 0.5 })])
    expect(r.map((x) => [x.id, x.qty])).toEqual([['a', 3], ['b', 2], ['c', 1], ['w', 1]])
  })
  it('не склеивает позиции с разной ценой или комментарием', () => {
    const r = mergeCarts([line('a', 1)], [line('a', 1, { price: 9000 }), line('a', 1, { notes: 'без лука' })])
    expect(r).toHaveLength(3)
  })
  it('не меняет исходные массивы', () => {
    const into = [line('a', 1)]
    mergeCarts(into, [line('a', 5)])
    expect(into[0].qty).toBe(1)
  })
})

describe('состояние стола и роли', () => {
  it('свободен / занят / счёт выдан', () => {
    expect(tableStateOf([])).toBe('free')
    expect(tableStateOf([order({ paymentStatus: 'paid' })])).toBe('free')
    expect(tableStateOf([order({ status: 'cancelled' })])).toBe('free')
    expect(tableStateOf([order()])).toBe('busy')
    expect(tableStateOf([order({ precheckAt: '2026-10-05T10:00:00Z' })])).toBe('billed')
  })
  it('кассир отменяет сам только неотправленный заказ без счёта', () => {
    expect(cashierCanCancel(order())).toBe(true)
    expect(cashierCanCancel(order({ status: 'sent' }))).toBe(false)
    expect(cashierCanCancel(order({ precheckAt: '2026-10-05T10:00:00Z' }))).toBe(false)
  })
  it('возобновлённый заказ: к оплате только разница', () => {
    const o = order({ total: 70000, reopenedAt: '2026-10-05T10:00:00Z', reopenPaidAmount: 50000 })
    expect(prepaidOf(o)).toBe(50000)
    expect(amountDue(o)).toBe(20000)
    expect(amountDue(order({ total: 30000, reopenedAt: 'x', reopenPaidAmount: 50000 }))).toBe(-20000)
    expect(amountDue(order())).toBe(50000)
    expect(prepaidOf({ ...o, paymentStatus: 'paid' })).toBe(0)
  })
})

describe('проверка блюда', () => {
  const base: ProductDraft = { name: '  Плов   особый ', categoryId: 'hot', price: 35000, kind: 'portion' }
  const existing = [{ id: 'x1', nameRu: 'Плов особый', categoryId: 'hot' }, { id: 'x2', nameRu: 'Соус', categoryId: 'sauce' }, { id: 'x3', nameRu: 'соус', categoryId: 'sauce' }]
  it('нормализует пробелы', () => expect(normalizeName(base.name)).toBe('Плов особый'))
  it('находит дубль в категории без учёта регистра', () => {
    expect(validateProduct(base, existing).name).toMatch(/уже есть/)
    expect(validateProduct({ ...base, categoryId: 'salad' }, existing)).toEqual({})
    expect(validateProduct({ ...base, id: 'x1' }, existing)).toEqual({})
  })
  it('разрешает править старые дубли без переименования', () => {
    expect(validateProduct({ ...base, id: 'x2', name: 'Соус', categoryId: 'sauce' }, existing)).toEqual({})
  })
  it('требует название, категорию и цену > 0', () => {
    const e = validateProduct({ name: ' a ', categoryId: '', price: 0, kind: 'portion' }, [])
    expect(Object.keys(e).sort()).toEqual(['category', 'name', 'price'])
    expect(validateProduct({ ...base, price: 60_000_000 }, []).price).toBeTruthy()
    expect(validateProduct({ ...base, price: 10.5 }, []).price).toBeTruthy()
    expect(validateProduct({ ...base, name: 'x'.repeat(81) }, []).name).toBeTruthy()
    expect(validateProduct({ ...base, categoryId: '__new', newCategory: ' ' }, []).category).toBeTruthy()
    expect(validateProduct({ ...base, imageUrl: 'data:image/png;base64,AAA' }, []).image).toBeTruthy()
    expect(validateProduct({ ...base, variants: Array(9).fill('v') }, []).options).toBeTruthy()
  })
})

describe('фото', () => {
  it('fitSize сохраняет пропорции и не увеличивает', () => {
    expect(fitSize(4000, 3000, 800)).toEqual({ w: 800, h: 600 })
    expect(fitSize(3000, 4000, 800)).toEqual({ w: 600, h: 800 })
    expect(fitSize(300, 200, 800)).toEqual({ w: 300, h: 200 })
  })
  it('thumbOf: Storage → -t, public/menu → /menu/thumb, прочее без изменений', () => {
    const u = 'https://x.supabase.co/storage/v1/object/public/menu-photos/items/0a1b2c3d-1111-2222-3333-444455556666.webp'
    expect(thumbOf(u)).toBe(u.replace('.webp', '-t.webp'))
    expect(thumbOf('/menu/plov.jpg')).toBe('/menu/thumb/plov.webp')
    expect(thumbOf('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(thumbOf('')).toBeNull()
  })
})

describe('маппинг полей 0013', () => {
  it('precheck/reopen читаются из строки и не теряют исходную строку времени', () => {
    const o = orderFromRow({ id: 'o', order_number: '1', order_type: 'dine_in', items: [], total_amount: 100, status: 'open', payment_status: 'unpaid',
      precheck_at: '2026-10-05T10:00:00.123456+00:00', reopened_at: '2026-10-05T11:00:00.654321+00:00', reopen_paid_amount: '90', reopen_paid_method: 'cash' })
    expect(o.precheckAt).toBe('2026-10-05T10:00:00.123456+00:00')
    expect(o.reopenedAt).toBe('2026-10-05T11:00:00.654321+00:00')
    expect(o.reopenPaidAmount).toBe(90)
    const p = orderToPayload(o) as Record<string, unknown>
    expect(p.reopenedAt).toBe(o.reopenedAt)
    expect('reopenPaidAmount' in p).toBe(false)
  })
})

describe('гостевое меню из БД (#8)', async () => {
  const { getMenu, mergeLiveMenu } = await import('@/lib/menu')
  it('цены и наличие из БД, переводы из JSON, удалённые не попадают, весовые — за кг', () => {
    const base = getMenu()
    const c = base.categories[0]
    const j = c.items[0]
    const r = mergeLiveMenu(base, {
      categories: [{ id: c.id, title_ru: 'Категория', sort_order: 1 }],
      items: [
        { id: j.id, category_id: c.id, name_ru: 'Новое имя', price: 12345, sort_order: 1, available: false },
        { id: 'kg-1', category_id: c.id, name_ru: 'Курица кг', price: 1, price_per_kg: 90000, unit: 'kg', sort_order: 2, image_url: 'https://x/y.webp' },
        { id: 'orphan', category_id: 'nope', name_ru: 'X', price: 1, sort_order: 3 },
      ],
    })
    expect(r.categories).toHaveLength(1)
    const [a, b] = r.categories[0].items
    expect(a.price).toBe(12345)
    expect(a.available).toBe(false)
    expect(typeof a.name === 'object' && a.name.ru).toBe('Новое имя')
    if (typeof j.name === 'object' && j.name.uz) expect(typeof a.name === 'object' && a.name.uz).toBe(j.name.uz)
    expect(b.price).toBe(90000)
    expect(b.unit).toBe('kg')
    expect(b.image).toBe('https://x/y.webp')
  })
})
