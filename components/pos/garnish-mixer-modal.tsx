'use client'

import { useState, useMemo } from 'react'
import { X, Check, Utensils, Plus, Minus, Sparkles } from 'lucide-react'
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
  { id: 'buckwheat', name: 'Гречка отварная', shortName: 'Гречка', icon: '🌾' },
  { id: 'macaroni', name: 'Макароны', shortName: 'Макароны', icon: '🍝' },
  { id: 'fries', name: 'Картофель фри', shortName: 'Фри', icon: '🍟' },
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

type MixMode = 'single' | 'mix2' | 'mix3' | 'custom'

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
  const [mode, setMode] = useState<MixMode>('mix2')
  const [selectedSingle, setSelectedSingle] = useState<string>('puree')
  // Для смеси 2 гарниров
  const [selectedMix2, setSelectedMix2] = useState<[string, string]>(['puree', 'rice'])
  // Для тройного микса
  const [selectedMix3, setSelectedMix3] = useState<[string, string, string]>(['puree', 'rice', 'buckwheat'])
  // Для произвольной смеси: id -> процент
  const [customShares, setCustomShares] = useState<Record<string, number>>({
    puree: 50,
    rice: 50,
  })
  const [count, setCount] = useState<number>(1)

  const activeConfig = PORTION_CONFIGS[size]

  // Вычисление текущего состава и граммовки для каждого режима
  const currentComposition = useMemo(() => {
    const totalGrams = activeConfig.weight

    if (mode === 'single') {
      const def = INGREDIENTS.find((i) => i.id === selectedSingle) || INGREDIENTS[0]
      return [
        {
          id: def.id,
          name: def.name,
          shortName: def.shortName,
          icon: def.icon,
          percent: 100,
          grams: totalGrams,
        },
      ]
    }

    if (mode === 'mix2') {
      const def1 = INGREDIENTS.find((i) => i.id === selectedMix2[0]) || INGREDIENTS[0]
      const def2 = INGREDIENTS.find((i) => i.id === selectedMix2[1]) || INGREDIENTS[1]
      const halfGrams = Math.round(totalGrams / 2)
      return [
        {
          id: def1.id,
          name: def1.name,
          shortName: def1.shortName,
          icon: def1.icon,
          percent: 50,
          grams: halfGrams,
        },
        {
          id: def2.id,
          name: def2.name,
          shortName: def2.shortName,
          icon: def2.icon,
          percent: 50,
          grams: totalGrams - halfGrams,
        },
      ]
    }

    if (mode === 'mix3') {
      const def1 = INGREDIENTS.find((i) => i.id === selectedMix3[0]) || INGREDIENTS[0]
      const def2 = INGREDIENTS.find((i) => i.id === selectedMix3[1]) || INGREDIENTS[1]
      const def3 = INGREDIENTS.find((i) => i.id === selectedMix3[2]) || INGREDIENTS[2]
      const g1 = Math.round(totalGrams * 0.34)
      const g2 = Math.round(totalGrams * 0.33)
      const g3 = totalGrams - g1 - g2
      return [
        {
          id: def1.id,
          name: def1.name,
          shortName: def1.shortName,
          icon: def1.icon,
          percent: 34,
          grams: g1,
        },
        {
          id: def2.id,
          name: def2.name,
          shortName: def2.shortName,
          icon: def2.icon,
          percent: 33,
          grams: g2,
        },
        {
          id: def3.id,
          name: def3.name,
          shortName: def3.shortName,
          icon: def3.icon,
          percent: 33,
          grams: g3,
        },
      ]
    }

    // mode === 'custom'
    const activeKeys = Object.keys(customShares).filter((k) => (customShares[k] || 0) > 0)
    const sumShares = activeKeys.reduce((acc, k) => acc + (customShares[k] || 0), 0) || 1

    return activeKeys.map((k) => {
      const def = INGREDIENTS.find((i) => i.id === k) || { id: k, name: k, shortName: k, icon: '🥣' }
      const rawPct = Math.round(((customShares[k] || 0) / sumShares) * 100)
      const grams = Math.round((rawPct / 100) * totalGrams)
      return {
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        icon: def.icon,
        percent: rawPct,
        grams,
      }
    })
  }, [mode, size, selectedSingle, selectedMix2, selectedMix3, customShares, activeConfig])

  if (!isOpen) return null

  // Переключение в режиме смеси из 2
  function handleToggleMix2(id: string) {
    setSelectedMix2((prev) => {
      if (prev[0] === id) return prev
      if (prev[1] === id) return prev
      return [prev[1], id]
    })
  }

  // Переключение в режиме тройного микса
  function handleToggleMix3(id: string) {
    setSelectedMix3((prev) => {
      if (prev.includes(id)) return prev
      return [prev[1], prev[2], id]
    })
  }

  // Переключение в режиме свободной смеси
  function handleToggleCustom(id: string) {
    setCustomShares((prev) => {
      const next = { ...prev }
      if (next[id]) {
        // Не удаляем если остался всего один
        if (Object.keys(next).length > 1) {
          delete next[id]
        }
      } else {
        next[id] = 50
      }
      return next
    })
  }

  // Коррекция доли в свободной смеси
  function handleAdjustShare(id: string, delta: number) {
    setCustomShares((prev) => {
      const cur = prev[id] || 0
      const nextVal = Math.max(10, cur + delta)
      return { ...prev, [id]: nextVal }
    })
  }

  // Подтверждение и добавление в чек
  function handleConfirm() {
    let title = ''
    let notes = ''
    const breakdown: GarnishIngredient[] = currentComposition.map((c) => ({
      ingredient: c.shortName,
      percent: c.percent,
      grams: c.grams,
    }))

    if (mode === 'single') {
      const item = currentComposition[0]
      title = `Гарнир (${activeConfig.label}): ${item.name}`
      notes = `${item.shortName} (${activeConfig.weight}г)`
    } else {
      const mixDesc = currentComposition.map((c) => `${c.shortName} ${c.percent}%`).join(' + ')
      title = `Гарнир (${activeConfig.label}): ${currentComposition.map((c) => c.shortName).join(' + ')}`
      notes = `${mixDesc} (${activeConfig.weight}г)`
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
      <div className="flex flex-col max-h-[94vh] w-full max-w-lg rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* Шапка */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-2xs">
              <Utensils className="size-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight text-foreground">
                Конструктор смесей гарниров
              </h2>
              <p className="text-xs text-muted-foreground">
                Один гарнир, смесь 50/50, трио или свободный микс
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pr-1">
          {/* 1. Размер порции */}
          <div>
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block mb-2">
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

          {/* 2. Формат смеси: 4 режима */}
          <div>
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block mb-2">
              2. Формат подачи и смесь
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-secondary/60 border border-border">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                  mode === 'single'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                1 гарнир (100%)
              </button>
              <button
                type="button"
                onClick={() => setMode('mix2')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                  mode === 'mix2'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Микс 50 / 50
              </button>
              <button
                type="button"
                onClick={() => setMode('mix3')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                  mode === 'mix3'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Трио (по 1/3)
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1 ${
                  mode === 'custom'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="size-3 text-amber-500" />
                <span>Свой микс</span>
              </button>
            </div>
          </div>

          {/* 3. Интерактивная плашка состава тарелки */}
          <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">Состав тарелки:</span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                Итого {activeConfig.weight} грамм
              </span>
            </div>
            {/* Визуальная прогресс-полоса смеси */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5 gap-0.5">
              {currentComposition.map((c, idx) => (
                <div
                  key={c.id}
                  style={{ width: `${c.percent}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    idx === 0
                      ? 'bg-amber-500'
                      : idx === 1
                      ? 'bg-orange-500'
                      : idx === 2
                      ? 'bg-yellow-400'
                      : 'bg-emerald-500'
                  }`}
                  title={`${c.name}: ${c.percent}% (${c.grams}г)`}
                />
              ))}
            </div>
            {/* Чипсы выбранных ингредиентов с граммами */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentComposition.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-card border border-border px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs"
                >
                  <span aria-hidden="true">{c.icon}</span>
                  <span>{c.shortName}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    {c.percent}% ({c.grams}г)
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* 4. Выбор ингредиентов */}
          <div>
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block mb-2">
              {mode === 'single'
                ? '3. Выберите один гарнир'
                : mode === 'mix2'
                ? '3. Выберите 2 гарнира (по 50%)'
                : mode === 'mix3'
                ? '3. Выберите 3 гарнира (по 1/3)'
                : '3. Выберите гарниры и настройте пропорции'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INGREDIENTS.map((ing) => {
                const isSelected =
                  mode === 'single'
                    ? selectedSingle === ing.id
                    : mode === 'mix2'
                    ? selectedMix2.includes(ing.id)
                    : mode === 'mix3'
                    ? selectedMix3.includes(ing.id)
                    : Boolean(customShares[ing.id])

                const matchedComp = currentComposition.find((c) => c.id === ing.id)

                return (
                  <div
                    key={ing.id}
                    onClick={() => {
                      if (mode === 'single') setSelectedSingle(ing.id)
                      else if (mode === 'mix2') handleToggleMix2(ing.id)
                      else if (mode === 'mix3') handleToggleMix3(ing.id)
                      else handleToggleCustom(ing.id)
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 transition text-left cursor-pointer touch-manipulation active:scale-[0.99] min-h-[58px] ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-foreground font-black shadow-2xs'
                        : 'border-border bg-card text-foreground/80 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none" aria-hidden="true">
                        {ing.icon}
                      </span>
                      <div>
                        <span className="text-xs sm:text-sm font-bold block leading-tight">
                          {ing.name}
                        </span>
                        {isSelected && matchedComp && (
                          <span className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                            {matchedComp.percent}% · {matchedComp.grams}г
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mode === 'custom' && isSelected && (
                        <div
                          className="flex items-center gap-1 mr-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleAdjustShare(ing.id, -10)}
                            className="size-6 rounded-lg bg-secondary text-foreground font-black flex items-center justify-center hover:bg-muted active:scale-90"
                            title="Уменьшить долю"
                          >
                            <Minus className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustShare(ing.id, 10)}
                            className="size-6 rounded-lg bg-secondary text-foreground font-black flex items-center justify-center hover:bg-muted active:scale-90"
                            title="Увеличить долю"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      )}

                      {isSelected ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-black">
                          <Check className="size-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="size-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Подвал: количество и добавление в чек */}
        <div className="border-t border-border px-5 py-3.5 bg-muted/40 flex items-center justify-between gap-3">
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
