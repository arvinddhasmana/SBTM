#!/usr/bin/env bash
# =============================================================================
# SBTM v2 — Init & Seed Database  (Step 1 of 2)
#
# Applies the v2 schema (20260518_v2_cutover.sql + staging tables) and seeds
# super-admin + STA admin users. Board/school/driver/parent credentials are
# seeded in step 2 once the integration-importer has populated stx_boards,
# stx_schools, stx_guardians, etc.
#
# Full setup sequence:
#   1. ./scripts/schema-seed/init-db.sh         ← this script
#   2. ./scripts/schema-seed/import-and-seed.sh ← imports OSTA + RCJTC bundles,
#                                                  then seeds all remaining creds
#
# Usage:
#   ./scripts/schema-seed/init-db.sh
# =============================================================================
set -euo pipefail

CONTAINER_NAME="sbtm-postgres-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "\033[36mInitializing v2 Database...\033[0m"

run_sql_file() {
  local label="$1"
  local host_path="$2"
  local container_path="/tmp/$(basename "$host_path")"
  echo -e "\033[33m  Applying $label ...\033[0m"
  docker cp "$host_path" "$CONTAINER_NAME:$container_path"
  docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -v ON_ERROR_STOP=1 -f "$container_path"
}

# 1. Extensions (idempotent)
docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -v ON_ERROR_STOP=1 -c \
  "CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
   CREATE EXTENSION IF NOT EXISTS postgis;"

# 2. v2 core schema
run_sql_file "v2 schema migration" \
  "$REPO_ROOT/services/api-gateway/migrations/20260518_v2_cutover.sql"

# 3. Integration-importer staging tables
run_sql_file "staging tables" \
  "$REPO_ROOT/services/integration-importer/migrations/20260601_create_stage_tables.sql"

# 4. Minimal dev seed (super admin + OSTA STA + STA admin)
run_sql_file "v2 dev seed" "$SCRIPT_DIR/seed-v2.sql"

# Restart any services that exited while waiting for schema
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  EXITED_SERVICES=$(docker compose ps --status=exited --services 2>/dev/null || true)
  if [ -n "$EXITED_SERVICES" ]; then
    echo -e "\033[33m  Restarting exited services: $(echo "$EXITED_SERVICES" | tr '\n' ' ')\033[0m"
    # shellcheck disable=SC2086
    docker compose start $EXITED_SERVICES || true
  fi
fi

echo -e "\033[32m✅ v2 database initialized!\033[0m"
echo ""
echo "Minimal dev credentials (password: Admin123!):"
echo ""
echo "  System Admins:"
echo "    super.admin@sbtm.demo    (SUPER_ADMIN)"
echo "    sta.admin@osta.sbtm.demo (STA_ADMIN — OSTA)"
echo ""
echo "Next step — import sample bundles and seed all board/school/driver/parent credentials:"
echo ""
echo "  ./scripts/schema-seed/import-and-seed.sh"
echo ""
