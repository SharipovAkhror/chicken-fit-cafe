'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import {
  MenuBoard,
  type ViewCategory,
  type ViewItem,
} from '@/components/menu/menu-board'
import { PromoBanners } from '@/components/menu/promo-banners'
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
import { useTheme } from '@/lib/theme'

const EAGER_IMAGES = 6

export function MenuPage({ locale }: { locale: Locale }) {
  const { isDark, toggleTheme } = useTheme()
  const [menu, setMenu] = useState<Menu>(getMenu)
  const [activeCategory, setActiveCategory] = useState<string>('')
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
        rawPrice: item.price,
        image: item.image?.trim() ?? '',
        available: item.available !== false,
        meta,
        eager: rendered++ < EAGER_IMAGES,
      }
    }),
  }))

  // Отслеживание текущей активной категории при скролле
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) {
          setActiveCategory(visible.target.id)
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )

    categories.forEach((c) => {
      const el = document.getElementById(c.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [categories, activeCategory])

  return (
    <main lang={locale} className="min-h-screen bg-background text-foreground selection:bg-amber-500/30 transition-colors duration-200">
      {/* Верхняя информационная полоса: Доставка, Телефон и Адрес */}
      <div className="bg-amber-500 text-black py-1 px-3 text-[11px] sm:text-xs font-bold text-center flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 shadow-xs">
        <span>📍 ул. Ибн Сина 136 (ориентир: аэропорт)</span>
        <span>📞 Заказ: 93-380-2002</span>
        <span className="hidden md:inline">🛵 Бесплатная доставка до 1 км</span>
        <span>✈️ Telegram: @ChickenFit</span>
      </div>

      {/* Верхняя панель сайта */}
      <header className="border-b border-border/50 bg-background/90 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6">
          {/* Логотип */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-2xl bg-amber-500/20 text-lg sm:text-xl shadow-inner">
              🍗
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                  Chicken<span className="text-amber-500">Fit</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground">
                Вкусно · Полезно · По-домашнему
              </p>
            </div>
          </Link>

          {/* Правая часть: кнопка Кассы, переключатель темы и языки */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Кнопка входа в кассу / админку */}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500 hover:text-black shadow-xs"
              title="Панель кассира и управления заказами"
            >
              <span>🔐</span>
              <span className="hidden sm:inline">Касса</span>
            </Link>

            {/* Переключатель темы (светлая / тёмная) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center size-8 rounded-xl border border-border bg-secondary text-xs text-foreground transition hover:bg-amber-500 hover:text-black cursor-pointer shadow-xs"
              title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Языковой переключатель */}
            <nav aria-label="Language" className="flex shrink-0 gap-0.5 rounded-xl bg-secondary/80 p-0.5 sm:p-1">
              {LOCALES.map((code) => (
                <Link
                  key={code}
                  href={LOCALE_PATH[code]}
                  aria-current={code === locale ? 'true' : undefined}
                  className={`rounded-lg px-2 py-1 text-[11px] sm:text-xs font-bold transition-all ${
                    code === locale
                      ? 'bg-amber-500 text-black shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {LOCALE_LABEL[code]}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Липкая панель разделов меню с авто-подсветкой */}
      <nav
        aria-label={ui.menu}
        className="sticky top-[53px] sm:top-[57px] z-40 border-b border-border bg-background/95 backdrop-blur shadow-xs"
      >
        <ul className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-3 py-2 sm:px-6 [&::-webkit-scrollbar]:hidden scroll-smooth">
          {categories.map((category) => {
            const isActive = activeCategory === category.id

            return (
              <li key={category.id} className="shrink-0">
                <a
                  href={`#${category.id}`}
                  onClick={() => setActiveCategory(category.id)}
                  className={`block rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'border border-border/70 bg-secondary/40 text-muted-foreground hover:border-amber-500/40 hover:text-foreground'
                  }`}
                >
                  {category.title}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Главное содержимое: Баннеры акций + Блюда */}
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:gap-8 px-3 py-4 sm:px-6 sm:py-6 pb-28">
        {/* Большие броские промо-баннеры */}
        <PromoBanners onSelectCategory={setActiveCategory} />

        {/* Сетка блюд по категориям */}
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
            <p className="font-bold text-xs sm:text-sm text-foreground">
              Cafe ChickenFit · Самарканд, ул. Ибн Сина 136
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Телефон доставки: <a href="tel:933802002" className="text-amber-500 font-bold hover:underline">93-380-2002</a> · Telegram: <a href="https://t.me/ChickenFit" className="text-amber-500 font-bold hover:underline">@ChickenFit</a>
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/admin" className="text-amber-500 hover:underline">
              Управление кассой
            </Link>
            <Link href="/design-preview" className="text-muted-foreground hover:text-foreground">
              Презентация бренда
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
