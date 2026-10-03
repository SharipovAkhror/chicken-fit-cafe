'use client'
import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { GarnishIngredient } from '@/domain/cart'
import { GARNISHES, PORTION, QUICK_MIXES, buildMix, equalSplit, mixLabel, mixNote, shiftPercent, type PortionSize } from '@/domain/garnish'
import { formatUZS } from '@/domain/money'
import { Modal } from './common'

export type GarnishResult = { mix: GarnishIngredient[] | null; note: string; size?: PortionSize; label: string }

/**
 * Выбор гарнира.
 *  kind='dish'    — блюдо «с гарниром»: один гарнир, быстрые смеси 50/50, свой набор или без гарнира;
 *  kind='portion' — сборный гарнир: размер порции, 1–5 ингредиентов, доли с шагом 10% (минимум 10%).
 */
export function GarnishDialog({ kind, title, prices, initialSize = 'half', onClose, onPick }: {
  kind: 'dish' | 'portion'
  title: string
  prices?: Record<PortionSize, number>
  initialSize?: PortionSize
  onClose: () => void
  onPick: (r: GarnishResult) => void
}) {
  const [size, setSize] = useState<PortionSize>(initialSize)
  const [ids, setIds] = useState<string[]>(kind === 'portion' ? ['puree'] : [])
  const [pct, setPct] = useState<number[]>(kind === 'portion' ? [100] : [])
  const grams = kind === 'portion' ? PORTION[size].grams : undefined

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    setIds(next)
    setPct(equalSplit(next.length))
  }
  const finish = (sel: string[], p: number[]) => {
    const mix = buildMix(sel, p, grams)
    onPick({ mix, note: `${kind === 'dish' ? 'Гарнир: ' : ''}${mixNote(mix, grams)}`, size, label: mixLabel(mix) })
  }

  return (
    <Modal title={title} onClose={onClose} width={560}>
      {kind === 'portion' && prices && (
        <div className="seg mb-3 w-full" role="radiogroup" aria-label="Размер порции" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {(Object.keys(PORTION) as PortionSize[]).map((s) => (
            <button key={s} role="radio" aria-checked={size === s} style={{ minHeight: 56 }} onClick={() => setSize(s)}>
              {PORTION[s].label} · {PORTION[s].grams} г · {formatUZS(prices[s])}
            </button>
          ))}
        </div>
      )}
      {kind === 'dish' && (
        <>
          <div className="text-sm muted mb-1">Один гарнир</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {GARNISHES.map((g) => <button key={g.id} className="btn btn-lg" onClick={() => finish([g.id], [100])}>{g.name}</button>)}
          </div>
          <div className="text-sm muted mb-1">Смесь 50/50</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {QUICK_MIXES.map((m) => (
              <button key={m.join('-')} className="btn" onClick={() => finish(m, [50, 50])}>{mixLabel(buildMix(m, [50, 50]))}</button>
            ))}
          </div>
          <div className="text-sm muted mb-1">Свой набор</div>
        </>
      )}
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Ингредиенты гарнира">
        {GARNISHES.map((g) => (
          <button key={g.id} className="cat-chip" aria-pressed={ids.includes(g.id)} onClick={() => toggle(g.id)}>{g.name}</button>
        ))}
      </div>
      {ids.length > 1 && (
        <ul className="grid gap-2 mb-3" aria-label="Доли">
          {ids.map((id, i) => { const nm = GARNISHES.find((g) => g.id === id)?.name ?? id; return (
            <li key={id} className="flex items-center gap-2">
              <span className="flex-1 font-semibold">{nm}</span>
              <button className="btn" aria-label={`Меньше: ${nm}`} onClick={() => setPct(shiftPercent(pct, i, -10))}><Minus size={16} /></button>
              <span className="w-24 text-center font-bold">{pct[i]}%{grams ? ` · ${Math.round((grams * pct[i]) / 100)} г` : ''}</span>
              <button className="btn" aria-label={`Больше: ${nm}`} onClick={() => setPct(shiftPercent(pct, i, 10))}><Plus size={16} /></button>
            </li>
          ) })}
        </ul>
      )}
      <div className="grid gap-2" style={{ gridTemplateColumns: kind === 'dish' ? '1fr 1fr' : '1fr' }}>
        {kind === 'dish' && <button className="btn btn-lg" onClick={() => onPick({ mix: null, note: 'Без гарнира', label: '' })}>Без гарнира</button>}
        <button className="btn btn-lg btn-primary" disabled={!ids.length} onClick={() => finish(ids, pct)}>
          Добавить{kind === 'portion' && prices ? ` · ${formatUZS(prices[size])}` : ''}
        </button>
      </div>
    </Modal>
  )
}
