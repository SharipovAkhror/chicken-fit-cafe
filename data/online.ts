/**
 * Операции, которым нужна сеть (не через outbox): фото блюд в Supabase Storage,
 * возобновление оплаченного заказа (без PIN — решение владельца 06.10). Миграции 0012/0013. Без сервера — понятная ошибка, касса продолжает работать.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ServerError, supabaseConfigured } from './api'

let client: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (!supabaseConfigured()) throw new ServerError('Нет связи с сервером — действие доступно только онлайн', false, 'not_configured')
  if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().rpc(fn, args)
  if (error) throw new ServerError(error.message || String(error), true, error.code)
  return data as T
}

export const BUCKET = 'menu-photos'
export type PhotoTicket = { bucket: string; path: string; thumb: string } | { error: string }

/** Загрузить сжатое фото (основное + миниатюра) по одноразовому талону; вернуть публичную ссылку. */
export async function uploadMenuPhoto(token: string, main: Blob, thumb: Blob, ext: 'webp' | 'jpg'): Promise<string> {
  const t = await rpc<PhotoTicket>('pos_photo_ticket', { p_token: token, p_ext: ext })
  if ('error' in t) throw new ServerError(t.error === 'too_many_uploads' ? 'Слишком много загрузок, попробуйте через час' : t.error, true, t.error)
  const contentType = ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const opts = { contentType, cacheControl: '31536000', upsert: false }
  const store = sb().storage.from(t.bucket)
  const a = await store.upload(t.path, main, opts)
  if (a.error) throw new ServerError(`Фото не загрузилось: ${a.error.message}`, true)
  const b = await store.upload(t.thumb, thumb, opts)
  if (b.error) console.warn('thumb upload', b.error.message) // без миниатюры карточка возьмёт основное фото
  return store.getPublicUrl(t.path).data.publicUrl
}

/** Удалить фото из Storage, если оно больше нигде не используется (сервер проверяет и выдаёт талон на удаление). */
export async function releaseMenuPhoto(token: string, url: string | null | undefined): Promise<void> {
  if (!url || !url.includes(`/${BUCKET}/`)) return
  try {
    const r = await rpc<{ bucket?: string; paths: string[] }>('pos_photo_release', { p_token: token, p_url: url })
    if (r.bucket && r.paths?.length) await sb().storage.from(r.bucket).remove(r.paths)
  } catch (e) { console.warn('photo release', e) } // мусорный файл не мешает работе; повторим при следующем удалении
}

export type ReopenResult = { order: Record<string, unknown> } | { error: 'not_found' | 'not_paid' | 'shift_closed' | 'forbidden' }
/** Причина необязательна: пустую сервер пишет как «Без причины». */
export const reopenOrderOnline = (token: string, orderId: string, reason: string) =>
  rpc<ReopenResult>('pos_reopen_order', { p_token: token, p_order_id: orderId, p_reason: reason.trim() })
