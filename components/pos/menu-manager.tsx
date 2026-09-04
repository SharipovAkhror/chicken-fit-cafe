'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Flame,
  Download,
  Copy,
  Layers,
  UtensilsCrossed,
} from 'lucide-react'
import type { MenuItem } from '@/lib/menu'

export type CategoryWithItems = {
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
    calories?: number
    protein?: number
    fat?: number
    carbs?: number
    image?: string
  }) => void
  onEditItem?: (item: MenuItem, categoryId: string) => void
  onDeleteItem?: (itemId: string) => void
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function getItemName(item: MenuItem): string {
  if (typeof item.name === 'string') return item.name
  return item.name.ru ?? Object.values(item.name)[0] ?? ''
}

function getItemDesc(item: MenuItem): string {
  if (!item.description) return ''
  if (typeof item.description === 'string') return item.description
  return item.description.ru ?? Object.values(item.description)[0] ?? ''
}

export function MenuManager({
  categories,
  onToggleAvailable,
  onUpdatePrice,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'stop'>('all')
  const [search, setSearch] = useState('')

  // Inline редактирование цены
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')

  // Модалка создания позиции
  const [showAddModal, setShowAddModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCatId, setFormCatId] = useState(categories[0]?.id ?? 'chicken')
  const [formPrice, setFormPrice] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formCalories, setFormCalories] = useState('')
  const [formProtein, setFormProtein] = useState('')
  const [formFat, setFormFat] = useState('')
  const [formCarbs, setFormCarbs] = useState('')
  const [formImage, setFormImage] = useState('')

  // Модалка полного редактирования позиции
  const [editingItem, setEditingItem] = useState<{ item: MenuItem; categoryId: string } | null>(null)

  // Модалка подтверждения удаления
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // Модалка экспорта JSON
  const [showExportModal, setShowExportModal] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  // Сохранение inline цены
  function handlePriceSave(id: string) {
    const val = parseInt(priceInput, 10)
    if (!isNaN(val) && val >= 0) {
      onUpdatePrice(id, val)
    }
    setEditingPriceId(null)
  }

  // Создание нового товара (конструктор)
  function handleCreateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim() || !formPrice) return

    const id = `item-${Date.now()}`
    onAddItem({
      id,
      categoryId: formCatId,
      name: formName.trim(),
      price: parseInt(formPrice, 10) || 0,
      description: formDesc.trim(),
      calories: formCalories ? parseInt(formCalories, 10) : undefined,
      protein: formProtein ? parseFloat(formProtein) : undefined,
      fat: formFat ? parseFloat(formFat) : undefined,
      carbs: formCarbs ? parseFloat(formCarbs) : undefined,
      image: formImage.trim() || undefined,
    })

    // Reset form
    setFormName('')
    setFormPrice('')
    setFormDesc('')
    setFormCalories('')
    setFormProtein('')
    setFormFat('')
    setFormCarbs('')
    setFormImage('')
    setShowAddModal(false)
  }

  // Открытие модалки редактирования существующего товара
  function openEditModal(item: MenuItem, catId: string) {
    setEditingItem({ item, categoryId: catId })
    setFormName(getItemName(item))
    setFormCatId(catId)
    setFormPrice(String(item.price))
    setFormDesc(getItemDesc(item))
    setFormCalories(item.calories ? String(item.calories) : '')
    setFormProtein(item.protein ? String(item.protein) : '')
    setFormFat(item.fat ? String(item.fat) : '')
    setFormCarbs(item.carbs ? String(item.carbs) : '')
    setFormImage(item.image || '')
  }

  // Сохранение отредактированного товара
  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem || !formName.trim() || !formPrice) return

    const updated: MenuItem = {
      ...editingItem.item,
      name: formName.trim(),
      price: parseInt(formPrice, 10) || 0,
      description: formDesc.trim() || undefined,
      calories: formCalories ? parseInt(formCalories, 10) : undefined,
      protein: formProtein ? parseFloat(formProtein) : undefined,
      fat: formFat ? parseFloat(formFat) : undefined,
      carbs: formCarbs ? parseFloat(formCarbs) : undefined,
      image: formImage.trim() || editingItem.item.image,
    }

    if (onEditItem) {
      onEditItem(updated, formCatId)
    } else {
      // Fallback if onEditItem not provided
      onUpdatePrice(updated.id, updated.price)
    }

    setEditingItem(null)
  }

  // Подтверждение удаления
  function confirmDeleteItem() {
    if (deletingItemId && onDeleteItem) {
      onDeleteItem(deletingItemId)
      setDeletingItemId(null)
    }
  }

  // Все блюда с привязкой к категориям для удобного поиска
  const allItemsWithCategory = useMemo(() => {
    const list: Array<{ item: MenuItem; categoryId: string; categoryTitle: string }> = []
    categories.forEach((cat) => {
      cat.items.forEach((it) => {
        list.push({ item: it, categoryId: cat.id, categoryTitle: cat.title })
      })
    })
    return list
  }, [categories])

  // Фильтрованный список позиций
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allItemsWithCategory.filter(({ item, categoryId }) => {
      // Category filter
      if (activeCategory !== 'all' && categoryId !== activeCategory) {
        return false
      }
      // Status filter
      const isAvail = item.available !== false
      if (statusFilter === 'available' && !isAvail) return false
      if (statusFilter === 'stop' && isAvail) return false

      // Search query
      if (q) {
        const name = getItemName(item).toLowerCase()
        const desc = getItemDesc(item).toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [allItemsWithCategory, activeCategory, statusFilter, search])

  // Экспорт данных в JSON
  function handleCopyJson() {
    const data = JSON.stringify(categories, null, 2)
    navigator.clipboard.writeText(data)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2500)
  }

  return (
    <div className="flex h-full flex-col space-y-3 overflow-hidden text-zinc-900 dark:text-white">
      {/* 1. Верхний бар управления */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black tracking-tight">Конструктор и каталог меню</h2>
            <span className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-xs px-2 py-0.5 font-bold">
              {allItemsWithCategory.length} поз.
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Создание, редактирование цен и состава, КБЖУ и управление стоп-листом
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:border-amber-500 transition cursor-pointer"
            title="Экспорт меню в JSON"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Экспорт</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormName('')
              setFormPrice('')
              setFormDesc('')
              setFormCalories('')
              setFormProtein('')
              setFormFat('')
              setFormCarbs('')
              setFormImage('')
              setShowAddModal(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-black text-black transition hover:bg-amber-400 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Plus className="size-4" />
            <span>Новый товар</span>
          </button>
        </div>
      </div>

      {/* 2. Поиск и фильтры по статусу */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 shrink-0">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию блюда, составу или коду..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-8 py-2 text-xs font-medium outline-none focus:border-amber-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="sm:col-span-4 flex rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 rounded-lg py-1 transition cursor-pointer text-center ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-black shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('available')}
            className={`flex-1 rounded-lg py-1 transition cursor-pointer text-center ${
              statusFilter === 'available'
                ? 'bg-emerald-500 text-black shadow-xs'
                : 'text-zinc-500 hover:text-emerald-500'
            }`}
          >
            В наличии
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('stop')}
            className={`flex-1 rounded-lg py-1 transition cursor-pointer text-center ${
              statusFilter === 'stop'
                ? 'bg-red-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-red-500'
            }`}
          >
            Стоп-лист
          </button>
        </div>
      </div>

      {/* 3. Горизонтальная прокрутка категорий */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
              : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Все разделы ({allItemsWithCategory.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              cat.id === activeCategory
                ? 'bg-amber-500 text-black shadow-xs'
                : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {cat.title} ({cat.items.length})
          </button>
        ))}
      </div>

      {/* 4. Список позиций меню (свободная высота с плавным скроллом) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {filteredList.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-500">
            <UtensilsCrossed className="size-8 opacity-40 mb-2" />
            <p className="text-sm font-semibold">Позиции не найдены</p>
            <p className="text-xs text-zinc-400 mt-1">Попробуйте изменить поисковый запрос или фильтр</p>
          </div>
        ) : (
          filteredList.map(({ item, categoryId, categoryTitle }) => {
            const name = getItemName(item)
            const desc = getItemDesc(item)
            const isAvailable = item.available !== false

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3 transition shadow-xs ${
                  isAvailable
                    ? 'border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 hover:border-amber-500/30'
                    : 'border-red-300 dark:border-red-500/25 bg-red-50/40 dark:bg-red-500/5 opacity-85'
                }`}
              >
                {/* Картинка + Инфо */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.image ? (
                    <div className="size-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={name} className="size-full object-cover" />
                    </div>
                  ) : (
                    <div className="size-14 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20 font-black text-sm">
                      <UtensilsCrossed className="size-6 text-amber-500/60" />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black truncate">{name}</h4>
                      <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                        {categoryTitle}
                      </span>
                      {!isAvailable && (
                        <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-black text-red-600 dark:text-red-400">
                          СТОП-ЛИСТ
                        </span>
                      )}
                    </div>

                    {desc && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {desc}
                      </p>
                    )}

                    {/* КБЖУ если указано */}
                    {(item.calories || item.protein || item.fat || item.carbs) && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                        {item.calories && (
                          <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                            <Flame className="size-3" />
                            {item.calories} ккал
                          </span>
                        )}
                        {item.protein && <span>Б: {item.protein}г</span>}
                        {item.fat && <span>Ж: {item.fat}г</span>}
                        {item.carbs && <span>У: {item.carbs}г</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Цена и кнопки действий */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                  {/* Inline редактирование цены */}
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
                        className="w-24 rounded-xl border border-amber-500 bg-white dark:bg-zinc-800 px-2 py-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-300 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handlePriceSave(item.id)}
                        className="rounded-xl bg-amber-500 p-1.5 text-xs font-bold text-black cursor-pointer"
                        title="Сохранить цену"
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPriceId(item.id)
                        setPriceInput(String(item.price))
                      }}
                      title="Нажмите для быстрой смены цены"
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-mono font-black text-amber-600 dark:text-amber-400 hover:underline px-2 py-1 rounded-lg hover:bg-amber-500/10 cursor-pointer"
                    >
                      {formatNum(item.price)} сум
                      <Edit2 className="size-3" />
                    </button>
                  )}

                  {/* Тумблер стоп-листа */}
                  <button
                    type="button"
                    onClick={() => onToggleAvailable(item.id, !isAvailable)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isAvailable
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/25'
                    }`}
                    title={isAvailable ? 'Поставить в стоп-лист' : 'Снять со стоп-листа'}
                  >
                    {isAvailable ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    <span className="hidden md:inline">{isAvailable ? 'В наличии' : 'Стоп-лист'}</span>
                  </button>

                  {/* Полное редактирование карточки */}
                  <button
                    type="button"
                    onClick={() => openEditModal(item, categoryId)}
                    className="flex size-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 hover:border-amber-500 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                    title="Полный конструктор / Редактировать состав"
                  >
                    <Edit2 className="size-3.5" />
                  </button>

                  {/* Удаление товара */}
                  {onDeleteItem && (
                    <button
                      type="button"
                      onClick={() => setDeletingItemId(item.id)}
                      className="flex size-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 hover:bg-red-500/15 hover:text-red-500 text-zinc-400 transition cursor-pointer"
                      title="Удалить позицию"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── МОДАЛКА: КОНСТРУКТОР НОВОГО ТОВАРА ───────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateItem}
            className="w-full max-w-lg space-y-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black">
                  +
                </div>
                <div>
                  <h3 className="text-base font-black">Конструктор нового товара</h3>
                  <p className="text-[11px] text-zinc-500">Добавление позиции в кассу и электронное меню</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-500">Категория меню</label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(e.target.value)}
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
                  <label className="text-xs font-bold text-zinc-500">Цена (сум) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="например, 35000"
                    className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-mono font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Название блюда / напитка *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="например, Шашлык куриный фитнес"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Описание / Состав ингредиентов</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Куриное филе, авторский маринад, специи, зелень"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>

              {/* Пищевая ценность (КБЖУ) */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3 space-y-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <Flame className="size-3.5" />
                  <span>Пищевая ценность (на 100г или порцию):</span>
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400">Ккал</label>
                    <input
                      type="number"
                      value={formCalories}
                      onChange={(e) => setFormCalories(e.target.value)}
                      placeholder="280"
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Белки (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formProtein}
                      onChange={(e) => setFormProtein(e.target.value)}
                      placeholder="32"
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Жиры (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formFat}
                      onChange={(e) => setFormFat(e.target.value)}
                      placeholder="6.5"
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Углеводы (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formCarbs}
                      onChange={(e) => setFormCarbs(e.target.value)}
                      placeholder="4.0"
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Путь к фото или URL (необязательно)</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="/menu/dish-name.jpg"
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-mono outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-3 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-black text-black transition hover:bg-amber-400 cursor-pointer shadow-md shadow-amber-500/20"
              >
                Создать товар
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── МОДАЛКА: РЕДАКТИРОВАНИЕ ТОВАРА ───────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg space-y-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black">
                  <Edit2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">Редактирование карточки</h3>
                  <p className="text-[11px] text-zinc-500">ID: {editingItem.item.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-500">Категория меню</label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(e.target.value)}
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
                  <label className="text-xs font-bold text-zinc-500">Цена (сум) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-mono font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Название блюда *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Описание / Состав</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-medium outline-none focus:border-amber-500"
                />
              </div>

              {/* Пищевая ценность (КБЖУ) */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3 space-y-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <Flame className="size-3.5" />
                  <span>Пищевая ценность:</span>
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400">Ккал</label>
                    <input
                      type="number"
                      value={formCalories}
                      onChange={(e) => setFormCalories(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Белки (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formProtein}
                      onChange={(e) => setFormProtein(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Жиры (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formFat}
                      onChange={(e) => setFormFat(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Углеводы (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formCarbs}
                      onChange={(e) => setFormCarbs(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500">Путь к фото / URL</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs font-mono outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-3 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-black text-black transition hover:bg-amber-400 cursor-pointer shadow-md shadow-amber-500/20"
              >
                Сохранить изменения
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── МОДАЛКА: ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ─────────────────────────── */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl text-center">
            <div className="size-12 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black">Удалить позицию?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Блюдо будет удалено из активного меню и кассы.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItemId(null)}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-2.5 text-xs font-bold text-white transition cursor-pointer"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── МОДАЛКА: ЭКСПОРТ JSON МЕНЮ ───────────────────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl space-y-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Download className="size-5 text-amber-500" />
                <h3 className="text-base font-black">Экспорт конфигурации меню</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Вы можете скопировать полный JSON всех категорий и товаров для обновления файла в репозитории:
            </p>

            <pre className="max-h-64 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
              {JSON.stringify(categories, null, 2)}
            </pre>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition cursor-pointer"
              >
                <Copy className="size-4" />
                <span>{copiedJson ? 'Скопировано в буфер!' : 'Скопировать JSON'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

