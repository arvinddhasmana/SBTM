#!/usr/bin/env bash
# scripts/azure/setup-db.sh
# Run PostgreSQL schema migrations and optional demo seeding against Azure PostgreSQL.
#
# Usage:
#   bash scripts/azure/setup-db.sh migrate      # Run schema + RLS migrations
#   bash scripts/azure/setup-db.sh seed-demo    # Insert demo data (requires migrate first)
#   bash scripts/azure/setup-db.sh backup       # Create a pre-deployment snapshot
#
# Requires:
#   DATABASE_URL environment variable set (or loaded from .env.production)
#   psql installed locally OR run from a pod with DB access

set -euo pipefail

COMMAND="${1:-migrate}"
ENV_FILE="${ENV_FILE:-.env.production}"

# Load DATABASE_URL if not already set
if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^\s*#' "${ENV_FILE}" | grep -v '^\s*$')
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set. Set it or add to ${ENV_FILE}"
  exit 1
fi

# Verify psql is available
if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: 'psql' not found. Install PostgreSQL client tools first."
  exit 1
fi

# Test DB connection before running any SQL
echo "==> Testing database connection"
if ! psql "${DATABASE_URL}" -c "SELECT 1" --quiet --no-align --tuples-only 2>/dev/null | grep -q "1"; then
  echo "ERROR: Cannot connect to database. Check DATABASE_URL and network access."
  echo "       PostgreSQL private endpoint requires VPN or Azure Bastion access."
  exit 1
fi
echo "    ✓ Database connection OK"

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/scripts"

case "${COMMAND}" in
  migrate)
    echo "==> Running schema migration"
    psql "${DATABASE_URL}" -f "${SCRIPTS_DIR}/init-db.sql"
    echo "==> Applying RLS policies"
    psql "${DATABASE_URL}" -f "${SCRIPTS_DIR}/rls-policies.sql"
    echo "==> Seeding standard data"
    psql "${DATABASE_URL}" -f "${SCRIPTS_DIR}/seed-standard.sql"
    echo "==> Migration complete"
    echo ""
    echo "    Verifying tables:"
    TABLE_COUNT=$(psql "${DATABASE_URL}" -t -c \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" \
      2>/dev/null | tr -d ' ' || echo "0")
    echo "    ✓ ${TABLE_COUNT} table(s) in public schema"
    psql "${DATABASE_URL}" -c "\dt" --quiet 2>/dev/null | head -20 || true
    ;;

  seed-demo)
    echo "==> Seeding demo data"
    psql "${DATABASE_URL}" -f "${SCRIPTS_DIR}/seed-demo.sql"
    echo "==> Demo seed complete"
    ;;

  backup)
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="/tmp/sbtm-backup-${TIMESTAMP}.sql"
    echo "==> Creating backup: ${BACKUP_FILE}"
    pg_dump "${DATABASE_URL}" -f "${BACKUP_FILE}" --clean --if-exists
    echo "==> Backup written to ${BACKUP_FILE}"
    BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
    echo "    Size: ${BACKUP_SIZE}"
    echo ""
    echo "    To upload to Azure Blob Storage:"
    echo "      az storage blob upload --account-name <STORAGE_ACCOUNT> \\"
    echo "        --container-name backups --file ${BACKUP_FILE} \\"
    echo "        --name sbtm-backup-${TIMESTAMP}.sql --auth-mode login"
    ;;

  *)
    echo "Usage: $0 [migrate|seed-demo|backup]"
    exit 1
    ;;
esac
