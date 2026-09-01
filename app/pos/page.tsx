'use client'

import { AuthGate } from '@/components/pos/auth-gate'
import { PosTerminal } from '@/components/pos/pos-terminal'

export default function StandalonePosPage() {
  return (
    <AuthGate>
      <PosTerminal />
    </AuthGate>
  )
}
