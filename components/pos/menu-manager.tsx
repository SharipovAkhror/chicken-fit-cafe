'use client'

import { useState } from 'react'
import type { MenuItem } from '@/lib/menu'

type CategoryWithItems = {
  id: string
  title: string
  items: MenuItem[]
}

type Props = {
  categories: CategoryWithItems[]
  onToggleAvailable: (itemId: string, available: boolean) => void
  onUpdatePrice: (itemId: string, newPrice: number) => void
  onAddItem: (item: {
    id: string
    categoryId: string
    name: string
    price: number
    description: string
  }) => void
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function MenuManager({
  categories,
  onToggleAvailable,
  onUpdatePrice,
  onAddItem,
}: Props) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Поля формы добавления
  const [newName, setNewName] = useState('')
  const [newCatId, setNewCatId] = useState(categories[0]?.id ?? 'chicken')
  const [newPrice, setNewPrice] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const active = categories.find((c) => c.id === activeCategory) ?? categories[0]

  function handlePriceSave(id: string) {
    const val = parseInt(priceInput, 10)
    if (!isNaN(val) && val >= 0) {
      onUpdatePrice(id, val)
    }
    setEditingPriceId(null)
  }

  function handleCreateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newPrice) return

    const id = `item-${Date.now()}`
    onAddItem({
      id,
      categoryId: newCatId,
      name: newName.trim(),
      price: parseInt(newPrice, 10) || 0,
      description: newDesc.trim(),
    })

    setNewName('')
    setNewPrice('')
    setNewDesc('')
    setShowAddModal(false)
  }

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden">
      {/* Шапка менеджера */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Управление меню</h2>
          <p className="text-xs text-white/50">Стоп-лист, цены и новые блюда</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-black transition hover:bg-amber-400 cursor-pointer shadow"
        >
          + Добавить блюдо
        </button>
      </div>

      {/* Вкладки категорий */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              cat.id === activeCategory
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Список позиций в выбранной категории */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {active?.items.map((item) => {
          const name =
            typeof item.name === 'string'
              ? item.name
              : item.name.ru ?? Object.values(item.name)[0] ?? ''
          const isAvailable = item.available !== false

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                isAvailable
                  ? 'border-white/5 bg-white/[0.03]'
                  : 'border-red-500/20 bg-red-500/5 opacity-70'
              }`}
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {name}
                  </h4>
                  {!isAvailable && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                      СТОП-ЛИСТ
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-white/40 line-clamp-1">
                    {typeof item.description === 'string'
                      ? item.description
                      : item.description.ru}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Редактирование цены */}
                {editingPriceId === item.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePriceSave(item.id)
                        if (e.key === 'Escape') setEditingPriceId(null)
                      }}
                      autoFocus
                      className="w-24 rounded-lg border border-amber-500/40 bg-white/10 px-2 py-1 text-xs text-amber-300 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handlePriceSave(item.id)}
                      className="rounded bg-amber-500 px-2 py-1 text-xs font-bold text-black"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPriceId(item.id)
                      setPriceInput(String(item.price))
                    }}
                    title="Нажмите для смены цены"
                    className="text-sm font-bold text-amber-400 hover:underline"
                  >
                    {formatNum(item.price)} сум
                  </button>
                )}

                {/* Тумблер наличия */}
                <button
                  type="button"
                  onClick={() => onToggleAvailable(item.id, !isAvailable)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    isAvailable
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  }`}
                >
                  {isAvailable ? 'В наличии' : 'Отключено'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Модалка добавления нового блюда */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateItem}
            className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Новая позиция меню</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/60">Категория</label>
                <select
                  value={newCatId}
                  onChange={(e) => setNewCatId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900">
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white/60">Название блюда</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="например, Борщ или Компот 1л"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none focus:border-amber-400/60"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Цена (в сумах)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="например, 22000"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none focus:border-amber-400/60"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Состав / Описание (необязательно)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="например, Свежие овощи, зелень, заправка"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white outline-none focus:border-amber-400/60"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl bg-white/5 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400 cursor-pointer"
              >
                Добавить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
