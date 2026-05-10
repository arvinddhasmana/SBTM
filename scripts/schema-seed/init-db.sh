#!/usr/bin/env bash
# =============================================================================
# SBTM Init & Seed Database
#
# Runs three SQL scripts in order:
#   1. init-schema.sql  — Create all tables and indexes
#   2. seed-standard.sql — Boards and system admin users
#   3. seed-demo.sql     — Demo-specific data (schools, routes, students, etc.)
# =============================================================================
set -euo pipefail

CONTAINER_NAME="sbtm-postgres-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\033[36mInitializing Database...\033[0m"

for f in init-schema.sql seed-standard.sql seed-demo.sql; do
  echo -e "\033[33m  Running $f ...\033[0m"
  docker cp "$SCRIPT_DIR/$f" "$CONTAINER_NAME:/tmp/$f"
  docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -f "/tmp/$f"
done

# Apply emergency-alerts service migrations (alert configuration tables required
# by the emergency-alerts service at startup).
ALERT_CONFIG_MIGRATION="$SCRIPT_DIR/../services/emergency-alerts/src/migrations/001-create-alert-config-tables.sql"
if [ -f "$ALERT_CONFIG_MIGRATION" ]; then
  echo -e "\033[33m  Running emergency-alerts migration: 001-create-alert-config-tables.sql ...\033[0m"
  docker cp "$ALERT_CONFIG_MIGRATION" "$CONTAINER_NAME:/tmp/001-create-alert-config-tables.sql"
  docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -v ON_ERROR_STOP=1 -f "/tmp/001-create-alert-config-tables.sql"
fi

# Apply data fix migrations to handle any data integrity issues from previous versions
echo -e "\033[36mApplying data fix migrations...\033[0m"

# Migration 001: Populate route-stop lat/lng from PostGIS geometry
MIGRATION_001="$SCRIPT_DIR/../migrations/001-populate-route-stop-lat-lng.sql"
if [ -f "$MIGRATION_001" ]; then
  echo -e "\033[33m  Running migration: 001-populate-route-stop-lat-lng.sql ...\033[0m"
  docker cp "$MIGRATION_001" "$CONTAINER_NAME:/tmp/001-populate-route-stop-lat-lng.sql"
  docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -v ON_ERROR_STOP=1 -f "/tmp/001-populate-route-stop-lat-lng.sql" 2>&1 | grep -v "NOTICE" || true
fi

# Migration 002: Fix orphaned student-stop associations after route updates
MIGRATION_002="$SCRIPT_DIR/../migrations/002-fix-orphaned-student-stops.sql"
if [ -f "$MIGRATION_002" ]; then
  echo -e "\033[33m  Running migration: 002-fix-orphaned-student-stops.sql ...\033[0m"
  docker cp "$MIGRATION_002" "$CONTAINER_NAME:/tmp/002-fix-orphaned-student-stops.sql"
  docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -v ON_ERROR_STOP=1 -f "/tmp/002-fix-orphaned-student-stops.sql" 2>&1 | grep -v "NOTICE" || true
fi

# Some services (e.g., emergency-alerts) eagerly load configuration from the
# database during onModuleInit and crash if their tables don't exist when the
# stack first comes up. Restart any exited services now that the schema and
# migrations have been applied.
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  EXITED_SERVICES=$(docker compose ps --status=exited --services 2>/dev/null || true)
  if [ -n "$EXITED_SERVICES" ]; then
    echo -e "\033[33m  Restarting exited services: $(echo $EXITED_SERVICES | tr '\n' ' ')\033[0m"
    # shellcheck disable=SC2086
    docker compose start $EXITED_SERVICES || true
  fi
fi

echo -e "\033[32m✅ Database initialized and seeded successfully!\033[0m"
echo ""
echo "Demo credentials (password: Admin123! for all):"
echo ""
echo "  System Admins:"
echo "    super.admin@sbtm.demo    (SUPER_ADMIN)"
echo "    osta.admin@sbtm.demo     (OSTA_ADMIN)"
echo "    ocdsb.admin@sbtm.demo    (BOARD_ADMIN - OCDSB)"
echo "    ocsb.admin@sbtm.demo     (BOARD_ADMIN - OCSB)"
echo ""
echo "  Per-School (example for St. Bernadette):"
echo "    admin.stbern@sbtm.demo    (SCHOOL_ADMIN)"
echo "    driver.stbern@sbtm.demo   (DRIVER)"
echo "    parent1.stbern@sbtm.demo  (PARENT)"
echo ""
echo "  School abbreviations: stbern, allsnt, sacrhrt, jyoung, mplwd, ayjack"
echo ""
echo "6-School Demo: 2 boards, 6 schools, 6 buses, 60 routes (5 AM + 5 PM per school)"
echo "               90 students, 60 parents, 6 drivers"
