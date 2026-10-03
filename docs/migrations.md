# Миграции БД

## Правила
1. Новый файл `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`; старые файлы не редактировать.
2. Только аддитивно: новые таблицы/колонки/индексы/функции, `create or replace`, `if not exists`, `on conflict do nothing`.
   Ничего не удалять и не переименовывать, пока это читает прод-клиент.
3. Идемпотентно: двойной прогон без ошибок (проверяют `run-local.sh` и CI).
4. Тест на каждую миграцию: `supabase/tests/0N_tests_*.sql` (подхватывается по маске `0[2-9]_*.sql`).
5. Новые функции — `revoke … from public, anon, authenticated`, наружу только через `pos_*`/`report_*`/`rescue_*`.
6. В прод — **до** мержа кода, который на них опирается, и только с согласия владельца.

## Проверка локально
```bash
npm run test:migrations   # stub Supabase → фикстура прод-схемы → все миграции → повтор → SQL-тесты
npm run test:pg           # импорт legacy-фикстуры через pos_apply_mutation на той же БД
```
Локальный Postgres 17 — см. [`setup.md`](setup.md#тесты). В CI то же делает job `migrations`.

## Применение в прод (Supabase `ikvontqurgzopdmsdmla`)
История миграций в прод-БД (`supabase_migrations.schema_migrations`) ведётся под **именами** `v2_00NN_<name>`
с версией = время применения (например `20261003201356 v2_0010_price_override_audit`), а не под именами файлов.
Поэтому `supabase db push` сейчас **не использовать**: CLI сочтёт все файлы репозитория неприменёнными и прогонит их заново.
(Выравнивание истории через `supabase migration repair` — отдельная задача с согласия владельца.)

Стандартный путь — `psql` (или Supabase Dashboard → SQL Editor: вставить файл целиком → Run):
```bash
export DATABASE_URL='<Supabase → Connect → Session pooler>'   # не сохранять в репозиторий
F=supabase/migrations/<новый файл>.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f "$F"            # одна транзакция: ошибка = ничего не применено
psql "$DATABASE_URL" -c "insert into supabase_migrations.schema_migrations(version, name)
  values (to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), 'v2_00NN_<name>')"
```
Проверка после применения:
```sql
select version, name from supabase_migrations.schema_migrations order by version desc limit 3;  -- новая запись есть
-- объекты миграции на месте, например:
select proname from pg_proc where pronamespace = 'public'::regnamespace and proname like 'pos_%';
```
Затем `curl -fsS https://chicken-fit-cafe.vercel.app/api/keepalive` и readonly-проверка из [`release.md`](release.md#релиз)
(старый прод-клиент должен работать с новой схемой). Отметить миграцию в таблице ниже.

## Список
| № | Файл | Что | В Supabase |
|---|---|---|---|
| 0001 | `…000100_baseline` | фиксация исходной схемы v1 | применена |
| 0002 | `…000200_core_v2` | таблицы v2, колонки, индексы | применена |
| 0003 | `…000300_rpc` | `pos_login/pull/apply_mutation`, upsert-функции | применена |
| 0004 | `…000400_reports` | `report_shift`, `report_sales` | применена |
| 0005 | `…000500_realtime_broadcast` | сигнал `cf-sync` из триггеров | применена |
| 0006 | `…000600_rls_lockdown` | RLS, публичное чтение только меню/столов | применена |
| 0007 | `…000700_seed_reference` | столы, учётки, пометка dev-заказов | применена |
| 0008 | `…000800_tables_and_test_staff` | `table.upsert`, `staff.is_test` → `dev_test` | применена |
| 0009 | `…000900_product_kinds` | `menu_items.kind/options` | применена |
| 0010 | `…001000_price_override_audit` | аудит ручной цены → `order_events.price_override` | применена 04.10.2026 |
