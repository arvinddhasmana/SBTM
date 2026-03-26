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
echo ""
echo "Demo credentials (password: Admin123! for all):"
echo "  Admins:  osta.admin@sbtm.demo | school.admin@sbtm.demo | school2.admin@sbtm.demo"
echo "  Parents: parent1@sbtm.demo ... parent10@sbtm.demo"
echo ""
echo "Live drivers (phone app GPS):"
echo "  driver1@sbtm.demo  → ROUTE-R01 (Greenfield Elementary)"
echo "  driver2@sbtm.demo  → ROUTE-R02 (Greenfield Elementary)"
echo "  driver11@sbtm.demo → ROUTE-R11 (Riverside Academy)"
echo "  driver12@sbtm.demo → ROUTE-R12 (Riverside Academy)"
echo ""
echo "Data: 2 schools, 20 routes, 20 buses, 20 drivers, 100 stops, 500 students, 10 parents"
