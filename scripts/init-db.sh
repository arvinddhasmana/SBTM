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

# 3. Sync OSRM road polylines into routes_reference
echo ""
echo "Syncing road polylines via OSRM..."
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if command -v node &> /dev/null && [ -f "$REPO_ROOT/sync-routes.js" ]; then
  node "$REPO_ROOT/sync-routes.js" && echo -e "\033[32m✅ Route polylines synced\033[0m" \
    || echo -e "\033[33m⚠️  Route polyline sync skipped (OSRM may be offline — will use fallback)\033[0m"
else
  echo -e "\033[33m⚠️  sync-routes.js not found or node unavailable — skipping polyline sync\033[0m"
fi

echo ""
echo "Demo credentials (password: Admin123! for all):"
echo "  Admins:  osta.admin@sbtm.demo | school.admin@sbtm.demo | school2.admin@sbtm.demo"
echo "  Parents: parent1@sbtm.demo ... parent10@sbtm.demo"
echo ""
echo "Live drivers (phone app GPS):"
echo "  driver1@sbtm.demo  → ROUTE-R01 (Bank Street South   — Greenfield Elementary)"
echo "  driver2@sbtm.demo  → ROUTE-R02 (Bronson Avenue      — Greenfield Elementary)"
echo "  driver11@sbtm.demo → ROUTE-R11 (Richmond Road       — Riverside Academy)"
echo "  driver12@sbtm.demo → ROUTE-R12 (Scott Street        — Riverside Academy)"
echo ""
echo "Data: 2 schools, 4 routes, 4 buses, 4 drivers, 48 stops, 88 students, 10 parents"
