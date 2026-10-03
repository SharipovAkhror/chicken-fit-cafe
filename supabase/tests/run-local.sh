#!/usr/bin/env bash
# Прогон миграций на локальном Postgres 17: stub Supabase -> фикстура прод-схемы -> все миграции -> повтор (идемпотентность) -> SQL-тесты.
# Подключение: если задан PGHOST (напр. Docker: PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres) — обычный psql;
# иначе локальный кластер через `sudo -u postgres`.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=cf_migration_test
if [ -n "${PGHOST:-}" ]; then as() { "$@"; }; else as() { sudo -u postgres "$@"; }; fi
as dropdb --if-exists "$DB"
as createdb "$DB"
run() { as psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }
run tests/00_local_supabase_stub.sql
run tests/01_prod_state_fixture.sql
for f in migrations/*.sql; do echo "apply $f"; run "$f"; done
echo "re-apply (idempotency)"; for f in migrations/*.sql; do run "$f"; done
for f in tests/0[2-9]_*.sql; do echo "test $f"; run "$f"; done
echo "ALL MIGRATION TESTS PASSED"
