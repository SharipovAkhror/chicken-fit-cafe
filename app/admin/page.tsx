import { redirect } from 'next/navigation'

// Админка v1 работала с localStorage напрямую — в v2 всё в кассе (/pos: отчёты, смена, бэкап).
export default function AdminPage() {
  redirect('/pos')
}
