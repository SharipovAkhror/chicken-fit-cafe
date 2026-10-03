# Chicken Fit — касса

Касса кафе Chicken Fit (Самарканд): столы, заказы (порции, на вес, гарниры), оплата наличными / Click·Payme,
печать чеков 58/80 мм, экран кухни, смены с X/Z-отчётами, отчёты продаж, гостевое меню по QR.
Работает офлайн и синхронизируется через Supabase.

| Путь | Что |
|---|---|
| `/pos` | касса (вход по PIN) |
| `/kds` | экран кухни (PIN) |
| `/backup` | JSON-бэкап данных устройства без PIN |
| `/`, `/uz`, `/en` | гостевое меню |

```bash
npm ci
cp .env.example .env.local   # URL проекта Supabase и publishable key
npm run dev                  # http://localhost:3000/pos
npm run check                # lint + typecheck + unit + build
```

Правила, архитектура, команды и релиз — [AGENTS.md](AGENTS.md); подробности — [`docs/`](docs).
