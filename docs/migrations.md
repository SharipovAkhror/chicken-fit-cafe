# Миграции БД

## Правила
1. Новый файл `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`; старые файлы не редактировать.
2. Только аддитивно: новые таблицы/колонки/индексы/функции, `create or replace`, `if not exists`, `on conflict do nothing`.
   Ничего не удалять и не переименовывать, пока это читает прод-клиент.
3. Идемпотентно: двойной прогон без ошибок (это проверяют `run-local.sh` и CI).
4. Тест на каждую миграцию: `supabase/tests/0N_tests_*.sql` (подхватывается автоматически по маске `0[2-9]_*.sql`).
5. Новые функции — `revoke … from public, anon, authenticated`, наружу только через `pos_*`/`report_*`/`rescue_*`.
6. Применять в Supabase **до** деплоя кода, который на них опирается (коннектор Supabase `apply_migration` или SQL Editor),
   имя миграции в Supabase — `v2_00NN_<name>`.

## Проверка
```bash
sudo service postgresql start
npm run test:migrations   # stub Supabase → фикстура прод-схемы → все миграции → повтор → SQL-тесты
npm run test:pg           # импорт legacy-фикстуры через pos_apply_mutation на той же БД
```

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
