'use client'
/** Аварийный экспорт без PIN: снимок старой кассы + локальные данные v2 в JSON-файл. */
import { useEffect, useState } from 'react'
import '@/features/ui/v2.css'
import { getDb, getDeviceId } from '@/data/local-db'
import { captureAndStore } from '@/features/rescue/rescue'
import { buildBackup, backupFilename, downloadJson } from '@/features/rescue/backup'

export default function BackupPage() {
  const [info, setInfo] = useState<string>('Подготовка…')
  useEffect(() => {
    ;(async () => {
      const db = getDb()
      const row = await captureAndStore(db, window.localStorage, await getDeviceId(db))
      const b = await buildBackup(db)
      setInfo(`Снимков старой кассы: ${b.legacySnapshots.length}${row ? ` (ключей ${row.snapshot.keyCount}, ${Math.round(row.snapshot.sizeBytes / 1024)} КБ)` : ''}; заказов v2: ${b.v2.orders.length}; в очереди: ${b.v2.outbox.length}`)
    })().catch((e) => setInfo(`Ошибка: ${e.message}`))
  }, [])
  return (
    <div className="v2 min-h-dvh flex items-center justify-center p-4">
      <div className="panel p-6 grid gap-4" style={{ maxWidth: 520 }}>
        <h1 className="text-2xl font-bold">Бэкап данных кассы</h1>
        <p className="muted">{info}</p>
        <button className="btn btn-lg btn-primary" onClick={async () => downloadJson(await buildBackup(getDb()), backupFilename())}>Скачать файл бэкапа</button>
        <a className="btn" href="/pos">Открыть кассу</a>
      </div>
    </div>
  )
}
