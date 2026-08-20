'use client'

import { useState, useMemo } from 'react'
import type { CartItem, GarnishIngredient } from '@/lib/cart'

export type GarnishMixerModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddGarnish: (item: {
    id: string
    name: string
    price: number
    category: string
    isKitchen: boolean
    notes: string
    garnishMix: GarnishIngredient[]
    qty: number
  }) => void
  initialSize?: 'half' | 'full'
}

type IngredientDef = {
  id: string
  name: string
  shortName: string
  icon: string
  color: string
}

const INGREDIENTS: IngredientDef[] = [
  {
    id: 'rice',
    name: 'Рис отварной',
    shortName: 'Рис',
    icon: '🍚',
    color: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200',
  },
  {
    id: 'buckwheat',
    name: 'Гречка',
    shortName: 'Гречка',
    icon: '🥣',
    color: 'bg-orange-100 dark:bg-orange-950/60 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-200',
  },
  {
    id: 'macaroni',
    name: 'Макароны',
    shortName: 'Макароны',
    icon: '🍝',
    color: 'bg-yellow-100 dark:bg-yellow-950/60 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-200',
  },
  {
    id: 'puree',
    name: 'Картофельное пюре',
    shortName: 'Пюре',
    icon: '🥔',
    color: 'bg-stone-100 dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200',
  },
  {
    id: 'fries',
    name: 'Картошка фри',
    shortName: 'Фри',
    icon: '🍟',
    color: 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200',
  },
]

const PORTION_CONFIGS = {
  half: {
    label: 'Полпорции',
    price: 23000,
    weight: 180,
    badge: '23 000 сум · 180 г',
  },
  full: {
    label: '1 порция (Полная)',
    price: 35000,
    weight: 350,
    badge: '35 000 сум · 350 г',
  },
}

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function GarnishMixerModal({
  isOpen,
  onClose,
  onAddGarnish,
  initialSize = 'half',
}: GarnishMixerModalProps) {
  const [size, setSize] = useState<'half' | 'full'>(initialSize)
  // parts count per ingredient: { rice: 1, puree: 1, ... }
  const [selectedParts, setSelectedParts] = useState<Record<string, number>>({
    rice: 1,
  })
  const [count, setCount] = useState<number>(1)

  const activeConfig = PORTION_CONFIGS[size]

  // Выбранные ингредиенты и их доли
  const { mixBreakdown, totalParts, mixDescription } = useMemo(() => {
    const activeEntries = Object.entries(selectedParts).filter(
      ([, parts]) => parts > 0,
    )
    const sumParts = activeEntries.reduce((acc, [, parts]) => acc + parts, 0)

    if (sumParts === 0) {
      return {
        mixBreakdown: [],
        totalParts: 0,
        mixDescription: 'Не выбран ингредиент',
      }
    }

    const breakdown: GarnishIngredient[] = activeEntries.map(
      ([id, parts]) => {
        const def = INGREDIENTS.find((i) => i.id === id)!
        const pct = Math.round((parts / sumParts) * 100)
        const grams = Math.round((activeConfig.weight * parts) / sumParts)
        return {
          ingredient: def.shortName,
          percent: pct,
          grams,
        }
      },
    )

    let desc = ''
    if (breakdown.length === 1) {
      desc = `${breakdown[0].ingredient} (100%)`
    } else {
      desc = breakdown
        .map((b) => `${b.ingredient} ${b.percent}%`)
        .join(' + ')
    }

    return {
      mixBreakdown: breakdown,
      totalParts: sumParts,
      mixDescription: desc,
    }
  }, [selectedParts, activeConfig.weight])

  if (!isOpen) return null

  // Переключение одного ингредиента (выбор чистого вкуса в 1 клик)
  function handleSelectSingle(id: string) {
    setSelectedParts({ [id]: 1 })
  }

  // Переключение чекбокса / добавление в микс
  function handleToggleIngredient(id: string) {
    setSelectedParts((prev) => {
      const current = prev[id] || 0
      if (current > 0) {
        const next = { ...prev }
        delete next[id]
        // если ничего не осталось, выберем первый
        if (Object.keys(next).length === 0) {
          return { [id]: 1 }
        }
        return next
      } else {
        return { ...prev, [id]: 1 }
      }
    })
  }

  // Увеличение доли ингредиента
  function handleAdjustPart(id: string, delta: number) {
    setSelectedParts((prev) => {
      const current = prev[id] || 0
      const nextVal = Math.max(0, current + delta)
      const updated = { ...prev, [id]: nextVal }
      if (nextVal === 0) delete updated[id]
      if (Object.keys(updated).length === 0) {
        return { rice: 1 }
      }
      return updated
    })
  }

  // Быстрые пресеты
  function handlePreset5050(id1: string, id2: string) {
    setSelectedParts({ [id1]: 1, [id2]: 1 })
  }

  function handlePresetEqualAllSelected() {
    const keys = Object.keys(selectedParts)
    if (keys.length === 0) return
    const next: Record<string, number> = {}
    keys.forEach((k) => (next[k] = 1))
    setSelectedParts(next)
  }

  // Добавление в корзину
  function handleConfirm() {
    if (mixBreakdown.length === 0) return

    const sizeLabel = size === 'half' ? 'Полпорции' : '1 порция'
    const title = `Гарнир (${sizeLabel}): ${mixDescription}`
    const unitPrice = activeConfig.price
    const uniqueId = `side-${size}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    onAddGarnish({
      id: uniqueId,
      name: title,
      price: unitPrice,
      category: 'sides',
      isKitchen: true,
      notes: `Гарнир ${sizeLabel}: ${mixDescription} (${activeConfig.weight}г)`,
      garnishMix: mixBreakdown,
      qty: count,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm print:hidden">
      <div className="flex flex-col max-h-[92vh] w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-2xl overflow-hidden">
        {/* Шапка */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 bg-zinc-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-500/20 text-lg">
              🥗
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                Конструктор гарнира
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                5 ингредиентов · Свободное микширование
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800 text-sm font-bold text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Тело модала со скроллом */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 1. Выбор размера порции */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
              1. Размер порции
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSize('half')}
                className={`flex flex-col items-start p-3 rounded-2xl border transition text-left cursor-pointer ${
                  size === 'half'
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-black">
                    🥣 Полпорции
                  </span>
                  <span
                    className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${
                      size === 'half'
                        ? 'border-amber-500 bg-amber-500 text-black font-black'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {size === 'half' && '✓'}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  23 000 сум
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  Вес: 180 грамм
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSize('full')}
                className={`flex flex-col items-start p-3 rounded-2xl border transition text-left cursor-pointer ${
                  size === 'full'
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs sm:text-sm font-black">
                    🍽️ 1 порция
                  </span>
                  <span
                    className={`size-4 rounded-full border flex items-center justify-center text-[10px] ${
                      size === 'full'
                        ? 'border-amber-500 bg-amber-500 text-black font-black'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {size === 'full' && '✓'}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  35 000 сум
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  Вес: 350 грамм
                </span>
              </button>
            </div>
          </div>

          {/* 2. Быстрые шаблоны */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                2. Быстрые миксы (50/50)
              </label>
              <button
                type="button"
                onClick={handlePresetEqualAllSelected}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Поровну
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handlePreset5050('rice', 'buckwheat')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500"
              >
                🍚+🥣 Рис & Гречка
              </button>
              <button
                type="button"
                onClick={() => handlePreset5050('puree', 'rice')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500"
              >
                🥔+🍚 Пюре & Рис
              </button>
              <button
                type="button"
                onClick={() => handlePreset5050('puree', 'fries')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500"
              >
                🥔+🍟 Пюре & Фри
              </button>
              <button
                type="button"
                onClick={() => handlePreset5050('macaroni', 'puree')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500"
              >
                🍝+🥔 Макароны & Пюре
              </button>
            </div>
          </div>

          {/* 3. Ингредиенты и регуляторы долей */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
              3. Выберите состав (5 ингредиентов)
            </label>

            <div className="space-y-1.5">
              {INGREDIENTS.map((ing) => {
                const parts = selectedParts[ing.id] || 0
                const isSelected = parts > 0
                const percent =
                  totalParts > 0 ? Math.round((parts / totalParts) * 100) : 0
                const grams =
                  totalParts > 0
                    ? Math.round((activeConfig.weight * parts) / totalParts)
                    : 0

                return (
                  <div
                    key={ing.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                      isSelected
                        ? 'border-amber-500/60 bg-zinc-50 dark:bg-zinc-900/90 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 opacity-70'
                    }`}
                  >
                    {/* Кнопка выбора / название */}
                    <div
                      onClick={() => handleToggleIngredient(ing.id)}
                      className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                    >
                      <span className="text-xl">{ing.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                            {ing.name}
                          </span>
                          {isSelected && (
                            <span className="rounded-md bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-black text-amber-600 dark:text-amber-400">
                              {percent}% ({grams}г)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Управление долями ингредиента */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectSingle(ing.id)}
                        className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-amber-500 hover:text-black transition"
                        title="Выбрать только этот гарнир 100%"
                      >
                        100%
                      </button>

                      <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustPart(ing.id, -1)}
                          disabled={parts === 0}
                          className="flex size-6 items-center justify-center rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center text-xs font-black text-zinc-900 dark:text-white">
                          {parts}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustPart(ing.id, 1)}
                          className="flex size-6 items-center justify-center rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 4. Визуальная шкала пропорций */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-400">Итоговый состав:</span>
              <span className="font-black text-amber-600 dark:text-amber-400">
                {activeConfig.weight} грамм
              </span>
            </div>

            {/* Прогресс-бар микса */}
            <div className="h-4 w-full rounded-xl overflow-hidden flex bg-zinc-200 dark:bg-zinc-800">
              {mixBreakdown.map((item, idx) => {
                const colors = [
                  'bg-amber-500',
                  'bg-orange-500',
                  'bg-emerald-500',
                  'bg-sky-500',
                  'bg-rose-500',
                ]
                return (
                  <div
                    key={item.ingredient}
                    style={{ width: `${item.percent}%` }}
                    className={`${colors[idx % colors.length]} h-full transition-all flex items-center justify-center text-[9px] font-black text-black overflow-hidden`}
                    title={`${item.ingredient}: ${item.percent}%`}
                  >
                    {item.percent >= 15 ? `${item.ingredient} ${item.percent}%` : ''}
                  </div>
                )
              })}
            </div>

            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              📋 {mixDescription}
            </p>
          </div>
        </div>

        {/* Подвал с добавлением в чек */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between gap-3">
          {/* Количество порций */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="flex size-8 items-center justify-center rounded-xl text-sm font-black text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-black text-zinc-900 dark:text-white">
              {count}
            </span>
            <button
              type="button"
              onClick={() => setCount((c) => c + 1)}
              className="flex size-8 items-center justify-center rounded-xl text-sm font-black text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              +
            </button>
          </div>

          {/* Кнопка Добавить */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-2xl bg-amber-500 py-3 px-4 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-98 cursor-pointer flex items-center justify-between"
          >
            <span>✅ Добавить в чек</span>
            <span>{formatNum(activeConfig.price * count)} сум</span>
          </button>
        </div>
      </div>
    </div>
  )
}
