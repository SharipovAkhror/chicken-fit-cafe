'use client'
/**
 * Запускается на любой странице сразу при открытии (до PIN): снимок legacy-данных -> IndexedDB -> сервер.
 * Ничего не пишет в localStorage.
 */
import { useEffect } from 'react'
import { getDb, getDeviceId } from '@/data/local-db'
import { supabaseApi, supabaseConfigured } from '@/data/api'
import { captureAndStore, uploadPending } from './rescue'

export function RescueBoot() {
  useEffect(() => {
    ;(async () => {
      try {
        const db = getDb()
        const deviceId = await getDeviceId(db)
        await captureAndStore(db, window.localStorage, deviceId)
        if (supabaseConfigured()) await uploadPending(db, supabaseApi)
      } catch (e) {
        console.error('[rescue] boot failed', e)
      }
    })()
  }, [])
  return null
}
