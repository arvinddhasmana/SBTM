#!/usr/bin/env bash
# =============================================================================
# SBTM Demo Verification (6-School Demo)
# Verifies seeded users/roles, tenant entities, and login credentials.
# =============================================================================
set -euo pipefail

DATABASE_USER="${1:-postgres}"
DATABASE_NAME="${2:-sbms}"
API_BASE="${3:-http://localhost:3001/api/v1}"
CONTAINER_NAME="sbtm-postgres-1"

ALL_PASSED=true

echo -e "\033[36m--- SBTM Demo Verification (6-School) ---\033[0m"

run_query() {
  local label="$1"
  local sql="$2"
  echo -e "\033[33m$label\033[0m"
  echo "$sql" | docker exec -i "$CONTAINER_NAME" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" -t
}

test_login() {
  local email="$1"
  local response
  response=$(curl -sf -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Admin123!\"}" 2>/dev/null) || true

  if echo "$response" | grep -q "accessToken"; then
    echo -e "  \033[32mOK: $email\033[0m"
    return 0
  else
    echo -e "  \033[31mFAIL: $email\033[0m"
    return 1
  fi
}

get_token() {
  local email="$1"
  curl -sf -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Admin123!\"}" 2>/dev/null \
    | grep -oP '"accessToken"\s*:\s*"\K[^"]+' || echo ""
}

test_api_get() {
  local label="$1"
  local url="$2"
  local token="$3"
  local expected_status="${4:-200}"
  local http_code

  http_code=$(curl -sf -o /dev/null -w "%{http_code}" -X GET "$url" \
    -H "Authorization: Bearer $token" 2>/dev/null) || http_code=$(curl -o /dev/null -w "%{http_code}" -X GET "$url" \
    -H "Authorization: Bearer $token" 2>/dev/null)

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "  \033[32mOK: $label (expected $expected_status)\033[0m"
    return 0
  else
    echo -e "  \033[31mFAIL: $label -> HTTP $http_code (expected $expected_status)\033[0m"
    return 1
  fi
}

wait_api_health() {
  local url="$1"
  echo -e "  \033[90mChecking API health at $url...\033[0m"
  for i in $(seq 1 30); do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo -e "  \033[32mAPI is healthy!\033[0m"
      return 0
    fi
    if [ "$i" -eq 1 ]; then
      echo -e "  \033[90mAPI not ready yet, waiting...\033[0m"
    elif [ $((i % 5)) -eq 0 ]; then
      echo -e "  \033[90mStill waiting... ($i/30)\033[0m"
    fi
    sleep 3
  done
  echo -e "  \033[31mAPI health check timed out after 90 seconds\033[0m"
  return 1
}

# --- Database Checks ---

run_query "Tenant entities:" \
  "SELECT 'school_boards', COUNT(*) FROM school_boards;
SELECT 'schools', COUNT(*) FROM schools;"

run_query "Users by role:" \
  "SELECT role, COUNT(*) FROM users WHERE email LIKE '%@sbtm.demo' GROUP BY role ORDER BY role;"

run_query "Seeded demo users (sample):" \
  "SELECT email, role, \"schoolId\" FROM users WHERE email LIKE '%@sbtm.demo' ORDER BY email LIMIT 30;"

run_query "Route counts by school (60 expected total):" \
  "SELECT s.name, COUNT(r.id) AS route_count FROM routes r JOIN schools s ON r.\"schoolId\" = s.id GROUP BY s.name ORDER BY s.name;"

run_query "Route sample (UUID ids):" \
  "SELECT id, name, \"vehicleId\", \"schoolId\", direction FROM routes ORDER BY name LIMIT 12;"

run_query "Students (90 expected):" \
  "SELECT COUNT(*) AS student_count FROM students;"

run_query "Route stops (expected ~300-400):" \
  "SELECT COUNT(*) AS stop_count FROM route_stops;"

# --- Login Checks ---

echo -e "\033[33mLogin verification (Admin123!):\033[0m"
if ! wait_api_health "$API_BASE/health"; then
  echo -e "  \033[31mFAIL: API gateway is not reachable at $API_BASE\033[0m"
  exit 1
fi

# Test representative logins across roles
EMAILS=(
  "osta.admin@sbtm.demo"
  "ocdsb.admin@sbtm.demo"
  "ocsb.admin@sbtm.demo"
  "admin.stbern@sbtm.demo"
  "admin.jyoung@sbtm.demo"
  "driver.stbern@sbtm.demo"
  "driver.allsnt@sbtm.demo"
  "parent1.stbern@sbtm.demo"
  "parent1.jyoung@sbtm.demo"
)

for email in "${EMAILS[@]}"; do
  if ! test_login "$email"; then
    ALL_PASSED=false
  fi
done

# --- API Data Checks ---

echo -e "\033[33mAPI demo data checks (as OSTA admin):\033[0m"
OSTA_TOKEN=$(get_token "osta.admin@sbtm.demo")

if [ -z "$OSTA_TOKEN" ]; then
  echo -e "  \033[31mFAIL: Could not get OSTA admin token\033[0m"
  ALL_PASSED=false
else
  if ! test_api_get "OSTA Admin: /students" "$API_BASE/students" "$OSTA_TOKEN"; then
    ALL_PASSED=false
  fi
fi

# --- Parent API Checks ---

echo -e "\033[33mParent API checks:\033[0m"
PARENT_TOKEN=$(get_token "parent1.stbern@sbtm.demo")
if [ -n "$PARENT_TOKEN" ]; then
  if ! test_api_get "Parent (stbern): /parent/children" "$API_BASE/parent/children" "$PARENT_TOKEN"; then
    ALL_PASSED=false
  fi
  # Resolve a real route UUID from the DB for the live-location smoke test
  STBERN_ROUTE_UUID=$(docker exec "$CONTAINER_NAME" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" -t -A -c \
    "SELECT r.id FROM routes r JOIN schools s ON r.\"schoolId\" = s.id WHERE s.name ILIKE '%bernadette%' AND r.direction = 'AM' LIMIT 1;" 2>/dev/null || true)
  if [ -n "$STBERN_ROUTE_UUID" ]; then
    if ! test_api_get "Parent (stbern): /routes/$STBERN_ROUTE_UUID/live-location" "$API_BASE/routes/$STBERN_ROUTE_UUID/live-location" "$PARENT_TOKEN" 200; then
      ALL_PASSED=false
    fi
  fi
fi

# --- Driver API Checks ---

echo -e "\033[33mDriver API checks:\033[0m"
DRIVER_TOKEN=$(get_token "driver.stbern@sbtm.demo")
if [ -n "$DRIVER_TOKEN" ]; then
  if ! test_api_get "Driver (stbern): /driver/me/schedule" "$API_BASE/driver/me/schedule" "$DRIVER_TOKEN"; then
    ALL_PASSED=false
  fi
fi

# --- Alert Governance Checks (Phase B) ---

echo -e "\033[33mAlert governance checks:\033[0m"

run_query "Alert counts by tier:" \
  "SELECT tier, COUNT(*) FROM emergency_alert GROUP BY tier ORDER BY tier;"

run_query "Alert counts by status:" \
  "SELECT status, COUNT(*) FROM emergency_alert GROUP BY status ORDER BY status;"

run_query "Audit log summary:" \
  "SELECT \"eventType\", COUNT(*) FROM alert_audit_log GROUP BY \"eventType\" ORDER BY \"eventType\";"

run_query "Recent audit log entries:" \
  "SELECT \"alertId\", \"eventType\", \"actorRole\", \"escalationLevel\", \"eventTimestamp\" FROM alert_audit_log ORDER BY \"eventTimestamp\" DESC LIMIT 10;"

run_query "Confirmed/False-alarm alerts:" \
  "SELECT id, \"eventType\", status, tier, \"confirmedBy\", \"confirmedAt\" FROM emergency_alert WHERE status IN ('CONFIRMED', 'FALSE_ALARM') ORDER BY \"createdAt\" DESC LIMIT 5;"

if [ -n "$OSTA_TOKEN" ]; then
  if ! test_api_get "OSTA Admin: /alerts" "$API_BASE/alerts" "$OSTA_TOKEN"; then
    ALL_PASSED=false
  fi
  if ! test_api_get "OSTA Admin: /alerts/active" "$API_BASE/alerts/active" "$OSTA_TOKEN"; then
    ALL_PASSED=false
  fi
fi

# --- Result ---

if [ "$ALL_PASSED" = true ]; then
  echo -e "\033[32mVerification passed.\033[0m"
  exit 0
else
  echo -e "\033[31mVerification found issues.\033[0m"
  exit 1
fi
