'use client'
import { useEffect, useState } from 'react'
import { Delete, Minus, Plus, Trash2, Undo2 } from 'lucide-react'
import { baseName, gramsOf, isPriceOverridden, lineTotal, weighLine, type CartItem } from '@/domain/cart'
import { formatUZS } from '@/domain/money'
import { KIND_LABEL, optionsNote, type ProductKind, type ProductOptions } from '@/domain/product'
import type { TableRow } from '@/data/local-db'
import { Modal } from './common'

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

export type PadField = { key: string; label: string; value: string; suffix?: string; step?: (d: number) => void; min?: number }
const fmt = (v: string) => (v ? formatUZS(Number(v)) : '')

/**
 * Поля + цифровая клавиатура. Нажатие на поле делает его активным; первая цифра заменяет значение
 * (не нужно стирать), дальше — дописывает. Работает и с физической клавиатурой (цифры, Backspace, Enter).
 */
export function FieldPad({ fields, active, onActive, onInput, onEnter }: {
  fields: PadField[]; active: string; onActive: (k: string) => void; onInput: (k: string, v: string) => void; onEnter?: () => void
}) {
  const [fresh, setFresh] = useState(true)
  const cur = fields.find((f) => f.key === active)?.value ?? ''
  const press = (k: string) => {
    if (k === 'back') { onInput(active, fresh ? '' : cur.slice(0, -1)); setFresh(false); return }
    const next = ((fresh ? '' : cur) + k).replace(/^0+(?=\d)/, '')
    if (next.length <= 9) onInput(active, next)
    setFresh(false)
  }
  const pick = (k: string) => { onActive(k); setFresh(true) }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (/^\d$/.test(e.key)) { e.preventDefault(); press(e.key) }
      else if (e.key === 'Backspace') { e.preventDefault(); press('back') }
      else if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  return (
    <div className="grid gap-2">
      <div className={`grid gap-2${fields.some((f) => f.step) ? ' pad-grid-step' : ''}`} style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr))` }}>
        {fields.map((f) => {
          const box = (
            <button key={f.key} type="button" className="pad-field flex-1" aria-pressed={f.key === active} aria-label={`${f.label}: ${f.value || 'пусто'}`} onClick={() => pick(f.key)}>
              <span className="pad-label">{f.label}</span>
              <span className="pad-value">{fmt(f.value) || <span className="muted">0</span>}{f.suffix && <span className="pad-suffix"> {f.suffix}</span>}</span>
            </button>
          )
          if (!f.step) return box
          return (
            <div key={f.key} className="flex gap-1 min-w-0">
              <button type="button" className="btn pad-step" aria-label="Минус один" disabled={Number(f.value || 0) <= (f.min ?? 1)} onClick={() => { f.step?.(-1); setFresh(true) }}><Minus size={22} /></button>
              {box}
              <button type="button" className="btn pad-step" aria-label="Плюс один" onClick={() => { f.step?.(1); setFresh(true) }}><Plus size={22} /></button>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'].map((k) => (
          <button key={k} type="button" className="btn numkey" onClick={() => press(k)}>{k}</button>
        ))}
        <button type="button" className="btn numkey" onClick={() => press('back')} aria-label="Стереть"><Delete size={24} /></button>
      </div>
    </div>
  )
}

/** Весовой товар: сразу ввод граммов вручную, цена считается на лету. Можно ввести сумму — граммы посчитаются. */
export function WeightAdd({ name, pricePerKg, opts, onClose, onAdd }: {
  name: string; pricePerKg: number; opts: ProductOptions; onClose: () => void
  onAdd: (r: { grams: number; price: number; note: string; variant: string | null }) => void
}) {
  const [active, setActive] = useState<'grams' | 'sum'>('grams')
  const [v, setV] = useState({ grams: '', sum: '' })
  const [variant, setVariant] = useState<string | null>(opts.variants?.[0] ?? null)
  const [extras, setExtras] = useState<string[]>([])
  const grams = active === 'grams' ? Number(v.grams || 0) : Math.round((Number(v.sum || 0) * 1000) / pricePerKg)
  const price = active === 'grams' ? Math.round((grams * pricePerKg) / 1000) : Number(v.sum || 0)
  const add = () => { if (grams > 0) onAdd({ grams, price, note: optionsNote(variant, extras), variant }) }
  const fields: PadField[] = [
    { key: 'grams', label: 'Вес', value: active === 'grams' ? v.grams : grams ? String(grams) : '', suffix: 'г' },
    { key: 'sum', label: 'Сумма', value: active === 'sum' ? v.sum : price ? String(price) : '', suffix: 'сум' },
  ]
  return (
    <Modal title={name} onClose={onClose} width={480}>
      <Variants opts={opts} variant={variant} setVariant={setVariant} extras={extras} setExtras={setExtras} />
      <FieldPad fields={fields} active={active} onEnter={add}
        onActive={(k) => { setActive(k as 'grams' | 'sum'); setV({ grams: grams ? String(grams) : '', sum: price ? String(price) : '' }) }}
        onInput={(k, val) => setV((o) => ({ ...o, [k]: val }))} />
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="muted text-sm">{formatUZS(pricePerKg)} сум за 1 кг</span>
        <div className="flex gap-1" aria-label="Быстрый вес">
          {[300, 500, 1000].map((g) => (
            <button key={g} type="button" className="btn btn-ghost btn-sm" onClick={() => { setActive('grams'); setV({ grams: String(g), sum: '' }) }}>{g >= 1000 ? `${g / 1000} кг` : `${g} г`}</button>
          ))}
        </div>
      </div>
      <button className="btn btn-lg btn-primary w-full mt-3" disabled={grams <= 0} onClick={add}>
        {grams > 0 ? `Добавить · ${formatUZS(price)} сум` : 'Введите вес'}
      </button>
    </Modal>
  )
}

const QUICK_TAGS = ['С собой', 'Без лука', 'Подогреть', 'Острее', 'Не острое', 'Без соли', 'Соус отдельно', 'В ланчбокс']

/**
 * Правка позиции чека. Изменения применяются сразу (без «Сохранить»):
 *  весовая — вес / сумма / цена за кг; обычная — количество (−/+ или цифрами) и цена за шт.
 * Ручная цена помечается в чеке и пишется сервером в аудит.
 */
export function LinePanel({ line, onChange, onRemove, onClose }: { line: CartItem; onChange: (l: CartItem) => void; onRemove: () => void; onClose: () => void }) {
  const [weighted] = useState(() => !!line.weightKg)
  const derived = (k: string) => String(k === 'grams' ? gramsOf(line) : k === 'sum' ? line.price : k === 'ppk' ? line.pricePerKg ?? 0 : k === 'qty' ? line.qty : line.price)
  const [active, setActive] = useState(weighted ? 'grams' : 'qty')
  const [txt, setTxt] = useState(() => derived(weighted ? 'grams' : 'qty'))
  const [noteOpen, setNoteOpen] = useState(!!line.notes)
  const input = (k: string, val: string) => {
    setTxt(val)
    const n = Number(val || 0)
    if (n <= 0) return
    if (weighted) {
      const next = weighLine(line, k === 'grams' ? { grams: n } : k === 'sum' ? { sum: n } : { pricePerKg: n })
      if (gramsOf(next) > 0) onChange(next) // вес не может стать 0 — ждём следующую цифру
    }
    else onChange(k === 'qty' ? { ...line, qty: n } : { ...line, price: n })
  }
  const step = (d: number) => { const q = Math.max(1, line.qty + d); onChange({ ...line, qty: q }); if (active === 'qty') setTxt(String(q)) }
  const fields: PadField[] = (weighted
    ? [{ key: 'grams', label: 'Вес', suffix: 'г' }, { key: 'sum', label: 'Сумма' }, { key: 'ppk', label: 'Цена за кг' }]
    : [{ key: 'qty', label: 'Количество', suffix: 'шт', step: (d: number) => step(d) }, { key: 'price', label: 'Цена за шт' }]
  ).map((f) => ({ ...f, value: f.key === active ? txt : derived(f.key) }))
  const overridden = isPriceOverridden(line)
  const listPpk = line.listPricePerKg ?? line.pricePerKg ?? 0
  const notes = line.notes ?? ''
  const toggle = (t: string) => {
    const has = notes.split(',').map((x) => x.trim()).includes(t)
    const next = has ? notes.split(',').map((x) => x.trim()).filter((x) => x && x !== t).join(', ') : notes ? `${notes}, ${t}` : t
    onChange({ ...line, notes: next || undefined })
  }
  return (
    <div className="grid gap-3" aria-label="Правка позиции">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-bold">{baseName(line)}</div>
          {overridden && (
            <button type="button" className="text-sm link-btn" onClick={() => onChange(weighted ? weighLine(line, { pricePerKg: listPpk }) : { ...line, price: line.originalPrice })}>
              <Undo2 size={14} /> Цена по меню: {formatUZS(weighted ? listPpk : line.originalPrice)}{weighted ? ' за кг' : ''} — вернуть
            </button>
          )}
        </div>
        <div className="text-2xl font-bold whitespace-nowrap" aria-label="Сумма позиции">{formatUZS(lineTotal(line))}</div>
      </div>
      <FieldPad fields={fields} active={active} onEnter={onClose}
        onActive={(k) => { setActive(k); setTxt(derived(k)) }} onInput={input} />
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Быстрые комментарии">
        {QUICK_TAGS.map((t) => {
          const on = notes.split(',').map((x) => x.trim()).includes(t)
          return <button key={t} type="button" className="cat-chip shrink-0" aria-pressed={on} aria-selected={on} onClick={() => toggle(t)}>{t}</button>
        })}
        <button type="button" className="cat-chip shrink-0" aria-expanded={noteOpen} onClick={() => setNoteOpen(!noteOpen)}>Свой комментарий…</button>
      </div>
      {noteOpen && <input className="input" placeholder="Комментарий для кухни" aria-label="Комментарий для кухни" value={notes} onChange={(e) => onChange({ ...line, notes: e.target.value || undefined })} />}
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <button type="button" className="btn btn-lg btn-ghost" style={{ color: 'var(--danger)' }} onClick={onRemove}><Trash2 size={18} />Удалить</button>
        <button type="button" className="btn btn-lg btn-primary" onClick={onClose}>Готово</button>
      </div>
    </div>
  )
}

export type QuickProduct = { name: string; price: number; categoryId: string; categoryTitle: string; kind: ProductKind; isKitchen: boolean; saveToMenu: boolean }

/**
 * Новое блюдо прямо из заказа: название, цена — остальное по умолчанию (категория — открытая, тип — порция,
 * «кг» в названии → на вес, напитки → бар). Галочка «Сохранить в меню» (по умолчанию включена).
 */
export function QuickProductDialog({ cats, defaultCat, canSave, onClose, onDone }: {
  cats: { id: string; title: string }[]; defaultCat: string | null; canSave: boolean; onClose: () => void; onDone: (p: QuickProduct) => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [cat, setCat] = useState(defaultCat ?? cats[0]?.id ?? '')
  const [kindSel, setKind] = useState<ProductKind | null>(null)
  const [save, setSave] = useState(canSave)
  const kind: ProductKind = kindSel ?? (/(^|\s)кг$/i.test(name.trim()) ? 'weighted' : 'portion')
  const bar = /drink|напит|bar/i.test(cat) || /напит|чай|кофе/i.test(cats.find((c) => c.id === cat)?.title ?? '')
  const ok = name.trim().length >= 2 && Number(price) > 0
  return (
    <Modal title="Новое блюдо" onClose={onClose} width={480}>
      <form className="grid gap-3" onSubmit={(e) => {
        e.preventDefault()
        if (ok) onDone({ name: name.trim(), price: Number(price), categoryId: cat, categoryTitle: cats.find((c) => c.id === cat)?.title ?? cat, kind, isKitchen: !bar, saveToMenu: save })
      }}>
        <label className="grid gap-1"><span className="text-sm muted">Название</span>
          <input className="input input-lg" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <label className="grid gap-1"><span className="text-sm muted">{kind === 'weighted' ? 'Цена за 1 кг, сум' : 'Цена, сум'}</span>
          <input className="input input-lg" inputMode="numeric" value={price ? formatUZS(Number(price)) : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1"><span className="text-sm muted">Категория</span>
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select></label>
          <div className="grid gap-1"><span className="text-sm muted">Тип</span>
            <div className="seg seg-fill" role="radiogroup" aria-label="Тип">
              {(['portion', 'weighted', 'with_side'] as ProductKind[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>{k === 'with_side' ? 'Гарнир' : KIND_LABEL[k]}</button>
              ))}
            </div></div>
        </div>
        {canSave && <label className="flex items-center gap-2"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} style={{ width: 22, height: 22 }} />Сохранить в меню</label>}
        <button className="btn btn-lg btn-primary" type="submit" disabled={!ok}>Добавить в заказ</button>
      </form>
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
