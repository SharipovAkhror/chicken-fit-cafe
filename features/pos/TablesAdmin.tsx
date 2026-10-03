'use client'
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRuntime, getEngine } from '@/features/app/runtime'
import { enqueue } from '@/data/outbox'
import type { TableRow } from '@/data/local-db'
import { Modal } from './common'
import { useTables } from './useData'

/** Столы (только admin): добавить, переименовать, удалить (на сервере — is_active=false, история заказов сохраняется). */
export function TablesAdmin() {
  const { db } = useRuntime()
  const tables = useTables()
  const [edit, setEdit] = useState<TableRow | 'new' | null>(null)
  const [del, setDel] = useState<TableRow | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const zones = [...new Set(tables.map((t) => t.zone))]

  const save = async (t: TableRow) => {
    await db.diningTables.put(t)
    await enqueue(db, 'table.upsert', t.id, { id: t.id, name: t.label, zone: t.zone, capacity: t.seats ?? 4, sortOrder: t.sortOrder, isActive: true })
    getEngine().kick()
  }
  const remove = async (t: TableRow) => {
    const open = await db.orders.filter((o) => o.tableId === t.id && o.paymentStatus === 'unpaid' && o.status !== 'cancelled').count()
    if (open) { setErr(`На «${t.label}» есть неоплаченный заказ. Сначала закройте его.`); setDel(null); return }
    await db.diningTables.delete(t.id)
    await enqueue(db, 'table.upsert', t.id, { id: t.id, isActive: false })
    getEngine().kick()
    setDel(null)
  }

  return (
    <div className="p-4 grid gap-4" style={{ maxWidth: 900 }}>
      <div><button className="btn btn-primary" onClick={() => setEdit('new')}><Plus size={18} />Добавить стол</button></div>
      {err && <div className="banner banner-warn" role="alert">{err}</div>}
      {zones.map((z) => (
        <section key={z} className="panel p-3">
          <h3 className="font-bold mb-2">{z}</h3>
          {tables.filter((t) => t.zone === z).map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="flex-1 font-semibold">{t.label}</span>
              <span className="muted text-sm">мест: {t.seats ?? '—'}</span>
              <button className="btn" aria-label={`Переименовать ${t.label}`} onClick={() => setEdit(t)}><Pencil size={18} />Изменить</button>
              <button className="btn btn-ghost" aria-label={`Удалить ${t.label}`} onClick={() => { setErr(null); setDel(t) }}><Trash2 size={18} /></button>
            </div>
          ))}
        </section>
      ))}
      {edit && (
        <TableForm table={edit === 'new' ? null : edit} zones={zones} existing={tables}
          onClose={() => setEdit(null)} onSave={async (t) => { await save(t); setEdit(null) }} />
      )}
      {del && (
        <Modal title={`Удалить «${del.label}»?`} onClose={() => setDel(null)}>
          <p className="mb-3">Стол исчезнет из зала. Старые заказы этого стола останутся в истории и отчётах.</p>
          <button className="btn btn-lg btn-danger w-full" onClick={() => remove(del)}>Удалить стол</button>
        </Modal>
      )}
    </div>
  )
}

function TableForm({ table, zones, existing, onClose, onSave }: { table: TableRow | null; zones: string[]; existing: TableRow[]; onClose: () => void; onSave: (t: TableRow) => void }) {
  const nextNum = Math.max(0, ...existing.map((t) => Number(t.id)).filter(Number.isFinite)) + 1
  const [label, setLabel] = useState(table?.label ?? `Стол ${nextNum}`)
  const [zone, setZone] = useState(table?.zone ?? zones[0] ?? '1 этаж')
  const [seats, setSeats] = useState(String(table?.seats ?? 4))
  const valid = label.trim().length >= 1 && zone.trim().length >= 1
  return (
    <Modal title={table ? 'Изменить стол' : 'Новый стол'} onClose={onClose}>
      <form className="grid gap-3" onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        const maxSort = Math.max(0, ...existing.map((t) => t.sortOrder))
        onSave({ id: table?.id ?? String(nextNum), label: label.trim(), zone: zone.trim(), seats: Number(seats) || 4, sortOrder: table?.sortOrder ?? maxSort + 1 })
      }}>
        <label className="grid gap-1"><span className="text-sm muted">Название</span><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus /></label>
        <label className="grid gap-1"><span className="text-sm muted">Зал</span>
          <input className="input" list="zones" value={zone} onChange={(e) => setZone(e.target.value)} />
          <datalist id="zones">{zones.map((z) => <option key={z} value={z} />)}</datalist></label>
        <label className="grid gap-1"><span className="text-sm muted">Мест</span><input className="input" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ''))} /></label>
        <button className="btn btn-lg btn-primary" type="submit" disabled={!valid}>Сохранить</button>
      </form>
    </Modal>
  )
}
