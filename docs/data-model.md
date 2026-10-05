# Модель данных

## Supabase (Postgres 17, проект `ikvontqurgzopdmsdmla`)
| Таблица | Назначение |
|---|---|
| `categories`, `menu_items` | меню (`kind`, `options`, `unit`, `price_per_kg`, `is_kitchen`, `needs_review`, `is_deleted`); публичное чтение |
| `menu_item_history` | история правок меню |
| `dining_tables` | столы (зона, места, порядок); публичное чтение |
| `orders`, `order_items` | заказы и строки (`price`, `original_price`, `weight_kg`, `price_per_kg`, `garnish_mix`, `notes`) |
| `order_events` | журнал заказа: `created`, `status`, `paid`, `cancelled`, `merged`, `reopened`, `price_override` (payload ≤ 16 КБ) |
| `orders.precheck_at`, `reopened_at`, `reopen_paid_amount/method` | «Счёт выдан» и сторно при возобновлении (0013) |
| `manager_approvals` | одноразовые подтверждения PIN админа (отмена/возобновление, 15 мин; чистка 90 дн.) |
| `photo_tickets` | талоны на запись/удаление фото в Storage (10 мин) |
| `app_meta` | служебные отметки (время последней уборки `housekeeping`) |
| Storage `menu-photos` | фото блюд: public read, ≤ 512 КБ, только webp/jpeg/png, запись/удаление только по талону |
| `shifts` | смены (наличные на начало/факт, статус) |
| `staff`, `staff_sessions`, `login_attempts` | сотрудники (`role`, `pin_hash`, `is_test`), токены (sha256), защита от перебора |
| `applied_mutations` | идемпотентность: `mutation_id` → результат |
| `legacy_snapshots` | снимки localStorage v1 + отчёт импорта |

`orders.source`: `pos` (касса v2), `legacy_rescue` (импорт v1), `dev_test` (тестовый сотрудник; не в отчётах и не в pull).

## RPC (все `security definer`, доступ по токену сессии)
- `pos_login(pin, device)`, `pos_logout(token)`, `pos_pull(token, since)`
- `pos_apply_mutation(token, mutation_id, kind, payload)`, где `kind`:
  `order.upsert`, `order.set_status`, `order.cancel` (причина, `approvalId`, `mergedInto`), `shift.upsert`, `menu.upsert` (admin, cashier), `table.upsert` (admin),
  `legacy.order`, `legacy.shift`, `legacy.menu`
- `pos_manager_approve`, `pos_reopen_order`, `pos_photo_ticket`, `pos_photo_release` (0012–0013); `public_menu()` — гостевое меню (anon, 0014);
  `housekeeping()` — уборка старых служебных строк (anon, не чаще раза в 6 ч, вызывается `/api/keepalive`)
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

## Ограничения данных (0011) и free tier
CHECK (NOT VALID → VALIDATE): длины текстов (названия ≤ 120, заметки ≤ 2000…), цены 0…50 млн, `image_url` ≤ 500 и не `data:`,
`options` ≤ 4 КБ, `orders.items` — массив ≤ 64 КБ, payload событий ≤ 16 КБ, суммы ≥ 0, скидка 0…100, `paid ⇒ paid_at`.
Хранение: сессии — 7 дней после истечения, попытки входа — 30 дн., `applied_mutations` — 60 дн., история меню — 365 дн.
Free tier Supabase: БД 500 МБ, Storage 1 ГБ, egress 5 ГБ/мес. Фото: ~80–120 КБ + миниатюра ~12 КБ, кэш 1 год, касса грузит миниатюры.
