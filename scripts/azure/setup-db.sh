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
    ;;

  *)
    echo "Usage: $0 [migrate|seed-demo|backup]"
    exit 1
    ;;
esac
