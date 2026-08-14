'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import {
  MenuBoard,
  type ViewCategory,
  type ViewItem,
} from '@/components/menu/menu-board'
import {
  formatDate,
  formatPrice,
  LOCALE_LABEL,
  LOCALE_PATH,
  LOCALES,
  UI,
  type Locale,
} from '@/lib/i18n'
import { getMenu, getLiveMenu, t, type Menu } from '@/lib/menu'

const EAGER_IMAGES = 4

export function MenuPage({ locale }: { locale: Locale }) {
  const [menu, setMenu] = useState<Menu>(getMenu)
  const ui = UI[locale]

  useEffect(() => {
    // Подгрузка свежего меню из Supabase в фоне
    getLiveMenu().then((live) => {
      setMenu(live)
    })
  }, [])

  let rendered = 0
  const categories: ViewCategory[] = menu.categories.map((category) => ({
    id: category.id,
    title: t(category.title, locale),
    items: category.items.map((item): ViewItem => {
      const meta = [
        item.weight ? `${item.weight} ${ui.gram}` : null,
        item.kcal ? `${item.kcal} ${ui.kcal}` : null,
      ]
        .filter(Boolean)
        .join(' · ')

      return {
        id: item.id,
        name: t(item.name, locale),
        description: t(item.description, locale),
        price: formatPrice(item.price, locale),
        image: item.image?.trim() ?? '',
        available: item.available !== false,
        meta,
        eager: rendered++ < EAGER_IMAGES,
      }
    }),
  }))

  return (
    <main lang={locale} className="min-h-screen bg-background text-foreground selection:bg-amber-500/30">
      {/* Уютная теплая шапка с ретро-гирляндой и брендом */}
      <header className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-amber-500/10 via-background to-background pt-6 pb-6 md:pt-10 md:pb-8">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          {/* Верхняя строка: Логотип и переключатель языка */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl shadow-inner md:size-14">
                🍗
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl text-foreground">
                    Chicken<span className="text-amber-500">Fit</span>
                  </h1>
                </div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                  {t(menu.cafe.tagline, locale)}
                </p>
              </div>
            </div>

            {/* Языковой переключатель */}
            <nav aria-label="Language" className="flex shrink-0 gap-1 rounded-xl bg-secondary/60 p-1 backdrop-blur">
              {LOCALES.map((code) => (
                <Link
                  key={code}
                  href={LOCALE_PATH[code]}
                  aria-current={code === locale ? 'true' : undefined}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    code === locale
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {LOCALE_LABEL[code]}
                </Link>
              ))}
            </nav>
          </div>

          {/* Теплые теги заведения */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-600 dark:text-amber-400">
              ✨ Сочная & свежая
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              🍳 Завтрак · Обед · Ужин
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              📍 Самарканд
            </span>
          </div>
        </div>
      </header>

      {/* Липкая панель разделов меню */}
      <nav
        aria-label={ui.menu}
        className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur shadow-xs"
      >
        <ul className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 md:px-8 [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <li key={category.id}>
              <a
                href={`#${category.id}`}
                className="block rounded-full border border-border/80 bg-secondary/40 px-4 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
              >
                {category.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Список категорий и блюд */}
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 md:px-8 md:py-12">
        <MenuBoard
          categories={categories}
          labels={{
            ingredients: ui.ingredients,
            soldOut: ui.soldOut,
            close: ui.close,
          }}
        />
      </div>

      {/* Подвал сайта */}
      <footer className="mx-auto max-w-5xl px-4 pb-12 text-sm text-muted-foreground md:px-8">
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium">{ui.priceNote}</p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {ui.updated}: {formatDate(menu.updated)}
            </p>
          </div>

          <div className="text-xs text-muted-foreground/70">
            ChickenFit · Самарканд
          </div>
        </div>
      </footer>
    </main>
  )
}
