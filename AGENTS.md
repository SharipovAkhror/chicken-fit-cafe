# AGENTS.md — единственный источник правил для агентов и разработчиков

Касса (POS) кафе Chicken Fit, Самарканд. Прод: https://chicken-fit-cafe.vercel.app (`/pos`, `/kds`, `/backup`, гостевое меню `/`).
Язык общения с владельцем — русский. Деньги — целые сумы (UZS). Время бизнеса — Asia/Samarkand (UTC+5).

## Стек
Next.js 16 (App Router, React 19) · TypeScript · Tailwind 4 (только гостевое меню) + свой CSS кассы ·
Dexie/IndexedDB (офлайн) · Supabase Postgres 17 (RPC security definer, RLS) · Vercel · lucide-react · Vitest · Playwright.

## Карта кода
| Путь | Что |
|---|---|
| `app/` | маршруты: `pos`, `kds`, `backup`, `api/keepalive`, `/`, `uz`, `en` (гостевое меню) |
| `features/pos` | экраны кассы: столы, заказ, оплата, меню/столы (admin), смена, отчёты, история, печать |
| `features/kitchen` | экран кухни (KDS) |
| `features/rescue` | перенос данных старой кассы v1 из localStorage (только чтение ключей) + бэкап |
| `features/app/runtime.tsx` | сессия, движок синхронизации, контекст |
| `features/ui` | `v2.css` — дизайн-система кассы (токены, компоненты, движение); `brand-tokens.css` — бренд для гостевого меню |
| `data/` | `local-db` (Dexie `cf2`), `api` (RPC), `outbox` (очередь мутаций), `sync` (pull/realtime), `mappers` |
| `domain/` | чистая логика без I/O: корзина, вес/цена, гарниры, товары, заказ, деньги, id |
| `components/menu`, `lib/` | гостевое меню (QR) и его утилиты |
| `content/menu.json` | базовое меню: сид для кассы до первой синхронизации и запасной вариант гостевого меню |
| `supabase/migrations` | схема (версионные, аддитивные); `supabase/tests` — SQL-тесты и `run-local.sh` |
| `tests/unit`, `tests/integration`, `tests/e2e` | Vitest; импорт legacy на Postgres; Playwright smoke (мок RPC) |
| `docs/` | `architecture.md`, `data-model.md`, `migrations.md`, `release.md`, `design-system.md` |

## Поток данных
UI → `domain` → запись в IndexedDB → `outbox` (идемпотентный `mutation_id`) → RPC `pos_apply_mutation` →
триггер шлёт сигнал `cf-sync` → другие устройства делают `pos_pull` → IndexedDB → UI (`useLiveQuery`).
Касса работает без сети; отчёты (`report_shift`, `report_sales`) считаются только на сервере.

## Инварианты (нарушать нельзя)
1. **Никогда не удалять и не изменять ключи localStorage старой версии** (`chickenfit*`, `cf-*`, `cf_*`). Их только читает `features/rescue`.
2. **БД меняется только новой версионной миграцией** в `supabase/migrations/` — аддитивно и идемпотентно (повторный прогон без ошибок).
   Перед применением: `npm run test:migrations` (локальный PG) и CI job `migrations`. Старые клиенты должны продолжать работать.
3. Клиент не пишет в таблицы напрямую: RLS закрыт, вся запись — RPC с PIN-сессией. Публично читаются только меню и столы.
4. **Секретов в репозитории нет.** В клиенте — только publishable key Supabase (`.env.local`, Vercel env). Service role не используется.
5. Ручная цена позиции: `price ≠ originalPrice`; сервер пишет аудит `order_events.type='price_override'`.
6. Иконки — только lucide (stroke 1.75); цвета — только токены из `features/ui/v2.css`; контраст ≥ WCAG AA.
7. Анимации 120/180/240 мс ease-out, не блокируют кассира, отключаются при `prefers-reduced-motion`.
8. Merge в `main` = прод-деплой. Только с явного согласия владельца.

## Команды
```bash
npm ci
npm run dev                 # http://localhost:3000/pos (нужен .env.local, см. .env.example)
npm run check               # lint (0 warnings) + typecheck + unit + build
npm run test:migrations     # миграции дважды + SQL-тесты на локальном Postgres (sudo, БД cf_migration_test)
npm run test:pg             # импорт legacy на том же локальном Postgres
npm run build && npx next start -p 3100 &  npm run test:e2e   # smoke, мок RPC, скриншоты в $SHOTS
```
`tests/e2e/real-supabase-readonly.mjs` — только чтение на реальной БД (вход/pull/отчёты/выход).
`tests/e2e/real-supabase-e2e.mjs` — пишет в реальную БД под тестовым сотрудником (`staff.is_test`, `source='dev_test'`); запускать только осознанно.

## Открытые задачи
Открытые задачи — GitHub Issues (метки `design`, `owner`, `feature`, `security`); TODO-списки в репозитории не держать.
Задача закрывается сама: в коммите или PR в `main` пишется `Closes #N`. Задачи `owner` без кода закрывает владелец вручную.

## Релиз и откат
Ветка → PR/CI зелёный (lint, types, unit, build, migrations, e2e) → миграции применить в Supabase (до деплоя) →
`main` (ff) → Vercel собирает прод → проверить `/api/keepalive` 200, `/pos`, `/kds`, `/backup`.
Откат — Vercel Instant Rollback на предыдущий прод-деплой (id в `docs/release.md`). Миграции аддитивные — откат кода их не требует.
