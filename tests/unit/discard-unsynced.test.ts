import { describe, expect, it, vi } from 'vitest'
vi.mock('@/features/app/runtime', () => ({ getEngine: () => ({ kick() {} }) }))
import { LocalDb } from '@/data/local-db'
import { discardUnsyncedOrder, hasUnsynced, newOrder, pay } from '@/features/pos/actions'

describe('stuck paid order that never reached server (№062)', () => {
  it('can be discarded locally with its outbox rows', async () => {
    const db = new LocalDb(`t-${Math.random()}`); await db.open()
    const o = await pay(db, { ...newOrder({ type: 'takeaway', cashierName: 'K', deviceId: 'd' }), total: 89_999_999_910 }, 'cash', null)
    expect(await hasUnsynced(db, o.id)).toBe(true)
    await discardUnsyncedOrder(db, o.id)
    expect(await db.orders.get(o.id)).toBeUndefined()
    expect(await hasUnsynced(db, o.id)).toBe(false)
  })
})
