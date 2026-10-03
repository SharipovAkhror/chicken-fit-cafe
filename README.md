# Chicken Fit — касса

Касса кафе Chicken Fit (Самарканд): столы, заказы, оплата наличными/Click, печать чеков 58/80 мм,
экран кухни, смены с X/Z-отчётами, отчёты продаж, гостевое меню по QR.

## Запуск
```bash
npm ci
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                   # http://localhost:3000/pos
```
Без переменных Supabase касса работает «только локально» (вход по PIN недоступен).

## Маршруты
| Путь | Что |
|---|---|
| `/pos` | касса (PIN) |
| `/kds` | экран кухни (PIN) |
| `/backup` | скачать JSON-бэкап устройства без PIN |
| `/`, `/uz`, `/en` | гостевое меню |

## Данные
- Supabase: таблицы закрыты RLS, доступ только через RPC с PIN-сессией (`supabase/migrations`).
- Устройство: IndexedDB `cf2` (меню, заказы, смены, очередь изменений, снимки старой версии).
- Перенос со старой версии (v1, localStorage): при первом открытии снимок уходит в IndexedDB и на сервер,
  после входа по PIN заказы/смены/меню импортируются идемпотентно и сверяются по дням (раздел «Бэкап»).

## Проверки
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; миграции — `supabase/tests/run-local.sh`.
