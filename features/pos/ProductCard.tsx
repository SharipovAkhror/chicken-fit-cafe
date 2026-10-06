'use client'
import { CupSoda, Flame, Layers, Plus, Scale, SlidersHorizontal, UtensilsCrossed } from 'lucide-react'
import type { MenuItemRow } from '@/data/local-db'
import { formatUZS } from '@/domain/money'
import { hasOptions, kindOf, pricePerKgOf, stationOf } from '@/domain/product'

import { thumbOf } from './photo'
export { thumbOf }

/** Один спокойный индикатор типа: иконка + слово, приглушённым цветом. */
export function TypeIndicator({ item, reserve = true }: { item: MenuItemRow; reserve?: boolean }) {
  const k = kindOf(item)
  const opts = hasOptions(item)
  const parts: Array<[React.ReactNode, string]> = []
  if (k === 'weighted') parts.push([<Scale key="w" size={14} aria-hidden />, 'на вес'])
  if (k === 'with_side') parts.push([<UtensilsCrossed key="s" size={14} aria-hidden />, 'гарнир на выбор'])
  if (k === 'side_mix') parts.push([<Layers key="m" size={14} aria-hidden />, 'микс'])
  if (opts && k !== 'with_side') parts.push([<SlidersHorizontal key="o" size={14} aria-hidden />, 'варианты'])
  if (!parts.length) return reserve ? <span className="pcard-type" /> : null
  return <span className="pcard-type">{parts[0][0]}{parts.map((p) => p[1]).join(' · ')}</span>
}

/**
 * Карточка блюда. hit — продано сегодня (для топ-5: значок «Хит»); pulse — меняется при каждом добавлении этого блюда:
 * карточка мигает рамкой бренда и показывает «+1» (подтверждение нажатия без звука).
 */
export function ProductCard({ item, qty, onAdd, showPhoto = true, hit, pulse }: { item: MenuItemRow; qty: number; onAdd: () => void; showPhoto?: boolean; hit?: number; pulse?: number }) {
  const k = kindOf(item)
  const img = thumbOf(item.imageUrl)
  const price = k === 'weighted' ? `${formatUZS(pricePerKgOf(item))} / кг` : formatUZS(item.price)
  return (
    <button type="button" className="pcard" data-in={qty > 0 || undefined} data-pulse={pulse ? pulse % 2 : undefined} aria-disabled={!item.available} onClick={() => item.available && onAdd()}
      aria-label={`${item.nameRu}, ${price} сум${item.available ? '' : ', нет в наличии'}${qty ? `, в заказе ${qty}` : ''}`}>
      {showPhoto && (
        <span className="pcard-media">
          {img
            ? <img className="pcard-img" src={img} alt="" loading="lazy" decoding="async" />
            : <span className="pcard-ph" aria-hidden>{stationOf(item) === 'bar' ? <CupSoda size={22} /> : <UtensilsCrossed size={22} />}</span>}
        </span>
      )}
      {/* key={qty}: бейдж «подпрыгивает» на каждом добавлении — подтверждение без звука и тостов */}
      {qty > 0 && <span key={qty} className="pcard-qty" aria-hidden>{qty}</span>}
      {!!pulse && <span key={`p${pulse}`} className="pcard-plus" aria-hidden>+1</span>}
      {!!hit && <span className="pcard-hit" title={`Сегодня продано: ${hit}`}><Flame size={13} aria-hidden />Хит · {hit}</span>}
      <span className="pcard-body">
        <span className="pcard-name">{item.nameRu}</span>
        <TypeIndicator item={item} />
        <span className="pcard-foot">
          {item.available ? <span className="pcard-price">{price}</span> : <span className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Нет в наличии</span>}
        </span>
      </span>
    </button>
  )
}

/** Плитка «+ новое блюдо» в конце сетки (как «+» в Square). */
export function NewProductTile({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="pcard pcard-new" onClick={onClick} aria-label="Новое блюдо в этой категории">
      <Plus size={22} aria-hidden />
      <span>Новое блюдо</span>
    </button>
  )
}
