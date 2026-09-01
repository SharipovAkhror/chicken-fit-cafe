import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Кухня (KDS) · ChickenFit',
  description: 'Kitchen Display System для поваров ChickenFit Cafe',
  robots: 'noindex, nofollow',
}

export default function KdsLayout({
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
