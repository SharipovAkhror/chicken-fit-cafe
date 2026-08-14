'use client'

import { useCallback, useEffect, useState } from 'react'

export type ViewItem = {
  id: string
  name: string
  description: string
  price: string
  image: string
  available: boolean
  /** «320 г · 540 ккал» — уже собрано на сервере, может быть пустой строкой. */
  meta: string
  /** Картинки первого экрана грузим сразу, остальные — лениво. */
  eager: boolean
}

export type ViewCategory = {
  id: string
  title: string
  items: ViewItem[]
}

type Labels = {
  ingredients: string
  soldOut: string
  close: string
}

function Thumb({
  item,
  className,
}: {
  item: ViewItem
  className?: string
}) {
  if (!item.image) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary ${className ?? ''}`}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mark.svg"
          alt=""
          className="size-1/3 max-w-16 opacity-25"
        />
      </div>
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={item.image}
      alt={item.name}
      loading={item.eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`object-cover ${className ?? ''}`}
    />
  )
}

export function MenuBoard({
  categories,
  labels,
}: {
  categories: ViewCategory[]
  labels: Labels
}) {
  const [openItem, setOpenItem] = useState<ViewItem | null>(null)
  const close = useCallback(() => setOpenItem(null), [])

  useEffect(() => {
    if (!openItem) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openItem, close])

  return (
    <>
      {categories.map((category) => (
        <section
          key={category.id}
          id={category.id}
          className="scroll-mt-28 md:scroll-mt-32"
        >
          <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
            {category.title}
          </h2>

          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {category.items.map((item) => (
              <li key={item.id} className="flex">
                <button
                  type="button"
                  onClick={() => setOpenItem(item)}
                  className="flex h-full w-full gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none sm:flex-col sm:gap-0 sm:p-0"
                >
                  <Thumb
                    item={item}
                    className={`size-24 shrink-0 rounded-xl sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none ${
                      item.available ? '' : 'opacity-40 grayscale'
                    }`}
                  />

                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:p-4">
                    <h3 className="text-base leading-snug font-semibold text-balance sm:text-lg">
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
                      <span className="text-base font-bold text-primary sm:text-lg">
                        {item.price}
                      </span>
                      {item.meta && (
                        <span className="text-xs text-muted-foreground">
                          {item.meta}
                        </span>
                      )}
                      {!item.available && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {labels.soldOut}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {openItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openItem.name}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
          >
            {/* Без фото вместо пустой плашки оставляем узкую полосу под кнопку закрытия. */}
            <div className={openItem.image ? 'relative' : 'relative h-14'}>
              {openItem.image && (
                <Thumb
                  item={openItem}
                  className={`aspect-[4/3] w-full rounded-t-3xl ${
                    openItem.available ? '' : 'opacity-40 grayscale'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={close}
                aria-label={labels.close}
                autoFocus
                className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-card/90 text-xl leading-none font-medium shadow-md backdrop-blur focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-2xl leading-tight font-bold text-balance">
                  {openItem.name}
                </h3>
                <span className="text-2xl font-bold text-primary">
                  {openItem.price}
                </span>
              </div>

              {openItem.meta && (
                <p className="text-sm text-muted-foreground">{openItem.meta}</p>
              )}

              {openItem.description && (
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {labels.ingredients}
                  </p>
                  <p className="leading-relaxed">{openItem.description}</p>
                </div>
              )}

              {!openItem.available && (
                <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground">
                  {labels.soldOut}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
