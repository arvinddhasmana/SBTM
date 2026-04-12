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
