import Link from 'next/link'

const brandColors = [
  { name: 'Warm Pastry', hex: '#FAF7F0', desc: 'Основной тёплый фон, слоёное тесто (60%)' },
  { name: 'Deep Graphite', hex: '#18181B', desc: 'Контрастный текст и акценты (25%)' },
  { name: 'Amber Gold', hex: '#F59E0B', desc: 'Хрустящая корочка, брендовый акцент (10%)' },
  { name: 'Terracotta Red', hex: '#C95530', desc: 'Пряные соусы, аппетитные акценты (5%)' },
]

export default function DesignPreviewPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500/30">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16 space-y-12">
        {/* Шапка презентации */}
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 text-3xl shadow-inner">
              🍗
            </div>
            <div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                ChickenFit Cafe · Самарканд
              </span>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                Презентация бренда и системы
              </h1>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black shadow transition hover:bg-amber-400"
            >
              📱 Открыть QR-меню
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              🛒 Касса & QR
            </Link>
          </div>
        </header>

        {/* Секция 1: Цветовая палитра */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">🎨 Фирменная палитра заведения</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {brandColors.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div
                  className="h-20 w-full rounded-xl border border-black/10 shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white text-sm">{c.name}</p>
                    <span className="font-mono text-xs text-amber-400">{c.hex}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Секция 2: Фуд-фотографии блюд */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">📸 Студийная фуд-съёмка для меню</h2>
              <p className="text-xs text-white/50">
                Изолированный чистый белый фон, аппетитная сочная текстура и высокое качество
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[
              { title: 'Чебурек', img: '/menu/cheburek.jpg', price: '15 000 сум' },
              { title: 'Стрипсы 5 шт', img: '/menu/strips-5.jpg', price: '38 000 сум' },
              { title: 'Крылья 6 шт', img: '/menu/wings-6.jpg', price: '42 000 сум' },
              { title: 'Беляш', img: '/menu/belyashi.jpg', price: '12 000 сум' },
              { title: 'Пирожки', img: '/menu/pirozhki.jpg', price: '8 000 сум' },
              { title: 'Блинчики', img: '/menu/blinchiki.jpg', price: '12 000 сум' },
              { title: 'Куриный суп', img: '/menu/chicken-soup.jpg', price: '25 000 сум' },
              { title: 'Чечевичный суп', img: '/menu/lentil-soup.jpg', price: '22 000 сум' },
              { title: 'Картофель фри', img: '/menu/fries.jpg', price: '18 000 сум' },
              { title: 'Стрипсы комбо', img: '/menu/combo-strips.jpg', price: '55 000 сум' },
              { title: 'Фирменный соус', img: '/menu/house-sauce.jpg', price: '5 000 сум' },
              { title: 'Чесночный соус', img: '/menu/garlic-sauce.jpg', price: '5 000 сум' },
            ].map((item) => (
              <div
                key={item.title}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2.5 transition hover:border-amber-500/50 hover:bg-white/10"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-white p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.img}
                    alt={item.title}
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                  <p className="text-[11px] font-bold text-amber-400">{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Секция 3: Вывеска и рекламный баннер */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">🏪 Фасад и баннеры</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-400">Светлый вариант оформления</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/banners/chicken-banner-light.jpg"
                alt="Banner Light"
                className="w-full rounded-2xl border border-black/10 object-cover shadow"
              />
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-400">Тёмный премиальный вариант</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/banners/chicken-banner-dark.jpg"
                alt="Banner Dark"
                className="w-full rounded-2xl border border-black/10 object-cover shadow"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
