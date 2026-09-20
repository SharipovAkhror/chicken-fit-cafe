'use client'

import { useState, useMemo } from 'react'
import { Search, X, Utensils, Plus, UtensilsCrossed } from 'lucide-react'
import type { MenuItem } from '@/lib/menu'

type Props = {
  categories: {
    id: string
    title: string
    items: MenuItem[]
  }[]
  activeCategory: string
  onCategoryChange: (id: string) => void
  onAddItem: (item: {
    id: string
    name: string
    price: number
    category?: string
    notes?: string
    isKitchen?: boolean
    weightKg?: number
    pricePerKg?: number
  }) => void
  onOpenGarnishMixer?: (initialSize?: 'half' | 'full') => void
  onOpenChickenModal?: () => void
}

const DISHES_WITH_SIDE = new Set([
  'cutlet-homemade',
  'cutlet-homemade-half',
  'cutlet-chicken',
  'cutlet-chicken-half',
  'goulash',
  'tefteli',
  'kiev-cutlet',
  'chicken-roast',
  'kupaty',
])

const QUICK_SIDES = [
  { id: 'puree', name: 'Картофельное пюре', shortName: 'Пюре', icon: '🥔' },
  { id: 'rice', name: 'Рис отварной', shortName: 'Рис', icon: '🍚' },
  { id: 'buckwheat', name: 'Гречка', shortName: 'Гречка', icon: '🌾' },
  { id: 'macaroni', name: 'Макароны', shortName: 'Макароны', icon: '🍝' },
  { id: 'fries', name: 'Картофель фри', shortName: 'Фри', icon: '🍟' },
]

const QUICK_SIDE_MIXES = [
  { id: 'puree-rice', name: 'Пюре + Рис (50/50)', shortName: 'Пюре 50% + Рис 50%', icon: '🥔🍚' },
  { id: 'puree-buckwheat', name: 'Пюре + Гречка (50/50)', shortName: 'Пюре 50% + Гречка 50%', icon: '🥔🌾' },
  { id: 'rice-buckwheat', name: 'Рис + Гречка (50/50)', shortName: 'Рис 50% + Гречка 50%', icon: '🍚🌾' },
  { id: 'puree-macaroni', name: 'Пюре + Макароны (50/50)', shortName: 'Пюре 50% + Макароны 50%', icon: '🥔🍝' },
  { id: 'rice-macaroni', name: 'Рис + Макароны (50/50)', shortName: 'Рис 50% + Макароны 50%', icon: '🍚🍝' },
]

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function MenuGrid({
  categories,
  activeCategory,
  onCategoryChange,
  onAddItem,
  onOpenGarnishMixer,
  onOpenChickenModal,
}: Props) {
  const [search, setSearch] = useState('')
  const [quickSideDish, setQuickSideDish] = useState<{
    item: MenuItem
    categoryId: string
    name: string
  } | null>(null)
  const [sideTab, setSideTab] = useState<'single' | 'mix'>('single')
  const [selectedCustomSides, setSelectedCustomSides] = useState<string[]>(['puree', 'rice'])

  const allItems = useMemo(() => {
    const list: Array<{ item: MenuItem; categoryTitle: string; categoryId: string }> = []
    categories.forEach((cat) => {
      cat.items.forEach((it) => {
        if (it.available !== false) {
          list.push({ item: it, categoryTitle: cat.title, categoryId: cat.id })
        }
      })
    })
    return list
  }, [categories])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      const active = categories.find((c) => c.id === activeCategory) ?? categories[0]
      return (active?.items ?? [])
        .filter((it) => it.available !== false)
        .map((it) => ({
          item: it,
          categoryTitle: active?.title ?? '',
          categoryId: active?.id ?? '',
        }))
    }

    return allItems.filter(({ item }) => {
      const name =
        typeof item.name === 'string'
          ? item.name
          : item.name.ru ?? Object.values(item.name)[0] ?? ''
      return name.toLowerCase().includes(q)
    })
  }, [search, categories, activeCategory, allItems])

  function handleItemClick(item: MenuItem, categoryId: string) {
    const name =
      typeof item.name === 'string'
        ? item.name
        : item.name.ru ?? Object.values(item.name)[0] ?? ''

    // Если это весовая курица (Chicken по кг):
    if (
      item.id === 'chicken-1kg' ||
      item.id.includes('chicken-kg') ||
      name.toLowerCase().includes('chicken кг') ||
      name.toLowerCase().includes('курица кг') ||
      name.toLowerCase().includes('по кг')
    ) {
      if (onOpenChickenModal) {
        onOpenChickenModal()
        return
      }
    }

    // Если это отдельный сборный гарнир из раздела sides:
    if (categoryId === 'sides' || item.id.startsWith('side-')) {
      if (onOpenGarnishMixer) {
        const initialSize =
          item.id.includes('full') || item.price >= 35000 ? 'full' : 'half'
        onOpenGarnishMixer(initialSize)
        return
      }
    }

    // Если это горячее блюдо с обязательным выбором гарнира — быстрый селектор:
    if (DISHES_WITH_SIDE.has(item.id) || name.toLowerCase().includes('с гарниром')) {
      setSideTab('single')
      setSelectedCustomSides(['puree', 'rice'])
      setQuickSideDish({ item, categoryId, name })
      return
    }

    // Все остальные блюда (комбо, супы, шашлык, чай, напитки, салаты) добавляются СРАЗУ В 1 КЛИК
    onAddItem({
      id: item.id,
      name,
      price: item.price,
      category: categoryId,
    })
  }

  return (
    <div className="flex h-full flex-col space-y-3">
      {/* Поиск и фильтр категорий */}
      <div className="space-y-2">
        {/* Поисковая строка */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Быстрый поиск блюда по меню (стрипсы, комбо, суп, чай)..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 shadow-2xs transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Кнопки категорий */}
        {!search && (
          <div className="flex gap-2 overflow-x-auto pb-1.5 touch-manipulation [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const isActive = cat.id === activeCategory
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryChange(cat.id)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 touch-manipulation ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-xs font-black'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:border-amber-500/40'
                  }`}
                >
                  {cat.title}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Сетка блюд */}
      <div className="flex-1 overflow-y-auto pr-0.5">
        {filteredItems.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
            <p className="text-sm font-medium text-muted-foreground">Ничего не найдено</p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-2 text-xs font-bold text-amber-500 hover:underline cursor-pointer"
            >
              Сбросить поиск
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map(({ item, categoryId }) => {
              const name =
                typeof item.name === 'string'
                  ? item.name
                  : item.name.ru ?? Object.values(item.name)[0] ?? ''

              const isSide =
                categoryId === 'sides' || item.id.startsWith('side-')

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item, categoryId)}
                  className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 text-left transition-all hover:border-amber-500/50 hover:shadow-xs active:scale-[0.98] cursor-pointer shadow-2xs min-h-[110px] touch-manipulation"
                >
                  <div className="space-y-1.5 w-full">
                    {item.image ? (
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary/50 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={name}
                          className="size-full object-cover transition duration-300 group-hover:scale-103"
                          loading="lazy"
                        />
                        {isSide && (
                          <span className="absolute top-1.5 right-1.5 rounded-md bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 shadow-xs font-mono">
                            Микс
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-[4/3] w-full flex items-center justify-center rounded-lg bg-secondary/40">
                        <UtensilsCrossed className="size-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <h3 className="text-xs sm:text-sm font-bold leading-tight text-foreground line-clamp-2">
                      {name}
                    </h3>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between border-t border-border/40 pt-2 w-full">
                    <span className="text-xs sm:text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                      {formatNum(item.price)}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">сум</span>
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition">
                      <Plus className="size-4" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Быстрый выбор гарнира или смеси гарниров в 1 клик для кассира */}
      {quickSideDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs select-none">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Выбор гарнира к блюду
                </span>
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  {quickSideDish.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickSideDish(null)}
                className="flex size-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground active:scale-90 transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Вкладки: 1 гарнир или Смесь гарниров */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1 border border-border">
              <button
                type="button"
                onClick={() => setSideTab('single')}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 touch-manipulation ${
                  sideTab === 'single'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Один гарнир (100%)
              </button>
              <button
                type="button"
                onClick={() => setSideTab('mix')}
                className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 touch-manipulation ${
                  sideTab === 'mix'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Смесь гарниров (Микс)
              </button>
            </div>

            {/* 1. Режим: Один гарнир */}
            {sideTab === 'single' ? (
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SIDES.map((side) => (
                  <button
                    key={side.id}
                    type="button"
                    onClick={() => {
                      onAddItem({
                        id: `${quickSideDish.item.id}-${side.id}`,
                        name: quickSideDish.name,
                        price: quickSideDish.item.price,
                        category: quickSideDish.categoryId,
                        notes: `Гарнир: ${side.name}`,
                      })
                      setQuickSideDish(null)
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl border-2 border-border bg-card hover:border-amber-500 hover:bg-amber-500/10 active:scale-95 transition text-left cursor-pointer touch-manipulation min-h-[54px]"
                  >
                    <span className="text-xl" aria-hidden="true">{side.icon}</span>
                    <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                      {side.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              /* 2. Режим: Смесь гарниров */
              <div className="space-y-3">
                {/* Готовые популярные смеси 50/50 */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Быстрые смеси 50/50:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_SIDE_MIXES.map((mix) => (
                      <button
                        key={mix.id}
                        type="button"
                        onClick={() => {
                          onAddItem({
                            id: `${quickSideDish.item.id}-${mix.id}`,
                            name: quickSideDish.name,
                            price: quickSideDish.item.price,
                            category: quickSideDish.categoryId,
                            notes: `Гарнир: ${mix.shortName}`,
                          })
                          setQuickSideDish(null)
                        }}
                        className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-border bg-card hover:border-amber-500 hover:bg-amber-500/10 active:scale-95 transition text-left cursor-pointer touch-manipulation"
                      >
                        <span className="text-base select-none">{mix.icon}</span>
                        <span className="text-xs font-bold text-foreground leading-tight">
                          {mix.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Конструктор свободной смеси */}
                <div className="p-3 rounded-2xl border border-border bg-secondary/30 space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase block">
                    Или выберите любые компоненты смеси:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SIDES.map((side) => {
                      const isSelected = selectedCustomSides.includes(side.id)
                      return (
                        <button
                          key={side.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomSides((prev) =>
                              prev.includes(side.id)
                                ? prev.length > 1
                                  ? prev.filter((s) => s !== side.id)
                                  : prev
                                : [...prev, side.id],
                            )
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500 text-black font-black shadow-2xs'
                              : 'border-border bg-card text-foreground hover:bg-secondary'
                          }`}
                        >
                          <span aria-hidden="true">{side.icon}</span>
                          <span>{side.shortName}</span>
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const selectedNames = selectedCustomSides.map(
                        (s) => QUICK_SIDES.find((qs) => qs.id === s)?.shortName || s,
                      )
                      const pct = Math.round(100 / selectedNames.length)
                      const noteStr = `Гарнир микс: ${selectedNames.map((n) => `${n} ${pct}%`).join(' + ')}`
                      const mixKey = `mix-${selectedCustomSides.join('-')}`

                      onAddItem({
                        id: `${quickSideDish.item.id}-${mixKey}`,
                        name: quickSideDish.name,
                        price: quickSideDish.item.price,
                        category: quickSideDish.categoryId,
                        notes: noteStr,
                      })
                      setQuickSideDish(null)
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition active:scale-95 shadow-xs cursor-pointer text-center touch-manipulation mt-2"
                  >
                    Добавить смесь ({selectedCustomSides.map((s) => QUICK_SIDES.find((qs) => qs.id === s)?.shortName).join(' + ')})
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onAddItem({
                  id: quickSideDish.item.id,
                  name: quickSideDish.name,
                  price: quickSideDish.item.price,
                  category: quickSideDish.categoryId,
                  notes: 'Без гарнира',
                })
                setQuickSideDish(null)
              }}
              className="w-full py-2.5 rounded-xl border border-border bg-secondary/50 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition text-center cursor-pointer"
            >
              Подать без гарнира
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
