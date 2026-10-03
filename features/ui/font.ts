import localFont from 'next/font/local'

/** Inter (OFL), локальный файл: латиница + кириллица, вариативный 100–900. Без запросов к Google. */
export const inter = localFont({
  src: '../../app/fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
})
