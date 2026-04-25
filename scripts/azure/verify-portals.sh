#!/usr/bin/env bash
# scripts/azure/verify-portals.sh
# Verifies that the admin + parent Static Web Apps and the API gateway are
# reachable, that authentication works end-to-end, and that CORS is correctly
# configured for the deployed origins.
#
# Usage:
#   bash scripts/azure/verify-portals.sh [demo|production]
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed (review the matrix at the end)
#
# Environment variables:
#   DEMO_LOGIN_EMAIL    (default super.admin@sbtm.demo)
#   DEMO_LOGIN_PASSWORD (default Admin123!)
#   QUICK=1             skips login + CORS checks (used by cost-start.sh)

set -uo pipefail

ENVIRONMENT="${1:-demo}"
QUICK="${QUICK:-0}"

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RESOURCE_GROUP="sbtm-rg"
else
  RESOURCE_GROUP="sbtm-demo-rg"
fi

PARAMS_FILE="infra/azure/parameters.${ENVIRONMENT}.json"
CUSTOM_DOMAIN=""
if [[ -f "${PARAMS_FILE}" ]] && command -v jq >/dev/null 2>&1; then
  CUSTOM_DOMAIN=$(jq -r '.parameters.customDomain.value // ""' "${PARAMS_FILE}")
fi

ADMIN_SWA_NAME="sbtm-admin-${ENVIRONMENT}"
PARENT_SWA_NAME="sbtm-parent-${ENVIRONMENT}"
ADMIN_DEFAULT_HOST=$(az staticwebapp show -g "${RESOURCE_GROUP}" -n "${ADMIN_SWA_NAME}" --query defaultHostname -o tsv 2>/dev/null || echo "")
PARENT_DEFAULT_HOST=$(az staticwebapp show -g "${RESOURCE_GROUP}" -n "${PARENT_SWA_NAME}" --query defaultHostname -o tsv 2>/dev/null || echo "")

ADMIN_CUSTOM_URL="https://admin.${CUSTOM_DOMAIN}"
PARENT_CUSTOM_URL="https://parent.${CUSTOM_DOMAIN}"
API_URL="https://api.${CUSTOM_DOMAIN}"

DEMO_LOGIN_EMAIL="${DEMO_LOGIN_EMAIL:-super.admin@sbtm.demo}"
DEMO_LOGIN_PASSWORD="${DEMO_LOGIN_PASSWORD:-Admin123!}"

# Color helpers (no-op when not a TTY)
if [[ -t 1 ]]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; CYAN=""; RESET=""
fi

declare -a RESULTS_LABEL
declare -a RESULTS_STATUS
declare -a RESULTS_DETAIL
FAILURES=0

record() {
  # $1 status (PASS|FAIL|SKIP|WARN), $2 label, $3 detail
  RESULTS_STATUS+=("$1"); RESULTS_LABEL+=("$2"); RESULTS_DETAIL+=("$3")
  [[ "$1" == "FAIL" ]] && FAILURES=$((FAILURES + 1))
}

check_url_200() {
  local label="$1" url="$2"
  if [[ -z "${url}" || "${url}" == "https://" ]]; then
    record SKIP "${label}" "URL not configured"
    return
  fi
  local resp body
  resp=$(curl -sk -o /tmp/verify-portal-body -w "%{http_code}" --max-time 15 "${url}" 2>/dev/null || echo "000")
  if [[ "${resp}" == "200" ]]; then
    body=$(head -c 4096 /tmp/verify-portal-body 2>/dev/null || true)
    if echo "${body}" | grep -qi "<title"; then
      record PASS "${label}" "HTTP 200, HTML <title> present (${url})"
    else
      record WARN "${label}" "HTTP 200 but no <title> tag (${url})"
    fi
  else
    record FAIL "${label}" "HTTP ${resp} (${url})"
  fi
  rm -f /tmp/verify-portal-body
}

check_api_health() {
  local url="${API_URL}/api/v1/health"
  local resp body
  resp=$(curl -sk -o /tmp/verify-api-body -w "%{http_code}" --max-time 15 "${url}" 2>/dev/null || echo "000")
  body=$(cat /tmp/verify-api-body 2>/dev/null || true)
  rm -f /tmp/verify-api-body
  if [[ "${resp}" == "200" ]] && echo "${body}" | grep -q '"status"'; then
    record PASS "API health" "HTTP 200, body=${body:0:80}"
  else
    record FAIL "API health" "HTTP ${resp}, body=${body:0:120}"
  fi
}

check_login() {
  local resp body
  body=$(curl -sk --max-time 15 -X POST "${API_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${DEMO_LOGIN_EMAIL}\",\"password\":\"${DEMO_LOGIN_PASSWORD}\"}" 2>/dev/null || true)
  if echo "${body}" | grep -q "accessToken"; then
    record PASS "Login (${DEMO_LOGIN_EMAIL})" "accessToken present"
  else
    record FAIL "Login (${DEMO_LOGIN_EMAIL})" "no accessToken: ${body:0:160}"
  fi
}

check_cors_preflight() {
  local origin="$1"
  local headers
  headers=$(curl -sk -I --max-time 15 -X OPTIONS "${API_URL}/api/v1/auth/login" \
    -H "Origin: ${origin}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" 2>/dev/null || true)
  if echo "${headers}" | grep -qi "access-control-allow-origin"; then
    record PASS "CORS preflight (${origin})" "ACAO header returned"
  else
    record FAIL "CORS preflight (${origin})" "no Access-Control-Allow-Origin header"
  fi
}

# ── Run checks ───────────────────────────────────────────────────────────────
echo ""
echo "${CYAN}── Verifying SBTM portals (${ENVIRONMENT}) ──${RESET}"
echo "  Admin default:  ${ADMIN_DEFAULT_HOST:-<not provisioned>}"
echo "  Parent default: ${PARENT_DEFAULT_HOST:-<not provisioned>}"
echo "  Custom domain:  ${CUSTOM_DOMAIN:-<unset>}"
echo ""

[[ -n "${ADMIN_DEFAULT_HOST}" ]]  && check_url_200 "Admin default hostname"  "https://${ADMIN_DEFAULT_HOST}"   || record SKIP "Admin default hostname"  "SWA not provisioned"
[[ -n "${PARENT_DEFAULT_HOST}" ]] && check_url_200 "Parent default hostname" "https://${PARENT_DEFAULT_HOST}"  || record SKIP "Parent default hostname" "SWA not provisioned"

if [[ -n "${CUSTOM_DOMAIN}" ]]; then
  check_url_200 "Admin custom domain"  "${ADMIN_CUSTOM_URL}"
  check_url_200 "Parent custom domain" "${PARENT_CUSTOM_URL}"
  check_api_health
  if [[ "${QUICK}" != "1" ]]; then
    check_login
    check_cors_preflight "${ADMIN_CUSTOM_URL}"
    check_cors_preflight "${PARENT_CUSTOM_URL}"
  fi
fi

# ── Print summary table ──────────────────────────────────────────────────────
echo ""
echo "${CYAN}── Verification summary ──${RESET}"
printf "  %-6s  %-32s  %s\n" "STATUS" "CHECK" "DETAIL"
printf "  %-6s  %-32s  %s\n" "------" "--------------------------------" "-----------------------------------------------------------"
for i in "${!RESULTS_LABEL[@]}"; do
  status="${RESULTS_STATUS[$i]}"
  label="${RESULTS_LABEL[$i]}"
  detail="${RESULTS_DETAIL[$i]}"
  case "${status}" in
    PASS) icon="${GREEN}✓ PASS${RESET}" ;;
    FAIL) icon="${RED}✗ FAIL${RESET}" ;;
    WARN) icon="${YELLOW}! WARN${RESET}" ;;
    SKIP) icon="${YELLOW}- SKIP${RESET}" ;;
    *)    icon="${status}" ;;
  esac
  printf "  %b  %-32s  %s\n" "${icon}" "${label}" "${detail}"
done
echo ""

if [[ "${FAILURES}" -gt 0 ]]; then
  echo "${RED}${FAILURES} check(s) failed.${RESET}"
  exit 1
fi
echo "${GREEN}All checks passed.${RESET}"
exit 0
