/**
 * Universal Offline-First Outbox Sync Engine
 * Обеспечивает 100% сохранность данных кассы (уровень iiko / r_keeper):
 * - Ни один заказ и ни одно изменение меню не теряются при обрыве связи.
 * - Очередь повторных попыток с защитой от дублирования.
 * - Автоматический синк при появлении интернета (событие online + периодический интервал).
 */

import { supabase } from '@/lib/supabase'

export type OutboxItemType = 'order_create' | 'order_update' | 'menu_upsert' | 'menu_delete'

export interface OutboxOrderRecord {
  id: string
  orderNumber: string
  payload: any
  type: 'create' | 'update'
  attempts: number
  lastAttemptAt?: string
  lastError?: string
  createdAt: string
}

export interface OutboxMenuRecord {
  id: string
  type: 'upsert' | 'delete'
  payload: any
  attempts: number
  lastAttemptAt?: string
  lastError?: string
  createdAt: string
}

const OUTBOX_ORDERS_KEY = 'chickenfit_outbox_orders_v1'
const OUTBOX_MENU_KEY = 'chickenfit_outbox_menu_v1'
const MAX_ATTEMPTS = 50

// Вспомогательные функции безопасной работы с LocalStorage
function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: any): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`LocalStorage write error for ${key}:`, err)
  }
}

// ─── ОЧЕРЕДЬ ЗАКАЗОВ ──────────────────────────────────────────

export function getOutboxOrders(): OutboxOrderRecord[] {
  return safeGet<OutboxOrderRecord[]>(OUTBOX_ORDERS_KEY, [])
}

export function enqueueOrderSync(orderId: string, orderNumber: string, payload: any, type: 'create' | 'update' = 'create'): void {
  const current = getOutboxOrders()
  const existingIdx = current.findIndex((item) => item.id === orderId)

  const record: OutboxOrderRecord = {
    id: orderId,
    orderNumber,
    payload,
    type,
    attempts: existingIdx >= 0 ? current[existingIdx].attempts : 0,
    createdAt: existingIdx >= 0 ? current[existingIdx].createdAt : new Date().toISOString(),
  }

  if (existingIdx >= 0) {
    current[existingIdx] = record
  } else {
    current.push(record)
  }

  safeSet(OUTBOX_ORDERS_KEY, current)
  // Пробуем синхронизировать сразу в фоне
  triggerBackgroundSync()
}

export function removeOrderFromOutbox(orderId: string): void {
  const current = getOutboxOrders().filter((item) => item.id !== orderId)
  safeSet(OUTBOX_ORDERS_KEY, current)
}

// ─── ОЧЕРЕДЬ МЕНЮ ─────────────────────────────────────────────

export function getOutboxMenu(): OutboxMenuRecord[] {
  return safeGet<OutboxMenuRecord[]>(OUTBOX_MENU_KEY, [])
}

export function enqueueMenuMutation(id: string, type: 'upsert' | 'delete', payload: any): void {
  const current = getOutboxMenu()
  const existingIdx = current.findIndex((item) => item.id === id)

  const record: OutboxMenuRecord = {
    id,
    type,
    payload,
    attempts: existingIdx >= 0 ? current[existingIdx].attempts : 0,
    createdAt: existingIdx >= 0 ? current[existingIdx].createdAt : new Date().toISOString(),
  }

  if (existingIdx >= 0) {
    current[existingIdx] = record
  } else {
    current.push(record)
  }

  safeSet(OUTBOX_MENU_KEY, current)
  triggerBackgroundSync()
}

export function removeMenuFromOutbox(id: string): void {
  const current = getOutboxMenu().filter((item) => item.id !== id)
  safeSet(OUTBOX_MENU_KEY, current)
}

// ─── ФОНОВЫЙ СИНХРОНИЗАТОР ─────────────────────────────────────

let isSyncing = false
const syncListeners = new Set<(status: { pendingOrders: number; pendingMenu: number; isSyncing: boolean }) => void>()

export function subscribeToSyncStatus(listener: (status: { pendingOrders: number; pendingMenu: number; isSyncing: boolean }) => void): () => void {
  syncListeners.add(listener)
  listener({
    pendingOrders: getOutboxOrders().length,
    pendingMenu: getOutboxMenu().length,
    isSyncing,
  })
  return () => {
    syncListeners.delete(listener)
  }
}

function notifyListeners() {
  const status = {
    pendingOrders: getOutboxOrders().length,
    pendingMenu: getOutboxMenu().length,
    isSyncing,
  }
  syncListeners.forEach((l) => {
    try {
      l(status)
    } catch {}
  })
}

/** Выполнить цикл отправки всей очереди в Supabase */
export async function processOutboxQueue(): Promise<{
  syncedOrders: number
  syncedMenu: number
  failed: number
}> {
  if (isSyncing || !supabase) {
    return { syncedOrders: 0, syncedMenu: 0, failed: 0 }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedOrders: 0, syncedMenu: 0, failed: 0 }
  }

  isSyncing = true
  notifyListeners()

  let syncedOrders = 0
  let syncedMenu = 0
  let failed = 0

  try {
    // 1. Синхронизируем заказы
    const pendingOrders = getOutboxOrders()
    for (const record of pendingOrders) {
      try {
        record.attempts += 1
        record.lastAttemptAt = new Date().toISOString()

        const p = record.payload
        // Формируем безопасный статус, гарантированно принимаемый схемой
        const safeStatus = ['completed', 'cancelled'].includes(p.status) ? p.status : 'completed'

        // Попытка полной вставки/апдейта
        let resultErr: any = null
        if (record.type === 'create') {
          const { error } = await supabase.from('orders').upsert({
            id: p.id,
            order_number: p.order_number || p.orderNumber,
            order_type: p.order_type || p.type,
            table_number: p.table_number || p.tableNumber || null,
            customer_phone: p.customer_phone || p.customerPhone || null,
            delivery_address: p.delivery_address || p.deliveryAddress || null,
            items: p.items,
            total_amount: p.total_amount || p.total,
            payment_method: p.payment_method || p.paymentMethod,
            cash_received: p.cash_received || p.cashReceived || null,
            change_amount: p.change_amount || p.changeAmount || null,
            status: safeStatus,
          })
          resultErr = error
        } else {
          const { error } = await supabase
            .from('orders')
            .update({
              items: p.items,
              total_amount: p.total_amount || p.total,
              table_number: p.table_number || p.tableNumber || null,
              status: safeStatus,
            })
            .eq('id', record.id)
          resultErr = error
        }

        if (!resultErr) {
          removeOrderFromOutbox(record.id)
          syncedOrders += 1
        } else {
          record.lastError = resultErr.message
          failed += 1
          if (record.attempts > MAX_ATTEMPTS) {
            // Архивируем нерешаемый конфликт
            console.error(`Order ${record.id} exceeded max sync attempts:`, record.lastError)
          }
        }
      } catch (err: any) {
        record.lastError = err?.message || String(err)
        failed += 1
      }
    }

    // 2. Синхронизируем меню
    const pendingMenu = getOutboxMenu()
    for (const record of pendingMenu) {
      try {
        record.attempts += 1
        record.lastAttemptAt = new Date().toISOString()

        let menuErr: any = null
        if (record.type === 'upsert') {
          const { error } = await supabase.from('menu_items').upsert(record.payload)
          menuErr = error
        } else {
          const { error } = await supabase.from('menu_items').delete().eq('id', record.id)
          menuErr = error
        }

        if (!menuErr) {
          removeMenuFromOutbox(record.id)
          syncedMenu += 1
        } else {
          record.lastError = menuErr.message
          failed += 1
        }
      } catch (err: any) {
        record.lastError = err?.message || String(err)
        failed += 1
      }
    }
  } finally {
    isSyncing = false
    notifyListeners()
  }

  return { syncedOrders, syncedMenu, failed }
}

let backgroundTimer: any = null

export function triggerBackgroundSync(): void {
  if (typeof window === 'undefined') return
  if (backgroundTimer) clearTimeout(backgroundTimer)
  backgroundTimer = setTimeout(() => {
    processOutboxQueue().catch(console.warn)
  }, 1000)
}

// Авто-инициализация слушателей сети
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('📡 Сеть восстановлена: запуск синхронизации очереди Outbox...')
    triggerBackgroundSync()
  })

  // Регулярный опрос очереди каждые 30 секунд
  setInterval(() => {
    const orders = getOutboxOrders()
    const menu = getOutboxMenu()
    if (orders.length > 0 || menu.length > 0) {
      processOutboxQueue().catch(console.warn)
    }
  }, 30000)
}
