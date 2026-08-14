'use client'

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

export function MenuGrid({
  categories,
  activeCategory,
  onCategoryChange,
  onAddItem,
}: Props) {
  const active = categories.find((c) => c.id === activeCategory) ?? categories[0]

  return (
    <div className="flex h-full flex-col">
      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto px-1 pb-3 [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              cat.id === activeCategory
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {active?.items
            .filter((item) => item.available !== false)
            .map((item) => {
              // Get Russian name for display
              const name =
                typeof item.name === 'string'
                  ? item.name
                  : item.name.ru ?? Object.values(item.name)[0] ?? ''

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onAddItem({ id: item.id, name, price: item.price })
                  }
                  className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 text-left transition hover:border-amber-500/30 hover:bg-white/[0.06] active:scale-[0.97]"
                >
                  <span className="text-sm font-medium leading-snug text-white/90 line-clamp-2">
                    {name}
                  </span>
                  <span className="mt-2 text-lg font-bold text-amber-400">
                    {String(item.price).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  </span>
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}
