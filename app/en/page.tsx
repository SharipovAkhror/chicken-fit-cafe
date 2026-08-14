import type { Metadata } from 'next'

import { MenuPage } from '@/components/menu/menu-page'

export const metadata: Metadata = {
  title: 'ChickenFit — menu',
  description: 'ChickenFit menu: chicken in flaky pastry. Samarkand.',
}

export default function Page() {
  return <MenuPage locale="en" />
}
