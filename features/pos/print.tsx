'use client'
/**
 * Печать через window.print и @media print. Разметка и метрики чека/бегунка/X-Z — как в v1 (receipt-v1.tsx,
 * стили в app/globals.css). Задания печатаются по очереди: одно задание = один диалог печати.
 * Автоматически ничего не печатается — только по явному выбору кассира.
 */
import { useEffect, useState } from 'react'
import type { Order, ShiftSummary } from '@/domain/order'
import { OrderSlipV1, ShiftSlipV1, type Paper } from './receipt-v1'

export type PrintJob =
  | { kind: 'receipt' | 'precheck' | 'kitchen'; order: Order; tableLabel?: string }
  | { kind: 'shift'; type: 'X' | 'Z'; summary: ShiftSummary }

let pushJob: ((j: PrintJob) => void) | null = null

export function printJob(job: PrintJob) {
  pushJob?.(job)
}

export function PrintArea({ paper, shiftNumber }: { paper: Paper; shiftNumber?: number }) {
  const [queue, setQueue] = useState<PrintJob[]>([])
  useEffect(() => {
    pushJob = (j) => setQueue((q) => [...q, j])
    return () => { pushJob = null }
  }, [])
  const job = queue[0] ?? null
  useEffect(() => {
    if (!job) return
    const t = setTimeout(() => {
      window.print()
      setQueue((q) => q.slice(1))
    }, 60)
    return () => clearTimeout(t)
  }, [job])
  const mode = !job ? 'guest' : job.kind === 'shift' ? 'shift' : job.kind === 'receipt' ? 'guest' : job.kind
  return (
    <div id="receipt-print-wrapper" className={`receipt-hidden print-mode-${mode} paper-${paper}`} data-paper={paper} data-kind={job?.kind}>
      {job && (job.kind === 'shift' ? <ShiftSlipV1 type={job.type} s={job.summary} />
        : <OrderSlipV1 mode={job.kind === 'receipt' ? 'guest' : job.kind} order={job.order} paper={paper} tableLabel={job.tableLabel} shiftNumber={shiftNumber} />)}
    </div>
  )
}
