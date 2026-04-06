#!/usr/bin/env bash
# =============================================================================
# SBTM Demo Verification (Single-Bus Demo)
# Verifies seeded users/roles, tenant entities, and login credentials.
# =============================================================================
set -euo pipefail

DATABASE_USER="${1:-postgres}"
DATABASE_NAME="${2:-sbms}"
API_BASE="${3:-http://localhost:3001/api/v1}"
CONTAINER_NAME="sbtm_antigravity-postgres-1"

ALL_PASSED=true

echo -e "\033[36m--- SBTM Demo Verification ---\033[0m"

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

run_query "Seeded demo users:" \
  "SELECT email, role, \"schoolId\" FROM users WHERE email LIKE '%@sbtm.demo' ORDER BY email;"

run_query "Students with AM/PM route assignments:" \
  "SELECT id, \"firstName\", \"lastName\", \"amRouteId\", \"pmRouteId\" FROM students_reference ORDER BY id;"

run_query "Route references:" \
  "SELECT id, name, \"vehicleId\", \"driverId\" FROM routes_reference ORDER BY id;"

# --- Login Checks ---

echo -e "\033[33mLogin verification (Admin123!):\033[0m"
if ! wait_api_health "$API_BASE/health"; then
  echo -e "  \033[31mFAIL: API gateway is not reachable at $API_BASE\033[0m"
  exit 1
fi

EMAILS=("osta.admin@sbtm.demo" "school.admin@sbtm.demo" "driver1@sbtm.demo" "parent1@sbtm.demo")

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
PARENT_TOKEN=$(get_token "parent1@sbtm.demo")
if [ -n "$PARENT_TOKEN" ]; then
  if ! test_api_get "Parent1: /parent/children" "$API_BASE/parent/children" "$PARENT_TOKEN"; then
    ALL_PASSED=false
  fi
  if ! test_api_get "Parent1: /routes/ROUTE-SingleBus-AM/live-location" "$API_BASE/routes/ROUTE-SingleBus-AM/live-location" "$PARENT_TOKEN"; then
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
