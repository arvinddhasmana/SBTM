#!/usr/bin/env bash
# =============================================================================
# SBTM Demo Simulator — Runs on top of seeded data (reset-demo-db.sh)
#
# Prompts for:
#   1. Number of schools (default 1)
#   2. Which seeded schools to simulate (default: St. Bernadette)
#   3. How many AM/PM routes per school (default 1)
#   4. GPS signal delay in seconds (default 3)
#
# Does NOT create any new data entities — uses seeded data only.
# =============================================================================
set -euo pipefail

API_BASE="http://localhost:3001/api/v1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="sbtm-postgres-1"

# --- Helper Functions ---

login_user() {
  local email="$1"
  local response
  response=$(curl -sf -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Admin123!\"}" 2>/dev/null) || true
  echo "$response"
}

get_token() {
  echo "$1" | grep -oP '"accessToken"\s*:\s*"\K[^"]+' 2>/dev/null || echo ""
}

# --- School Database ---
# Keyed by short code matching seed-demo.sql
declare -A SCHOOL_IDS SCHOOL_NAMES SCHOOL_ABBREVS SCHOOL_ADMIN_EMAILS SCHOOL_ADMIN_IDS DRIVER_EMAILS DRIVER_IDS SCHOOL_BOARD_IDS
declare -a SCHOOL_CODES

SCHOOL_CODES=(stbern allsnt sacrhrt jyoung mplwd ayjack)

SCHOOL_IDS[stbern]="30000000-0000-0000-0001-000000000001"
SCHOOL_IDS[allsnt]="30000000-0000-0000-0002-000000000001"
SCHOOL_IDS[sacrhrt]="30000000-0000-0000-0003-000000000001"
SCHOOL_IDS[jyoung]="30000000-0000-0000-0004-000000000001"
SCHOOL_IDS[mplwd]="30000000-0000-0000-0005-000000000001"
SCHOOL_IDS[ayjack]="30000000-0000-0000-0006-000000000001"

SCHOOL_NAMES[stbern]="St. Bernadette Catholic Elementary School"
SCHOOL_NAMES[allsnt]="All Saints High School"
SCHOOL_NAMES[sacrhrt]="Sacred Heart Catholic High School (7-12)"
SCHOOL_NAMES[jyoung]="John Young Elementary School"
SCHOOL_NAMES[mplwd]="Maplewood Secondary School"
SCHOOL_NAMES[ayjack]="A.Y. Jackson S.S."

SCHOOL_ABBREVS[stbern]="STBERN"
SCHOOL_ABBREVS[allsnt]="ALLSNT"
SCHOOL_ABBREVS[sacrhrt]="SACRHRT"
SCHOOL_ABBREVS[jyoung]="JYOUNG"
SCHOOL_ABBREVS[mplwd]="MPLWD"
SCHOOL_ABBREVS[ayjack]="AYJACK"

SCHOOL_ADMIN_EMAILS[stbern]="admin.stbern@sbtm.demo"
SCHOOL_ADMIN_EMAILS[allsnt]="admin.allsnt@sbtm.demo"
SCHOOL_ADMIN_EMAILS[sacrhrt]="admin.sacrhrt@sbtm.demo"
SCHOOL_ADMIN_EMAILS[jyoung]="admin.jyoung@sbtm.demo"
SCHOOL_ADMIN_EMAILS[mplwd]="admin.mplwd@sbtm.demo"
SCHOOL_ADMIN_EMAILS[ayjack]="admin.ayjack@sbtm.demo"

SCHOOL_ADMIN_IDS[stbern]="30000000-0000-0000-0001-00000000000a"
SCHOOL_ADMIN_IDS[allsnt]="30000000-0000-0000-0002-00000000000a"
SCHOOL_ADMIN_IDS[sacrhrt]="30000000-0000-0000-0003-00000000000a"
SCHOOL_ADMIN_IDS[jyoung]="30000000-0000-0000-0004-00000000000a"
SCHOOL_ADMIN_IDS[mplwd]="30000000-0000-0000-0005-00000000000a"
SCHOOL_ADMIN_IDS[ayjack]="30000000-0000-0000-0006-00000000000a"

DRIVER_EMAILS[stbern]="driver.stbern@sbtm.demo"
DRIVER_EMAILS[allsnt]="driver.allsnt@sbtm.demo"
DRIVER_EMAILS[sacrhrt]="driver.sacrhrt@sbtm.demo"
DRIVER_EMAILS[jyoung]="driver.jyoung@sbtm.demo"
DRIVER_EMAILS[mplwd]="driver.mplwd@sbtm.demo"
DRIVER_EMAILS[ayjack]="driver.ayjack@sbtm.demo"

DRIVER_IDS[stbern]="driver-stbern-01"
DRIVER_IDS[allsnt]="driver-allsnt-01"
DRIVER_IDS[sacrhrt]="driver-sacrhrt-01"
DRIVER_IDS[jyoung]="driver-jyoung-01"
DRIVER_IDS[mplwd]="driver-mplwd-01"
DRIVER_IDS[ayjack]="driver-ayjack-01"

SCHOOL_BOARD_IDS[stbern]="b1a2b3c4-d5e6-4f7a-8b9c-1d2e3f4a5b6c"
SCHOOL_BOARD_IDS[allsnt]="b1a2b3c4-d5e6-4f7a-8b9c-1d2e3f4a5b6c"
SCHOOL_BOARD_IDS[sacrhrt]="b1a2b3c4-d5e6-4f7a-8b9c-1d2e3f4a5b6c"
SCHOOL_BOARD_IDS[jyoung]="b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
SCHOOL_BOARD_IDS[mplwd]="b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
SCHOOL_BOARD_IDS[ayjack]="b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"

# --- Interactive Prompts ---

echo -e "\033[36m=== SBTM Demo Simulator (Seeded Data) ===\033[0m"
echo ""

# Step 1: Number of schools
read -rp "Number of schools to simulate [default: 1]: " NUM_SCHOOLS
NUM_SCHOOLS="${NUM_SCHOOLS:-1}"

# Step 2: Show available schools and let user pick
echo ""
echo -e "\033[36mAvailable seeded schools:\033[0m"
for i in "${!SCHOOL_CODES[@]}"; do
  code="${SCHOOL_CODES[$i]}"
  idx=$((i + 1))
  echo "  $idx. ${SCHOOL_NAMES[$code]}"
done
echo ""

read -rp "Choose schools (comma-separated numbers, e.g. 1,3) [default: 1]: " SCHOOL_SELECTION
SCHOOL_SELECTION="${SCHOOL_SELECTION:-1}"

# Parse selected schools
IFS=',' read -ra SELECTED_INDICES <<< "$SCHOOL_SELECTION"
declare -a SELECTED_SCHOOLS
for idx in "${SELECTED_INDICES[@]}"; do
  idx=$(echo "$idx" | tr -d ' ')
  arr_idx=$((idx - 1))
  if [ "$arr_idx" -ge 0 ] && [ "$arr_idx" -lt "${#SCHOOL_CODES[@]}" ]; then
    SELECTED_SCHOOLS+=("${SCHOOL_CODES[$arr_idx]}")
  else
    echo "Warning: Invalid school number $idx, skipping."
  fi
done

if [ ${#SELECTED_SCHOOLS[@]} -eq 0 ]; then
  SELECTED_SCHOOLS=("stbern")
fi

# Step 3: Routes per school
read -rp "How many AM/PM routes per school [default: 1, max 5]: " ROUTES_PER_SCHOOL
ROUTES_PER_SCHOOL="${ROUTES_PER_SCHOOL:-1}"
if [ "$ROUTES_PER_SCHOOL" -gt 5 ]; then ROUTES_PER_SCHOOL=5; fi

# Step 4: GPS interval
read -rp "Delay in seconds for GPS signals [default: 3]: " GPS_DELAY
GPS_DELAY="${GPS_DELAY:-3}"

echo ""
echo -e "\033[36m--- Simulation Configuration ---\033[0m"
echo "  Schools: ${SELECTED_SCHOOLS[*]}"
echo "  Routes per school: $ROUTES_PER_SCHOOL (AM + PM each)"
echo "  GPS delay: ${GPS_DELAY}s"
echo ""

# --- Pre-flight: Verify API is up ---

echo -e "\033[36mVerifying API is available...\033[0m"
if ! curl -sf "$API_BASE/health" > /dev/null 2>&1; then
  echo -e "\033[31mERROR: API at $API_BASE is not responding. Is the stack running?\033[0m"
  exit 1
fi
echo -e "\033[32mAPI is healthy.\033[0m"

# --- Authenticate ---

echo -e "\033[36mAuthenticating...\033[0m"
ADMIN_AUTH=$(login_user "osta.admin@sbtm.demo")
ADMIN_TOKEN=$(get_token "$ADMIN_AUTH")
if [ -z "$ADMIN_TOKEN" ]; then echo -e "\033[31mAdmin auth failed\033[0m"; exit 1; fi

# --- Clean up stale route data ---

echo -e "\033[36mCleaning up stale location data...\033[0m"
for code in "${SELECTED_SCHOOLS[@]}"; do
  abbr="${SCHOOL_ABBREVS[$code]}"
  for r in $(seq 1 "$ROUTES_PER_SCHOOL"); do
    bus_id="BUS-${abbr}-$(printf '%02d' "$r")"
    docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -c \
      "DELETE FROM location_points WHERE vehicle_id = '$bus_id';" > /dev/null 2>&1 || true
  done
done

# --- Build simulation config JSON for the TypeScript runner ---

echo -e "\033[36mBuilding simulation config...\033[0m"

CONFIG_PATH="$SCRIPT_DIR/demo-sim-config.json"

npx tsx "$SCRIPT_DIR/demo-gen-config.ts" "${SELECTED_SCHOOLS[*]}" "$ROUTES_PER_SCHOOL" "$GPS_DELAY"

if [ ! -f "$CONFIG_PATH" ]; then
  echo -e "\033[31mERROR: Config generation failed\033[0m"
  exit 1
fi

# --- Print simulation info ---

echo ""
echo -e "\033[36m--- Simulation Participants ---\033[0m"
for code in "${SELECTED_SCHOOLS[@]}"; do
  abbr="${SCHOOL_ABBREVS[$code]}"
  echo ""
  echo -e "\033[33m  ${SCHOOL_NAMES[$code]}:\033[0m"
  echo "    School Admin: ${SCHOOL_ADMIN_EMAILS[$code]}"
  echo "    Driver:       ${DRIVER_EMAILS[$code]}"

  # Print parents
  for p in $(seq 1 5); do
    echo "    Parent $p:     parent${p}.${code}@sbtm.demo"
  done

  # Print route names
  for r in $(seq 1 "$ROUTES_PER_SCHOOL"); do
    rPad=$(printf '%02d' "$r")
    echo "    Route $r AM:   ROUTE-${abbr}-R${rPad}-AM"
    echo "    Route $r PM:   ROUTE-${abbr}-R${rPad}-PM"
  done
done

echo ""
echo -e "\033[36mAll passwords: Admin123!\033[0m"
echo ""

# --- Launch TypeScript runner ---

echo -e "\033[36mStarting Demo Simulation (GPS delay: ${GPS_DELAY}s)...\033[0m"
echo -e "\033[33mNote: Route 1 of each school will have full alert lifecycle.\033[0m"
echo -e "\033[33m      Critical alerts will halt the bus until resolved.\033[0m"
echo ""

npx tsx "$SCRIPT_DIR/demo-run.ts"

echo -e "\033[32mDemo Simulation Finished!\033[0m"
