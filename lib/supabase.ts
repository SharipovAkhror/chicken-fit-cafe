import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// publishable-ключ (как у кассы); старый ANON — запасной вариант для локальной разработки
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Supabase-клиент гостевого сайта. Без переменных окружения — null (сайт показывает меню из content/menu.json).
 * У anon нет доступа к таблицам: меню читается только через RPC public_menu (миграция 0014).
 */
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null
