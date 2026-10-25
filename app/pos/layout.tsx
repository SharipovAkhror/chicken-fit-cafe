import type { Metadata, Viewport } from 'next'
import '@/features/ui/pos.css'

export const metadata: Metadata = {
  title: 'Касса · Chicken Fit',
  robots: 'noindex, nofollow',
  manifest: '/pos.webmanifest',
  // iOS «На экран Домой»: PNG 180×180 (SVG iOS не понимает и рисует серую букву)
  icons: { icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }] },
  appleWebApp: { capable: true, title: 'Касса', statusBarStyle: 'default' },
}
export const viewport: Viewport = { themeColor: '#F4F1EC', width: 'device-width', initialScale: 1 }

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <div className="select-none">{children}</div>
}
