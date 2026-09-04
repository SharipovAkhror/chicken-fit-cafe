'use client'

import { useState } from 'react'
import { X, Check, Utensils } from 'lucide-react'
import type { GarnishIngredient } from '@/lib/cart'

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
}

const INGREDIENTS: IngredientDef[] = [
  { id: 'puree', name: 'Картофельное пюре', shortName: 'Пюре', icon: '🥔' },
  { id: 'rice', name: 'Рис отварной', shortName: 'Рис', icon: '🍚' },
  { id: 'buckwheat', name: 'Гречка', shortName: 'Гречка', icon: '🌾' },
  { id: 'macaroni', name: 'Макароны', shortName: 'Макароны', icon: '🍝' },
  { id: 'fries', name: 'Картошка фри', shortName: 'Фри', icon: '🍟' },
]

const PORTION_CONFIGS = {
  half: {
    label: 'Полпорции',
    price: 23000,
    weight: 180,
  },
  full: {
    label: '1 порция',
    price: 35000,
    weight: 350,
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
  const [mode, setMode] = useState<'single' | 'mix5050'>('single')
  const [selectedSingle, setSelectedSingle] = useState<string>('puree')
  const [selectedMix, setSelectedMix] = useState<[string, string]>(['puree', 'rice'])
  const [count, setCount] = useState<number>(1)

  if (!isOpen) return null

  const activeConfig = PORTION_CONFIGS[size]

  // Обработка клика в режиме микса 50/50
  function handleToggleMixIngredient(id: string) {
    setSelectedMix((prev) => {
      // Если уже выбран — не сбрасываем в 0, а оставляем
      if (prev[0] === id) return prev
      if (prev[1] === id) return prev
      // Заменяем второй элемент новым выбором
      return [prev[1], id]
    })
  }

  // Подтверждение и добавление в чек
  function handleConfirm() {
    let title = ''
    let notes = ''
    let breakdown: GarnishIngredient[] = []

    if (mode === 'single') {
      const def = INGREDIENTS.find((i) => i.id === selectedSingle) || INGREDIENTS[0]
      title = `Гарнир (${activeConfig.label}): ${def.name}`
      notes = `${def.shortName} (${activeConfig.weight}г)`
      breakdown = [
        {
          ingredient: def.shortName,
          percent: 100,
          grams: activeConfig.weight,
        },
      ]
    } else {
      const def1 = INGREDIENTS.find((i) => i.id === selectedMix[0]) || INGREDIENTS[0]
      const def2 = INGREDIENTS.find((i) => i.id === selectedMix[1]) || INGREDIENTS[1]
      const halfWeight = Math.round(activeConfig.weight / 2)

      title = `Гарнир (${activeConfig.label}): ${def1.shortName} + ${def2.shortName} (50/50)`
      notes = `${def1.shortName} 50% + ${def2.shortName} 50% (${activeConfig.weight}г)`
      breakdown = [
        {
          ingredient: def1.shortName,
          percent: 50,
          grams: halfWeight,
        },
        {
          ingredient: def2.shortName,
          percent: 50,
          grams: halfWeight,
        },
      ]
    }

    const uniqueId = `side-${size}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    onAddGarnish({
      id: uniqueId,
      name: title,
      price: activeConfig.price,
      category: 'sides',
      isKitchen: true,
      notes,
      garnishMix: breakdown,
      qty: count,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs print:hidden select-none">
      <div className="flex flex-col max-h-[92vh] w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* Шапка */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/40">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Utensils className="size-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                Выбор гарнира
              </h2>
              <p className="text-xs text-muted-foreground">
                Стандартная подача или 50/50 микс
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer touch-manipulation active:scale-90"
            aria-label="Закрыть"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Тело модала */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Размер порции */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              1. Размер порции
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSize('half')}
                className={`flex flex-col p-3 rounded-2xl border-2 transition text-left cursor-pointer touch-manipulation active:scale-98 ${
                  size === 'half'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-black text-foreground">
                    Полпорции (180 г)
                  </span>
                  {size === 'half' && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-black">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  23 000 сум
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSize('full')}
                className={`flex flex-col p-3 rounded-2xl border-2 transition text-left cursor-pointer touch-manipulation active:scale-98 ${
                  size === 'full'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-black text-foreground">
                    1 порция (350 г)
                  </span>
                  {size === 'full' && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-black">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  35 000 сум
                </span>
              </button>
            </div>
          </div>

          {/* 2. Режим: Один или Микс 50/50 */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              2. Формат гарнира
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary/60 border border-border">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer touch-manipulation active:scale-95 ${
                  mode === 'single'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Один гарнир (100%)
              </button>
              <button
                type="button"
                onClick={() => setMode('mix5050')}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer touch-manipulation active:scale-95 ${
                  mode === 'mix5050'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Микс 50 / 50 (Два гарнира)
              </button>
            </div>
          </div>

          {/* 3. Выбор гарнира */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {mode === 'single'
                  ? '3. Выберите гарнир'
                  : '3. Выберите 2 гарнира (по 50%)'}
              </label>
              {mode === 'mix5050' && (
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {INGREDIENTS.find((i) => i.id === selectedMix[0])?.shortName} +{' '}
                  {INGREDIENTS.find((i) => i.id === selectedMix[1])?.shortName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INGREDIENTS.map((ing) => {
                const isSingleSelected = mode === 'single' && selectedSingle === ing.id
                const isMixSelected = mode === 'mix5050' && selectedMix.includes(ing.id)
                const isSelected = mode === 'single' ? isSingleSelected : isMixSelected

                return (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => {
                      if (mode === 'single') {
                        setSelectedSingle(ing.id)
                      } else {
                        handleToggleMixIngredient(ing.id)
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition text-left cursor-pointer touch-manipulation active:scale-98 min-h-[56px] ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-foreground font-black shadow-2xs'
                        : 'border-border bg-card text-foreground/80 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none" aria-hidden="true">
                        {ing.icon}
                      </span>
                      <span className="text-sm font-bold leading-tight">
                        {ing.name}
                      </span>
                    </div>

                    <div>
                      {mode === 'single' ? (
                        isSingleSelected ? (
                          <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-black">
                            <Check className="size-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="size-5 rounded-full border-2 border-muted-foreground/30" />
                        )
                      ) : isMixSelected ? (
                        <span className="rounded-lg bg-amber-500 px-2 py-0.5 text-xs font-black text-black font-mono">
                          50%
                        </span>
                      ) : (
                        <span className="size-5 rounded-lg border-2 border-muted-foreground/30" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Подвал: количество и добавление в чек */}
        <div className="border-t border-border px-5 py-4 bg-muted/40 flex items-center justify-between gap-3">
          {/* Количество порций */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="flex size-10 items-center justify-center rounded-xl text-base font-black text-foreground hover:bg-secondary active:scale-90 transition cursor-pointer touch-manipulation"
              aria-label="Уменьшить количество"
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm sm:text-base font-black font-mono text-foreground">
              {count}
            </span>
            <button
              type="button"
              onClick={() => setCount((c) => c + 1)}
              className="flex size-10 items-center justify-center rounded-xl text-base font-black text-foreground hover:bg-secondary active:scale-90 transition cursor-pointer touch-manipulation"
              aria-label="Увеличить количество"
            >
              +
            </button>
          </div>

          {/* Кнопка Добавить */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 min-h-[50px] rounded-2xl bg-amber-500 py-3 px-4 text-sm sm:text-base font-black text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95 cursor-pointer flex items-center justify-between touch-manipulation"
          >
            <span className="inline-flex items-center gap-2">
              <Check className="size-5 stroke-[2.5]" />
              <span>Добавить в чек</span>
            </span>
            <span className="font-mono font-black">
              {formatNum(activeConfig.price * count)} сум
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
