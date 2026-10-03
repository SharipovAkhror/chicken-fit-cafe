'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRuntime, getEngine } from '@/features/app/runtime'
import { enqueue } from '@/data/outbox'
import type { MenuItemRow } from '@/data/local-db'
import { formatUZS } from '@/domain/money'
import { uuidv4 } from '@/domain/ids'
import { KIND_HINT, KIND_LABEL, kindOf, optionsOf, parseList, pricePerKgOf, stationOf, type ProductKind } from '@/domain/product'
import { Modal } from './common'
import { saveMenuItem } from './actions'
import { TablesAdmin } from './TablesAdmin'
import { thumbOf, TypeIndicator } from './ProductCard'
import menuJson from '@/content/menu.json'

const JSON_TITLES: Record<string, string> = Object.fromEntries((menuJson as unknown as { categories: Array<{ id: string; title: { ru: string } }> }).categories.map((c) => [c.id, c.title.ru]))

/** Меню и столы. Админ: добавляет и правит блюда (по типам) и столы. Кассир: только стоп-лист. */
export function MenuAdminView({ isAdmin = false }: { isAdmin?: boolean }) {
  const [section, setSection] = useState<'menu' | 'tables'>('menu')
  return (
    <div>
      {isAdmin && (
        <div className="px-4 pt-4">
          <div className="seg" role="tablist" aria-label="Раздел">
            <button role="tab" aria-selected={section === 'menu'} aria-pressed={section === 'menu'} onClick={() => setSection('menu')}>Блюда</button>
            <button role="tab" aria-selected={section === 'tables'} aria-pressed={section === 'tables'} onClick={() => setSection('tables')}>Столы</button>
          </div>
        </div>
      )}
      {section === 'tables' && isAdmin ? <TablesAdmin /> : <MenuItems isAdmin={isAdmin} />}
    </div>
  )
}

function MenuItems({ isAdmin }: { isAdmin: boolean }) {
  const { db } = useRuntime()
  const items = useLiveQuery(() => db.menu.toArray(), [db]) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), [db]) ?? []
  const [form, setForm] = useState<MenuItemRow | 'new' | null>(null)
  const [q, setQ] = useState('')
  const save = async (m: MenuItemRow, patch: Partial<MenuItemRow>) => {
    await db.menu.update(m.id, patch)
    await enqueue(db, 'menu.upsert', m.id, { id: m.id, ...patch })
    getEngine().kick()
  }
  const review = items.filter((i) => i.needsReview && !i.isDeleted)
  const active = items.filter((i) => !i.needsReview && !i.isDeleted && (!q || i.nameRu.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.sortOrder - b.sortOrder)
  const groups = [...new Set(active.map((i) => i.categoryId))]
  const catTitle = (g: string | null) => cats.find((c) => c.id === g)?.titleRu ?? (g ? JSON_TITLES[g] ?? g : 'Без категории')
  // категории с сервера + базовые из menu.json (если сервер ещё не прислал справочник)
  const catList = [
    ...[...cats].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.id, title: c.titleRu })),
    ...Object.entries(JSON_TITLES).filter(([id]) => !cats.some((c) => c.id === id)).map(([id, title]) => ({ id, title })),
  ]
  if (!items.length) return <div className="p-6 muted">Меню ещё не загружено с сервера.</div>
  return (
    <div className="p-4 grid gap-4" style={{ maxWidth: 960, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <div className="flex gap-2 flex-wrap items-center">
        {isAdmin && <button className="btn btn-primary" onClick={() => setForm('new')}><Plus size={18} />Добавить блюдо</button>}
        <input className="input flex-1 min-w-0" style={{ maxWidth: 280, minWidth: 120 }} placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по меню" />
        {!isAdmin && <span className="muted text-sm">Нажмите «В продаже», чтобы поставить блюдо в стоп-лист.</span>}
      </div>
      {groups.map((g) => (
        <section key={g ?? 'none'} className="panel">
          <h3 className="font-bold px-3 pt-3 pb-1">{catTitle(g)}</h3>
          {active.filter((i) => i.categoryId === g).map((m) => {
            const img = thumbOf(m.imageUrl)
            const k = kindOf(m)
            return (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" style={{ background: 'none', color: 'inherit', minHeight: 48, cursor: isAdmin ? 'pointer' : 'default' }}
                  onClick={() => isAdmin && setForm(m)} aria-label={isAdmin ? `Изменить ${m.nameRu}` : m.nameRu} disabled={!isAdmin}>
                  {img ? <img src={img} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', opacity: m.available ? 1 : 0.5 }} />
                    : <span style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface-2)' }} aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold" style={{ opacity: m.available ? 1 : 0.6, overflowWrap: 'anywhere' }}>{m.nameRu}</span>
                    <span className="sm:hidden block font-bold text-sm">{k === 'weighted' ? `${formatUZS(pricePerKgOf(m))} / кг` : formatUZS(m.price)}</span>
                    <TypeIndicator item={m} reserve={false} />
                  </span>
                  <span className="hidden sm:block font-bold whitespace-nowrap">{k === 'weighted' ? `${formatUZS(pricePerKgOf(m))} / кг` : formatUZS(m.price)}</span>
                </button>
                <button className={`btn${m.available ? '' : ' btn-danger'}`} style={{ minWidth: 104, paddingInline: 10 }} aria-pressed={!m.available} onClick={() => save(m, { available: !m.available })}>
                  {m.available ? 'В продаже' : 'Стоп-лист'}
                </button>
              </div>
            )
          })}
        </section>
      ))}
      {review.length > 0 && isAdmin && (
        <details className="panel p-3">
          <summary className="font-bold cursor-pointer">Скрытые позиции из старой базы ({review.length})</summary>
          <p className="muted text-sm my-2">Были в базе, но не в меню кассы. Верните нужные или удалите.</p>
          {review.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="flex-1">{m.nameRu} · {formatUZS(m.price)}</span>
              <button className="btn" onClick={() => save(m, { needsReview: false, available: true })}>Вернуть</button>
              <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => save(m, { isDeleted: true, needsReview: false })}>Удалить</button>
            </div>
          ))}
        </details>
      )}
      {form && (
        <ItemForm item={form === 'new' ? null : form} cats={catList}
          onClose={() => setForm(null)}
          onDelete={form !== 'new' ? async () => { await save(form, { isDeleted: true }); setForm(null) } : undefined}
          onSave={async (row, categoryTitle) => {
            await saveMenuItem(db, row, categoryTitle, form !== 'new' ? form : null)
            setForm(null)
          }} />
      )}
    </div>
  )
}

type FormRow = Omit<MenuItemRow, 'isDeleted' | 'needsReview' | 'sortOrder'>

/** Форма блюда. Поля зависят от типа: у весового — цена за кг, у гарнира-микса нет вариантов. */
export function ItemForm({ item, cats, onClose, onSave, onDelete }: {
  item: MenuItemRow | null; cats: { id: string; title: string }[]; onClose: () => void
  onSave: (row: FormRow, categoryTitle: string) => void; onDelete?: () => void
}) {
  const [kind, setKind] = useState<ProductKind>(item ? kindOf(item) : 'portion')
  const [name, setName] = useState(item?.nameRu ?? '')
  const [cat, setCat] = useState(item?.categoryId ?? cats[0]?.id ?? '')
  const [newCat, setNewCat] = useState('')
  const [price, setPrice] = useState(item ? String(kindOf(item) === 'weighted' ? pricePerKgOf(item) : item.price) : '')
  const [grams, setGrams] = useState(item?.weight ? String(item.weight) : '')
  const [kitchen, setKitchen] = useState(item ? stationOf(item) === 'kitchen' : true)
  const [variants, setVariants] = useState((item ? optionsOf(item).variants ?? [] : []).join(', '))
  const [extras, setExtras] = useState((item ? optionsOf(item).extras ?? [] : []).join(', '))
  const [img, setImg] = useState(item?.imageUrl ?? '')
  const [available, setAvailable] = useState(item?.available ?? true)
  const advOpen = !!item && (!!item.imageUrl || !!item.weight || item.available === false || stationOf(item) === 'bar' || !!item.options)
  const [confirmDel, setConfirmDel] = useState(false)
  const priceN = Number(price.replace(/\D/g, '') || 0)
  const imgOk = !img.trim() || /^(https?:\/\/|\/)/.test(img.trim())
  const catId = cat === '__new' ? `cat-${newCat.trim().toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').slice(0, 24)}` : cat
  const valid = name.trim().length >= 2 && priceN > 0 && imgOk && (cat !== '__new' || newCat.trim().length >= 2)
  const v = parseList(variants), x = parseList(extras)
  const preview = thumbOf(img.trim())
  return (
    <Modal title={item ? 'Изменить блюдо' : 'Новое блюдо'} onClose={onClose} width={620}>
      <form className="grid gap-3" onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSave({
          id: item?.id ?? `custom-${uuidv4().slice(0, 8)}`, nameRu: name.trim(), categoryId: catId, kind,
          price: priceN, unit: kind === 'weighted' ? 'kg' : 'portion', pricePerKg: kind === 'weighted' ? priceN : null,
          weight: grams ? Number(grams) : null, isKitchen: kitchen, imageUrl: img.trim() || null, available,
          options: kind !== 'side_mix' && (v.length || x.length) ? { ...(v.length ? { variants: v } : {}), ...(x.length ? { extras: x } : {}) } : null,
        }, cat === '__new' ? newCat.trim() : cats.find((c) => c.id === cat)?.title ?? cat)
      }}>
        <div className="grid gap-1">
          <span className="text-sm muted">Тип</span>
          <div className="seg" role="radiogroup" aria-label="Тип" style={{ flexWrap: 'wrap' }}>
            {(Object.keys(KIND_LABEL) as ProductKind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <span className="text-sm muted">{KIND_HINT[kind]}</span>
        </div>
        <label className="grid gap-1"><span className="text-sm muted">Название</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1"><span className="text-sm muted">Категория</span>
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              <option value="__new">+ Новая категория…</option>
            </select></label>
          <label className="grid gap-1"><span className="text-sm muted">{kind === 'weighted' ? 'Цена за 1 кг, сум' : 'Цена, сум'}</span>
            <input className="input" inputMode="numeric" value={price ? formatUZS(priceN) : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} required /></label>
        </div>
        {cat === '__new' && <input className="input" placeholder="Название новой категории" aria-label="Название новой категории" value={newCat} onChange={(e) => setNewCat(e.target.value)} />}
        <details className="adv" open={advOpen}>
          <summary className="cursor-pointer font-semibold py-2">Дополнительно <span className="muted text-sm font-normal">— кухня/бар, выход, варианты, фото</span></summary>
          <div className="grid gap-3 pt-2">
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="grid gap-1">
              <span className="text-sm muted">Куда уходит заказ</span>
              <div className="seg" role="radiogroup" aria-label="Куда">
                <button type="button" role="radio" aria-checked={kitchen} onClick={() => setKitchen(true)}>Кухня</button>
                <button type="button" role="radio" aria-checked={!kitchen} onClick={() => setKitchen(false)}>Бар</button>
              </div>
            </div>
            {kind !== 'weighted' && (
              <label className="grid gap-1"><span className="text-sm muted">Выход, г (необязательно)</span>
                <input className="input" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value.replace(/\D/g, ''))} /></label>
            )}
          </div>
          {kind !== 'side_mix' && kind !== 'with_side' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1"><span className="text-sm muted">Варианты, через запятую</span>
                <input className="input" placeholder="Микс, Крылья, Стрипсы" value={variants} onChange={(e) => setVariants(e.target.value)} /></label>
              <label className="grid gap-1"><span className="text-sm muted">Добавки без доплаты</span>
                <input className="input" placeholder="Острый" value={extras} onChange={(e) => setExtras(e.target.value)} /></label>
            </div>
          )}
          <div className="flex gap-3 items-start">
            <label className="grid gap-1 flex-1"><span className="text-sm muted">Фото (ссылка, необязательно)</span>
              <input className="input" inputMode="url" placeholder="https://… или /menu/…" value={img} onChange={(e) => setImg(e.target.value)} />
              {!imgOk && <span className="text-sm" style={{ color: 'var(--danger)' }}>Ссылка должна начинаться с https:// или /</span>}</label>
            {preview && imgOk && <img src={preview} alt="Предпросмотр" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', marginTop: 22 }} />}
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} style={{ width: 22, height: 22 }} />В продаже</label>
          </div>
        </details>
        <div className="grid gap-2" style={{ gridTemplateColumns: onDelete ? '1fr 2fr' : '1fr' }}>
          {onDelete && (confirmDel
            ? <button type="button" className="btn btn-lg btn-danger" onClick={onDelete}>Точно убрать</button>
            : <button type="button" className="btn btn-lg btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDel(true)}>Убрать из меню</button>)}
          <button className="btn btn-lg btn-primary" type="submit" disabled={!valid}>Сохранить</button>
        </div>
      </form>
    </Modal>
  )
}
