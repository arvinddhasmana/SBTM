#!/bin/bash
# Run Alert Configuration Migration
# This script applies the alert configuration database schema

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATION_FILE="$SCRIPT_DIR/../services/emergency-alerts/src/migrations/001-create-alert-config-tables.sql"

# Load database connection from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_DATABASE="${DB_DATABASE:-sbms}"
DB_USERNAME="${DB_USERNAME:-postgres}"

echo "===================================="
echo "Alert Configuration Migration"
echo "===================================="
echo "Database: $DB_DATABASE"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USERNAME"
echo "===================================="

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "ERROR: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

# Check if PGPASSWORD is set
if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: DB_PASSWORD environment variable is not set"
  exit 1
fi

# Run migration
echo "Applying migration..."
export PGPASSWORD="$DB_PASSWORD"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo "✓ Migration applied successfully!"
else
  echo "✗ Migration failed!"
  exit 1
fi

echo "===================================="
echo "Verifying tables..."
echo "===================================="

# Verify tables exist
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'alert_%config%'
  OR table_name = 'notification_routing_config'
ORDER BY table_name;
"

echo "===================================="
echo "Migration Complete!"
echo "===================================="
