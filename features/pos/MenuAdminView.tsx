'use client'
/**
 * Конструктор меню. Админ: «Добавить блюдо» · нажать на блюдо — изменить · внутри — «Убрать из меню» (с подтверждением).
 * Кассир: только «В продаже» ↔ стоп-лист (переключатель). Сверху — сводка (всего, в продаже, стоп-лист, категорий),
 * плитки сводки работают как фильтр. Фото — по желанию, в «Дополнительно». Столы и печать — в «Настройках».
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Ban, BookOpen, Camera, CheckCircle2, ChevronRight, ImageOff, Layers, Loader2, MousePointerClick, Pencil, Plus, Search, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { useRuntime, getEngine } from '@/features/app/runtime'
import { enqueue } from '@/data/outbox'
import type { MenuItemRow } from '@/data/local-db'
import { formatUZS } from '@/domain/money'
import { uuidv4 } from '@/domain/ids'
import { KIND_HINT, KIND_LABEL, kindOf, optionsOf, parseList, pricePerKgOf, stationOf, type ProductKind } from '@/domain/product'
import { NAME_MAX, normalizeName, validateProduct, type ProductErrors } from '@/domain/product-form'
import { releaseMenuPhoto, uploadMenuPhoto } from '@/data/online'
import { Modal } from './common'
import { saveMenuItem } from './actions'
import { TypeIndicator } from './ProductCard'
import { compressPhoto, thumbOf, type CompressedPhoto } from './photo'
import menuJson from '@/content/menu.json'

const JSON_TITLES: Record<string, string> = Object.fromEntries((menuJson as unknown as { categories: Array<{ id: string; title: { ru: string } }> }).categories.map((c) => [c.id, c.title.ru]))

export function MenuAdminView({ isAdmin = false }: { isAdmin?: boolean }) {
  const { db, session } = useRuntime()
  const items = useLiveQuery(() => db.menu.toArray(), [db]) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), [db]) ?? []
  const [form, setForm] = useState<MenuItemRow | 'new' | null>(null)
  const [q, setQ] = useState('')
  const [catF, setCatF] = useState<string | null>(null)
  const [stopOnly, setStopOnly] = useState(false)
  const save = async (m: MenuItemRow, patch: Partial<MenuItemRow>) => {
    await db.menu.update(m.id, patch)
    await enqueue(db, 'menu.upsert', m.id, { id: m.id, ...patch })
    getEngine().kick()
  }
  const review = items.filter((i) => i.needsReview && !i.isDeleted)
  const needle = q.trim().toLowerCase()
  const visible = items.filter((i) => !i.needsReview && !i.isDeleted)
  const active = visible.filter((i) => (!needle || i.nameRu.toLowerCase().includes(needle)) && (!catF || i.categoryId === catF) && (!stopOnly || !i.available)).sort((a, b) => a.sortOrder - b.sortOrder)
  const catTitle = (g: string | null) => cats.find((c) => c.id === g)?.titleRu ?? (g ? JSON_TITLES[g] ?? g : 'Без категории')
  const catList = [
    ...[...cats].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.id, title: c.titleRu })),
    ...Object.entries(JSON_TITLES).filter(([id]) => !cats.some((c) => c.id === id)).map(([id, title]) => ({ id, title })),
  ]
  const groups = catList.map((c) => c.id).filter((id) => active.some((i) => i.categoryId === id))
  for (const i of active) if (!groups.includes(i.categoryId as string)) groups.push(i.categoryId as string)
  const stopCount = visible.filter((i) => !i.available).length
  if (!items.length) return <div className="page muted">Меню ещё не загружено с сервера.</div>
  return (
    <div className="page grid gap-4" style={{ maxWidth: 1040, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <div className="menu-stats" aria-label="Сводка по меню">
        <button type="button" className="mstat" aria-pressed={!stopOnly && !catF} onClick={() => { setStopOnly(false); setCatF(null) }}>
          <span className="kpi-ico" data-tone="brand"><BookOpen size={18} aria-hidden /></span><span><b>{visible.length}</b><span className="mstat-l">блюд в меню</span></span>
        </button>
        <div className="mstat"><span className="kpi-ico" data-tone="success"><CheckCircle2 size={18} aria-hidden /></span><span><b>{visible.length - stopCount}</b><span className="mstat-l">в продаже</span></span></div>
        <button type="button" className="mstat" aria-pressed={stopOnly} onClick={() => setStopOnly(!stopOnly)} aria-label={`Стоп-лист: ${stopCount}. Показать только их`}>
          <span className="kpi-ico" data-tone="warning"><Ban size={18} aria-hidden /></span><span><b>{stopCount}</b><span className="mstat-l">в стоп-листе</span></span>
        </button>
        <div className="mstat"><span className="kpi-ico" data-tone="accent"><Layers size={18} aria-hidden /></span><span><b>{new Set(visible.map((i) => i.categoryId)).size}</b><span className="mstat-l">категорий</span></span></div>
      </div>
      {isAdmin && (
        <div className="howto" aria-label="Как пользоваться">
          <span><Plus size={16} aria-hidden /><b>Добавить</b> — кнопка справа</span>
          <span><MousePointerClick size={16} aria-hidden /><b>Изменить</b> — нажмите на блюдо</span>
          <span><Trash2 size={16} aria-hidden /><b>Убрать</b> — внутри блюда, внизу</span>
          <span><Ban size={16} aria-hidden /><b>Закончилось</b> — выключите «В продаже»</span>
        </div>
      )}
      <div className="flex gap-2 flex-wrap items-center">
        <label className="search flex-1" style={{ minWidth: 180, maxWidth: 360 }}>
          <Search size={18} aria-hidden />
          <input className="input" placeholder="Найти блюдо" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по меню" />
        </label>
        <span className="flex-1" />
        {isAdmin && <button className="btn btn-lg btn-primary" onClick={() => setForm('new')}><Plus size={20} />Добавить блюдо</button>}
      </div>
      <div className="cat-wrap" role="tablist" aria-label="Фильтр по категории">
        <button role="tab" className="cat-chip" aria-selected={!catF} onClick={() => setCatF(null)}>Все</button>
        {catList.filter((c) => visible.some((i) => i.categoryId === c.id)).map((c) => (
          <button key={c.id} role="tab" className="cat-chip" aria-selected={catF === c.id} onClick={() => setCatF(c.id)}>{c.title}</button>
        ))}
      </div>
      {!isAdmin && <p className="muted text-sm">Выключите «В продаже», если блюдо закончилось — касса покажет его как «Нет в наличии».</p>}
      {groups.map((g) => (
        <section key={g ?? 'none'} className="panel overflow-hidden">
          <h3 className="list-head">{catTitle(g)}</h3>
          {active.filter((i) => i.categoryId === g).map((m) => {
            const img = thumbOf(m.imageUrl)
            const k = kindOf(m)
            const price = k === 'weighted' ? `${formatUZS(pricePerKgOf(m))} / кг` : formatUZS(m.price)
            return (
              <div key={m.id} className="mrow" data-off={!m.available || undefined}>
                <button className="mrow-main" onClick={() => isAdmin && setForm(m)} aria-label={isAdmin ? `Изменить ${m.nameRu}` : m.nameRu} disabled={!isAdmin}>
                  {img ? <img src={img} alt="" className="mrow-img" loading="lazy" /> : <span className="mrow-img mrow-ph" aria-hidden><UtensilsCrossed size={18} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="mrow-name">{m.nameRu}</span>
                    <TypeIndicator item={m} reserve={false} />
                  </span>
                  <span className="mrow-price">{price}</span>
                  {isAdmin && <span className="mrow-edit" aria-hidden><Pencil size={14} /><span>Изменить</span><ChevronRight size={16} /></span>}
                </button>
                <label className="switch" title={m.available ? 'В продаже' : 'Стоп-лист'}>
                  <input type="checkbox" role="switch" checked={m.available} aria-label={`В продаже: ${m.nameRu}`} onChange={() => void save(m, { available: !m.available })} />
                  <span aria-hidden />
                </label>
              </div>
            )
          })}
        </section>
      ))}
      {active.length === 0 && (
        <div className="empty-card"><span className="empty-ico"><Search size={22} aria-hidden /></span><span><b>{stopOnly ? 'В стоп-листе пусто — всё в продаже' : 'Ничего не найдено'}</b>
          <span className="block muted text-sm">{stopOnly ? 'Нажмите «блюд в меню», чтобы увидеть всё' : 'Проверьте название или выберите «Все»'}</span></span></div>
      )}
      {review.length > 0 && isAdmin && (
        <details className="panel p-3">
          <summary className="font-bold cursor-pointer">Скрытые позиции из старой базы ({review.length})</summary>
          <p className="muted text-sm my-2">Были в базе, но не в меню кассы. Верните нужные или удалите.</p>
          {review.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="flex-1">{m.nameRu} · {formatUZS(m.price)}</span>
              <button className="btn" onClick={() => save(m, { needsReview: false, available: true })}>Вернуть</button>
              <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => save(m, { isDeleted: true, needsReview: false })}>Удалить</button>
            </div>
          ))}
        </details>
      )}
      {form && (
        <ItemForm item={form === 'new' ? null : form} cats={catList} existing={items} token={session?.token ?? null}
          onClose={() => setForm(null)}
          onDelete={form !== 'new' ? async () => {
            await save(form, { isDeleted: true, imageUrl: '' })
            if (session) releaseAfterSync(session.token, form.imageUrl)
            setForm(null)
          } : undefined}
          onSave={async (row, categoryTitle) => {
            const prev = form !== 'new' ? form.imageUrl : null
            await saveMenuItem(db, row, categoryTitle, form !== 'new' ? form : null)
            // старое фото из Storage удаляем после сохранения ссылки на новое (сервер проверит, что оно больше не используется)
            if (session && prev && prev !== row.imageUrl) releaseAfterSync(session.token, prev)
            setForm(null)
          }} />
      )}
    </div>
  )
}

/** Удалить старое фото после того, как сервер получил новую ссылку (иначе он сочтёт фото ещё используемым). */
function releaseAfterSync(token: string, url: string | null | undefined) {
  if (!url) return
  void getEngine().sync().catch(() => {}).finally(() => void releaseMenuPhoto(token, url))
}

type FormRow = Omit<MenuItemRow, 'isDeleted' | 'needsReview' | 'sortOrder'>

/** Форма блюда: название, категория, цена, как продаётся; остальное (кухня/бар, выход, варианты, фото) — в «Дополнительно». Ошибки — под полями. */
export function ItemForm({ item, cats, existing, token, onClose, onSave, onDelete }: {
  item: MenuItemRow | null; cats: { id: string; title: string }[]; existing: MenuItemRow[]; token: string | null; onClose: () => void
  onSave: (row: FormRow, categoryTitle: string) => Promise<void> | void; onDelete?: () => void
}) {
  const [kind, setKind] = useState<ProductKind>(item ? kindOf(item) : 'portion')
  const [name, setName] = useState(item?.nameRu ?? '')
  const [cat, setCat] = useState(item?.categoryId ?? cats[0]?.id ?? '')
  const [newCat, setNewCat] = useState('')
  const [price, setPrice] = useState(item ? String(kindOf(item) === 'weighted' ? pricePerKgOf(item) : item.price) : '')
  const [grams, setGrams] = useState(item?.weight ? String(item.weight) : '')
  const [kitchen, setKitchen] = useState(item ? stationOf(item) === 'kitchen' : true)
  const [variants, setVariants] = useState((item ? optionsOf(item).variants ?? [] : []).join(', '))
  const [extras, setExtras] = useState((item ? optionsOf(item).extras ?? [] : []).join(', '))
  const [img, setImg] = useState(item?.imageUrl ?? '')
  const [photo, setPhoto] = useState<(CompressedPhoto & { preview: string }) | null>(null)
  const [photoErr, setPhotoErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<'compress' | 'upload' | null>(null)
  const [available, setAvailable] = useState(item?.available ?? true)
  const [tried, setTried] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const priceN = Number(price.replace(/\D/g, '') || 0)
  const v = parseList(variants), x = parseList(extras)
  const catId = cat === '__new' ? `cat-${normalizeName(newCat).toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').slice(0, 24)}` : cat
  const errs: ProductErrors = validateProduct({ id: item?.id, name, categoryId: cat, newCategory: newCat, price: priceN, kind, weight: grams ? Number(grams) : null, variants: v, extras: x, imageUrl: photo ? null : img }, existing)
  const show = (k: keyof ProductErrors) => (tried && errs[k] ? <span className="field-error" role="alert">{errs[k]}</span> : null)
  const preview = photo?.preview ?? thumbOf(img.trim())

  const pick = async (f: File | undefined) => {
    if (!f) return
    setPhotoErr(null); setBusy('compress')
    try {
      const c = await compressPhoto(f)
      if (photo) URL.revokeObjectURL(photo.preview)
      setPhoto({ ...c, preview: URL.createObjectURL(c.main) })
    } catch (e) { setPhotoErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(null); if (fileRef.current) fileRef.current.value = '' }
  }

  const submit = async () => {
    setTried(true)
    if (Object.keys(errs).length) return
    let imageUrl = img.trim() || null
    if (photo) {
      if (!token) { setPhotoErr('Нужен вход по PIN'); return }
      setBusy('upload')
      try { imageUrl = await uploadMenuPhoto(token, photo.main, photo.thumb, photo.ext) } catch (e) {
        setBusy(null); setPhotoErr(`${e instanceof Error ? e.message : String(e)}. Можно сохранить без фото — уберите его.`); return
      }
      setBusy(null)
    }
    await onSave({
      id: item?.id ?? `custom-${uuidv4().slice(0, 8)}`, nameRu: normalizeName(name), categoryId: catId, kind,
      price: priceN, unit: kind === 'weighted' ? 'kg' : 'portion', pricePerKg: kind === 'weighted' ? priceN : null,
      weight: grams ? Number(grams) : null, isKitchen: kitchen, imageUrl, available,
      options: kind !== 'side_mix' && (v.length || x.length) ? { ...(v.length ? { variants: v } : {}), ...(x.length ? { extras: x } : {}) } : null,
    }, cat === '__new' ? normalizeName(newCat) : cats.find((c) => c.id === cat)?.title ?? cat)
  }

  return (
    <Modal title={item ? 'Изменить блюдо' : 'Новое блюдо'} onClose={onClose} width={640}>
      <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <label className="grid gap-1"><span className="field-label">Название *</span>
          <input className="input input-lg" value={name} maxLength={NAME_MAX + 10} aria-invalid={tried && !!errs.name} onChange={(e) => setName(e.target.value)} />{show('name')}</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1"><span className="field-label">Категория *</span>
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-invalid={tried && !!errs.category}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              <option value="__new">+ Новая категория…</option>
            </select></label>
          <label className="grid gap-1"><span className="field-label">{kind === 'weighted' ? 'Цена за 1 кг, сум *' : 'Цена, сум *'}</span>
            <input className="input" inputMode="numeric" aria-invalid={tried && !!errs.price} value={price ? formatUZS(priceN) : ''} onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 9))} />{show('price')}</label>
        </div>
        {cat === '__new' && <input className="input" placeholder="Название новой категории" aria-label="Название новой категории" maxLength={60} value={newCat} onChange={(e) => setNewCat(e.target.value)} />}
        {show('category')}
        <div className="grid gap-1">
          <span className="field-label">Как продаётся</span>
          <div className="seg" role="radiogroup" aria-label="Тип" style={{ flexWrap: 'wrap' }}>
            {(Object.keys(KIND_LABEL) as ProductKind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <span className="text-sm muted">{KIND_HINT[kind]}</span>
        </div>
        <details className="adv" open={!!item && (!!item.weight || stationOf(item) === 'bar' || !!item.options || !!item.imageUrl)}>
          <summary className="cursor-pointer font-semibold py-2">Дополнительно <span className="muted text-sm font-normal">— кухня/бар, выход, варианты, фото</span></summary>
          <div className="grid gap-3 pt-2">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="grid gap-1">
                <span className="field-label">Куда уходит заказ</span>
                <div className="seg" role="radiogroup" aria-label="Куда">
                  <button type="button" role="radio" aria-checked={kitchen} onClick={() => setKitchen(true)}>Кухня</button>
                  <button type="button" role="radio" aria-checked={!kitchen} onClick={() => setKitchen(false)}>Бар</button>
                </div>
              </div>
              {kind !== 'weighted' && (
                <label className="grid gap-1"><span className="field-label">Выход, г</span>
                  <input className="input" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value.replace(/\D/g, '').slice(0, 6))} />{show('weight')}</label>
              )}
            </div>
            {kind !== 'side_mix' && kind !== 'with_side' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1"><span className="field-label">Варианты, через запятую</span>
                  <input className="input" placeholder="Микс, Крылья, Стрипсы" value={variants} onChange={(e) => setVariants(e.target.value)} /></label>
                <label className="grid gap-1"><span className="field-label">Добавки без доплаты</span>
                  <input className="input" placeholder="Острый" value={extras} onChange={(e) => setExtras(e.target.value)} /></label>
              </div>
            )}
            {show('options')}
            <span className="field-label">Фото — по желанию</span>
            <div className="photo-field">
              <div className="photo-box" aria-label="Фото блюда">
                {preview ? <img src={preview} alt="Фото блюда" /> : <span className="photo-ph"><UtensilsCrossed size={28} aria-hidden />Без фото</span>}
                {busy === 'compress' && <span className="photo-busy"><Loader2 size={22} className="spin" aria-hidden />Сжимаем…</span>}
              </div>
              <div className="grid gap-2 content-start">
                <input ref={fileRef} type="file" accept="image/*" hidden aria-label="Выбрать фото" data-testid="photo-input" onChange={(e) => void pick(e.target.files?.[0])} />
                <button type="button" className="btn btn-lg" onClick={() => fileRef.current?.click()} disabled={!!busy}><Camera size={20} />{preview ? 'Заменить фото' : 'Добавить фото'}</button>
                {preview && <button type="button" className="btn btn-ghost" onClick={() => { setPhoto(null); setImg('') }}><ImageOff size={18} />Убрать фото</button>}
                <span className="text-sm muted">{photo ? `Готово к загрузке: ${photo.width}×${photo.height}, ${Math.round(photo.main.size / 1024)} КБ` : 'Камера или галерея. Фото уменьшится до 800 px (~100 КБ).'}</span>
                {photoErr && <span className="field-error" role="alert">{photoErr}</span>}
              </div>
            </div>
            {!photo && (
              <label className="grid gap-1"><span className="field-label">Или ссылка на фото</span>
                <input className="input" inputMode="url" placeholder="https://…" value={img} onChange={(e) => setImg(e.target.value)} />{show('image')}</label>
            )}
          </div>
        </details>
        <label className="flex items-center justify-between gap-3" style={{ minHeight: 48 }}>
          <span className="font-semibold">В продаже</span>
          <span className="switch"><input type="checkbox" role="switch" checked={available} onChange={(e) => setAvailable(e.target.checked)} aria-label="В продаже" /><span aria-hidden /></span>
        </label>
        {tried && Object.keys(errs).length > 0 && <p className="field-error" role="alert">Проверьте поля, отмеченные выше</p>}
        {confirmDel && <div className="danger-note" role="alert"><Trash2 size={22} aria-hidden /><div><b>Убрать «{item?.nameRu}» из меню?</b><span className="block">Блюдо исчезнет из кассы. Прошлые продажи в отчётах останутся.</span></div></div>}
        <div className="grid gap-2" style={{ gridTemplateColumns: onDelete ? '1fr 2fr' : '1fr' }}>
          {onDelete && (confirmDel
            ? <button type="button" className="btn btn-lg btn-danger-solid" onClick={onDelete}><Trash2 size={18} />Да, убрать</button>
            : <button type="button" className="btn btn-lg btn-danger" onClick={() => setConfirmDel(true)}><X size={18} />Убрать из меню</button>)}
          <button className="btn btn-lg btn-primary" type="submit" disabled={!!busy}>{busy === 'upload' ? <><Loader2 size={18} className="spin" />Загружаем фото…</> : 'Сохранить'}</button>
        </div>
      </form>
    </Modal>
  )
}
