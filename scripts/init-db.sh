#!/usr/bin/env bash
# =============================================================================
# SBTM Init & Seed Database (Consolidated)
# =============================================================================
set -euo pipefail

echo -e "\033[36mInitializing Database...\033[0m"

# 1. Copy SQL to container
CONTAINER_NAME="sbtm_antigravity-postgres-1"

echo "Copying init-db.sql to $CONTAINER_NAME..."
docker cp ./scripts/init-db.sql "$CONTAINER_NAME:/tmp/init-db.sql"

# 2. Execute SQL
echo "Executing SQL script inside container..."
docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -f /tmp/init-db.sql

echo -e "\033[32m✅ Database initialized and seeded successfully!\033[0m"
echo "Users created:"
echo "  Admin: osta.admin@sbtm.demo / Admin123!"
echo "  Parent: parent1@sbtm.demo / Admin123!"
