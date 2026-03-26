#!/usr/bin/env bash
# =============================================================================
# SBTM Demo Simulator
# Emits GPS, emergency alerts, late notifications, and route start/complete logs.
#
# Usage:
#   ./scripts/simulate-demo.sh
#   ./scripts/simulate-demo.sh --interval 5 --laps 3
#   ./scripts/simulate-demo.sh --no-presence --no-emergency
# =============================================================================
set -euo pipefail

# Defaults
API_BASE="http://localhost:3001/api/v1"
COMPLIANCE_API="http://localhost:3007"
INTERVAL_SECONDS=5
LAPS=3
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
    --strict-seed-validation) STRICT_SEED_VALIDATION=true; shift ;;
    --no-audit) NO_AUDIT=true; shift ;;
    --no-late) NO_LATE=true; shift ;;
    --no-emergency) NO_EMERGENCY=true; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

DEFAULT_BOARD_ID="b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
DEFAULT_SCHOOL_ID="c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
SEEDED_ROUTE_IDS=("ROUTE-R01" "ROUTE-R02" "ROUTE-R03" "ROUTE-R04" "ROUTE-R05" "ROUTE-R06" "ROUTE-R07" "ROUTE-R08" "ROUTE-R09" "ROUTE-R10" "ROUTE-R11" "ROUTE-R12" "ROUTE-R13" "ROUTE-R14" "ROUTE-R15" "ROUTE-R16" "ROUTE-R17" "ROUTE-R18" "ROUTE-R19" "ROUTE-R20")
SEEDED_VEHICLE_IDS=("BUS-01" "BUS-02" "BUS-03" "BUS-04" "BUS-05" "BUS-06" "BUS-07" "BUS-08" "BUS-09" "BUS-10" "BUS-11" "BUS-12" "BUS-13" "BUS-14" "BUS-15" "BUS-16" "BUS-17" "BUS-18" "BUS-19" "BUS-20")
SEEDED_STUDENT_IDS=("STUDENT-001" "STUDENT-002" "STUDENT-003" "STUDENT-004" "STUDENT-005" "STUDENT-006" "STUDENT-007" "STUDENT-008" "STUDENT-009" "STUDENT-010" "STUDENT-011" "STUDENT-012" "STUDENT-013" "STUDENT-014" "STUDENT-015")
SEEDED_DRIVER_EMAILS=("driver1@sbtm.demo" "driver2@sbtm.demo" "driver3@sbtm.demo" "driver4@sbtm.demo" "driver5@sbtm.demo" "driver6@sbtm.demo" "driver7@sbtm.demo" "driver8@sbtm.demo" "driver9@sbtm.demo" "driver10@sbtm.demo" "driver11@sbtm.demo" "driver12@sbtm.demo" "driver13@sbtm.demo" "driver14@sbtm.demo" "driver15@sbtm.demo" "driver16@sbtm.demo" "driver17@sbtm.demo" "driver18@sbtm.demo" "driver19@sbtm.demo" "driver20@sbtm.demo")
SEEDED_DRIVER_IDS=("driver-001" "driver-002" "driver-003" "driver-004" "driver-005" "driver-006" "driver-007" "driver-008" "driver-009" "driver-010" "driver-011" "driver-012" "driver-013" "driver-014" "driver-015" "driver-016" "driver-017" "driver-018" "driver-019" "driver-020")
# Live driver routes (real GPS from phone app — simulator still runs for when driver is offline)
LIVE_DRIVER_ROUTES=("ROUTE-R01" "ROUTE-R02" "ROUTE-R11" "ROUTE-R12")

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

write_audit_log() {
  if [ "$NO_AUDIT" = true ]; then return; fi
  local action="$1"
  local resource="$2"
  local resource_id="$3"
  local details="${4:-{}}"
  local payload
  payload="{\"user_id\":\"$ADMIN_USER_ID\",\"school_id\":\"$ADMIN_SCHOOL_ID\",\"action\":\"$action\",\"resource\":\"$resource\",\"resource_id\":\"$resource_id\",\"details\":$details}"
  curl -sf -X POST "$COMPLIANCE_API/audit" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null 2>&1 || \
    echo -e "  \033[33mAudit log failed\033[0m" >&2
}

contains_element() {
  local match="$1"
  shift
  for item in "$@"; do
    [[ "$item" == "$match" ]] && return 0
  done
  return 1
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
for i in $(seq 1 20); do
  email="driver${i}@sbtm.demo"
  auth_response=$(login_user "$email")
  DRIVER_TOKENS["$email"]=$(get_token_from_response "$auth_response")
done

# --- Route configuration ---

# Built-in demo routes (used if no track config file found)
# Format: routeId|vehicleId|driverEmail|driverId|students(comma-sep)|waypoints(semicolon-sep, each: lat,lng,label[,student[,speedKph[,pauseSeconds]]])
BUILTIN_ROUTES=(
  "ROUTE-R01|BUS-01|driver1@sbtm.demo|driver-001|STUDENT-001,STUDENT-021|45.3680,-75.6690,Start;45.3735,-75.6740,Stop 1,STUDENT-001;45.3770,-75.6800,Stop 2,STUDENT-021;45.3810,-75.6850,Stop 3;45.3850,-75.6910,Stop 4;45.3876,-75.6960,School"
  "ROUTE-R02|BUS-02|driver2@sbtm.demo|driver-002|STUDENT-002,STUDENT-022|45.3820,-75.6980,Start;45.3835,-75.6975,Stop 1,STUDENT-002;45.3848,-75.6972,Stop 2,STUDENT-022;45.3860,-75.6968,Stop 3;45.3870,-75.6963,Stop 4;45.3876,-75.6960,School"
  "ROUTE-R11|BUS-11|driver11@sbtm.demo|driver-011|STUDENT-011,STUDENT-031|45.3900,-75.7600,Start;45.3912,-75.7520,Stop 1,STUDENT-011;45.3925,-75.7440,Stop 2,STUDENT-031;45.3938,-75.7370,Stop 3;45.3950,-75.7330,Stop 4;45.3960,-75.7300,School"
  "ROUTE-R12|BUS-12|driver12@sbtm.demo|driver-012|STUDENT-012,STUDENT-032|45.4000,-75.7050,Start;45.3992,-75.7110,Stop 1,STUDENT-012;45.3985,-75.7170,Stop 2,STUDENT-032;45.3978,-75.7220,Stop 3;45.3970,-75.7265,Stop 4;45.3960,-75.7300,School"
)

# Try to load track config from JSON file
USE_TRACK_CONFIG=false
if [ -f "$TRACK_CONFIG_PATH" ]; then
  if command -v jq &> /dev/null; then
    USE_TRACK_CONFIG=true
    echo -e "\033[90mLoaded track config from $TRACK_CONFIG_PATH\033[0m"
  else
    echo -e "\033[33mWarning: jq not installed, using built-in routes. Install jq for JSON track config support.\033[0m"
  fi
fi

# Count routes and max waypoints
if [ "$USE_TRACK_CONFIG" = true ]; then
  # Determine track to use
  if [ -n "$TRACK_NAME" ]; then
    SELECTED_TRACK="$TRACK_NAME"
  else
    SELECTED_TRACK=$(jq -r '.defaultTrack // empty' "$TRACK_CONFIG_PATH" 2>/dev/null || echo "")
    if [ -z "$SELECTED_TRACK" ]; then
      SELECTED_TRACK=$(jq -r '.tracks | keys[0] // empty' "$TRACK_CONFIG_PATH" 2>/dev/null || echo "")
    fi
  fi

  if [ -n "$SELECTED_TRACK" ]; then
    echo -e "\033[90mUsing track '$SELECTED_TRACK'\033[0m"
    ROUTE_COUNT=$(jq -r ".tracks.\"$SELECTED_TRACK\".routes | length" "$TRACK_CONFIG_PATH" 2>/dev/null || echo "0")
  else
    ROUTE_COUNT=$(jq -r '.routes | length' "$TRACK_CONFIG_PATH" 2>/dev/null || echo "0")
  fi

  if [ "$ROUTE_COUNT" -eq 0 ]; then
    echo -e "\033[33mNo routes found in track config, using built-in routes.\033[0m"
    USE_TRACK_CONFIG=false
  fi
fi

if [ "$USE_TRACK_CONFIG" = false ]; then
  ROUTE_COUNT=${#BUILTIN_ROUTES[@]}
fi

echo -e "\033[36mStarting demo simulation...\033[0m"
echo -e "\033[90mGPS interval: ${INTERVAL_SECONDS} sec, laps: $LAPS\033[0m"
echo -e "\033[90mPresence tracking: $(if [ "$NO_PRESENCE" = true ]; then echo 'Disabled'; else echo 'Enabled (default)'; fi)\033[0m"

# Expected durations (minutes)
declare -A ROUTE_EXPECTED_DURATIONS
for rid in "${SEEDED_ROUTE_IDS[@]}"; do
  ROUTE_EXPECTED_DURATIONS["$rid"]=30
done

declare -A ROUTE_START_TIMES

# Helper to get route data
get_route_field() {
  local route_idx="$1"
  local field="$2"

  if [ "$USE_TRACK_CONFIG" = true ]; then
    local base_path
    if [ -n "$SELECTED_TRACK" ]; then
      base_path=".tracks.\"$SELECTED_TRACK\".routes[$route_idx]"
    else
      base_path=".routes[$route_idx]"
    fi
    jq -r "$base_path.$field // empty" "$TRACK_CONFIG_PATH" 2>/dev/null || echo ""
  else
    local route_data="${BUILTIN_ROUTES[$route_idx]}"
    IFS='|' read -r routeId vehicleId driverEmail driverId students waypoints <<< "$route_data"
    case "$field" in
      routeId) echo "$routeId" ;;
      vehicleId) echo "$vehicleId" ;;
      driverEmail) echo "$driverEmail" ;;
      driverId) echo "$driverId" ;;
      *) echo "" ;;
    esac
  fi
}

get_waypoint_count() {
  local route_idx="$1"
  if [ "$USE_TRACK_CONFIG" = true ]; then
    local base_path
    if [ -n "$SELECTED_TRACK" ]; then
      base_path=".tracks.\"$SELECTED_TRACK\".routes[$route_idx]"
    else
      base_path=".routes[$route_idx]"
    fi
    jq -r "$base_path.waypoints | length" "$TRACK_CONFIG_PATH" 2>/dev/null || echo "0"
  else
    local route_data="${BUILTIN_ROUTES[$route_idx]}"
    IFS='|' read -r _ _ _ _ _ waypoints <<< "$route_data"
    echo "$waypoints" | tr ';' '\n' | wc -l
  fi
}

get_waypoint_field() {
  local route_idx="$1"
  local wp_idx="$2"
  local field="$3"

  if [ "$USE_TRACK_CONFIG" = true ]; then
    local base_path
    if [ -n "$SELECTED_TRACK" ]; then
      base_path=".tracks.\"$SELECTED_TRACK\".routes[$route_idx]"
    else
      base_path=".routes[$route_idx]"
    fi
    jq -r "$base_path.waypoints[$wp_idx].$field // empty" "$TRACK_CONFIG_PATH" 2>/dev/null || echo ""
  else
    local route_data="${BUILTIN_ROUTES[$route_idx]}"
    IFS='|' read -r _ _ _ _ _ waypoints <<< "$route_data"
    local wp
    wp=$(echo "$waypoints" | tr ';' '\n' | sed -n "$((wp_idx + 1))p")
    IFS=',' read -r lat lng label student speedKph pauseSeconds <<< "$wp"
    case "$field" in
      lat) echo "$lat" ;;
      lng) echo "$lng" ;;
      label) echo "$label" ;;
      student) echo "${student:-}" ;;
      speedKph) echo "${speedKph:-30}" ;;
      pauseSeconds) echo "${pauseSeconds:-0}" ;;
      *) echo "" ;;
    esac
  fi
}

# Calculate max waypoints across routes
MAX_STEPS=0
for ((r = 0; r < ROUTE_COUNT; r++)); do
  wc=$(get_waypoint_count "$r")
  if [ "$wc" -gt "$MAX_STEPS" ]; then MAX_STEPS=$wc; fi
done

if [ "$MAX_STEPS" -lt 1 ]; then
  echo -e "\033[31mNo waypoints configured. Check the track config.\033[0m"
  exit 1
fi

# --- Simulation loop ---

for ((lap = 1; lap <= LAPS; lap++)); do
  echo -e "\033[35mLap $lap/$LAPS\033[0m"

  for ((step = 0; step < MAX_STEPS; step++)); do
    for ((r = 0; r < ROUTE_COUNT; r++)); do
      wp_count=$(get_waypoint_count "$r")
      if [ "$step" -ge "$wp_count" ]; then continue; fi

      route_id=$(get_route_field "$r" "routeId")
      vehicle_id=$(get_route_field "$r" "vehicleId")
      driver_email=$(get_route_field "$r" "driverEmail")
      driver_id=$(get_route_field "$r" "driverId")
      wp_lat=$(get_waypoint_field "$r" "$step" "lat")
      wp_lng=$(get_waypoint_field "$r" "$step" "lng")
      wp_label=$(get_waypoint_field "$r" "$step" "label")
      wp_student=$(get_waypoint_field "$r" "$step" "student")
      wp_speed=$(get_waypoint_field "$r" "$step" "speedKph")
      wp_pause=$(get_waypoint_field "$r" "$step" "pauseSeconds")

      timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      token="${DRIVER_TOKENS[$driver_email]:-$ADMIN_TOKEN}"

      if [ -z "$wp_speed" ] || [ "$wp_speed" = "null" ]; then wp_speed=30; fi
      if [ -z "$wp_pause" ] || [ "$wp_pause" = "null" ]; then wp_pause=0; fi

      # Track route start
      if [ "$lap" -eq 1 ] && [ "$step" -eq 0 ]; then
        ROUTE_START_TIMES["$route_id"]=$(date +%s)
        write_audit_log "ROUTE_STARTED" "route" "$route_id" \
          "{\"vehicleId\":\"$vehicle_id\",\"driverId\":\"$driver_id\",\"simulated\":true}"
      fi

      # GPS update
      gps_payload="{\"vehicleId\":\"$vehicle_id\",\"routeId\":\"$route_id\",\"timestamp\":\"$timestamp\",\"lat\":$wp_lat,\"lng\":$wp_lng,\"speedKph\":$wp_speed}"
      result=$(api_post "$API_BASE/routes/locations" "$gps_payload" "$token")
      if [ $? -eq 0 ]; then
        echo -e "\033[32m$vehicle_id: $wp_label\033[0m"
      else
        echo -e "\033[31mGPS failed for $vehicle_id\033[0m"
      fi

      # Pause at stop
      if [ "$wp_pause" -gt 0 ]; then
        echo -e "  \033[90mPausing for ${wp_pause} seconds...\033[0m"
        sleep "$wp_pause"
      fi

      # Presence
      if [ "$NO_PRESENCE" = false ] && [ -n "$wp_student" ] && [ "$wp_student" != "null" ]; then
        presence_payload="{\"studentId\":\"$wp_student\",\"vehicleId\":\"$vehicle_id\",\"routeId\":\"$route_id\",\"eventType\":\"BOARD\",\"timestamp\":\"$timestamp\",\"source\":\"MANUAL\"}"
        api_post "$API_BASE/student-presence-events" "$presence_payload" "$token" > /dev/null
        echo -e "  \033[32mPresence BOARD: $wp_student\033[0m"
      fi

      # Late detection
      if [ "$NO_LATE" = false ] && [[ "$wp_label" == *"Stop"* ]] && [ -n "${ROUTE_START_TIMES[$route_id]:-}" ]; then
        start_time=${ROUTE_START_TIMES[$route_id]}
        now=$(date +%s)
        elapsed_minutes=$(( (now - start_time) / 60 ))
        expected_duration=${ROUTE_EXPECTED_DURATIONS[$route_id]:-30}
        expected_minutes=$(( expected_duration * step / wp_count ))
        delay_minutes=$((elapsed_minutes - expected_minutes))

        if [ "$delay_minutes" -gt 5 ]; then
          late_payload="{\"vehicleId\":\"$vehicle_id\",\"routeId\":\"$route_id\",\"driverId\":\"$driver_id\",\"timestamp\":\"$timestamp\",\"lat\":$wp_lat,\"lng\":$wp_lng,\"eventType\":\"OTHER\"}"
          api_post "$API_BASE/emergency-events" "$late_payload" "$token" > /dev/null
          echo -e "  \033[33mLate notice: ~${delay_minutes} min behind schedule\033[0m"
          write_audit_log "ROUTE_DELAY" "route" "$route_id" \
            "{\"vehicleId\":\"$vehicle_id\",\"driverId\":\"$driver_id\",\"stopName\":\"$wp_label\",\"delayMinutes\":$delay_minutes,\"simulated\":true}"
        fi
      fi

      # Emergency
      if [ "$NO_EMERGENCY" = false ] && [ "$EMERGENCY_EVERY" -gt 0 ] && [ $((lap % EMERGENCY_EVERY)) -eq 0 ] && [ "$wp_label" = "Stop 1" ]; then
        panic_payload="{\"vehicleId\":\"$vehicle_id\",\"routeId\":\"$route_id\",\"driverId\":\"$driver_id\",\"timestamp\":\"$timestamp\",\"lat\":$wp_lat,\"lng\":$wp_lng,\"eventType\":\"PANIC_BUTTON\"}"
        api_post "$API_BASE/emergency-events" "$panic_payload" "$token" > /dev/null
        echo -e "  \033[31mEmergency PANIC alert sent\033[0m"
      fi

      # Route completed
      if [ "$lap" -eq "$LAPS" ] && [ "$step" -eq $((wp_count - 1)) ]; then
        write_audit_log "ROUTE_COMPLETED" "route" "$route_id" \
          "{\"vehicleId\":\"$vehicle_id\",\"driverId\":\"$driver_id\",\"simulated\":true}"
      fi
    done

    sleep "$INTERVAL_SECONDS"
  done
done

echo -e "\033[36mSimulation complete.\033[0m"
