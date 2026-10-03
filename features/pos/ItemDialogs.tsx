'use client'
import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/domain/cart'
import { formatUZS } from '@/domain/money'
import { optionsNote, type ProductOptions } from '@/domain/product'
import type { TableRow } from '@/data/local-db'
import { Modal, Numpad } from './common'

function Variants({ opts, variant, setVariant, extras, setExtras }: {
  opts: ProductOptions; variant: string | null; setVariant: (v: string) => void; extras: string[]; setExtras: (e: string[]) => void
}) {
  if (!opts.variants?.length && !opts.extras?.length) return null
  return (
    <div className="flex flex-wrap gap-2 mb-3 items-center">
      {!!opts.variants?.length && (
        <div className="seg" role="radiogroup" aria-label="Вариант">
          {opts.variants.map((v) => <button key={v} role="radio" aria-checked={variant === v} onClick={() => setVariant(v)}>{v}</button>)}
        </div>
      )}
      {opts.extras?.map((x) => (
        <button key={x} className="cat-chip" aria-pressed={extras.includes(x)} aria-selected={extras.includes(x)}
          onClick={() => setExtras(extras.includes(x) ? extras.filter((e) => e !== x) : [...extras, x])}>{x}</button>
      ))}
    </div>
  )
}

/** Весовой товар: по сумме («на 50 000») или по весу; быстрые кнопки добавляют сразу (как в v1, но без подтверждения). */
export function WeightDialog({ name, pricePerKg, opts, onClose, onAdd }: {
  name: string; pricePerKg: number; opts: ProductOptions; onClose: () => void
  onAdd: (r: { grams: number; price: number; note: string; variant: string | null }) => void
}) {
  const [mode, setMode] = useState<'sum' | 'weight'>('sum')
  const [v, setV] = useState('')
  const [variant, setVariant] = useState<string | null>(opts.variants?.[0] ?? null)
  const [extras, setExtras] = useState<string[]>([])
  const calc = (n: number, m = mode) => (m === 'sum' ? { price: n, grams: Math.round((n / pricePerKg) * 1000) } : { grams: n, price: Math.round((pricePerKg * n) / 1000) })
  const add = (n: number, m = mode) => { const c = calc(n, m); if (c.grams > 0) onAdd({ ...c, note: optionsNote(variant, extras), variant }) }
  const cur = calc(Number(v || 0))
  const quick = mode === 'sum' ? [30000, 45000, 50000, 60000, 75000, 90000] : [300, 500, 700, 1000, 1500, 2000]
  return (
    <Modal title={name} onClose={onClose} width={560}>
      <Variants opts={opts} variant={variant} setVariant={setVariant} extras={extras} setExtras={setExtras} />
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="seg" role="radiogroup" aria-label="Ввод">
          <button role="radio" aria-checked={mode === 'sum'} onClick={() => { setMode('sum'); setV('') }}>По сумме</button>
          <button role="radio" aria-checked={mode === 'weight'} onClick={() => { setMode('weight'); setV('') }}>По весу</button>
        </div>
        <span className="muted text-sm">{formatUZS(pricePerKg)} сум / кг</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3" aria-label="Быстро добавить">
        {quick.map((q) => (
          <button key={q} className="btn" onClick={() => add(q)}>
            {mode === 'sum' ? formatUZS(q) : q >= 1000 ? `${q / 1000} кг` : `${q} г`}
          </button>
        ))}
      </div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-2xl font-bold">{mode === 'sum' ? `${formatUZS(Number(v || 0))} сум` : `${Number(v || 0)} г`}</span>
        <span className="muted">{mode === 'sum' ? `${cur.grams} г` : `${formatUZS(cur.price)} сум`}</span>
      </div>
      <Numpad value={v} onChange={setV} />
      <button className="btn btn-lg btn-primary w-full mt-3" disabled={cur.grams <= 0} onClick={() => add(Number(v))}>
        Добавить{cur.grams > 0 ? ` · ${cur.grams} г · ${formatUZS(cur.price)}` : ''}
      </button>
    </Modal>
  )
}

/** Модификаторы порционного товара. Только варианты — одно нажатие добавляет. */
export function OptionsDialog({ name, opts, onClose, onAdd }: { name: string; opts: ProductOptions; onClose: () => void; onAdd: (note: string) => void }) {
  const [variant, setVariant] = useState<string | null>(opts.variants?.[0] ?? null)
  const [extras, setExtras] = useState<string[]>([])
  const instant = !opts.extras?.length
  return (
    <Modal title={name} onClose={onClose}>
      {instant ? (
        <div className="grid grid-cols-2 gap-2">
          {opts.variants?.map((v) => <button key={v} className="btn btn-lg" onClick={() => onAdd(v)}>{v}</button>)}
        </div>
      ) : (
        <>
          <Variants opts={opts} variant={variant} setVariant={setVariant} extras={extras} setExtras={setExtras} />
          <button className="btn btn-lg btn-primary w-full" onClick={() => onAdd(optionsNote(variant, extras))}>Добавить</button>
        </>
      )}
    </Modal>
  )
}

const QUICK_TAGS = ['С собой', 'Без лука', 'Подогреть', 'Острее', 'Не острое', 'Без соли', 'Соус отдельно', 'В ланчбокс']

/** Правка позиции: количество, цена, комментарий для кухни, удаление — всё в одном окне (v1 ItemEditModal). */
export function LineEditor({ line, onClose, onSave, onRemove }: { line: CartItem; onClose: () => void; onSave: (u: Partial<CartItem>) => void; onRemove: () => void }) {
  const [qty, setQty] = useState(line.qty)
  const [price, setPrice] = useState(String(line.price))
  const [notes, setNotes] = useState(line.notes ?? '')
  const toggle = (t: string) => setNotes(notes.includes(t) ? notes.split(',').map((s) => s.trim()).filter((s) => s && s !== t).join(', ') : notes ? `${notes}, ${t}` : t)
  return (
    <Modal title={line.name} onClose={onClose}>
      <div className="grid gap-3">
        {!line.weightKg && (
          <div className="flex items-center gap-3">
            <span className="muted flex-1">Количество</span>
            <button className="btn qty-btn" aria-label="Меньше" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={18} /></button>
            <span className="w-10 text-center text-xl font-bold">{qty}</span>
            <button className="btn qty-btn" aria-label="Больше" onClick={() => setQty(qty + 1)}><Plus size={18} /></button>
          </div>
        )}
        <label className="grid gap-1"><span className="text-sm muted">Цена за {line.weightKg ? 'позицию' : 'единицу'}, сум</span>
          <input className="input" inputMode="numeric" value={price ? formatUZS(Number(price)) : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} /></label>
        <div className="flex flex-wrap gap-2" aria-label="Быстрые комментарии">
          {QUICK_TAGS.map((t) => <button key={t} className="cat-chip" aria-pressed={notes.includes(t)} aria-selected={notes.includes(t)} onClick={() => toggle(t)}>{t}</button>)}
        </div>
        <label className="grid gap-1"><span className="text-sm muted">Комментарий для кухни</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-lg btn-danger" onClick={onRemove}><Trash2 size={18} />Удалить</button>
          <button className="btn btn-lg btn-primary" onClick={() => onSave({ qty, price: Number(price || 0), notes: notes.trim() || undefined })}>Готово</button>
        </div>
      </div>
    </Modal>
  )
}

/** Позиция не из меню (v1 «своя позиция»). */
export function CustomItemDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (r: { name: string; price: number; isKitchen: boolean }) => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [kitchen, setKitchen] = useState(true)
  const ok = name.trim().length >= 2 && Number(price) > 0
  return (
    <Modal title="Своя позиция" onClose={onClose}>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (ok) onAdd({ name: name.trim(), price: Number(price), isKitchen: kitchen }) }}>
        <label className="grid gap-1"><span className="text-sm muted">Название</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <label className="grid gap-1"><span className="text-sm muted">Цена, сум</span>
          <input className="input" inputMode="numeric" value={price ? formatUZS(Number(price)) : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} /></label>
        <div className="seg" role="radiogroup" aria-label="Куда">
          <button type="button" role="radio" aria-checked={kitchen} onClick={() => setKitchen(true)}>Кухня</button>
          <button type="button" role="radio" aria-checked={!kitchen} onClick={() => setKitchen(false)}>Бар (без кухни)</button>
        </div>
        <button className="btn btn-lg btn-primary" type="submit" disabled={!ok}>Добавить</button>
      </form>
    </Modal>
  )
}

/** Перенос счёта на свободный стол (v1 «Перенести»). */
export function TransferDialog({ from, tables, busy, onClose, onPick }: { from: string; tables: TableRow[]; busy: Set<string>; onClose: () => void; onPick: (id: string) => void }) {
  const zones = [...new Set(tables.map((t) => t.zone))]
  return (
    <Modal title={`Перенести счёт: ${tables.find((t) => t.id === from)?.label ?? from} →`} onClose={onClose}>
      {zones.map((z) => (
        <div key={z} className="mb-3">
          <div className="text-sm muted mb-1">{z}</div>
          <div className="grid grid-cols-4 gap-2">
            {tables.filter((t) => t.zone === z).map((t) => {
              const dis = t.id === from || busy.has(t.id)
              return <button key={t.id} className="btn btn-lg" disabled={dis} onClick={() => onPick(t.id)} aria-label={`${t.label}${dis ? ', занят' : ''}`}>{t.label.replace('Стол ', '')}</button>
            })}
          </div>
        </div>
      ))}
      <p className="muted text-sm">Занятые столы недоступны.</p>
    </Modal>
  )
}
