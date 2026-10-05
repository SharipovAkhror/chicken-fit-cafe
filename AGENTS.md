# AGENTS.md — точка входа для любого агента или разработчика

Касса (POS) кафе Chicken Fit, Самарканд. Прод: https://chicken-fit-cafe.vercel.app (`/pos`, `/kds`, `/backup`, гостевое меню `/`).
Язык общения с владельцем — русский. Деньги — целые сумы (UZS). Время бизнеса — Asia/Samarkand (UTC+5).
Проект ведётся только средствами из этого репозитория и аккаунтов владельца (GitHub, Vercel, Supabase) — стандартными CLI и дашбордами.

## Где что лежит
| Что | Где |
|---|---|
| Код, CI, задачи | GitHub `SharipovAkhror/chicken-fit-cafe`: ветка `main`, Actions, Issues |
| Хостинг | Vercel: team `akhrors-projects-fc8c3afa`, проект `chicken-fit-cafe` (`prj_TWBQgZ4iXmABwJF3nQIVCSKjdZT7`), Node 24.x, функции `iad1` |
| Прод-URL | https://chicken-fit-cafe.vercel.app (push в `main` = прод-деплой через Vercel Git integration) |
| БД | Supabase: проект `chickenfit`, ref `ikvontqurgzopdmsdmla`, регион `eu-central-1` (Frankfurt), Postgres 17 |
| Переменные окружения и секреты | только имена — [`docs/setup.md`](docs/setup.md#переменные-окружения-и-секреты) |

## Документация
| Файл | Когда читать |
|---|---|
| [`docs/setup.md`](docs/setup.md) | установка с нуля, env-переменные по окружениям, тесты, локальный Postgres |
| [`docs/architecture.md`](docs/architecture.md), [`docs/data-model.md`](docs/data-model.md) | как устроены синхронизация, офлайн, схема БД |
| [`docs/migrations.md`](docs/migrations.md) | изменение схемы БД и применение миграций в прод |
| [`docs/release.md`](docs/release.md) | деплой, проверка, откат, текущая цель отката, журнал деплоев |
| [`docs/operations.md`](docs/operations.md) | runbook'и: утро, сбой синхронизации, восстановление из бэкапа, смена PIN, тестовый сотрудник |
| [`docs/design-system.md`](docs/design-system.md) | токены, компоненты, движение |
| [`SECURITY.md`](SECURITY.md) | PIN, RLS, ключи, что делать при утечке |

## Стек
Next.js 16 (App Router, React 19) · TypeScript · Tailwind 4 (только гостевое меню) + свой CSS кассы ·
Dexie/IndexedDB (офлайн) · Supabase Postgres 17 (RPC security definer, RLS) · Vercel · lucide-react · Vitest · Playwright.

## Карта кода
| Путь | Что |
|---|---|
| `app/` | маршруты: `pos`, `kds`, `backup`, `api/keepalive`, `/`, `uz`, `en` (гостевое меню) |
| `features/pos` | экраны кассы: план зала (`TablesView`), заказ, оплата, отмена/возобновление (`OrderActions`), меню и фото блюд (`MenuAdminView`, `photo.ts`), смена, отчёты, история, настройки (печать, тема, столы, бэкап), печать |
| `features/kitchen` | экран кухни (KDS) |
| `features/rescue` | перенос данных старой кассы v1 из localStorage (только чтение ключей) + бэкап/восстановление JSON |
| `features/app/runtime.tsx` | сессия, движок синхронизации, контекст |
| `features/ui` | `pos.css` — дизайн-система кассы v3 (область `.pos`); `brand-tokens.css` — бренд гостевого меню |
| `data/` | `local-db` (Dexie `cf2`), `api` (RPC), `outbox` (очередь мутаций), `sync` (pull/realtime), `mappers`, `online` (только онлайн: фото в Storage, PIN админа, возобновление) |
| `domain/` | чистая логика без I/O: корзина, вес/цена, гарниры, товары, заказ, деньги, id |
| `components/menu`, `lib/` | гостевое меню (QR) и его утилиты |
| `content/menu.json` | базовое меню: сид для кассы до первой синхронизации и запасной вариант гостевого меню |
| `supabase/migrations`, `supabase/tests` | схема (версионные, аддитивные миграции); SQL-тесты и `run-local.sh` |
| `tests/unit`, `tests/integration`, `tests/e2e` | Vitest; импорт legacy на Postgres; Playwright smoke (мок RPC) и прод-проверки |
| `.github/workflows` | `ci.yml` (check, migrations, e2e), `supabase-keepalive.yml` |

## Поток данных
UI → `domain` → запись в IndexedDB → `outbox` (идемпотентный `mutation_id`) → RPC `pos_apply_mutation` →
триггер шлёт сигнал `cf-sync` → другие устройства делают `pos_pull` → IndexedDB → UI (`useLiveQuery`).
Касса работает без сети; отчёты (`report_shift`, `report_sales`) считаются только на сервере.

## Инварианты (нарушать нельзя)
1. **Никогда не удалять и не изменять ключи localStorage старой версии** (`chickenfit*`, `cf-*`, `cf_*`) и IndexedDB `cf2`. Их только читает `features/rescue`.
2. **БД меняется только новой версионной миграцией** в `supabase/migrations/` — аддитивно и идемпотентно. Перед прод: `npm run test:migrations` и CI job `migrations`. Старые клиенты должны продолжать работать.
3. Клиент не пишет в таблицы напрямую: RLS закрыт, вся запись — RPC с PIN-сессией. Публично читаются только меню и столы.
4. **Секретов в репозитории нет.** В клиенте — только publishable key Supabase. Service role и пароль БД в код и Vercel не попадают.
5. Ручная цена позиции: `price ≠ originalPrice`; сервер пишет аудит `order_events.type='price_override'`.
6. Иконки — только lucide (stroke 1.75); цвета — только токены из `features/ui/pos.css`; контраст ≥ WCAG AA; touch-цели ≥ 44 px;
   одно главное (терракотовое) действие на экран. Правила — [`docs/design-system.md`](docs/design-system.md).
7. Анимации 120/180/240 мс ease-out, не блокируют кассира, отключаются при `prefers-reduced-motion`.
8. **Оплата закрывает заказ** (`domain/order.ts`: `isActive` = не отменён и не оплачен, `statusAfterPayment`): стол сразу свободен,
   оплаченный заказ показывается «Закрыт», кухонный экран показывает `sent` только неоплаченные. Кухонным экраном кафе может не пользоваться.
9. **Печать — только по выбору кассира.** При оплате по умолчанию печатается только чек; бегунок — галочкой (выкл. по умолчанию,
   запоминается на устройстве) или кнопкой «Кухня»; «Пречек» — отдельная кнопка. Метрики ленты — как в v1 (печатали правильно на
   принтере кафе): разметка `features/pos/receipt-v1.tsx`, CSS `#receipt-print-wrapper` в `app/globals.css` (80 мм → 72 мм, Courier New 11px).
   Не менять без печати на реальном принтере.
11. **Отмена и возобновление оставляют след** (0013): отмена — только мутация `order.cancel` с причиной (`order_events 'cancelled'/'merged'`);
   кассир сам отменяет только неотправленный заказ без выданного счёта, иначе — одноразовый PIN админа (`pos_manager_approve`).
   Возобновить оплаченный — только онлайн, в открытую смену заказа, админ или кассир с PIN админа (`pos_reopen_order`): оплата сторнируется
   (`reopen_paid_*`), повторная оплата берёт разницу и несёт `reopenedAt` — старые офлайн-оплаты сервер игнорирует (нет двойной оплаты).
12. **Фото блюд — только Storage `menu-photos` по талонам** (0012): клиент сжимает (WebP ≤ 800 px, ≤ 150 КБ, без EXIF), берёт талон
   `pos_photo_ticket`, грузит файл и миниатюру `-t`; старое фото удаляется через `pos_photo_release` после синхронизации. Base64 в БД — запрещён (CHECK).
10. Merge в `main` = прод-деплой; изменения прод-БД, деплой и откат — только с явного согласия владельца.

## Команды
```bash
nvm use && npm ci && cp .env.example .env.local   # Node из .nvmrc; значения env — см. docs/setup.md
npm run dev                 # http://localhost:3000/pos
npm run check               # lint (0 warnings) + typecheck + unit + build — то же, что CI job `check`
npm run test:migrations && npm run test:pg   # локальный Postgres 17, см. docs/setup.md
npm run test:e2e            # smoke с моком RPC; нужен `npm run build && npx next start -p 3100`
```

## Открытые задачи
Только GitHub Issues (`gh issue list`; метки `design`, `owner`, `feature`, `security`); TODO-списки в репозитории не держать.
Задача закрывается коммитом или PR в `main` с `Closes #N`. Задачи `owner` без кода закрывает владелец вручную.

## Релиз и откат (кратко)
Ветка → PR → CI зелёный → миграции в Supabase (до мержа) → согласие владельца → `main` → Vercel собирает прод → проверка.
Откат — Vercel Instant Rollback (`vercel rollback`). Подробно и текущая цель отката — [`docs/release.md`](docs/release.md).
