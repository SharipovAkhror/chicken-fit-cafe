'use client'
/** После входа по PIN: импорт legacy-данных (идемпотентно), сверка, выравнивание меню. */
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import menu from '@/content/menu.json'
import { useRuntime, getEngine, api } from '@/features/app/runtime'
import { enqueueImport, reconcileMenu, uploadPending, verifyImport } from './rescue'
import type { ParseReport } from './parse'

export type RescueView = { sha: string; report?: ParseReport; verify?: { ok: boolean; pendingLegacy: number; diff: unknown[] }; uploaded: boolean; uploadError?: string | null }

export function useRescueImport(): RescueView | null {
  const { db, session, deviceId } = useRuntime()
  const rows = useLiveQuery(() => db.rescue.orderBy('capturedAt').reverse().toArray(), [db])
  const latest = rows?.[0]
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!session || !latest || !deviceId) return
    let alive = true
    ;(async () => {
      try {
        await uploadPending(db, api)
        if (!latest.enqueuedAt) {
          await enqueueImport(db, latest.sha256, { baseMenu: menu as never, deviceId })
          getEngine().kick(50)
        }
        await getEngine().sync()
        if (await reconcileMenu(db)) getEngine().kick(50)
        const pending = await db.outbox.filter((r) => r.kind.startsWith('legacy.')).count()
        if (pending === 0 && !latest.verifiedAt) await verifyImport(db, api, session.token, latest.sha256)
      } catch (e) {
        console.error('[rescue] import', e)
      }
      if (alive && !latest.verifiedAt) setTimeout(() => alive && setTick((t) => t + 1), 20_000)
    })()
    return () => { alive = false }
  }, [db, session, latest?.sha256, latest?.enqueuedAt, latest?.verifiedAt, deviceId, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!latest) return null
  return {
    sha: latest.sha256,
    report: latest.report as ParseReport | undefined,
    verify: latest.verify as RescueView['verify'],
    uploaded: !!latest.uploadedAt,
    uploadError: latest.uploadError,
  }
}
