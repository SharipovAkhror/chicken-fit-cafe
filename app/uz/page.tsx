import type { Metadata } from 'next'

import { MenuPage } from '@/components/menu/menu-page'

export const metadata: Metadata = {
  title: 'ChickenFit — menyu',
  description: "ChickenFit menyusi: qatlama xamirdagi tovuq. Samarqand.",
}

export default function Page() {
  return <MenuPage locale="uz" />
}
