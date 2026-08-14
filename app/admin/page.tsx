'use client'

import { AuthGate } from '@/components/pos/auth-gate'
import { PosTerminal } from '@/components/pos/pos-terminal'

export default function AdminPage() {
  return (
    <AuthGate>
      <PosTerminal />
    </AuthGate>
  )
}
