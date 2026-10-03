/**
 * Интеграция: legacy-фикстура -> parseLegacy -> pos_apply_mutation на ЛОКАЛЬНОМ Postgres (после supabase/tests/run-local.sh).
 * Запуск: LOCAL_PG=1 npx vitest run tests/integration
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { parseLegacy } from '@/features/rescue/parse'
import { uuidv5 } from '@/domain/ids'
import menu from '@/content/menu.json'
import { buildFixture } from '../unit/fixtures'

const run = process.env.LOCAL_PG ? describe : describe.skip
const psql = (file: string) =>
  execFileSync('sudo', ['-u', 'postgres', 'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-d', 'cf_migration_test', '-f', file], { encoding: 'utf8' })

run('legacy import on local Postgres', () => {
  it('все legacy-мутации применяются, повторно — без дублей, сверка по дням совпадает', async () => {
    const p = await parseLegacy(buildFixture(), { baseMenu: menu as never, deviceId: 'pg-test', now: new Date('2026-10-04T04:00:00Z') })
    const lines = [`select (public.pos_login('12345678','pg-test')->>'token') as tok \\gset`]
    const add = async (kind: string, key: string, payload: unknown) =>
      lines.push(`select public.pos_apply_mutation(:'tok', '${await uuidv5('it:' + kind + key)}', '${kind}', $j$${JSON.stringify(payload)}$j$::jsonb) is not null;`)
    for (const s of p.shifts) await add('legacy.shift', s.legacyId, s)
    for (const m of p.menu) await add('legacy.menu', m.id, m)
    for (const o of p.orders) await add('legacy.order', o.legacyId, o)
    const body = lines.join('\n')
    // второй прогон с новыми mutation id: legacy-импорт должен пропустить существующие записи
    const body2 = body.replaceAll("'legacy.", "'legacy.").replace(/'([0-9a-f-]{36})'/g, (_m, id) => `'${id.slice(0, 24)}${'0'.repeat(12)}'`)
    writeFileSync('/tmp/legacy-it.sql', `${body}\nselect public.rescue_verify(:'tok');\n`)
    writeFileSync('/tmp/legacy-it2.sql', `${body2.split('\n').slice(0, 1).join('\n')}\n${p.orders.slice(0, 50).map((o) => `select public.pos_apply_mutation(:'tok', gen_random_uuid(), 'legacy.order', $j$${JSON.stringify(o)}$j$::jsonb)->'result'->>'skipped';`).join('\n')}\nselect public.rescue_verify(:'tok');\n`)
    execFileSync('chmod', ['a+r', '/tmp/legacy-it.sql', '/tmp/legacy-it2.sql'])
    writeFileSync('/tmp/legacy-it0.sql', `${lines[0]}\nselect public.rescue_verify(:'tok');\n`)
    execFileSync('chmod', ['a+r', '/tmp/legacy-it0.sql'])
    const before = JSON.parse(psql('/tmp/legacy-it0.sql').trim().split('\n').pop()!)
    const out = psql('/tmp/legacy-it.sql').trim().split('\n')
    const verify = JSON.parse(out[out.length - 1])
    expect(verify.orders - before.orders).toBe(p.orders.length)
    expect(verify.shifts - before.shifts).toBe(p.shifts.length)
    for (const [day, v] of Object.entries(p.report.byDay)) {
      const b = before.orders_by_day[day] ?? { count: 0, total: 0 }
      const draft = p.orders.filter((o) => o.dataQuality?.includes('legacy_draft') && o.createdAt.startsWith(day))
      expect(verify.orders_by_day[day].count - b.count - draft.length).toBe(v.count)
      expect(verify.orders_by_day[day].total - b.total - draft.reduce((s, o) => s + o.total, 0)).toBe(v.total)
    }

    const out2 = psql('/tmp/legacy-it2.sql').trim().split('\n')
    expect(out2.slice(0, 50).every((l) => l === 'exists')).toBe(true)
    expect(JSON.parse(out2[out2.length - 1]).orders).toBe(verify.orders)
  }, 120_000)
})
