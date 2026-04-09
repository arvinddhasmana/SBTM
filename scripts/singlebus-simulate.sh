#!/usr/bin/env bash
# =============================================================================
# SBTM Single-Bus Demo Simulator
# Features: 7 Students, 1 Bus, 1 School, 5 stops, AM/PM Routes, Road-mapped GPS.
# =============================================================================
set -euo pipefail

# Defaults
API_BASE="http://localhost:3001/api/v1"
INTERVAL_SECONDS="${1:-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="$SCRIPT_DIR/singlebus-config.json"

# --- Helper Functions ---

api_post() {
  local url="$1"
  local body="$2"
  local token="${3:-}"
  local headers=(-H "Content-Type: application/json")
  if [ -n "$token" ]; then
    headers+=(-H "Authorization: Bearer $token")
  fi
  curl -sf -X POST "$url" "${headers[@]}" -d "$body" 2>/dev/null || true
}

login_user() {
  local email="$1"
  local body="{\"email\":\"$email\",\"password\":\"Admin123!\"}"
  local response
  response=$(curl -sf -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "$body" 2>/dev/null) || true
  echo "$response"
}

get_token() {
  echo "$1" | grep -oP '"accessToken"\s*:\s*"\K[^"]+' 2>/dev/null || echo ""
}

# Node-based JSON helper
node_config() {
  local query="$1"
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
    const result = (function() { return $query; })();
    process.stdout.write(typeof result === 'object' ? JSON.stringify(result) : String(result));
  " 2>/dev/null || echo ""
}

# --- Initialization ---

if [ ! -f "$CONFIG_PATH" ]; then
  echo "Error: Configuration file not found at $CONFIG_PATH"
  exit 1
fi

echo -e "\033[36mAuthenticating...\033[0m"
ADMIN_AUTH=$(login_user "osta.admin@sbtm.demo")
ADMIN_TOKEN=$(get_token "$ADMIN_AUTH")
if [ -z "$ADMIN_TOKEN" ]; then echo "Admin auth failed"; exit 1; fi

DRIVER_EMAIL=$(node_config "config.bus.driverEmail")
DRIVER_AUTH=$(login_user "$DRIVER_EMAIL")
DRIVER_TOKEN=$(get_token "$DRIVER_AUTH")

VEHICLE_ID=$(node_config "config.bus.vehicleId")
DRIVER_ID=$(node_config "config.bus.driverId")
SCHOOL_ID=$(node_config "config.school.id")

# Fetch Route Details
AM_ROUTE_ID=$(node_config "config.am.routeId")
AM_POLYLINE=$(node_config "config.am.polyline")
PM_ROUTE_ID=$(node_config "config.pm.routeId")
PM_POLYLINE=$(node_config "config.pm.polyline")

# Ensure Schema is ready
docker exec "sbtm-postgres-1" psql -U postgres -d sbms -c "ALTER TABLE routes_reference ADD COLUMN IF NOT EXISTS direction text; ALTER TABLE routes_reference ADD COLUMN IF NOT EXISTS \"schoolId\" uuid; ALTER TABLE students_reference ADD COLUMN IF NOT EXISTS \"amStopId\" varchar(255); ALTER TABLE students_reference ADD COLUMN IF NOT EXISTS \"pmStopId\" varchar(255);" > /dev/null 2>&1 || true

# Sync route geometry and attributes to database
sync_route() {
  local id="$1"
  local name="$2"
  local dir="$3"
  local poly="$4"
  echo "Syncing route $id to database..."
  docker exec "sbtm-postgres-1" psql -U postgres -d sbms -c "
    INSERT INTO routes_reference (id, name, \"schoolId\", direction, polyline) 
    VALUES ('$id', '$name', '$SCHOOL_ID', '$dir', '$poly') 
    ON CONFLICT (id) DO UPDATE SET polyline = EXCLUDED.polyline, direction = EXCLUDED.direction, name = EXCLUDED.name, \"schoolId\" = EXCLUDED.\"schoolId\";" > /dev/null
}

sync_stops() {
  local route_id="$1"
  local config_key="$2"
  echo "Syncing $config_key stops to database..."
  docker exec "sbtm-postgres-1" psql -U postgres -d sbms -c "DELETE FROM route_stops_reference WHERE \"routeId\" = '$route_id';" > /dev/null
  
  # Use node to generate the SQL inserts for stops
  local sql
  sql=$(node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
    const key = '$config_key';
    const lap = key === '.am' ? config.am : config.pm;
    const inserts = lap.stops.map((stop, i) => {
        const seq = i + 1;
        const escapedLabel = stop.label.replace(/'/g, \"''\");
        return \"INSERT INTO route_stops_reference (id, \\\"routeId\\\", \\\"sequenceOrder\\\", \\\"stopName\\\", lat, lng) VALUES ('STOP-$route_id-\" + seq + \"', '$route_id', \" + seq + \", '\" + escapedLabel + \"', \" + stop.lat + \", \" + stop.lng + \");\";
    }).join('\n');
    console.log(inserts);
  ")
  
  # Execute the generated SQL
  if [ -n "$sql" ]; then
    docker exec -i "sbtm-postgres-1" psql -U postgres -d sbms -c "$sql" > /dev/null
  fi
}

sync_route "$AM_ROUTE_ID" "Single Bus AM" "AM" "$AM_POLYLINE"
sync_route "$PM_ROUTE_ID" "Single Bus PM" "PM" "$PM_POLYLINE"
sync_stops "$AM_ROUTE_ID" ".am"
sync_stops "$PM_ROUTE_ID" ".pm"

# Sync student names to database
echo "Syncing students to database..."
node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
  const schoolId = config.school.id;
  config.students.forEach(s => {
    process.stdout.write(\"INSERT INTO students (id, first_name, last_name, external_student_id, school_id, grade) VALUES ('\" + s.id + \"', '\" + s.firstName + \"', '\" + s.lastName + \"', '\" + s.id + \"', '\" + schoolId + \"', '1') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, grade = EXCLUDED.grade;\n\");
  });
" | docker exec -i "sbtm-postgres-1" psql -U postgres -d sbms > /dev/null

# Link parents to students and sync reference data
echo "Linking parents to students..."
node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
  if (!config.parents) { process.exit(0); }
  const schoolId = config.school.id;
  const amRouteId = config.am.routeId;
  const pmRouteId = config.pm.routeId;
  const routesCsv = amRouteId + ',' + pmRouteId;
  // Build student→stopId maps from config stops
  const amStopMap = {};
  const pmStopMap = {};
  config.am.stops.forEach((s, i) => { const sid = 'STOP-' + amRouteId + '-' + (i+1); s.students.forEach(id => { amStopMap[id] = sid; }); });
  config.pm.stops.forEach((s, i) => { const sid = 'STOP-' + pmRouteId + '-' + (i+1); s.students.forEach(id => { pmStopMap[id] = sid; }); });
  for (const parent of config.parents) {
    for (const studentId of parent.studentIds) {
      process.stdout.write(\"UPDATE students SET parent_user_id = '\" + parent.userId + \"' WHERE id = '\" + studentId + \"';\n\");
      const student = config.students.find(s => s.id === studentId);
      if (student) {
        const amSid = amStopMap[studentId] || '';
        const pmSid = pmStopMap[studentId] || '';
        process.stdout.write(\"INSERT INTO students_reference (id, \\\"firstName\\\", \\\"lastName\\\", grade, \\\"parentId\\\", \\\"schoolId\\\", \\\"assignedRouteId\\\", \\\"amRouteId\\\", \\\"pmRouteId\\\", \\\"amStopId\\\", \\\"pmStopId\\\") VALUES ('\" + studentId + \"', '\" + student.firstName + \"', '\" + student.lastName + \"', 1, '\" + parent.userId + \"', '\" + schoolId + \"', '\" + amRouteId + \"', '\" + amRouteId + \"', '\" + pmRouteId + \"', '\" + amSid + \"', '\" + pmSid + \"') ON CONFLICT (id) DO UPDATE SET \\\"parentId\\\" = EXCLUDED.\\\"parentId\\\", \\\"schoolId\\\" = EXCLUDED.\\\"schoolId\\\", \\\"assignedRouteId\\\" = EXCLUDED.\\\"assignedRouteId\\\", \\\"amRouteId\\\" = EXCLUDED.\\\"amRouteId\\\", \\\"pmRouteId\\\" = EXCLUDED.\\\"pmRouteId\\\", \\\"amStopId\\\" = EXCLUDED.\\\"amStopId\\\", \\\"pmStopId\\\" = EXCLUDED.\\\"pmStopId\\\", \\\"firstName\\\" = EXCLUDED.\\\"firstName\\\", \\\"lastName\\\" = EXCLUDED.\\\"lastName\\\";\n\");
      }
    }
    // Append simulation routes to childRouteIds (preserve existing, avoid duplicates)
    process.stdout.write(\"UPDATE users SET \\\"childRouteIds\\\" = CASE WHEN \\\"childRouteIds\\\" IS NULL OR \\\"childRouteIds\\\" = '' THEN '\" + routesCsv + \"' WHEN \\\"childRouteIds\\\" LIKE '%\" + amRouteId + \"%' THEN \\\"childRouteIds\\\" ELSE \\\"childRouteIds\\\" || ',\" + routesCsv + \"' END, \\\"schoolId\\\" = '\" + schoolId + \"' WHERE id = '\" + parent.userId + \"';\n\");
  }
" | docker exec -i "sbtm-postgres-1" psql -U postgres -d sbms > /dev/null

# Clear old location points to prevent duplicate bus on map
echo "Cleaning up old location data for $VEHICLE_ID..."
docker exec "sbtm-postgres-1" psql -U postgres -d sbms -c "DELETE FROM location_points WHERE \"vehicle_id\" = '$VEHICLE_ID';" > /dev/null

# Clear old fleet assignments and absences for clean demo
echo "Cleaning up old Phase C demo data..."
docker exec "sbtm-postgres-1" psql -U postgres -d sbms -c "
  DELETE FROM fleet_assignments WHERE \"schoolId\" = '$SCHOOL_ID';
  DELETE FROM student_absences WHERE \"schoolId\" = '$SCHOOL_ID';
" > /dev/null 2>&1 || true

# --- Run ---

echo -e "\033[36mStarting Single-Bus Simulation (Interval: ${INTERVAL_SECONDS}s)...\033[0m"
npx tsx scripts/singlebus-run.ts "$INTERVAL_SECONDS"

echo -e "\033[32mSimulation Finished Successfully!\033[0m"
