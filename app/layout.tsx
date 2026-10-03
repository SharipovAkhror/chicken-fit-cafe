import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RescueBoot } from '@/features/rescue/RescueBoot'

export const metadata: Metadata = {
  title: 'ChickenFit — меню',
  description:
    'Меню ChickenFit: курица в слоёном тесте. Самарканд.',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FDFCF9',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // class="light" отключает серую dark-схему из globals.css: меню всегда в палитре бренда
  return (
    <html lang="ru" className="light">
      <body className="antialiased">
        <RescueBoot />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
