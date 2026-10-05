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
История в прод-БД (`supabase_migrations.schema_migrations`) совпадает с файлами репозитория: версия = префикс имени файла,
имя = остаток (выровнена 04.10.2026). Стандартный путь — Supabase CLI:
```bash
npx supabase login                                        # или SUPABASE_ACCESS_TOKEN
npx supabase link --project-ref ikvontqurgzopdmsdmla      # спросит пароль БД (Project Settings → Database)
npx supabase migration list                               # Local и Remote совпадают, новая — только в Local
npx supabase db push --dry-run                            # должна быть ровно новая миграция
npx supabase db push                                      # применяет и записывает в историю
```
Без `link`: `npx supabase db push --db-url "$DATABASE_URL"` (строка Session pooler из Supabase → Connect; в репозиторий не класть).
После успешного применения `migration list` показывает её в обеих колонках, `db push --dry-run` — «Remote database is up to date».

Запасной путь — `psql` (или SQL Editor: вставить файл целиком → Run), затем вручную записать историю под тем же именем файла:
```bash
F=supabase/migrations/20261005000100_example.sql             # пример
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f "$F"            # одна транзакция: ошибка = ничего не применено
psql "$DATABASE_URL" -c "insert into supabase_migrations.schema_migrations(version, name) values ('20261005000100', 'example')"
```
Проверка в обоих случаях: `select version, name from supabase_migrations.schema_migrations order by version desc limit 3;`,
затем `curl -fsS https://chicken-fit-cafe.vercel.app/api/keepalive` и readonly-проверка из [`release.md`](release.md#релиз)
(старый прод-клиент должен работать с новой схемой). Отметить миграцию в таблице ниже.
Если `db push` пишет «Remote migration versions not found in local migrations directory» — история снова разошлась:
не чинить наугад, сравнить `migration list` и при согласии владельца выровнять `supabase migration repair`.

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
| 0011 | `20261005000100_data_constraints` | CHECK/NOT NULL под free tier, `app_meta`, `housekeeping()` | **не применена** (ветка `ux/v3`) |
| 0012 | `20261005000200_menu_photos` | бакет `menu-photos`, талоны, политики Storage, проверки блюда в `_upsert_menu_item` | **не применена** |
| 0013 | `20261005000300_order_controls` | `order.cancel`, PIN админа, `pos_reopen_order`, `precheck_at`, защита от двойной оплаты | **не применена** |
| 0014 | `20261005000400_public_menu` | `public_menu()` для гостевого меню | **не применена** |

0011–0014 применять до мержа `ux/v3` в `main` (старые клиенты совместимы: новые поля необязательны, `precheckAt` без ключа не трогается).
