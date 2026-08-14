'use client'

import { useState, useMemo } from 'react'
import type { MenuItem } from '@/lib/menu'

type Props = {
  categories: {
    id: string
    title: string
    items: MenuItem[]
  }[]
  activeCategory: string
  onCategoryChange: (id: string) => void
  onAddItem: (item: { id: string; name: string; price: number }) => void
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function MenuGrid({
  categories,
  activeCategory,
  onCategoryChange,
  onAddItem,
}: Props) {
  const [search, setSearch] = useState('')

  const allItems = useMemo(() => {
    const list: Array<{ item: MenuItem; categoryTitle: string }> = []
    categories.forEach((cat) => {
      cat.items.forEach((it) => {
        if (it.available !== false) {
          list.push({ item: it, categoryTitle: cat.title })
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
        .map((it) => ({ item: it, categoryTitle: active?.title ?? '' }))
    }

    return allItems.filter(({ item }) => {
      const name =
        typeof item.name === 'string'
          ? item.name
          : item.name.ru ?? Object.values(item.name)[0] ?? ''
      return name.toLowerCase().includes(q)
    })
  }, [search, categories, activeCategory, allItems])

  return (
    <div className="flex h-full flex-col space-y-3">
      {/* Поиск и фильтр категорий */}
      <div className="space-y-2">
        {/* Поисковая строка */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Быстрый поиск блюда по меню (например: стрипсы, суп, чай)..."
            className="w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-amber-500 shadow-xs transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Кнопки категорий (скрываются во время активного поиска) */}
        {!search && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const isActive = cat.id === activeCategory
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryChange(cat.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
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
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
            <p className="text-sm font-medium text-zinc-400">Ничего не найдено</p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-2 text-xs font-bold text-amber-500 hover:underline"
            >
              Сбросить поиск
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map(({ item }) => {
              const name =
                typeof item.name === 'string'
                  ? item.name
                  : item.name.ru ?? Object.values(item.name)[0] ?? ''

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAddItem({ id: item.id, name, price: item.price })}
                  className="group flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 p-3 text-left transition-all hover:border-amber-500/50 hover:shadow-md hover:scale-[1.01] active:scale-[0.97] cursor-pointer shadow-xs"
                >
                  <div className="space-y-1.5">
                    {item.image && (
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={name}
                          className="size-full object-cover transition duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="text-xs sm:text-sm font-bold leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2">
                      {name}
                    </h3>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-2">
                    <span className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {formatNum(item.price)} <span className="text-[10px] font-normal text-zinc-400">сум</span>
                    </span>
                    <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-black text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition">
                      +
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
