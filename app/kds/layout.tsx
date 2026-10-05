import type { Metadata } from 'next'
import '@/features/ui/pos.css'

export const metadata: Metadata = { title: 'Кухня · Chicken Fit', robots: 'noindex, nofollow' }
export default function KdsLayout({ children }: { children: React.ReactNode }) {
  return <div className="select-none">{children}</div>
}
