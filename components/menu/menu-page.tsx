'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Sun, Moon, Flame, Send } from 'lucide-react'

import {
  MenuBoard,
  type ViewCategory,
  type ViewItem,
} from '@/components/menu/menu-board'
import { PromoBanners } from '@/components/menu/promo-banners'
import {
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
    // Подгрузка актуального меню из Supabase
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
    <main lang={locale} className="min-h-screen bg-background text-foreground selection:bg-amber-500/20 transition-colors duration-200">
      {/* 1. Верхняя информационная строка: строгий монохромный бар */}
      <div className="border-b border-border/40 bg-zinc-900 text-zinc-300 dark:bg-black dark:text-zinc-400 py-1.5 px-3 text-[11px] sm:text-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <div className="flex items-center gap-3 truncate">
            <span className="flex items-center gap-1">
              <MapPin className="size-3 text-amber-500 shrink-0" />
              <span className="truncate">ул. Ибн Сина 136 (ориентир: аэропорт)</span>
            </span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:flex items-center gap-1">
              <Phone className="size-3 text-amber-500 shrink-0" />
              <a href="tel:933802002" className="hover:text-white transition">93-380-2002</a>
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Открыто до 23:00</span>
            </span>
            <a
              href="https://t.me/ChickenFit"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1 text-zinc-400 hover:text-white transition"
            >
              <Send className="size-3" />
              <span>@ChickenFit</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Основная шапка сайта */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6">
          {/* Логотип бренда */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/25 transition">
              <Flame className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                  Chicken<span className="text-amber-600 dark:text-amber-500">Fit</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                Горячие обеды и фитнес-кухня
              </p>
            </div>
          </Link>

          {/* Правая часть: тема и языковой переключатель */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Переключатель темы */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center size-8 rounded-xl border border-border bg-secondary/50 text-foreground transition hover:border-amber-500/50 hover:bg-secondary cursor-pointer"
              title={isDark ? 'Светлая тема' : 'Тёмная тема'}
              aria-label="Сменить тему оформления"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {/* Языковой переключатель */}
            <nav aria-label="Язык / Language" className="flex shrink-0 gap-0.5 rounded-xl border border-border/60 bg-secondary/40 p-0.5">
              {LOCALES.map((code) => (
                <Link
                  key={code}
                  href={LOCALE_PATH[code]}
                  aria-current={code === locale ? 'true' : undefined}
                  className={`rounded-lg px-2 py-1 text-[11px] sm:text-xs font-semibold transition-all ${
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

      {/* 3. Фиксированная панель разделов меню */}
      <nav
        aria-label={ui.menu}
        className="sticky top-[53px] sm:top-[57px] z-40 border-b border-border/60 bg-background/95 backdrop-blur-md"
      >
        <ul className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-3 py-2 sm:px-6 [&::-webkit-scrollbar]:hidden scroll-smooth">
          {categories.map((category) => {
            const isActive = activeCategory === category.id

            return (
              <li key={category.id} className="shrink-0">
                <a
                  href={`#${category.id}`}
                  onClick={() => setActiveCategory(category.id)}
                  className={`block rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-xs font-bold'
                      : 'border border-border/70 bg-card text-muted-foreground hover:border-amber-500/40 hover:text-foreground'
                  }`}
                >
                  {category.title}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 4. Главное содержимое: Промо-слайдер + Сетка меню */}
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:gap-8 px-3 py-4 sm:px-6 sm:py-6 pb-28">
        <PromoBanners onSelectCategory={setActiveCategory} />

        <MenuBoard
          categories={categories}
          labels={{
            ingredients: ui.ingredients,
            soldOut: ui.soldOut,
            close: ui.close,
          }}
        />
      </div>

      {/* 5. Подвал */}
      <footer className="border-t border-border/60 bg-secondary/20 py-8 text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">
              Cafe ChickenFit · Самарканд, ул. Ибн Сина 136
            </p>
            <p className="mt-1">
              Телефон: <a href="tel:933802002" className="text-foreground hover:underline">93-380-2002</a> · Telegram: <a href="https://t.me/ChickenFit" className="text-foreground hover:underline">@ChickenFit</a>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/design-preview" className="hover:text-foreground transition">
              Brand Guide
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
