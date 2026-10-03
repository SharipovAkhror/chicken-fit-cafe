# Переход v1 → v2 (runbook)

Делать только после закрытия кафе и с согласия владельца. Ровно **один** прод-деплой.

## Перед деплоем
1. CI на `rebuild/v2` зелёный (lint, typecheck, test, build, миграции на Postgres 17), preview READY.
2. Миграции `v2_0001…v2_0008` уже применены в Supabase (аддитивно; v1 Supabase не использует).

## Деплой
1. Vercel → Environment Variables → **только Production**:
   `NEXT_PUBLIC_SUPABASE_URL=https://ikvontqurgzopdmsdmla.supabase.co`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…`.
   Не пересобирать старую сборку v1 с этими переменными.
2. `git checkout main && git merge --ff-only rebuild/v2 && git push origin main pre-v2` → Vercel собирает прод.
3. Проверка прода: `/api/keepalive` → 200, `/pos` → экран PIN, `/backup` открывается.

## Утро, первое открытие кассы (POS-устройство)
1. **Перезагрузить** вкладку кассы (если старая v1 осталась открытой — она продолжает работать на старом коде).
2. При открытии v2 сразу (до PIN) делается снимок данных старой кассы → IndexedDB → сервер (`legacy_snapshots`).
3. Желательно: раздел «Бэкап» → «Скачать бэкап (JSON)» (файл сохранить).
4. Войти по PIN → импорт заказов/смен/меню идёт сам; в «Бэкап» сверка по дням должна стать «совпадает».
5. Открыть смену и работать. Старая открытая смена v1 (если была) помечена — закрыть её.

## Проверка в Supabase (SQL)
```sql
select count(*), max(received_at) from legacy_snapshots;
select business_date, count(*), sum(total_amount) from orders where source = 'legacy_rescue' group by 1 order by 1;
select import_report->'verify' from legacy_snapshots order by received_at desc limit 1;
```

## Откат
Instant Rollback в Vercel на `dpl_DtNZzsEdt2aSZUtMJ9pT7aH8Vayj` (v1, коммит `cde9b97`).
v1 продолжит работать: legacy-ключи localStorage v2 не изменяет. Заказы, созданные в v2 до отката,
останутся в Supabase и IndexedDB, но в v1 видны не будут.

## E2E на реальной базе (без следа в отчётах)
Временный сотрудник `staff.is_test=true` (его заказы и смены пишутся с `source='dev_test'`, не попадают в отчёты и pull реальных сотрудников):
`TEST_PIN=… BASE=http://localhost:3100 node tests/e2e/real-supabase-e2e.mjs`. После прогона удалить его заказы
(`orders.created_by`), смены (`shifts.opened_by`), `applied_mutations.staff_id`, `login_attempts` его устройств и самого сотрудника.

## v2.1 / v2.2 (ветка `ux/v2.1`) — перед мержем в main
- `v2_0009_product_kinds` — **уже применена** в Supabase (колонки `menu_items.kind/options`; старые клиенты совместимы).
- `20261003001000_price_override_audit.sql` (`v2_0010`) — **ещё НЕ применена**. Применить при мерже (до деплоя прода):
  аудит ручной цены → `order_events.type = 'price_override'`. Вызов аудита в `_upsert_order` обёрнут в
  `exception when others` — сбой аудита не может сорвать запись заказа. Без неё v2.1 работает, но аудита нет.
