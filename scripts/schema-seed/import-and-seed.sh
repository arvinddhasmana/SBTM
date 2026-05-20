#!/usr/bin/env bash
# =============================================================================
# SBTM v2 — Import Sample Bundles + Seed All Dev Credentials
#
# Run this AFTER init-db.sh (schema + super/STA admin users must exist first).
#
# What this script does:
#   1. Commits both OSTA and RCJTC sample bundles via integration-importer.
#      This populates:
#        stx_boards, stx_schools, stx_operators, stx_vehicles
#        routes, trips, stop_times, stops, shapes
#        stx_students, stx_guardians, stx_student_guardians, stx_ridership
#   2. Re-runs seed-v2.sql so every board/school/driver/parent users row gets
#      its anchor_id resolved (the DO UPDATE clauses fix any NULLs left from
#      the initial init-db.sh run when the stx_* tables were still empty).
#
# Prerequisites:
#   - Docker infra running (postgres on localhost:5433)
#   - Schema applied: scripts/schema-seed/init-db.sh
#   - pnpm dependencies installed: pnpm install
#
# Usage:
#   ./scripts/schema-seed/import-and-seed.sh
#
# Optional env overrides:
#   SBTM_PII_KEY    — base64-encoded 32-byte AES key for PII columns.
#                     If unset, an ephemeral key is generated (ciphertexts are
#                     NOT decryptable after the process exits — fine for local
#                     dev, but means stx_students/stx_guardians names are
#                     unreadable. Set a stable key for persistent dev DBs).
#   OSRM_BASE_URL   — OSRM routing endpoint for road-snapped route shapes.
#                     If unset, stop coordinates are used as-is (passthrough).
#                     Default for docker-compose full stack: http://localhost:5000
# =============================================================================
set -euo pipefail

CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
DIM='\033[2m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTAINER_NAME="sbtm-postgres-1"

# ─── Defaults ──────────────────────────────────────────────────────────────
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:mysecretpassword@localhost:5433/sbms}"
OSRM_BASE_URL="${OSRM_BASE_URL:-}"   # empty → StubOsrmClient (passthrough)

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     SBTM v2 — Import Sample Bundles + Seed       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Step 1: Verify postgres is reachable ──────────────────────────────────
echo -e "${CYAN}[1/3] Checking Postgres connectivity...${NC}"
if ! docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; then
  echo -e "${RED}✗ Postgres container '$CONTAINER_NAME' is not ready.${NC}"
  echo -e "${DIM}  Run scripts/dev/dev-hybrid.sh first to start infrastructure.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Postgres is ready"
echo ""

# ─── Step 2: Import OSTA + RCJTC bundles ───────────────────────────────────
echo -e "${CYAN}[2/3] Committing OSTA and RCJTC sample bundles...${NC}"
echo ""
echo -e "${DIM}  Pipeline: CSV files → validate → stage_* tables → canonical v2 tables${NC}"
echo -e "${DIM}  PII columns (student/guardian names, addresses) encrypted with AES-256-GCM${NC}"
if [[ -n "$OSRM_BASE_URL" ]]; then
  echo -e "${DIM}  Shape fallback: OSRM road-snap via $OSRM_BASE_URL${NC}"
else
  echo -e "${DIM}  Shape fallback: passthrough (no OSRM — set OSRM_BASE_URL for road-snapped shapes)${NC}"
fi
echo ""

(cd "$REPO_ROOT" && \
  DATABASE_URL="$DATABASE_URL" \
  OSRM_BASE_URL="$OSRM_BASE_URL" \
  pnpm --filter integration-importer run import:sample -- --commit)

echo ""

# ─── Step 3: Re-run seed-v2.sql to fix anchor_ids ──────────────────────────
echo -e "${CYAN}[3/3] Seeding all dev credentials (board/school/driver/parent users)...${NC}"
echo ""
echo -e "${DIM}  ON CONFLICT DO UPDATE ensures anchor_id NULLs from init-db.sh are fixed now${NC}"
echo -e "${DIM}  that stx_boards / stx_schools / stx_guardians rows exist.${NC}"
echo ""

container_seed="/tmp/seed-v2.sql"
docker cp "$SCRIPT_DIR/seed-v2.sql" "$CONTAINER_NAME:$container_seed"
docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -v ON_ERROR_STOP=1 -f "$container_seed"

echo ""

# ─── Summary ───────────────────────────────────────────────────────────────
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Import + Seed complete!               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Dev credentials (password: Admin123! unless noted)${NC}"
echo ""
echo -e "  ${DIM}System${NC}"
echo "    super.admin@sbtm.demo            SUPER_ADMIN"
echo ""
echo -e "  ${DIM}STA Admins${NC}"
echo "    sta.admin@osta.sbtm.demo         STA_ADMIN  (OSTA)"
echo "    sta.admin@rcjtc.sbtm.demo        STA_ADMIN  (RCJTC)"
echo ""
echo -e "  ${DIM}Board Admins${NC}"
echo "    ocdsb.admin@sbtm.demo            BOARD_ADMIN (OCDSB)"
echo "    ocsb.admin@sbtm.demo             BOARD_ADMIN (OCSB)"
echo "    rcdsb.admin@sbtm.demo            BOARD_ADMIN (RCDSB)"
echo "    rccdsb.admin@sbtm.demo           BOARD_ADMIN (RCCDSB)"
echo ""
echo -e "  ${DIM}School Admins${NC}"
echo "    admin.maplewood@sbtm.demo        SCHOOL_ADMIN (OCDSB — Maplewood PS)"
echo "    admin.stbern@sbtm.demo           SCHOOL_ADMIN (OCSB  — St. Bernadette)"
echo "    admin.pinecrest@sbtm.demo        SCHOOL_ADMIN (RCDSB — Pinecrest ES)"
echo "    admin.cathedral@sbtm.demo        SCHOOL_ADMIN (RCCDSB — Cathedral HS)"
echo ""
echo -e "  ${DIM}Drivers${NC}"
echo "    driver.maplewood@sbtm.demo       DRIVER (Maplewood PS)"
echo "    driver.stbern@sbtm.demo          DRIVER (St. Bernadette)"
echo "    driver.pinecrest@sbtm.demo       DRIVER (Pinecrest ES)"
echo "    driver.cathedral@sbtm.demo       DRIVER (Cathedral HS)"
echo ""
echo -e "  ${DIM}Parents / Guardians (password: Parent123!)${NC}"
echo "    sam.demo@example.test            PARENT — OSTA-GRD-0001"
echo "    chris.specimen@example.test      PARENT — OSTA-GRD-0002"
echo "    pat.sample@example.test          PARENT — OSTA-GRD-0003"
echo "    kerry.example@example.test       PARENT — OSTA-GRD-0004"
echo "    jordan.pembroke@example.test     PARENT — RCJTC-GRD-0001"
echo "    robin.renfrew@example.test       PARENT — RCJTC-GRD-0002"
echo "    alex.cathedral@example.test      PARENT — RCJTC-GRD-0003"
echo "    sage.pinecrest@example.test      PARENT — RCJTC-GRD-0004"
echo ""
