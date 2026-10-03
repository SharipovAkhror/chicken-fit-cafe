# Установка, окружения, тесты

## С нуля (macOS / Linux)
```bash
git clone https://github.com/SharipovAkhror/chicken-fit-cafe.git && cd chicken-fit-cafe
nvm install && nvm use          # Node 24 (.nvmrc; package.json engines 24.x; так же в CI и Vercel)
npm ci
cp .env.example .env.local      # заполнить, см. ниже; без него касса работает в режиме «Только локально»
npm run dev                     # http://localhost:3000/pos
npm run check                   # lint (0 warnings) + typecheck + unit + build
```
Внимание: с реальными значениями в `.env.local` локальная касса пишет в **прод-БД**. Для экспериментов —
тестовый сотрудник ([`operations.md`](operations.md#тестовый-сотрудник)) или пустой `.env.local`.

CLI (по необходимости, вход под аккаунтом владельца): `gh auth login`, `npm i -g vercel && vercel login`,
Supabase CLI (`brew install supabase/tap/supabase` или `npx supabase`) + `supabase login`, `psql` 17.
Для неинтерактивной работы те же CLI берут токены из `GH_TOKEN`, `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`
(создаются в настройках аккаунта; в репозиторий не класть).

## Переменные окружения и секреты
Значения в репозитории не хранятся. Секретов GitHub Actions и переменных репозитория нет (`gh secret list`, `gh variable list` — пусто).

| Имя | Где задана | Зачем | Где взять |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel Production; `.env.local` | адрес проекта Supabase (касса, keepalive, гостевое меню) | Supabase → Project Settings → Data API (Project URL) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel Production; `.env.local` | публичный ключ клиента (доступ ограничен RLS + RPC) | Supabase → Project Settings → API Keys → Publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | не задана | гостевое меню читает меню из БД, только если задана; иначе `content/menu.json` (issue #8) | Supabase → API Keys (legacy anon) |

- **Preview (Vercel):** те же два имени привязаны к удалённой ветке `rebuild/v2`, т. е. фактически не заданы → превью работает
  «Только локально» (issue #13). Превью-URL закрыты Vercel Authentication (SSO), прод-домен открыт.
- **CI:** секретов нет. Job `e2e` подставляет фиктивные `NEXT_PUBLIC_SUPABASE_*` прямо в `ci.yml` (RPC мокаются в браузере).
- **Keepalive** (бесплатный Supabase засыпает): Vercel Cron из `vercel.json` (ежедневно 05:00 UTC) и
  `.github/workflows/supabase-keepalive.yml` (03:00 UTC каждые 2 дня) дёргают публичный `GET /api/keepalive`
  (чтение `categories`). Секретов и `CRON_SECRET` не нужно.
- Управление в Vercel: `vercel link --project chicken-fit-cafe --scope akhrors-projects-fc8c3afa`, затем `vercel env ls`,
  `vercel env pull .env.local --environment=production`, `vercel env add <ИМЯ> production`. После изменения env — новый деплой.

Только для операций, вне репозитория и Vercel:

| Имя | Зачем | Где взять |
|---|---|---|
| `DATABASE_URL` | `psql` к прод-БД: миграции, SQL-runbook'и | Supabase → Connect → Session pooler (IPv4); пароль — Project Settings → Database (там же сброс) |
| `TEST_PIN` | `tests/e2e/real-supabase-e2e.mjs` под тестовым сотрудником | задаётся при создании тестового сотрудника |
| PIN сотрудников | вход в `/pos`, `/kds`; readonly-проверка прода | у владельца; в БД только bcrypt-хеш (см. `SECURITY.md`) |

Переменные тестовых скриптов: `BASE` (URL приложения), `SHARE` (URL гостевого меню), `SHOTS` (папка скриншотов,
по умолчанию `test-results/shots`), `CHROME` (путь к браузеру; иначе `/usr/bin/google-chrome` или chromium Playwright —
`npx playwright install chromium`), `ADMIN_PIN`, `TEST_PIN`, `TABLE`, `LOCAL_PG`, `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`.

## Тесты
| Команда | Что | Нужно |
|---|---|---|
| `npm run check` | lint, typecheck, unit (Vitest), build | — |
| `npm run test:migrations` | stub Supabase → фикстура прод-схемы → все миграции ×2 → SQL-тесты | Postgres 17 |
| `npm run test:pg` | импорт legacy-фикстуры через `pos_apply_mutation` (после `test:migrations`) | Postgres 17 |
| `npm run test:e2e` | Playwright smoke всех экранов с моком RPC, реальную БД не трогает | `npm run build && npx next start -p 3100` |
| `node tests/e2e/real-supabase-readonly.mjs` | прод: вход, pull, отчёты, выход — без записи заказов | `BASE`, `SHARE`, `ADMIN_PIN` |
| `node tests/e2e/real-supabase-e2e.mjs` | пишет в прод-БД как тестовый сотрудник (`dev_test`); запускать осознанно | `TEST_PIN`, затем очистка |

Локальный Postgres 17 для миграций — любой из вариантов:
```bash
# Docker
docker run -d --name cf-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17
export PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres PGDATABASE=cf_migration_test
npm run test:migrations && npm run test:pg
# или системный кластер (Debian/Ubuntu): без PGHOST скрипты ходят через `sudo -u postgres`
sudo service postgresql start && npm run test:migrations && npm run test:pg
```
