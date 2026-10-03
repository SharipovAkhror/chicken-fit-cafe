'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useRuntime, getEngine } from '@/features/app/runtime'
import { enqueue } from '@/data/outbox'
import type { MenuItemRow } from '@/data/local-db'
import { formatUZS } from '@/domain/money'
import { uuidv4 } from '@/domain/ids'
import { Pencil, Plus } from 'lucide-react'
import { TablesAdmin } from './TablesAdmin'
import { Modal, Numpad } from './common'
import menuJson from '@/content/menu.json'

const JSON_TITLES: Record<string, string> = Object.fromEntries((menuJson as unknown as { categories: Array<{ id: string; title: { ru: string } }> }).categories.map((c) => [c.id, c.title.ru]))

/** Стоп-лист и цены. Изменения — через outbox (menu.upsert), история правок пишется на сервере. */
export function MenuAdminView({ isAdmin = false }: { isAdmin?: boolean }) {
  const [section, setSection] = useState<'menu' | 'tables'>('menu')
  return (
    <div>
      {isAdmin && (
        <div className="px-4 pt-4 flex gap-2" role="tablist" aria-label="Раздел">
          <button role="tab" aria-selected={section === 'menu'} className={`btn${section === 'menu' ? ' btn-primary' : ''}`} onClick={() => setSection('menu')}>Блюда</button>
          <button role="tab" aria-selected={section === 'tables'} className={`btn${section === 'tables' ? ' btn-primary' : ''}`} onClick={() => setSection('tables')}>Столы</button>
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
  const [editing, setEditing] = useState<MenuItemRow | null>(null)
  const [price, setPrice] = useState('')
  const [form, setForm] = useState<MenuItemRow | 'new' | null>(null)
  const save = async (m: MenuItemRow, patch: Partial<MenuItemRow>) => {
    await db.menu.update(m.id, patch)
    await enqueue(db, 'menu.upsert', m.id, { id: m.id, ...patch })
    getEngine().kick()
  }
  const review = items.filter((i) => i.needsReview && !i.isDeleted)
  const active = items.filter((i) => !i.needsReview && !i.isDeleted).sort((a, b) => a.sortOrder - b.sortOrder)
  const groups = [...new Set(active.map((i) => i.categoryId))]
  if (!items.length) return <div className="p-6 muted">Меню ещё не загружено с сервера.</div>
  return (
    <div className="p-4 grid gap-4" style={{ maxWidth: 900 }}>
      {isAdmin && <div><button className="btn btn-primary" onClick={() => setForm('new')}><Plus size={18} />Добавить блюдо</button></div>}
      {review.length > 0 && (
        <section className="panel p-3">
          <h3 className="font-bold mb-1">Требуют проверки ({review.length})</h3>
          <p className="muted text-sm mb-2">Эти позиции были в базе, но не в меню кассы. Они скрыты. Верните нужные или удалите.</p>
          {review.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="flex-1">{m.nameRu} · {formatUZS(m.price)}</span>
              <button className="btn" onClick={() => save(m, { needsReview: false, available: true })}>Вернуть в меню</button>
              <button className="btn btn-danger" onClick={() => save(m, { isDeleted: true, needsReview: false })}>Удалить</button>
            </div>
          ))}
        </section>
      )}
      {groups.map((g) => (
        <section key={g ?? 'none'} className="panel p-3">
          <h3 className="font-bold mb-2">{cats.find((c) => c.id === g)?.titleRu ?? (g ? JSON_TITLES[g] ?? g : 'Без категории')}</h3>
          {active.filter((i) => i.categoryId === g).map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
              {m.imageUrl ? <img src={m.imageUrl} alt="" width={36} height={36} style={{ borderRadius: 6, objectFit: 'cover', width: 36, height: 36 }} /> : null}
              <span className="flex-1" style={{ opacity: m.available ? 1 : 0.5 }}>{m.nameRu}</span>
              {isAdmin && <button className="btn btn-ghost" aria-label={`Изменить ${m.nameRu}`} onClick={() => setForm(m)}><Pencil size={18} /></button>}
              <button className="btn" style={{ minWidth: 120 }} onClick={() => { setEditing(m); setPrice(String(m.price)) }}>{formatUZS(m.price)}</button>
              <button className={`btn${m.available ? '' : ' btn-danger'}`} style={{ minWidth: 130 }} aria-pressed={!m.available} onClick={() => save(m, { available: !m.available })}>
                {m.available ? 'В продаже' : 'Стоп-лист'}
              </button>
            </div>
          ))}
        </section>
      ))}
      {form && (
        <ItemForm item={form === 'new' ? null : form} cats={cats.length ? cats.map((c) => ({ id: c.id, title: c.titleRu })) : Object.entries(JSON_TITLES).map(([id, title]) => ({ id, title }))}
          onClose={() => setForm(null)}
          onSave={async (row, catTitle) => {
            const existing = form !== 'new'
            const maxSort = Math.max(0, ...items.filter((i) => i.categoryId === row.categoryId).map((i) => i.sortOrder))
            const full: MenuItemRow = existing ? { ...(form as MenuItemRow), ...row } : { ...row, available: true, isDeleted: false, unit: 'portion', sortOrder: maxSort + 1 } as MenuItemRow
            await db.menu.put(full)
            if (full.categoryId && !cats.some((c) => c.id === full.categoryId)) await db.categories.put({ id: full.categoryId, titleRu: catTitle, sortOrder: 99, isActive: true })
            await enqueue(db, 'menu.upsert', full.id, {
              id: full.id, nameRu: full.nameRu, categoryId: full.categoryId, categoryTitle: catTitle, price: full.price,
              imageUrl: full.imageUrl ?? '', isKitchen: full.isKitchen, ...(existing ? {} : { available: true, sortOrder: full.sortOrder, unit: 'portion' }),
            })
            getEngine().kick()
            setForm(null)
          }} />
      )}
      {editing && (
        <Modal title={`Цена: ${editing.nameRu}`} onClose={() => setEditing(null)}>
          <div className="text-3xl font-bold mb-3">{formatUZS(Number(price || 0))} сум</div>
          <Numpad value={price} onChange={setPrice} />
          <button className="btn btn-lg btn-primary w-full mt-3" disabled={!price} onClick={async () => { await save(editing, { price: Number(price) }); setEditing(null) }}>Сохранить</button>
        </Modal>
      )}
    </div>
  )
}

function ItemForm({ item, cats, onClose, onSave }: {
  item: MenuItemRow | null
  cats: { id: string; title: string }[]
  onClose: () => void
  onSave: (row: Pick<MenuItemRow, 'id' | 'nameRu' | 'categoryId' | 'price' | 'imageUrl' | 'isKitchen'>, categoryTitle: string) => void
}) {
  const [name, setName] = useState(item?.nameRu ?? '')
  const [cat, setCat] = useState(item?.categoryId ?? cats[0]?.id ?? '')
  const [newCat, setNewCat] = useState('')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [img, setImg] = useState(item?.imageUrl ?? '')
  const [kitchen, setKitchen] = useState(item?.isKitchen ?? true)
  const [busy, setBusy] = useState(false)
  const priceN = Number(price.replace(/\D/g, '') || 0)
  const imgOk = !img.trim() || /^(https?:\/\/|\/)/.test(img.trim())
  const catId = cat === '__new' ? `cat-${newCat.trim().toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').slice(0, 24)}` : cat
  const valid = name.trim().length >= 2 && priceN > 0 && imgOk && (cat !== '__new' || newCat.trim().length >= 2)
  return (
    <Modal title={item ? 'Изменить блюдо' : 'Новое блюдо'} onClose={onClose} width={560}>
      <form className="grid gap-3" onSubmit={(e) => {
        e.preventDefault()
        if (!valid || busy) return
        setBusy(true)
        onSave({ id: item?.id ?? `custom-${uuidv4().slice(0, 8)}`, nameRu: name.trim(), categoryId: catId, price: priceN, imageUrl: img.trim() || null, isKitchen: kitchen },
          cat === '__new' ? newCat.trim() : cats.find((c) => c.id === cat)?.title ?? cat)
      }}>
        <label className="grid gap-1"><span className="text-sm muted">Название</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required minLength={2} /></label>
        <label className="grid gap-1"><span className="text-sm muted">Категория</span>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            <option value="__new">+ Новая категория…</option>
          </select></label>
        {cat === '__new' && <input className="input" placeholder="Название новой категории" value={newCat} onChange={(e) => setNewCat(e.target.value)} />}
        <label className="grid gap-1"><span className="text-sm muted">Цена, сум</span>
          <input className="input" inputMode="numeric" value={price ? formatUZS(priceN) : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} required /></label>
        <label className="grid gap-1"><span className="text-sm muted">Фото (ссылка, необязательно)</span>
          <input className="input" inputMode="url" placeholder="https://… или /images/…" value={img} onChange={(e) => setImg(e.target.value)} />
          {!imgOk && <span className="text-sm" style={{ color: 'var(--danger)' }}>Ссылка должна начинаться с https:// или /</span>}</label>
        {img.trim() && imgOk && <img src={img.trim()} alt="Предпросмотр" style={{ maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />}
        <label className="flex items-center gap-2"><input type="checkbox" checked={kitchen} onChange={(e) => setKitchen(e.target.checked)} style={{ width: 22, height: 22 }} />Готовит кухня (печатать кухонный тикет)</label>
        <button className="btn btn-lg btn-primary" type="submit" disabled={!valid || busy}>Сохранить</button>
      </form>
    </Modal>
  )
}
