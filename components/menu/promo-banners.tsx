'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'

type PromoBanner = {
  id: string
  title: string
  subtitle: string
  badge: string
  priceTag?: string
  buttonText: string
  targetCategory: string
  image: string
}

const BANNERS: PromoBanner[] = [
  {
    id: 'super-combo',
    badge: 'ХИТ ПРОДАЖ',
    title: 'СУПЕР КОМБО ЗА 45 000 СУМ',
    subtitle: 'Хрустящий Chicken + Картофель Фри + 2 соуса + освежающий компот 0.5л',
    priceTag: '45 000 сум',
    buttonText: 'Заказать комбо',
    targetCategory: 'chicken',
    image: '/menu/combo-chicken.jpg',
  },
  {
    id: 'chicken-1kg',
    badge: 'ДЛЯ КОМПАНИИ',
    title: 'CHICKEN 1 КГ (KFC)',
    subtitle: 'Большой баскет золотистой хрустящей курочки по домашнему рецепту',
    priceTag: '90 000 сум',
    buttonText: 'Выбрать баскет',
    targetCategory: 'chicken',
    image: '/menu/chicken-kfc-1kg.jpg',
  },
  {
    id: 'lunch-menu',
    badge: 'СВЕЖИЕ ОБЕДЫ',
    title: 'ДОМАШНИЕ ПЕРВЫЕ И ВТОРЫЕ БЛЮДА',
    subtitle: 'Борщ, зеленые щи, лапша, домашние котлеты, гуляш и свежие салаты',
    priceTag: 'от 20 000 сум',
    buttonText: 'Смотреть обеды',
    targetCategory: 'soups',
    image: '/menu/borscht.jpg',
  },
  {
    id: 'breakfast-menu',
    badge: 'ЗАВТРАКИ',
    title: 'СВЕЖАЯ ВЫПЕЧКА, БЛИНЫ И КОФЕ',
    subtitle: 'Пирожки с картошкой и мясом, сосиски в тесте, блины с творогом и капучино',
    priceTag: 'от 5 000 сум',
    buttonText: 'Меню завтраков',
    targetCategory: 'breakfast',
    image: '/menu/pirozhki-potatoes.jpg',
  },
]

export function PromoBanners({ onSelectCategory }: { onSelectCategory?: (id: string) => void }) {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % BANNERS.length)
    }, 6000)
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
    <section aria-label="Акции и предложения" className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="relative min-h-[240px] sm:min-h-[280px] md:min-h-[320px] flex items-center">
          {BANNERS.map((b, idx) => {
            const isCurrent = idx === activeIdx

            return (
              <div
                key={b.id}
                className={`absolute inset-0 transition-opacity duration-500 flex flex-col md:flex-row items-center justify-between overflow-hidden ${
                  isCurrent ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
                }`}
              >
                {/* Фоновое изображение */}
                <div className="absolute inset-0 z-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image}
                    alt={b.title}
                    className="size-full object-cover object-center brightness-[0.75] dark:brightness-[0.60]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 md:bg-gradient-to-r md:from-black/90 md:via-black/60 md:to-transparent" />
                </div>

                {/* Текстовое наполнение */}
                <div className="relative z-10 flex flex-col justify-end md:justify-center p-5 sm:p-8 max-w-xl text-white size-full">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/90 text-black px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                      <Sparkles className="size-3" />
                      {b.badge}
                    </span>
                    {b.priceTag && (
                      <span className="rounded-md bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-400/30">
                        {b.priceTag}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-tight text-white">
                    {b.title}
                  </h2>

                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 line-clamp-2 max-w-md">
                    {b.subtitle}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleScrollTo(b.targetCategory)}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold transition active:scale-[0.98] cursor-pointer shadow-xs"
                    >
                      <span>{b.buttonText}</span>
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Индикаторы слайдов */}
        <div className="absolute bottom-3 right-4 z-20 flex gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
          {BANNERS.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === activeIdx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Слайд ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
