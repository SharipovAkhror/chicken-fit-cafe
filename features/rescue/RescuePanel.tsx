'use client'
import { useRef, useState } from 'react'
import { useRuntime, getEngine } from '@/features/app/runtime'
import { formatUZS } from '@/domain/money'
import { buildBackup, backupFilename, downloadJson, restoreBackup } from './backup'
import type { RescueView } from './useRescueImport'

export function RescueBanner({ r }: { r: RescueView | null }) {
  if (!r) return null
  if (r.verify?.ok) return null
  if (!r.uploaded && r.uploadError)
    return <div className="banner banner-danger">Данные старой кассы сохранены на этом устройстве, но ещё не отправлены на сервер. Не очищайте браузер. Раздел «Настройки» → «Данные» → скачать бэкап.</div>
  return <div className="banner banner-info">Перенос данных старой кассы: {r.report ? `${r.report.ordersTotal} заказов, ${r.report.shifts} смен` : 'подготовка'}… Работать можно.</div>
}

export function BackupView({ r, embedded = false }: { r: RescueView | null; embedded?: boolean }) {
  const { db } = useRuntime()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className={embedded ? 'grid gap-4 mt-3' : 'p-4 grid gap-4'} style={{ maxWidth: 760 }}>
      {!embedded && <h2 className="text-2xl font-bold">Бэкап и перенос данных</h2>}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-lg btn-primary" onClick={async () => downloadJson(await buildBackup(db), backupFilename())}>Скачать бэкап (JSON)</button>
        <button className="btn btn-lg" onClick={() => file.current?.click()}>Загрузить бэкап</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          try {
            const res = await restoreBackup(db, JSON.parse(await f.text()))
            setMsg(`Загружено: снимков старой кассы ${res.snapshots.length}, заказов ${res.orders}. Импорт пойдёт автоматически.`)
            getEngine().kick()
          } catch (err) { setMsg(`Ошибка: ${(err as Error).message}`) }
        }} />
      </div>
      {msg && <div className="banner banner-info">{msg}</div>}
      {!r ? <p className="muted">Данных старой версии на этом устройстве не найдено.</p> : (
        <div className="panel p-4 grid gap-2">
          <div>Снимок старой кассы: <code>{r.sha.slice(0, 12)}</code> · на сервере: <strong>{r.uploaded ? 'да' : 'нет'}</strong>{r.uploadError ? ` (${r.uploadError})` : ''}</div>
          {r.report && (
            <>
              <div>Заказов: <strong>{r.report.ordersTotal}</strong> (из основного списка {r.report.ordersFromMainKey}{r.report.mainKeyAtCap ? ' — достигнут лимит 500' : ''}, восстановлено из очереди {r.report.ordersOnlyInOutbox}); смен: {r.report.shifts}; период: {r.report.dateFrom} — {r.report.dateTo}</div>
              {r.report.draftsLinked.length > 0 && <div className="banner banner-warn">Черновики столов, привязанные к заказам (проверьте вручную): {r.report.draftsLinked.map((d) => d.key).join(', ')}</div>}
              {r.report.errors.length > 0 && <div className="banner banner-warn">{r.report.errors.join('; ')}</div>}
              <div>Сверка с сервером: {r.verify ? (r.verify.ok ? <strong style={{ color: 'var(--success)' }}>совпадает</strong> : `ожидает (${r.verify.pendingLegacy} в очереди, расхождений по дням ${r.verify.diff.length})`) : 'ещё не выполнялась'}</div>
              <table className="data"><thead><tr><th>День</th><th className="num">Заказов</th><th className="num">Выручка (оплачено)</th></tr></thead>
                <tbody>{Object.entries(r.report.byDay).sort().reverse().map(([d, v]) => <tr key={d}><td>{d}</td><td className="num">{v.count}</td><td className="num">{formatUZS(r.report!.revenueByDay[d] ?? 0)}</td></tr>)}</tbody></table>
            </>
          )}
        </div>
      )}
    </div>
  )
}
