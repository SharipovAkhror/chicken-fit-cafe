#!/usr/bin/env bash
# Прогон миграций на локальном Postgres: fixture текущего прода -> все миграции -> тесты -> повторный прогон миграций (идемпотентность).
set -euo pipefail
cd "$(dirname "$0")/.."
DB=cf_migration_test
sudo -u postgres dropdb --if-exists "$DB"
sudo -u postgres createdb "$DB"
run() { sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }
run tests/00_local_supabase_stub.sql
run tests/01_prod_state_fixture.sql
for f in migrations/*.sql; do echo "apply $f"; run "$f"; done
echo "re-apply (idempotency)"; for f in migrations/*.sql; do run "$f"; done
run tests/02_tests.sql
echo "ALL MIGRATION TESTS PASSED"
