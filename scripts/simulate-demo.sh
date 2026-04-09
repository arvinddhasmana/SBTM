#!/usr/bin/env bash
# =============================================================================
# SBTM Demo Simulator (Enhanced)
# Emits GPS, emergency alerts, late notifications, and route start/complete logs.
#
# Laps:
#   Lap 1: Morning AM routes (Board at Stops, Alight at School)
#   Lap 2: Evening PM routes (Board at School, Alight at Stops)
#
# Defaults:
#   - 2 Laps (AM then PM)
#   - Resets data before each lap
#   - Filters for routes with 10+ stops/students (fallback to all if none found)
# =============================================================================
set -euo pipefail

# Defaults
API_BASE="http://localhost:3001/api/v1"
COMPLIANCE_API="http://localhost:3007"
INTERVAL_SECONDS=5
LAPS=2
LATE_EVERY=2
EMERGENCY_EVERY=3
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRACK_CONFIG_PATH="$SCRIPT_DIR/demo-gps-track.json"
TRACK_NAME=""
NO_PRESENCE=false
STRICT_SEED_VALIDATION=false
NO_AUDIT=false
NO_LATE=false
NO_EMERGENCY=false
MIN_STOPS=10
MIN_STUDENTS=10

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-base) API_BASE="$2"; shift 2 ;;
    --compliance-api) COMPLIANCE_API="$2"; shift 2 ;;
    --interval) INTERVAL_SECONDS="$2"; shift 2 ;;
    --laps) LAPS="$2"; shift 2 ;;
    --late-every) LATE_EVERY="$2"; shift 2 ;;
    --emergency-every) EMERGENCY_EVERY="$2"; shift 2 ;;
    --track-config) TRACK_CONFIG_PATH="$2"; shift 2 ;;
    --track-name) TRACK_NAME="$2"; shift 2 ;;
    --no-presence) NO_PRESENCE=true; shift ;;
    --no-audit) NO_AUDIT=true; shift ;;
    --no-late) NO_LATE=true; shift ;;
    --no-emergency) NO_EMERGENCY=true; shift ;;
    --min-stops) MIN_STOPS="$2"; shift 2 ;;
    --min-students) MIN_STUDENTS="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

DEFAULT_BOARD_ID="b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
DEFAULT_SCHOOL_ID="c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"

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

  if echo "$response" | grep -q "accessToken"; then
    echo "$response"
  else
    echo -e "\033[31mAuth failed for $email\033[0m" >&2
    echo ""
  fi
}

get_token_from_response() {
  echo "$1" | grep -oP '"accessToken"\s*:\s*"\K[^"]+' 2>/dev/null || echo ""
}

get_user_id_from_response() {
  echo "$1" | grep -oP '"id"\s*:\s*"\K[^"]+' 2>/dev/null || echo ""
}

get_school_id_from_response() {
  echo "$1" | grep -oP '"schoolId"\s*:\s*"\K[^"]+' 2>/dev/null || echo ""
}

# Node-based JSON helper (reads from file to avoid shell escaping issues)
node_query() {
  local query="$1"
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$TRACK_CONFIG_PATH', 'utf8'));
    const result = (function() { return $query; })();
    if (result === undefined || result === null) {
        console.log('');
    } else if (typeof result === 'object') {
      console.log(JSON.stringify(result));
    } else {
      console.log(result);
    }
  " 2>/dev/null || echo ""
}

reset_demo_data() {
  echo -e "\033[33mResetting demo feed data...\033[0m"
  local CONTAINER_NAME="sbtm-postgres-1"
  docker exec "$CONTAINER_NAME" psql -U postgres -d sbms -c "
    TRUNCATE TABLE presence_event CASCADE;
    TRUNCATE TABLE location_points CASCADE;
    TRUNCATE TABLE emergency_alert CASCADE;
    TRUNCATE TABLE route_lifecycle_events CASCADE;
    TRUNCATE TABLE alert_notification_log CASCADE;
  " > /dev/null 2>&1 || echo -e "  \033[33mWarning: Data reset failed\033[0m"
}

# Generate an internal service JWT
INTERNAL_SERVICE_SECRET="${INTERNAL_SERVICE_SECRET:-dev_internal_secret}"
if command -v node &> /dev/null; then
  INTERNAL_SERVICE_TOKEN=$(node -e "
    const crypto = require('crypto');
    const encode = s => Buffer.from(s).toString('base64url');
    const header = encode(JSON.stringify({alg:'HS256',typ:'JWT'}));
    const payload = encode(JSON.stringify({sub:'demo-simulator',iss:'sbtm-internal',iat:Math.floor(Date.now()/1000)}));
    const sig = crypto.createHmac('sha256','${INTERNAL_SERVICE_SECRET}').update(header+'.'+payload).digest('base64url');
    console.log(header+'.'+payload+'.'+sig);
  " 2>/dev/null) || INTERNAL_SERVICE_TOKEN=""
fi

write_audit_log() {
  if [ "$NO_AUDIT" = true ]; then return; fi
  local action="$1"
  local resource="$2"
  local resource_id="$3"
  local details="${4:-{}}"
  local payload="{\"user_id\":\"$ADMIN_USER_ID\",\"school_id\":\"$ADMIN_SCHOOL_ID\",\"action\":\"$action\",\"resource\":\"$resource\",\"resource_id\":\"$resource_id\",\"details\":$details}"
  
  local auth_header=""
  if [ -n "$INTERNAL_SERVICE_TOKEN" ]; then
    auth_header="-H \"Authorization: Bearer $INTERNAL_SERVICE_TOKEN\""
  fi

  curl -sf -X POST "$COMPLIANCE_API/audit" \
    -H "Content-Type: application/json" \
    $auth_header \
    -d "$payload" > /dev/null 2>&1 || true
}

# --- Authenticate ---

echo -e "\033[36mAuthenticating demo users...\033[0m"
ADMIN_AUTH=$(login_user "osta.admin@sbtm.demo")
if [ -z "$ADMIN_AUTH" ]; then
  echo -e "\033[31mAdmin auth failed, exiting.\033[0m"
  exit 1
fi
ADMIN_TOKEN=$(get_token_from_response "$ADMIN_AUTH")
ADMIN_USER_ID=$(get_user_id_from_response "$ADMIN_AUTH")
ADMIN_SCHOOL_ID=$(get_school_id_from_response "$ADMIN_AUTH")
if [ -z "$ADMIN_SCHOOL_ID" ]; then ADMIN_SCHOOL_ID="$DEFAULT_SCHOOL_ID"; fi

declare -A DRIVER_TOKENS
for i in 1 2 11 12; do
  email="driver${i}@sbtm.demo"
  auth_response=$(login_user "$email")
  DRIVER_TOKENS["$email"]=$(get_token_from_response "$auth_response")
done

# --- Load Config ---

if [ ! -f "$TRACK_CONFIG_PATH" ]; then
  echo -e "\033[31mNo track config found at $TRACK_CONFIG_PATH.\033[0m"
  exit 1
fi

if [ -n "$TRACK_NAME" ]; then
  SELECTED_TRACK="$TRACK_NAME"
else
  SELECTED_TRACK=$(node_query "data.defaultTrack || Object.keys(data.tracks)[0]")
fi
echo -e "\033[90mUsing track '$SELECTED_TRACK'\033[0m"

# Get filtered route IDs
LAP_ROUTE_IDS=$(node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('$TRACK_CONFIG_PATH', 'utf8'));
  const routes = data.tracks['$SELECTED_TRACK'].routes;
  const filtered = routes.filter(r => {
    const stops = r.waypoints.filter(w => w.label && w.label.includes('Stop')).length;
    const students = r.students ? r.students.length : 0;
    return (stops >= $MIN_STOPS && students >= $MIN_STUDENTS);
  });
  const finalRoutes = filtered.length > 0 ? filtered : routes;
  console.log(finalRoutes.map(r => r.routeId).join(' '));
")

# --- Simulation loop ---

for ((lap = 1; lap <= LAPS; lap++)); do
  if [ $((lap % 2)) -eq 1 ]; then
    LAP_TYPE="Morning AM"
    LAP_DIR="AM"
  else
    LAP_TYPE="Evening PM"
    LAP_DIR="PM"
  fi

  echo -e "\033[35m--- Lap $lap/$LAPS: $LAP_TYPE ---\033[0m"
  reset_demo_data

  # Determine max steps for routes in this lap
  # (Simpler to just re-read the file in the loop or use a temp file for metadata)
  
  for ROUTE_ID in $LAP_ROUTE_IDS; do
    echo -e "\033[90mPreparing route $ROUTE_ID...\033[0m"
  done

  # We'll run routes sequentially for clarity in this demo, 
  # or we could implement parallel background pids.
  # Parallel is better for "all buses running at once".
  
  for ROUTE_ID in $LAP_ROUTE_IDS; do
    (
      # Get route metadata base64 encoded
      ROUTE_METADATA_B64=$(node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$TRACK_CONFIG_PATH', 'utf8'));
        const r = data.tracks['$SELECTED_TRACK'].routes.find(rr => rr.routeId === '$ROUTE_ID');
        console.log(Buffer.from(JSON.stringify(r)).toString('base64'));
      ")
      
      VEHICLE_ID=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).vehicleId)")
      DRIVER_EMAIL=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).driverEmail)")
      DRIVER_ID=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).driverId)")
      WP_COUNT=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).waypoints.length)")
      token="${DRIVER_TOKENS[$DRIVER_EMAIL]:-$ADMIN_TOKEN}"

      # Sync Route Polyline
      POLYLINE=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).polyline || '')")
      if [ -n "$POLYLINE" ]; then
         docker exec "sbtm-postgres-1" psql -U postgres -d sbms -c "
            INSERT INTO routes_reference (id, name, \"vehicleId\", \"driverId\", schedule, polyline) 
            VALUES ('$ROUTE_ID', '$ROUTE_ID', '$VEHICLE_ID', '$DRIVER_ID', '{}', '$POLYLINE')
            ON CONFLICT (id) DO UPDATE SET polyline = EXCLUDED.polyline;
         " > /dev/null 2>&1 || true
      fi

      write_audit_log "ROUTE_STARTED" "route" "$ROUTE_ID" "{\"vehicleId\":\"$VEHICLE_ID\",\"driverId\":\"$DRIVER_ID\",\"simulated\":true,\"lap\":\"$LAP_TYPE\"}"

      for ((step = 0; step < WP_COUNT; step++)); do
        EFFECTIVE_STEP=$step
        if [ "$LAP_DIR" = "PM" ]; then
          EFFECTIVE_STEP=$((WP_COUNT - 1 - step))
        fi

        WP_B64=$(node -e "console.log(Buffer.from(JSON.stringify(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).waypoints[$EFFECTIVE_STEP])).toString('base64'))")
        WP_LAT=$(node -e "console.log(JSON.parse(Buffer.from('$WP_B64', 'base64').toString()).lat)")
        WP_LNG=$(node -e "console.log(JSON.parse(Buffer.from('$WP_B64', 'base64').toString()).lng)")
        WP_LABEL=$(node -e "console.log(JSON.parse(Buffer.from('$WP_B64', 'base64').toString()).label || '')")
        WP_STUDENTS_LIST=$(node -e "
          const wp = JSON.parse(Buffer.from('$WP_B64', 'base64').toString());
          const r = JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString());
          const isStop = wp.label && wp.label.includes('Stop');
          const isSchool = wp.label && wp.label.includes('School');
          let students = [];
          if (isStop) {
            students = wp.students || (wp.student ? [wp.student] : []);
          } else if (isSchool) {
            students = r.students || [];
          }
          console.log(students.join(' '));
        " 2>/dev/null)
        WP_SPEED=$(node -e "console.log(JSON.parse(Buffer.from('$WP_B64', 'base64').toString()).speedKph || 30)")
        WP_PAUSE=$(node -e "console.log(JSON.parse(Buffer.from('$WP_B64', 'base64').toString()).pauseSeconds || 0)")
        timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

        # GPS update
        gps_payload="{\"vehicleId\":\"$VEHICLE_ID\",\"routeId\":\"$ROUTE_ID\",\"timestamp\":\"$timestamp\",\"lat\":$WP_LAT,\"lng\":$WP_LNG,\"speedKph\":$WP_SPEED}"
        api_post "$API_BASE/routes/locations" "$gps_payload" "$token" > /dev/null
        # Only log stops/start/school to avoid flood
        if [ -n "$WP_LABEL" ]; then
           echo -e "\033[32m$VEHICLE_ID ($LAP_DIR): $WP_LABEL\033[0m"
        fi

        # Alerts Logic
        HAS_DEVIATION=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).hasDeviationAlert || false)")
        HAS_PANIC=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).hasPanicAlert || false)")

        if [ "$HAS_DEVIATION" = "true" ] && [ "$step" -eq 3 ]; then
           SCHOOL_ID=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).schoolId || '$DEFAULT_SCHOOL_ID')")
           alert_payload="{\"schoolId\":\"$SCHOOL_ID\",\"vehicleId\":\"$VEHICLE_ID\",\"routeId\":\"$ROUTE_ID\",\"driverId\":\"$DRIVER_ID\",\"timestamp\":\"$timestamp\",\"lat\":$WP_LAT,\"lng\":$WP_LNG,\"eventType\":\"ROUTE_DEVIATION\"}"
           api_post "$API_BASE/emergency-events" "$alert_payload" "$token" > /dev/null
           echo -e "  \033[31m[ALERT] Deviation: $VEHICLE_ID\033[0m"
        fi

        if [ "$HAS_PANIC" = "true" ] && [ "$step" -eq 6 ]; then
           SCHOOL_ID=$(node -e "console.log(JSON.parse(Buffer.from('$ROUTE_METADATA_B64', 'base64').toString()).schoolId || '$DEFAULT_SCHOOL_ID')")
           alert_payload="{\"schoolId\":\"$SCHOOL_ID\",\"vehicleId\":\"$VEHICLE_ID\",\"routeId\":\"$ROUTE_ID\",\"driverId\":\"$DRIVER_ID\",\"timestamp\":\"$timestamp\",\"lat\":$WP_LAT,\"lng\":$WP_LNG,\"eventType\":\"PANIC_BUTTON\"}"
           api_post "$API_BASE/emergency-events" "$alert_payload" "$token" > /dev/null
           echo -e "  \033[31m[ALERT] Panic: $VEHICLE_ID\033[0m"
        fi

        # Presence Logic
        if [ "$NO_PRESENCE" = false ] && [ -n "$WP_STUDENTS_LIST" ]; then
          EVENT=""
          if [ "$LAP_DIR" = "AM" ]; then
             if [[ "$WP_LABEL" == *"Stop"* ]]; then EVENT="BOARD"; fi
             if [[ "$WP_LABEL" == *"School"* ]]; then EVENT="ALIGHT"; fi
          else
             if [[ "$WP_LABEL" == *"School"* ]]; then EVENT="BOARD"; fi
             if [[ "$WP_LABEL" == *"Stop"* ]]; then EVENT="ALIGHT"; fi
          fi

          if [ -n "$EVENT" ]; then
            for STUDENT_ID in $WP_STUDENTS_LIST; do
              presence_payload="{\"schoolId\":\"$ADMIN_SCHOOL_ID\",\"studentId\":\"$STUDENT_ID\",\"vehicleId\":\"$VEHICLE_ID\",\"routeId\":\"$ROUTE_ID\",\"eventType\":\"$EVENT\",\"timestamp\":\"$timestamp\",\"source\":\"MANUAL\"}"
              api_post "$API_BASE/student-presence-events" "$presence_payload" "$token" > /dev/null
              echo -e "  \033[32mPresence $EVENT: $STUDENT_ID\033[0m"
            done
          fi
        fi

        # Pause
        if [ "$WP_PAUSE" -gt 0 ]; then sleep "$WP_PAUSE"; fi
        sleep "$INTERVAL_SECONDS"
      done

      write_audit_log "ROUTE_COMPLETED" "route" "$ROUTE_ID" "{\"vehicleId\":\"$VEHICLE_ID\",\"driverId\":\"$DRIVER_ID\",\"simulated\":true}"
      echo -e "\033[36m$VEHICLE_ID: Completed $LAP_TYPE\033[0m"
    ) &
  done
  wait
done

echo -e "\033[36mSimulation complete.\033[0m"
