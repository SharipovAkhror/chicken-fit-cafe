# Эксплуатация (runbook'и)

SQL выполнять в Supabase → SQL Editor или `psql "$DATABASE_URL"` ([`setup.md`](setup.md#переменные-окружения-и-секреты)).
Любые записи в прод-БД — только с согласия владельца. PIN не писать в issues, коммиты, чаты; SQL Editor хранит
историю запросов — запрос с PIN после выполнения удалить или использовать `psql`.

## Утренний чек-лист (до первого заказа)
1. `curl -fsS https://chicken-fit-cafe.vercel.app/api/keepalive` → `{"status":"ok"}`. Иначе — «Сбой синхронизации» ниже.
2. На кассе: перезагрузить вкладку `/pos`, в шапке «Синхронизировано»; «Бэкап» → «Скачать бэкап (JSON)» → сохранить вне устройства.
3. Вчерашние смены закрыты (Z-отчёт), открытых старше сегодняшнего дня нет:
   ```sql
   select number, business_date, cashier_name, opened_at from shifts where status = 'open' order by opened_at;
   select max(applied_at) as last_sync from applied_mutations;
   ```
4. Keepalive в GitHub зелёный: `gh run list --workflow supabase-keepalive.yml -L 3`.
Первичная сверка переноса с v1 — issue #5.

## «Заказ не закрывается» / стол занят после оплаты
С 04.10.2026 оплата сама закрывает заказ и освобождает стол. Если стол всё ещё занят — перезагрузить вкладку `/pos` (старая версия
в памяти). Проверка, что оплаты дошли до сервера:
```sql
select number, status, payment_status, paid_at from orders where business_date = current_date order by created_at desc limit 20;
```
Оплаченные заказы со статусом `sent` (созданные до фикса) касса и отчёты считают закрытыми; выручка учитывается по `payment_status='paid'`.

## Мелкий/неверный шрифт на чеке
Метрики чека — как в v1 (`app/globals.css`, `#receipt-print-wrapper`). Проверить ширину ленты в шапке кассы (кнопка «80mm/58mm»)
и в диалоге печати браузера: масштаб 100 %, поля «Нет», без колонтитулов.
Чек 72 мм печатается по центру листа (на ленте 80 мм — поля по 4 мм, внутри ещё 2 мм), поэтому правый край не уходит
за печатную зону, даже если драйвер отдаёт лист 80 мм. Проверка без принтера:
`npm run build && RECEIPT_OUT=/tmp/rc npx vitest run tests/unit/receipt-fixtures.test.ts && node tests/e2e/receipt-render.mjs /tmp/rc test-results/receipts`
— PNG 203 dpi (как у термопринтера) для листа 80 и 72 мм: длинные названия, крупные суммы, гарнир, весовое блюдо, кухня, Z-отчёт.

## Сбой синхронизации
Индикатор в шапке кассы: «Синхронизировано» · «Отправка · N» · «Офлайн · в очереди N» (нет сети или ошибка — текст во всплывающей
подсказке) · «Ошибка синхр.: N — повторить» (сервер отклонил изменения) · «Только локально» (в сборке нет env Supabase).
1. **Ничего не очищать**: не чистить данные сайта, не переустанавливать браузер. Касса продолжает работать офлайн, всё лежит в IndexedDB `cf2`.
2. Сначала бэкап: «Бэкап» → «Скачать бэкап (JSON)» (или `/backup` без PIN).
3. `curl -s https://chicken-fit-cafe.vercel.app/api/keepalive`:
   - `503 Supabase env missing` → проверить env Production в Vercel (`vercel env ls`), задать и передеплоить;
   - `502` / таймаут → Supabase: Dashboard → статус проекта (на паузе → Restore project), https://status.supabase.com, Logs → Postgres;
   - `200` → проблема на устройстве: сеть, затем кнопка «Ошибка синхр. — повторить»; сессия истекла → выйти и войти по PIN.
4. Повторная «Ошибка синхр.» → текст ошибки в DevTools Console кассы и Supabase → Logs (функция `pos_apply_mutation`); если началось после
   деплоя — откат ([`release.md`](release.md#откат)), очередь сохранится и уйдёт после исправления.
5. Готово, когда индикатор «Синхронизировано», а `max(applied_at)` свежий.

## Восстановление из JSON-бэкапа
Файл `chickenfit-backup-*.json` (формат `chickenfit-backup/1`): снимки localStorage v1 + заказы, смены и очередь v2 устройства.
1. Открыть `/pos` на нужном устройстве (можно новом), войти по PIN → «Бэкап» → «Загрузить бэкап» → выбрать файл.
2. Снимки v1 попадают в IndexedDB и импортируются обычным идемпотентным путём; заказы v2, которых нет локально, ставятся в очередь
   с детерминированным `mutationId` — повторная загрузка того же файла дублей не создаёт.
3. Проверить индикатор и сверку по дням в «Бэкап»; в БД — запросы из [`release.md`](release.md#перенос-с-v1-выполнен-03102026-путь-спасения-остаётся-в-коде).

Снимок всей БД (вне репозитория, хранить приватно): `pg_dump "$DATABASE_URL" -n public --data-only -f cf-$(date +%F).sql`.
Бэкапы на стороне Supabase — Dashboard → Database → Backups (зависят от тарифа).

## Смена PIN
PIN — 4–8 цифр, **уникален среди активных сотрудников** (вход ищет сотрудника по PIN). Сначала задача #4: сид-PIN открыты в
`supabase/migrations/20261003000700_seed_reference.sql`.
```sql
begin;
update public.staff set pin_hash = extensions.crypt('<НОВЫЙ_PIN>', extensions.gen_salt('bf', 10))
 where name = '<Имя, напр. Кассир 1>' and is_active;                                   -- ожидается UPDATE 1
select count(*) from public.staff where is_active and pin_hash = extensions.crypt('<НОВЫЙ_PIN>', pin_hash);  -- должно быть 1
delete from public.staff_sessions where staff_id in (select id from public.staff where name = '<Имя>');      -- выход на всех устройствах
commit;
```
Новый сотрудник: `insert into public.staff(name, role, pin_hash) values ('<Имя>', 'cashier'|'kitchen'|'admin', extensions.crypt('<PIN>', extensions.gen_salt('bf', 10)));`
Уволить — не удалять (на него ссылаются заказы): `update public.staff set is_active = false where name = '<Имя>';` + удалить его `staff_sessions`.

## Тестовый сотрудник
Для `tests/e2e/real-supabase-e2e.mjs`: его записи получают `source='dev_test'` и не попадают в отчёты; доступны только заказы и смены.
```sql
insert into public.staff(name, role, pin_hash, is_test)
values ('Тест E2E', 'cashier', extensions.crypt('<TEST_PIN>', extensions.gen_salt('bf', 10)), true);
```
После прогона — удалить всё, что он создал:
```sql
begin;
create temp table t as select id from public.staff where name = 'Тест E2E' and is_test;
create temp table d as select distinct device_id from public.staff_sessions where staff_id in (select id from t);
delete from public.orders where created_by in (select id from t);            -- позиции и события удаляются каскадом
delete from public.order_events where staff_id in (select id from t);
delete from public.shifts where opened_by in (select id from t);
delete from public.applied_mutations where staff_id in (select id from t);
delete from public.login_attempts where device_id in (select device_id from d);
delete from public.staff where id in (select id from t);                     -- сессии удаляются каскадом
commit;
```
