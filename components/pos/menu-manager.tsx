'use client'

import { useState, useMemo } from 'react'
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
  const [search, setSearch] = useState('')

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

  const itemsToDisplay = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const list: MenuItem[] = []
      categories.forEach((cat) => {
        cat.items.forEach((it) => {
          const name =
            typeof it.name === 'string'
              ? it.name
              : it.name.ru ?? Object.values(it.name)[0] ?? ''
          if (name.toLowerCase().includes(q)) {
            list.push(it)
          }
        })
      })
      return list
    }
    return active?.items ?? []
  }, [search, categories, active])

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden text-zinc-900 dark:text-white">
      {/* Шапка менеджера */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-tight">Управление меню</h2>
          <p className="text-xs text-zinc-500">Стоп-лист, цены и моментальное добавление новых позиций</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-black text-black transition hover:bg-amber-400 cursor-pointer shadow-md shadow-amber-500/20"
        >
          <span>+</span>
          <span>Добавить блюдо</span>
        </button>
      </div>

      {/* Поиск и категории */}
      <div className="space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по всем позициям меню..."
          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-medium outline-none focus:border-amber-500"
        />

        {!search && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  cat.id === activeCategory
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Список позиций */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {itemsToDisplay.map((item) => {
          const name =
            typeof item.name === 'string'
              ? item.name
              : item.name.ru ?? Object.values(item.name)[0] ?? ''
          const isAvailable = item.available !== false

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition shadow-xs ${
                isAvailable
                  ? 'border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60'
                  : 'border-red-300 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 opacity-80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {item.image && (
                  <div className="size-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={name} className="size-full object-cover" />
                  </div>
                )}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold truncate">
                      {name}
                    </h4>
                    {!isAvailable && (
                      <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-black text-red-600 dark:text-red-400">
                        СТОП-ЛИСТ
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-zinc-500 line-clamp-1">
                      {typeof item.description === 'string'
                        ? item.description
                        : item.description.ru}
                    </p>
                  )}
                </div>
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
                      className="w-24 rounded-xl border border-amber-500 bg-white dark:bg-zinc-800 px-2 py-1 text-xs font-bold text-amber-600 dark:text-amber-300 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handlePriceSave(item.id)}
                      className="rounded-xl bg-amber-500 px-2.5 py-1 text-xs font-bold text-black"
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
                    className="text-sm font-black text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {formatNum(item.price)} сум ✏️
                  </button>
                )}

                {/* Тумблер наличия */}
                <button
                  type="button"
                  onClick={() => onToggleAvailable(item.id, !isAvailable)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isAvailable
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/25'
                  }`}
                >
                  {isAvailable ? 'В наличии' : 'В стоп-листе'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Модалка добавления нового блюда */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateItem}
            className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black">Новая позиция меню</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-500">Категория</label>
                <select
                  value={newCatId}
                  onChange={(e) => setNewCatId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-semibold outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Название блюда</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="например, Борщ или Компот 1л"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Цена (в сумах)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="например, 25000"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Состав / Описание</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="например, Свежие ингредиенты, соус"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-3 text-xs font-bold text-zinc-600 dark:text-zinc-300"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-black text-black transition hover:bg-amber-400 cursor-pointer shadow"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
