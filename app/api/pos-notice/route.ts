import { NextResponse } from 'next/server'
import notice from './notice.json'

export const dynamic = 'force-dynamic'

/** Сообщение для касс + id сборки: открытые вкладки узнают, что вышла новая версия. */
export function GET() {
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'
  const active = !notice.until || Date.parse(notice.until) > Date.now()
  return NextResponse.json({ build, notice: active ? notice : null }, { headers: { 'cache-control': 'no-store' } })
}
