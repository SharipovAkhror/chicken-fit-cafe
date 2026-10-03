import type { Metadata, Viewport } from 'next'
import '@/features/ui/v2.css'

export const metadata: Metadata = { title: 'Касса · Chicken Fit', robots: 'noindex, nofollow' }
export const viewport: Viewport = { themeColor: '#F4F1EC', width: 'device-width', initialScale: 1 }

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <div className="select-none">{children}</div>
}
