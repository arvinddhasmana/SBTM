#!/usr/bin/env bash
# =============================================================================
# SBTM "Seeded-DB Only" Simulator
#
# Drives a live simulation feed (GPS, presence, lifecycle, alerts) using ONLY
# the data already loaded by ./scripts/init-db.sh (seed-demo.sql). Nothing in
# the database is mutated except for new operational events emitted via the API
# (location_points, presence events, alerts) — schools/routes/students/parents
# are read as-is.
#
# Flow:
#   1. Lists schools from `schools` table — user picks one.
#   2. Auto-selects the first 2 AM/PM route pairs (R01 + R02) for the school
#      from `routes`.
#   3. Loads route stops, students (with AM/PM stop assignments), parent emails.
#   4. Prints summary: routes + parent emails per route.
#   5. Hands off to scripts/seeded-run.ts, which runs both buses concurrently
#      and auto-distributes alerts (LATE_ARRIVAL, ROUTE_DEVIATION, PANIC_BUTTON)
#      across the 4 routes.
# =============================================================================
set -euo pipefail

API_BASE="http://localhost:3001/api/v1"
INTERVAL_SECONDS="${1:-1}"
CONTAINER_NAME="sbtm-postgres-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

psql_q() {
  docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -t -A -F $'\t' -c "$1"
}

# --- Pre-flight: API must be reachable ---
if ! curl -sf -o /dev/null "$API_BASE/health" 2>/dev/null \
   && ! curl -sf -o /dev/null "$API_BASE/../../health" 2>/dev/null; then
  echo -e "${YELLOW}Warning:${RESET} API at $API_BASE may not be reachable."
  echo "         (health probe failed — continuing anyway)"
fi

# --- 1. List schools ---
echo -e "${CYAN}=== SBTM Seeded-DB Simulator ===${RESET}"
echo ""
echo -e "${CYAN}Available schools:${RESET}"

mapfile -t SCHOOLS < <(psql_q "SELECT id, name FROM schools ORDER BY name;")
if [ "${#SCHOOLS[@]}" -eq 0 ]; then
  echo -e "${RED}No schools found in DB. Run ./scripts/init-db.sh first.${RESET}"
  exit 1
fi

i=1
declare -a SCHOOL_IDS
for line in "${SCHOOLS[@]}"; do
  sid="${line%%$'\t'*}"
  sname="${line#*$'\t'}"
  SCHOOL_IDS+=("$sid")
  printf "  %2d) %s\n" "$i" "$sname"
  i=$((i+1))
done
echo ""

read -rp "Select school [1-${#SCHOOLS[@]}]: " CHOICE
if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || (( CHOICE < 1 || CHOICE > ${#SCHOOLS[@]} )); then
  echo -e "${RED}Invalid selection.${RESET}"
  exit 1
fi
SELECTED_ID="${SCHOOL_IDS[$((CHOICE-1))]}"
SELECTED_NAME="${SCHOOLS[$((CHOICE-1))]#*$'\t'}"
echo ""
echo -e "${GREEN}Selected:${RESET} $SELECTED_NAME"
echo -e "${GREEN}School ID:${RESET} $SELECTED_ID"
echo ""

# --- 2. Auto-pick 2 AM/PM route pairs ---
# Strategy: Query operational routes table, group by name prefix to find route pairs
mapfile -t ROUTE_PAIRS < <(psql_q "
  SELECT id, name, direction
  FROM routes
  WHERE \"schoolId\" = '$SELECTED_ID'
  ORDER BY name, direction
  LIMIT 4;
")

if [ "${#ROUTE_PAIRS[@]}" -lt 4 ]; then
  echo -e "${RED}School '$SELECTED_NAME' does not have 2 complete AM/PM route pairs in routes.${RESET}"
  echo "Found: ${#ROUTE_PAIRS[@]} route(s)."
  exit 1
fi

ROUTE_IDS=()
for row in "${ROUTE_PAIRS[@]}"; do
  rid="${row%%$'\t'*}"
  ROUTE_IDS+=("$rid")
done
echo -e "${CYAN}Auto-selected routes (2 AM + 2 PM):${RESET}"
for r in "${ROUTE_IDS[@]}"; do echo "  - $r"; done
echo ""

# --- 3. Print routes + students + parent emails per route ---
echo -e "${CYAN}Routes / Students / Parents:${RESET}"
for r in "${ROUTE_IDS[@]}"; do
  ROUTE_ROW=$(psql_q "SELECT name, \"vehicleId\" FROM routes WHERE id = '$r';")
  RNAME="${ROUTE_ROW%%$'\t'*}"
  RVEH="${ROUTE_ROW#*$'\t'}"
  echo ""
  echo -e "  ${GREEN}$r${RESET}  ($RNAME)"
  echo "    Vehicle: $RVEH"

  # Query students from operational students table using am_route_id/pm_route_id
  mapfile -t STU < <(psql_q "
    SELECT s.first_name || ' ' || s.last_name AS sname,
           u.email AS pemail
    FROM students s
    LEFT JOIN users u ON u.id = s.parent_user_id
    WHERE s.am_route_id = '$r' OR s.pm_route_id = '$r'
    ORDER BY s.first_name;
  ")
  if [ "${#STU[@]}" -eq 0 ]; then
    echo "    (no students assigned)"
  else
    for srow in "${STU[@]}"; do
      sn="${srow%%$'\t'*}"
      pe="${srow#*$'\t'}"
      printf "    - %-25s  parent: %s\n" "$sn" "${pe:-<unassigned>}"
    done
  fi
done
echo ""

# Driver email (one driver per school for the seeded data)
DRIVER_EMAIL=$(psql_q "SELECT email FROM users WHERE role = 'DRIVER' AND \"schoolId\" = '$SELECTED_ID' LIMIT 1;")
if [ -z "$DRIVER_EMAIL" ]; then
  echo -e "${RED}No driver user found for school.${RESET}"
  exit 1
fi
echo -e "${CYAN}Driver login:${RESET} $DRIVER_EMAIL  /  Admin123!"

# School admin email (for context only)
ADMIN_EMAIL=$(psql_q "SELECT email FROM users WHERE role = 'SCHOOL_ADMIN' AND \"schoolId\" = '$SELECTED_ID' LIMIT 1;")
echo -e "${CYAN}School admin:${RESET} ${ADMIN_EMAIL:-<n/a>}  /  Admin123!"
echo ""

read -rp "Press ENTER to start the simulation (Ctrl+C to abort)..." _

# --- 4. Run the simulation ---
echo -e "${CYAN}Starting simulation (interval ${INTERVAL_SECONDS}s)...${RESET}"
SCHOOL_ID="$SELECTED_ID" \
  ROUTE_IDS="${ROUTE_IDS[*]}" \
  DRIVER_EMAIL="$DRIVER_EMAIL" \
  npx tsx "$SCRIPT_DIR/seeded-run.ts" "$INTERVAL_SECONDS"

echo -e "${GREEN}Seeded-DB simulation finished.${RESET}"
