'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useRuntime, getEngine } from '@/features/app/runtime'
import { enqueue } from '@/data/outbox'
import type { MenuItemRow } from '@/data/local-db'
import { formatUZS } from '@/domain/money'
import { Modal, Numpad } from './common'
import menuJson from '@/content/menu.json'

const JSON_TITLES: Record<string, string> = Object.fromEntries((menuJson as unknown as { categories: Array<{ id: string; title: { ru: string } }> }).categories.map((c) => [c.id, c.title.ru]))

/** Стоп-лист и цены. Изменения — через outbox (menu.upsert), история правок пишется на сервере. */
export function MenuAdminView() {
  const { db } = useRuntime()
  const items = useLiveQuery(() => db.menu.toArray(), [db]) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), [db]) ?? []
  const [editing, setEditing] = useState<MenuItemRow | null>(null)
  const [price, setPrice] = useState('')
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
              <span className="flex-1" style={{ opacity: m.available ? 1 : 0.5 }}>{m.nameRu}</span>
              <button className="btn" style={{ minWidth: 120 }} onClick={() => { setEditing(m); setPrice(String(m.price)) }}>{formatUZS(m.price)}</button>
              <button className={`btn${m.available ? '' : ' btn-danger'}`} style={{ minWidth: 130 }} aria-pressed={!m.available} onClick={() => save(m, { available: !m.available })}>
                {m.available ? 'В продаже' : 'Стоп-лист'}
              </button>
            </div>
          ))}
        </section>
      ))}
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
