import { Button } from '@/components/ui/button'

const swatches = [
  { name: 'Pastry', hex: '#FAF7F0', role: 'Фон 60%' },
  { name: 'Graphite', hex: '#28211D', role: 'Текст 25%' },
  { name: 'Terracotta', hex: '#C95530', role: 'Бренд 10%' },
  { name: 'Olive', hex: '#667447', role: 'UI only 5%' },
] as const

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12 md:px-10 md:py-16">
        <header className="flex flex-col gap-6 border-b border-border pb-10">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.svg"
              alt="ChickenFit"
              width={56}
              height={56}
              className="rounded-2xl"
            />
            <div>
              <p className="text-sm font-bold tracking-wide text-[var(--cf-color-terracotta)]">
                DESIGN PREVIEW · R3
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Chicken
                <span className="text-[var(--cf-color-terracotta)]">Fit</span>
              </h1>
              <p className="mt-1 max-w-xl text-base text-muted-foreground">
                Micro R3: детальный food-mark + плотный lockup. Не финал.
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
          <h2 className="text-xl font-semibold">Палитра R3</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {swatches.map((s) => (
              <div
                key={s.name}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <div className="h-24" style={{ backgroundColor: s.hex }} aria-hidden />
                <div className="space-y-1 p-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.hex}</p>
                  <p className="text-sm text-muted-foreground">{s.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          Смотри <code>design/assets/micro/gallery-r3.html</code> для отбора.
        </footer>
      </div>
    </main>
  )
}
