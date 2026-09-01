import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Касса (POS) · ChickenFit',
  description: 'Сенсорный кассовый терминал ChickenFit Cafe',
  robots: 'noindex, nofollow',
}

export default function PosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground select-none">
      {children}
    </div>
  )
}
