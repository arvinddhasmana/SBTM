#!/usr/bin/env bash
# =============================================================================
# SBTM v2 — Demo Verification
#
# Verifies seeded STAs/users, post-import transport data (if loaded), and
# login credentials against a running stack.
#
# Usage:
#   ./scripts/schema-seed/verify-demo.sh [DB_USER] [DB_NAME] [API_BASE]
#
# Defaults:
#   DB_USER  = postgres
#   DB_NAME  = sbms
#   API_BASE = http://localhost:3001/api/v1
#
# Seed-only rows are always verified.  Transport rows (boards, schools,
# students, routes) are checked but reported as INFO when absent — import
# has not been run yet.
# =============================================================================
set -euo pipefail

DATABASE_USER="${1:-postgres}"
DATABASE_NAME="${2:-sbms}"
API_BASE="${3:-http://localhost:3001/api/v1}"
CONTAINER_NAME="sbtm-postgres-1"

ALL_PASSED=true

echo -e "\033[36m--- SBTM v2 Demo Verification ---\033[0m"

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

  http_code=$(curl -o /dev/null -w "%{http_code}" -X GET "$url" \
    -H "Authorization: Bearer $token" 2>/dev/null)

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "  \033[32mOK: $label (HTTP $http_code)\033[0m"
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

# =============================================================================
# DATABASE CHECKS — SEED DATA (always present after init-db.sh)
# =============================================================================

echo -e "\033[36m[DB] Seed data checks\033[0m"

run_query "STAs (expect 2 — OSTA and RCJTC):" \
  "SELECT id, short_code, name FROM stx_sta ORDER BY short_code;"

run_query "Users by role (expect 1 SUPER_ADMIN + 2 STA_ADMIN):" \
  "SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;"

run_query "Seeded users:" \
  "SELECT email, role, anchor_kind, anchor_id FROM users ORDER BY email;"

# =============================================================================
# DATABASE CHECKS — TRANSPORT DATA (present only after import)
# =============================================================================

echo -e "\033[36m[DB] Transport data checks (INFO — requires import)\033[0m"

run_query "Boards per STA:" \
  "SELECT sta.short_code, COUNT(b.id) AS board_count
   FROM stx_sta sta
   LEFT JOIN stx_boards b ON b.sta_id = sta.id
   GROUP BY sta.short_code ORDER BY sta.short_code;"

run_query "Schools per STA:" \
  "SELECT sta.short_code, COUNT(sc.id) AS school_count
   FROM stx_sta sta
   LEFT JOIN stx_boards b ON b.sta_id = sta.id
   LEFT JOIN stx_schools sc ON sc.board_id = b.id
   GROUP BY sta.short_code ORDER BY sta.short_code;"

run_query "Students per STA:" \
  "SELECT sta.short_code, COUNT(st.id) AS student_count
   FROM stx_sta sta
   LEFT JOIN stx_students st ON st.sta_id = sta.id
   GROUP BY sta.short_code ORDER BY sta.short_code;"

run_query "Routes per STA (with shape source):" \
  "SELECT sta.short_code, r.stx_shape_source, COUNT(r.id) AS route_count
   FROM stx_sta sta
   LEFT JOIN routes r ON r.sta_id = sta.id
   GROUP BY sta.short_code, r.stx_shape_source ORDER BY sta.short_code, r.stx_shape_source;"

run_query "Stop-times count:" \
  "SELECT COUNT(*) AS stop_time_count FROM stop_times;"

run_query "Shapes rows count:" \
  "SELECT COUNT(*) AS shape_point_count FROM shapes;"

# =============================================================================
# DATABASE CHECKS — ALERTS (present only after import or manual creation)
# =============================================================================

echo -e "\033[36m[DB] Alert checks\033[0m"

run_query "Alerts by category and status:" \
  "SELECT category, status, COUNT(*) FROM stx_alerts GROUP BY category, status ORDER BY category, status;"

run_query "Alert audit entries (most recent 10):" \
  "SELECT alert_id, event_type, actor_role, created_at
   FROM stx_alert_audit ORDER BY created_at DESC LIMIT 10;"

# =============================================================================
# LOGIN CHECKS
# =============================================================================

echo -e "\033[36m[API] Login verification (password: Admin123!)\033[0m"

if ! wait_api_health "$API_BASE/health"; then
  echo -e "  \033[31mFAIL: API gateway not reachable at $API_BASE\033[0m"
  exit 1
fi

SEEDED_EMAILS=(
  "super.admin@sbtm.demo"
  "sta.admin@osta.sbtm.demo"
  "sta.admin@rcjtc.sbtm.demo"
)

for email in "${SEEDED_EMAILS[@]}"; do
  if ! test_login "$email"; then
    ALL_PASSED=false
  fi
done

# =============================================================================
# API DATA CHECKS — OSTA STA ADMIN
# =============================================================================

echo -e "\033[36m[API] STA Admin endpoint checks (OSTA)\033[0m"

OSTA_TOKEN=$(get_token "sta.admin@osta.sbtm.demo")

if [ -z "$OSTA_TOKEN" ]; then
  echo -e "  \033[31mFAIL: Could not get OSTA STA Admin token\033[0m"
  ALL_PASSED=false
else
  if ! test_api_get "STA Admin: GET /boards" "$API_BASE/boards" "$OSTA_TOKEN"; then
    ALL_PASSED=false
  fi
  if ! test_api_get "STA Admin: GET /alerts" "$API_BASE/alerts" "$OSTA_TOKEN"; then
    ALL_PASSED=false
  fi
fi

# =============================================================================
# API DATA CHECKS — SUPER ADMIN
# =============================================================================

echo -e "\033[36m[API] Super Admin endpoint checks\033[0m"

SUPER_TOKEN=$(get_token "super.admin@sbtm.demo")

if [ -z "$SUPER_TOKEN" ]; then
  echo -e "  \033[31mFAIL: Could not get Super Admin token\033[0m"
  ALL_PASSED=false
else
  if ! test_api_get "Super Admin: GET /boards" "$API_BASE/boards" "$SUPER_TOKEN"; then
    ALL_PASSED=false
  fi
fi

# =============================================================================
# RESULT
# =============================================================================

echo ""
if [ "$ALL_PASSED" = true ]; then
  echo -e "\033[32m✅ Verification passed.\033[0m"
  exit 0
else
  echo -e "\033[31m❌ Verification found issues.\033[0m"
  exit 1
fi
