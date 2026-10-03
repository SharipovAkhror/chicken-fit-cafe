# Правила для AI-агентов и разработчиков

Репозиторий — касса (POS) кафе Chicken Fit, Самарканд. Next.js 16 + Supabase (Postgres 17) + IndexedDB (Dexie).

## Главное
1. **Данные кафе важнее всего.** Никогда не удалять и не изменять ключи localStorage старой версии
   (`chickenfit*`, `cf-*`, `cf_*`) — их только читает `features/rescue`.
2. **Схема БД меняется только миграциями** в `supabase/migrations/` (аддитивно, идемпотентно).
   Перед применением — прогон на локальном Postgres: `supabase/tests/run-local.sh` (и CI job `migrations`).
3. Клиент не имеет прямого доступа к таблицам (RLS). Вся запись — RPC `pos_apply_mutation` с PIN-сессией
   и идемпотентным `mutation_id`. Отчёты считаются только на сервере (`report_shift`, `report_sales`).
4. Касса работает офлайн: запись сначала в IndexedDB, затем через outbox (`data/outbox.ts`).
5. Деньги — целые сумы (UZS), без копеек. Время бизнеса — Asia/Samarkand (UTC+5).
6. Прод-деплой и merge в `main` — только с явного согласия владельца.

## Структура
- `app/` — маршруты: `/pos` касса, `/kds` кухня, `/backup` аварийный бэкап, `/`, `/uz`, `/en` гостевое меню (только просмотр)
- `features/` — экраны (`pos`, `kitchen`, `rescue`, `app`), `data/` — локальная БД, RPC, outbox, sync, `domain/` — чистая логика
- `supabase/migrations` — схема, `supabase/tests` — локальные тесты миграций
- `docs/` — оборудование, печать, ADR

## Проверка перед коммитом
`npm run lint && npm run typecheck && npm test && npm run build`
(+ `npm run test:pg` после `supabase/tests/run-local.sh`, + `npm run test:e2e` на запущенном `next start -p 3100`).
