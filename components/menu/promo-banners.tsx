'use client'

import { useState, useEffect } from 'react'

type PromoBanner = {
  id: string
  title: string
  subtitle: string
  badge: string
  priceTag?: string
  buttonText: string
  targetCategory: string
  image: string
  accentColor: string
}

const BANNERS: PromoBanner[] = [
  {
    id: 'super-combo',
    badge: '🔥 ХИТ ПРОДАЖ',
    title: 'СУПЕР КОМБО ЗА 45 000 СУМ',
    subtitle: 'Хрустящий Chicken + Картофель Фри + 2 соуса + освежающий компот 0.5л',
    priceTag: '45 000 сум',
    buttonText: 'Заказать комбо',
    targetCategory: 'chicken',
    image: '/assets/banners/super-combo.jpg',
    accentColor: 'from-amber-500/90 to-orange-600/90',
  },
  {
    id: 'chicken-1kg',
    badge: '🍗 ДЛЯ КОМПАНИИ',
    title: 'CHICKEN 1 КГ (KFC)',
    subtitle: 'Большой баскет золотистой хрустящей курочки по домашнему рецепту',
    priceTag: '90 000 сум',
    buttonText: 'Выбрать баскет',
    targetCategory: 'chicken',
    image: '/assets/banners/brand-hero.jpg',
    accentColor: 'from-amber-600/90 to-zinc-900/90',
  },
  {
    id: 'lunch-menu',
    badge: '🍲 СВЕЖИЕ ОБЕДЫ',
    title: 'ДОМАШНИЕ ПЕРВЫЕ & ВТОРЫЕ БЛЮДА',
    subtitle: 'Борщ, зеленые щи, лапша, домашние котлеты, гуляш и свежие салаты',
    priceTag: 'от 20 000 сум',
    buttonText: 'Смотреть обеды',
    targetCategory: 'soups',
    image: '/assets/banners/lunch-menu.jpg',
    accentColor: 'from-emerald-600/90 to-teal-800/90',
  },
  {
    id: 'breakfast-menu',
    badge: '☕ ЗАВТРАКИ',
    title: 'СВЕЖАЯ ВЫПЕЧКА, БЛИНЫ & КОФЕ',
    subtitle: 'Пирожки с картошкой и мясом, сосиски в тесте, блины с творогом и капучино',
    priceTag: 'от 5 000 сум',
    buttonText: 'Меню завтраков',
    targetCategory: 'breakfast',
    image: '/assets/banners/breakfast-menu.jpg',
    accentColor: 'from-amber-500/90 to-yellow-700/90',
  },
]

export function PromoBanners({ onSelectCategory }: { onSelectCategory?: (id: string) => void }) {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % BANNERS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  function handleScrollTo(catId: string) {
    if (onSelectCategory) {
      onSelectCategory(catId)
    }
    const el = document.getElementById(catId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section aria-label="Акции и супер-комбо" className="w-full">
      {/* Большой слайдер / баннеры */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md">
        <div className="relative min-h-[260px] sm:min-h-[300px] md:min-h-[340px] flex items-center">
          {BANNERS.map((b, idx) => {
            const isCurrent = idx === activeIdx

            return (
              <div
                key={b.id}
                className={`absolute inset-0 transition-opacity duration-700 flex flex-col md:flex-row items-center justify-between overflow-hidden ${
                  isCurrent ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
                }`}
              >
                {/* Фоновое изображение с мягким градиентом для легкой читаемости */}
                <div className="absolute inset-0 z-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image}
                    alt={b.title}
                    className="size-full object-cover object-center filter brightness-[0.88] dark:brightness-[0.70]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 md:bg-gradient-to-r md:from-black/90 md:via-black/60 md:to-transparent" />
                </div>

                {/* Текстовое наполнение баннера */}
                <div className="relative z-10 flex flex-col justify-end md:justify-center p-5 sm:p-8 md:p-10 max-w-xl text-white size-full">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="rounded-full bg-amber-500 px-3 py-1 text-[11px] sm:text-xs font-black text-black shadow-xs">
                      {b.badge}
                    </span>
                    {b.priceTag && (
                      <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs font-black text-amber-400 border border-amber-500/30">
                        {b.priceTag}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                    {b.title}
                  </h2>

                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium text-zinc-200 line-clamp-2 drop-shadow">
                    {b.subtitle}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleScrollTo(b.targetCategory)}
                      className="rounded-2xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-black transition active:scale-95 shadow-lg shadow-amber-500/25 cursor-pointer flex items-center gap-2"
                    >
                      <span>{b.buttonText}</span>
                      <span>➔</span>
                    </button>
                    <span className="hidden sm:inline-block text-xs font-semibold text-zinc-300">
                      📍 ул. Ибн Сина 136 · 📞 93-380-2002
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Индикаторы слайдов (точки переключения) */}
        <div className="absolute bottom-3 right-4 z-20 flex gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full">
          {BANNERS.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === activeIdx ? 'w-6 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Перейти к слайду ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
