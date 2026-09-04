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
  }) => void
  onOpenGarnishMixer?: (initialSize?: 'half' | 'full') => void
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function MenuGrid({
  categories,
  activeCategory,
  onCategoryChange,
  onAddItem,
  onOpenGarnishMixer,
}: Props) {
  const [search, setSearch] = useState('')

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

    // Если кликнули на позицию гарнира или раздел sides — открываем конструктор миксов
    if (
      onOpenGarnishMixer &&
      (categoryId === 'sides' ||
        item.id.startsWith('side-') ||
        name.toLowerCase().includes('гарнир'))
    ) {
      const initialSize =
        item.id.includes('full') || item.price >= 35000 ? 'full' : 'half'
      onOpenGarnishMixer(initialSize)
      return
    }

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
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {/* Карточка конструктора гарниров (внутри сетки без лишнего баннера) */}
            {onOpenGarnishMixer && (activeCategory === 'sides' || !activeCategory) && !search && (
              <button
                type="button"
                onClick={() => onOpenGarnishMixer('half')}
                className="group flex flex-col justify-between rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-3 text-left transition-all hover:border-amber-500 hover:bg-amber-500/15 active:scale-[0.98] cursor-pointer shadow-2xs min-h-[110px] touch-manipulation"
              >
                <div className="space-y-1.5 w-full">
                  <div className="aspect-[4/3] w-full flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Utensils className="size-7" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black leading-tight text-foreground">
                    Сборный гарнир
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    Один или 50/50: Рис, Гречка, Пюре, Фри
                  </p>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-amber-500/30 pt-2 w-full">
                  <span className="text-xs sm:text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                    23к / 35к <span className="text-[10px] font-normal text-muted-foreground">сум</span>
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-black text-xs font-bold">
                    <Plus className="size-4" />
                  </span>
                </div>
              </button>
            )}

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
    </div>
  )
}
