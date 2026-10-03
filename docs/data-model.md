# Модель данных

## Supabase (Postgres 17, проект `ikvontqurgzopdmsdmla`)
| Таблица | Назначение |
|---|---|
| `categories`, `menu_items` | меню (`kind`, `options`, `unit`, `price_per_kg`, `is_kitchen`, `needs_review`, `is_deleted`); публичное чтение |
| `menu_item_history` | история правок меню |
| `dining_tables` | столы (зона, места, порядок); публичное чтение |
| `orders`, `order_items` | заказы и строки (`price`, `original_price`, `weight_kg`, `price_per_kg`, `garnish_mix`, `notes`) |
| `order_events` | журнал заказа: `created`, `status`, `paid`, `cancelled`, `price_override` |
| `shifts` | смены (наличные на начало/факт, статус) |
| `staff`, `staff_sessions`, `login_attempts` | сотрудники (`role`, `pin_hash`, `is_test`), токены (sha256), защита от перебора |
| `applied_mutations` | идемпотентность: `mutation_id` → результат |
| `legacy_snapshots` | снимки localStorage v1 + отчёт импорта |

`orders.source`: `pos` (касса v2), `legacy_rescue` (импорт v1), `dev_test` (тестовый сотрудник; не в отчётах и не в pull).

## RPC (все `security definer`, доступ по токену сессии)
- `pos_login(pin, device)`, `pos_logout(token)`, `pos_pull(token, since)`
- `pos_apply_mutation(token, mutation_id, kind, payload)`, где `kind`:
  `order.upsert`, `order.set_status`, `shift.upsert`, `menu.upsert` (admin, cashier), `table.upsert` (admin),
  `legacy.order`, `legacy.shift`, `legacy.menu`
- `report_shift`, `report_sales` — отчёты; `rescue_store_snapshot`, `rescue_verify`, `rescue_save_report` — перенос v1
- Внутренние (`_upsert_order`, `_audit_price_overrides`, `_session_staff`, …) клиенту недоступны.

## Устройство (IndexedDB `cf2`, `data/local-db.ts`)
| Store | Ключ / индексы |
|---|---|
| `kv` | `key` — сессия, настройки, отметки пречека (`precheck:<orderId>`) |
| `menu`, `categories`, `diningTables` | справочники из `pos_pull` (до первой синхронизации — из `content/menu.json`) |
| `orders` | `id, createdAt, status, tableId, shiftId, updatedAt`; поле `dirty` — есть неотправленные изменения |
| `shifts` | `id, openedAt, status` |
| `outbox` | `++seq, &mutationId, entityId, nextAttemptAt` |
| `rescue` | снимки localStorage v1 (`sha256, capturedAt`) |

## localStorage
Ключи v1 (`features/rescue/legacy-keys.ts`, префиксы `chickenfit`, `cf-`, `cf_`) — **только чтение**.
Собственные ключи v2 — с префиксом `cf2_`.
