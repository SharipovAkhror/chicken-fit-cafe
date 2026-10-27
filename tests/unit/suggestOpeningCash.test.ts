import { describe, it, expect } from 'vitest'
import { suggestOpeningCash } from '@/features/pos/ShiftView'
const base = { id: 's', cashierName: 'a', openedAt: '', initialCash: 50000, status: 'closed' as const }
describe('suggestOpeningCash', () => {
  it('no previous shift → 0', () => expect(suggestOpeningCash().amount).toBe(0))
  it('uses counted cash', () => expect(suggestOpeningCash({ ...base, countedCash: 120000 }).amount).toBe(120000))
  it('falls back to initial', () => expect(suggestOpeningCash(base).amount).toBe(50000))
})
