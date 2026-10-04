# Архитектура (v2)

## Слои
```
app/ (маршруты)  →  features/* (экраны, React)  →  domain/* (чистые функции)
                          │
                          ▼
                 data/local-db (Dexie «cf2», IndexedDB)  ⇄  data/outbox  →  data/api (RPC Supabase)
                          ▲                                                   │
                          └──────── data/sync (pos_pull) ◀── realtime «cf-sync» ┘
```
- **Офлайн прежде всего.** Любое действие сразу пишется в IndexedDB и отображается (`useLiveQuery`).
  Мутация кладётся в `outbox` с уникальным `mutationId`; `flushOutbox` отправляет её в `pos_apply_mutation`
  (повтор с backoff до 60 с; сервер дедуплицирует по `applied_mutations`).
- **Синхронизация** (`data/sync.ts`): после локальной записи (debounce), по broadcast-сигналу `cf-sync`
  (триггеры БД, без персональных данных), polling 15 с, при `online` и возврате на вкладку → `pos_pull(since)`.
- **Сервер** — только Postgres-функции `security definer`. PIN проверяется в БД (bcrypt), клиент получает
  случайный токен (в БД — sha256). Таблицы закрыты RLS; анонимно читаются только `categories`, `menu_items`, `dining_tables`.
- **Отчёты** (`report_shift`, `report_sales`) считаются только на сервере; записи `source='dev_test'` в них не попадают.

## Роли
`admin` — всё, включая столы и отчёты; `cashier` — заказы, оплата, смены, меню (`menu.upsert`); `kitchen` — KDS.

## Маршруты
| Маршрут | Код | Примечание |
|---|---|---|
| `/pos` | `features/pos/PosApp.tsx` | столы → заказ → оплата; меню/столы (admin), смена, отчёты, история, бэкап |
| `/kds` | `features/kitchen/KitchenView.tsx` | очередь кухни, смена статусов `order.set_status` |
| `/backup` | `features/rescue/RescuePanel.tsx` | скачать JSON всего, что есть на устройстве, без PIN |
| `/api/keepalive` | `app/api/keepalive/route.ts` | пинг Supabase (Vercel cron + GitHub Action) |
| `/`, `/uz`, `/en` | `components/menu/*`, `lib/menu.ts` | гостевое меню, только просмотр |

## Касса: ключевые сценарии
- **Товары** (`domain/product.ts`): `kind` = `portion | weighted | with_side | side_mix`, `options` = варианты/добавки без доплаты.
- **Строка чека** (`domain/cart.ts`): `price` — цена за строку единицы, `originalPrice` — по меню; для весовых
  `weightKg`, `pricePerKg`, `listPricePerKg`. `weighLine()` пересчитывает вес/сумму/цену за кг.
  Ручная цена = `price ≠ originalPrice` → серверный аудит `price_override`.
- **Гарниры** (`domain/garnish.ts`): смесь до 3 гарниров с долями; доли хранятся в `garnishMix` и `notes`.
- **Оплата** (`features/pos/actions.ts` → `pay()`): заказ сразу `paid` и закрыт (`completed`; если кухня уже нажала «Начать» —
  остаётся `cooking/ready` до «Выдано»). Стол освобождается, касса показывает «Заказ №N оплачен и закрыт · Стол X свободен».
- **Печать** (`features/pos/print.tsx`, разметка `receipt-v1.tsx`, CSS v1 в `app/globals.css`): чек, пречек, бегунок, X/Z — через
  `window.print()`, одно задание = один диалог. Лента 80/58 мм; по умолчанию — настройка v1 устройства
  (`chickenfit-pos-paper-width`, только чтение), иначе 80 мм. При оплате — только то, что отмечено (чек — вкл., бегунок — выкл.).
- **Номер заказа** выдаётся при первом сохранении на сервер (кухня, пречек или оплата); до этого заказ — черновик стола.

## Перенос со старой кассы (v1)
v1 хранила всё в localStorage. При каждом открытии v2 до входа (`features/rescue/RescueBoot.tsx`):
снимок всех ключей `chickenfit*`/`cf-*`/`cf_*` → IndexedDB (`rescue`) → сервер (`rescue_store_snapshot`).
После входа по PIN — идемпотентный импорт (`legacy.shift`, `legacy.menu`, `legacy.order`, `source='legacy_rescue'`)
и сверка по дням (`rescue_verify`, раздел «Бэкап»). Ключи v1 только читаются — никогда не изменяются и не удаляются.

## Ключевые решения
- Supabase через RPC, а не прямые запросы к таблицам: одна точка проверки прав и идемпотентности.
- IndexedDB вместо localStorage: объём, транзакции, `useLiveQuery`; localStorage v1 остаётся нетронутым как страховка.
- Свой небольшой CSS для кассы (`features/ui/v2.css`) вместо UI-кита: крупные touch-цели, предсказуемая производительность на слабом планшете.
- Гостевое меню — отдельная часть (Tailwind, `brand-tokens.css`); читает `content/menu.json`, а при наличии
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` — живое меню из БД (`lib/menu.ts#getLiveMenu`; в проде переменная не задана).
