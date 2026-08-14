import type { Metadata } from 'next'

import { MenuPage } from '@/components/menu/menu-page'

export const metadata: Metadata = {
  title: 'ChickenFit — меню',
  description: 'Меню ChickenFit: курица в слоёном тесте. Самарканд.',
}

/** Адрес из QR-кода. Русский — язык по умолчанию, без редиректов. */
export default function Page() {
  return <MenuPage locale="ru" />
}
