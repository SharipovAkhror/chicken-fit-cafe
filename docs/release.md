# Релиз и откат

## Окружения
| | Где | Supabase env |
|---|---|---|
| Прод | `main` → https://chicken-fit-cafe.vercel.app (Vercel `prj_TWBQgZ4iXmABwJF3nQIVCSKjdZT7`) | Production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Preview | любая ветка (защищено Vercel Authentication) | не задан → касса в режиме «только локально» (реальная БД не используется) |
| Локально | `.env.local` (из `.env.example`) | осторожно: указывает на прод-БД |

## Релиз
1. Ветка от `main`, коммиты, push → CI зелёный: `check` (lint 0 warnings, types, unit, build), `migrations` (PG 17 ×2 + SQL-тесты + импорт legacy), `e2e` (smoke, мок RPC).
2. Новые миграции применить в Supabase **до** мержа (они аддитивные, старый прод-клиент с ними работает). Отметить в `docs/migrations.md`.
3. Согласие владельца → `git checkout main && git merge --ff-only <branch> && git push origin main`.
4. Vercel собирает прод; дождаться `READY`.
5. Проверка: `/api/keepalive` → 200 `{"status":"ok"}`; `/pos` (экран PIN), `/kds`, `/backup` → 200;
   `BASE=https://chicken-fit-cafe.vercel.app SHARE=https://chicken-fit-cafe.vercel.app/ node tests/e2e/real-supabase-readonly.mjs`
   (вход, pull, отчёты, выход — без записи заказов). Записать id нового прод-деплоя ниже.
6. Касса: перезагрузить вкладку на устройстве (сервис-воркера нет; старая вкладка работает на старом коде до перезагрузки).

## Откат
- Код: Vercel → Deployments → предыдущий прод-деплой → **Instant Rollback** (без пересборки).
- БД: миграции аддитивные — откат кода их не требует; данные, записанные новой версией, остаются и читаются старой.
- Данные устройства: IndexedDB `cf2` и ключи v1 в localStorage не удаляются; `/backup` даёт JSON-копию.

## Журнал прод-деплоев
| Дата (UTC+5) | Коммит | Деплой | Что |
|---|---|---|---|
| 03.10.2026 | `74ab3bb` | `dpl_BrqYthiJSCDCiYwdgECR7sdL9JJZ` | v2.0 (переход с v1; v1 — `dpl_DtNZzsEdt2aSZUtMJ9pT7aH8Vayj`, тег `pre-v2`) |
| 04.10.2026 | ux/v2.1 → main | см. Vercel (откат → `dpl_BrqYthiJSCDCiYwdgECR7sdL9JJZ`) | v2.1–v2.3: типы товаров, правка позиций, аудит цены (0010), редизайн |

## Тестовые записи в реальной БД
`tests/e2e/real-supabase-e2e.mjs` — только под сотрудником `staff.is_test=true` (записи `source='dev_test'`, не в отчётах).
После прогона удалить его заказы (`orders.created_by`), смены (`shifts.opened_by`), `applied_mutations.staff_id`,
`login_attempts` его устройств и самого сотрудника.

## Перенос с v1 (выполнен 03.10.2026; путь спасения остаётся в коде)
При открытии v2 на устройстве со старыми данными снимок localStorage уходит в IndexedDB и на сервер, после входа — импорт
(`source='legacy_rescue'`) и сверка по дням в разделе «Бэкап». Проверка в SQL:
```sql
select count(*), max(received_at) from legacy_snapshots;
select business_date, count(*), sum(total_amount) from orders where source = 'legacy_rescue' group by 1 order by 1;
```
