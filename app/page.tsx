import { Button } from '@/components/ui/button'

const swatches = [
  { name: 'Pastry', token: '--cf-color-pastry', hex: '#F3E7D3', role: 'Фон 60%' },
  { name: 'Graphite', token: '--cf-color-graphite', hex: '#28211D', role: 'Текст 25%' },
  { name: 'Terracotta', token: '--cf-color-terracotta', hex: '#B94D2F', role: 'Бренд 10%' },
  { name: 'Olive', token: '--cf-color-olive', hex: '#667447', role: 'Свежесть 5%' },
] as const

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12 md:px-10 md:py-16">
        <header className="flex flex-col gap-6 border-b border-border pb-10">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.svg"
              alt="ChickenFit mark"
              width={64}
              height={64}
              className="rounded-2xl"
            />
            <div>
              <p className="text-sm font-bold tracking-wide text-[var(--cf-color-terracotta)]">
                DESIGN SYSTEM v1 · REVIEW
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Chicken<span className="text-[var(--cf-color-terracotta)]">Fit</span>
              </h1>
              <p className="mt-1 max-w-xl text-base text-muted-foreground">
                Слой + Гостеприимство. Современный локальный сытный обед
                Самарканда — без фольклорного декора.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Заказать обед</Button>
            <Button size="lg" variant="outline">
              Меню
            </Button>
          </div>
        </header>

        <section className="grid gap-6">
          <h2 className="text-xl font-semibold">Палитра</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {swatches.map((s) => (
              <div
                key={s.name}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <div
                  className="h-24"
                  style={{ backgroundColor: `var(${s.token})` }}
                  aria-hidden
                />
                <div className="space-y-1 p-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.hex}</p>
                  <p className="text-sm text-muted-foreground">{s.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--cf-color-olive)]">
              Карточка продукта
            </p>
            <h3 className="text-2xl font-semibold">Бургер-самса</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Слоёное тесто · курица · соус. Сытный обед за один укус.
            </p>
            <div className="mt-6 flex items-end justify-between">
              <span className="text-lg font-bold">— сум</span>
              <Button>В заказ</Button>
            </div>
          </article>

          <article className="rounded-2xl bg-[var(--cf-color-graphite)] p-6 text-[var(--cf-color-pastry)]">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--cf-color-terracotta)]">
              Вывеска / mono
            </p>
            <h3 className="text-2xl font-semibold">
              Chicken<span className="text-[var(--cf-color-terracotta)]">Fit</span>
            </h3>
            <p className="mt-2 text-sm opacity-80">
              Рады, что вы с нами. Собираем при вас.
            </p>
            <div className="mt-8 flex gap-2" aria-hidden>
              <span className="h-2.5 w-16 rounded-full bg-[var(--cf-color-terracotta)]" />
              <span className="h-2.5 w-16 translate-x-2 rounded-full bg-[var(--cf-color-terracotta)]" />
              <span className="h-2.5 w-16 -translate-x-1 rounded-full bg-[var(--cf-color-terracotta)]" />
            </div>
          </article>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          Источники: <code>design/design-system.md</code>,{' '}
          <code>design/tokens.css</code>, <code>brand/BRANDBOOK.md</code>. Статус
          системы — review; critical approval — владелец проекта.
        </footer>
      </div>
    </main>
  )
}
