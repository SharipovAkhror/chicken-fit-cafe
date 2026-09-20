'use client'

import { useState, useMemo } from 'react'
import { X, Check, Scale, DollarSign, Flame, Delete, RotateCcw } from 'lucide-react'

export type ChickenWeightModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddChicken: (item: {
    id: string
    name: string
    price: number
    category: string
    isKitchen: boolean
    notes: string
    weightKg: number
    pricePerKg: number
    qty: number
  }) => void
  initialWeightKg?: number
  initialPricePerKg?: number
}

const DEFAULT_PRICE_PER_KG = 90000

const QUICK_SUMS = [30000, 45000, 50000, 60000, 75000, 90000, 100000, 150000]
const QUICK_WEIGHTS = [0.3, 0.5, 0.7, 0.85, 1.0, 1.2, 1.5, 2.0]

type ChickenType = 'mix' | 'wings' | 'strips'

function formatNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function ChickenWeightModal({
  isOpen,
  onClose,
  onAddChicken,
  initialWeightKg = 0.5,
  initialPricePerKg = DEFAULT_PRICE_PER_KG,
}: ChickenWeightModalProps) {
  const [pricePerKg, setPricePerKg] = useState<number>(initialPricePerKg)
  // Активное поле для ввода: 'sum' (гость назвал сумму) или 'weight' (гость назвал вес или с весов)
  const [activeInput, setActiveInput] = useState<'sum' | 'weight'>('sum')
  const [sumInput, setSumInput] = useState<string>('50000')
  const [weightInput, setWeightInput] = useState<string>(
    (50000 / initialPricePerKg).toFixed(3),
  )

  const [chickenType, setChickenType] = useState<ChickenType>('mix')
  const [isSpicy, setIsSpicy] = useState<boolean>(false)

  // Вычисленные значения
  const { calculatedSum, calculatedWeightKg, calculatedGrams } = useMemo(() => {
    const pKg = Math.max(1, pricePerKg)
    if (activeInput === 'sum') {
      const sum = parseInt(sumInput, 10) || 0
      const wKg = sum / pKg
      const grams = Math.round(wKg * 1000)
      return {
        calculatedSum: sum,
        calculatedWeightKg: Number(wKg.toFixed(3)),
        calculatedGrams: grams,
      }
    } else {
      const wKg = parseFloat(weightInput.replace(',', '.')) || 0
      const sum = Math.round(wKg * pKg)
      const grams = Math.round(wKg * 1000)
      return {
        calculatedSum: sum,
        calculatedWeightKg: Number(wKg.toFixed(3)),
        calculatedGrams: grams,
      }
    }
  }, [activeInput, sumInput, weightInput, pricePerKg])

  if (!isOpen) return null

  // Обновление по сумме
  function handleSelectQuickSum(sum: number) {
    setActiveInput('sum')
    setSumInput(String(sum))
    const wKg = sum / Math.max(1, pricePerKg)
    setWeightInput(wKg.toFixed(3))
  }

  // Обновление по весу
  function handleSelectQuickWeight(w: number) {
    setActiveInput('weight')
    setWeightInput(w.toFixed(3))
    const sum = Math.round(w * pricePerKg)
    setSumInput(String(sum))
  }

  // Смещение веса +- граммы
  function handleAdjustWeightGrams(deltaGrams: number) {
    setActiveInput('weight')
    const curGrams = calculatedGrams
    const nextGrams = Math.max(50, curGrams + deltaGrams)
    const nextKg = Number((nextGrams / 1000).toFixed(3))
    setWeightInput(nextKg.toFixed(3))
    setSumInput(String(Math.round(nextKg * pricePerKg)))
  }

  // Обработка клика цифрового нумпада
  function handleNumpadKey(key: string) {
    if (activeInput === 'sum') {
      let nextStr = sumInput === '0' ? '' : sumInput
      if (key === '.') return // в сумме нет копеек
      nextStr += key
      const parsed = parseInt(nextStr, 10) || 0
      setSumInput(String(parsed))
      setWeightInput((parsed / Math.max(1, pricePerKg)).toFixed(3))
    } else {
      let nextStr = weightInput === '0' ? '' : weightInput
      if (key === '.' && nextStr.includes('.')) return
      nextStr += key
      setWeightInput(nextStr)
      const parsedKg = parseFloat(nextStr.replace(',', '.')) || 0
      setSumInput(String(Math.round(parsedKg * pricePerKg)))
    }
  }

  function handleNumpadBackspace() {
    if (activeInput === 'sum') {
      const nextStr = sumInput.slice(0, -1)
      const parsed = parseInt(nextStr, 10) || 0
      setSumInput(String(parsed))
      setWeightInput((parsed / Math.max(1, pricePerKg)).toFixed(3))
    } else {
      const nextStr = weightInput.slice(0, -1)
      setWeightInput(nextStr || '0')
      const parsedKg = parseFloat(nextStr.replace(',', '.')) || 0
      setSumInput(String(Math.round(parsedKg * pricePerKg)))
    }
  }

  function handleNumpadClear() {
    if (activeInput === 'sum') {
      setSumInput('0')
      setWeightInput('0.000')
    } else {
      setWeightInput('0')
      setSumInput('0')
    }
  }

  // Подтверждение и добавление в чек
  function handleConfirm() {
    if (calculatedSum <= 0 || calculatedWeightKg <= 0) return

    const typeLabel =
      chickenType === 'mix'
        ? 'Микс (крылья + стрипсы)'
        : chickenType === 'wings'
        ? 'Крылья'
        : 'Стрипсы'

    const spicyLabel = isSpicy ? ' · Острый 🌶️' : ''
    const shortTitle = `Chicken ${chickenType === 'mix' ? '' : typeLabel + ' '}(${calculatedWeightKg.toFixed(2)} кг)`.trim()
    const detailedNote = `Вес: ${calculatedWeightKg.toFixed(3)} кг (${calculatedGrams}г) · ${formatNum(pricePerKg)} сум/кг · ${typeLabel}${spicyLabel}`

    const uniqueId = `chicken-kg-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    onAddChicken({
      id: uniqueId,
      name: shortTitle,
      price: calculatedSum,
      category: 'chicken',
      isKitchen: true,
      notes: detailedNote,
      weightKg: calculatedWeightKg,
      pricePerKg,
      qty: 1,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs print:hidden select-none">
      <div className="flex flex-col max-h-[95vh] w-full max-w-xl rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* Шапка */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-2xs">
              <Scale className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black leading-tight text-foreground">
                  Курица на вес (Chicken по кг)
                </h2>
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {formatNum(pricePerKg)} сум / кг
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Введите сумму гостя (касса сама посчитает кг) или точный вес с весов
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
          {/* Два главных блока: СУММА и ВЕС (двусторонний расчёт) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Блок 1: Сумма */}
            <div
              onClick={() => setActiveInput('sum')}
              className={`flex flex-col p-3.5 rounded-2xl border-2 transition cursor-pointer touch-manipulation ${
                activeInput === 'sum'
                  ? 'border-amber-500 bg-amber-500/10 shadow-xs ring-2 ring-amber-500/20'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="size-3.5 text-amber-500" />
                  <span>Сумма гостя</span>
                </span>
                {activeInput === 'sum' && (
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground mt-1.5 truncate">
                {formatNum(calculatedSum)} <span className="text-xs font-normal text-muted-foreground">сум</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                Нажмите для ввода суммы
              </span>
            </div>

            {/* Блок 2: Вес */}
            <div
              onClick={() => setActiveInput('weight')}
              className={`flex flex-col p-3.5 rounded-2xl border-2 transition cursor-pointer touch-manipulation ${
                activeInput === 'weight'
                  ? 'border-blue-500 bg-blue-500/10 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Scale className="size-3.5 text-blue-500" />
                  <span>Вес в кг</span>
                </span>
                {activeInput === 'weight' && (
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-foreground mt-1.5 truncate">
                {calculatedWeightKg.toFixed(3)}{' '}
                <span className="text-xs font-normal text-muted-foreground">кг ({calculatedGrams}г)</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                Нажмите для ввода веса
              </span>
            </div>
          </div>

          {/* Быстрые кнопки в зависимости от режима или универсальные */}
          <div className="space-y-2">
            {/* Быстрые суммы */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Быстрые суммы:
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                  автоматически считает кг
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {QUICK_SUMS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSelectQuickSum(s)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                      calculatedSum === s && activeInput === 'sum'
                        ? 'bg-amber-500 text-black shadow-xs font-black'
                        : 'border border-border bg-card hover:bg-secondary text-foreground'
                    }`}
                  >
                    {s >= 1000 ? `${s / 1000}к` : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Быстрый вес */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Быстрый вес:
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                  автоматически считает сумму
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {QUICK_WEIGHTS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleSelectQuickWeight(w)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                      Math.abs(calculatedWeightKg - w) < 0.01 && activeInput === 'weight'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'border border-border bg-card hover:bg-secondary text-foreground'
                    }`}
                  >
                    {w} кг
                  </button>
                ))}
              </div>
            </div>

            {/* Точная подстройка веса (+- 50г, +- 100г) */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleAdjustWeightGrams(-100)}
                className="flex-1 py-1.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer text-center touch-manipulation"
              >
                − 100 г
              </button>
              <button
                type="button"
                onClick={() => handleAdjustWeightGrams(-50)}
                className="flex-1 py-1.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer text-center touch-manipulation"
              >
                − 50 г
              </button>
              <button
                type="button"
                onClick={() => handleAdjustWeightGrams(50)}
                className="flex-1 py-1.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer text-center touch-manipulation"
              >
                + 50 г
              </button>
              <button
                type="button"
                onClick={() => handleAdjustWeightGrams(100)}
                className="flex-1 py-1.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer text-center touch-manipulation"
              >
                + 100 г
              </button>
            </div>
          </div>

          {/* Состав чикена (крылья, стрипсы, микс) + острота */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block">
              Состав порции:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChickenType('mix')}
                className={`py-2.5 px-3 rounded-2xl border-2 text-xs sm:text-sm font-bold transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                  chickenType === 'mix'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground font-black shadow-2xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                🍗 Микс (Крылья + Стрипсы)
              </button>
              <button
                type="button"
                onClick={() => setChickenType('wings')}
                className={`py-2.5 px-3 rounded-2xl border-2 text-xs sm:text-sm font-bold transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                  chickenType === 'wings'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground font-black shadow-2xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                🍗 Только крылья
              </button>
              <button
                type="button"
                onClick={() => setChickenType('strips')}
                className={`py-2.5 px-3 rounded-2xl border-2 text-xs sm:text-sm font-bold transition text-center cursor-pointer touch-manipulation active:scale-95 ${
                  chickenType === 'strips'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground font-black shadow-2xs'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                🍗 Только стрипсы
              </button>
            </div>

            {/* Тогл остроты */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl border border-border bg-secondary/30">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Flame className={`size-4 ${isSpicy ? 'text-red-500' : 'text-muted-foreground'}`} />
                <span>Острый чикен (Spicy)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSpicy(!isSpicy)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer touch-manipulation active:scale-95 ${
                  isSpicy
                    ? 'bg-red-500 text-white font-black shadow-xs'
                    : 'border border-border bg-card text-muted-foreground'
                }`}
              >
                {isSpicy ? 'ОСТРЫЙ 🌶️' : 'Классический'}
              </button>
            </div>
          </div>

          {/* Экранный нумпад для прямого набора */}
          <div className="pt-2 border-t border-border/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">
                Сенсорный ввод {activeInput === 'sum' ? '(сумма)' : '(вес кг)'}:
              </span>
              <button
                type="button"
                onClick={handleNumpadClear}
                className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
              >
                Очистить поле
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpadKey(k)}
                  className="h-11 rounded-xl border border-border bg-card text-base font-bold font-mono hover:bg-secondary active:scale-95 transition cursor-pointer flex items-center justify-center touch-manipulation"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={handleNumpadBackspace}
                className="h-11 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground active:scale-95 transition cursor-pointer flex items-center justify-center touch-manipulation"
                aria-label="Удалить символ"
              >
                <Delete className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Подвал: подтверждение и добавление в чек */}
        <div className="border-t border-border px-5 py-3.5 bg-muted/40 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground font-semibold">
              Итого к пробитию:
            </span>
            <span className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400">
              {formatNum(calculatedSum)} сум
            </span>
            <span className="text-[11px] text-muted-foreground">
              {calculatedWeightKg.toFixed(3)} кг ({calculatedGrams}г)
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={calculatedSum <= 0 || calculatedWeightKg <= 0}
            className="flex-1 min-h-[52px] rounded-2xl bg-amber-500 py-3 px-4 text-sm sm:text-base font-black text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-between touch-manipulation"
          >
            <span className="inline-flex items-center gap-2">
              <Check className="size-5 stroke-[2.5]" />
              <span>Добавить в чек</span>
            </span>
            <span className="font-mono font-black">
              {formatNum(calculatedSum)} сум
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
