#!/usr/bin/env bash
# =============================================================================
# SBTM System End-to-End Validation Script
# Validates all major system components and their integrations
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}SBTM System End-to-End Validation${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo ""

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

check_command() {
    if command -v "$1" &> /dev/null; then
        pass "Command '$1' is available"
    else
        fail "Command '$1' is not installed"
    fi
}

check_service_health() {
    local service_name=$1
    local url=$2

    if curl -sf "$url" > /dev/null 2>&1; then
        pass "Service '$service_name' is healthy"
    else
        fail "Service '$service_name' is not responding at $url"
    fi
}

check_container() {
    local container_name=$1

    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        pass "Container '$container_name' is running"
    else
        fail "Container '$container_name' is not running"
    fi
}

echo "Checking prerequisites..."
check_command docker
check_command docker-compose
check_command curl
check_command psql
echo ""

echo "Checking Docker containers..."
check_container "postgres"
check_container "redis"
check_container "api-gateway"
check_container "gps-tracking"
check_container "emergency-alerts"
check_container "student-presence"
check_container "student-management"
echo ""

echo "Checking service health endpoints..."
check_service_health "API Gateway" "http://localhost:3001/api/v1/health"
check_service_health "GPS Tracking" "http://localhost:3002/health"
check_service_health "Emergency Alerts" "http://localhost:3003/health"
check_service_health "Student Presence" "http://localhost:3004/health"
check_service_health "Student Management" "http://localhost:3006/health"
echo ""

echo "Checking database connectivity..."
if docker exec postgres psql -U postgres -d sbms -c "SELECT 1" > /dev/null 2>&1; then
    pass "PostgreSQL database is accessible"
else
    fail "PostgreSQL database is not accessible"
fi
echo ""

echo "Checking database schema..."
EXPECTED_TABLES=("schools" "routes" "route_stops" "students" "vehicles" "users" "presence_event")
for table in "${EXPECTED_TABLES[@]}"; do
    if docker exec postgres psql -U postgres -d sbms -c "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
        pass "Table '$table' exists and is queryable"
    else
        fail "Table '$table' does not exist or is not queryable"
    fi
done
echo ""

echo "Checking Redis connectivity..."
if docker exec redis redis-cli ping | grep -q "PONG"; then
    pass "Redis is responding to ping"
else
    fail "Redis is not responding"
fi
echo ""

echo "Checking alert-config endpoints..."
if curl -sf "http://localhost:3003/api/v1/alert-config/escalation-timing" > /dev/null 2>&1; then
    pass "Alert config endpoint is accessible"
else
    warn "Alert config endpoint returned error (may need authentication)"
fi
echo ""

echo "Checking presence events..."
PRESENCE_COUNT=$(docker exec postgres psql -U postgres -d sbms -t -c "SELECT COUNT(*) FROM presence_event" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$PRESENCE_COUNT" -gt 0 ]; then
    pass "Presence events exist in database ($PRESENCE_COUNT records)"
else
    warn "No presence events found - run ./scripts/simulation/SimulationOnlyOnSeededDB.sh to generate test data"
fi
echo ""

echo "Checking UUID-based route identifiers..."
ROUTE_COUNT=$(docker exec postgres psql -U postgres -d sbms -t -c "SELECT COUNT(*) FROM routes WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$ROUTE_COUNT" -gt 0 ]; then
    pass "UUID-based routes found ($ROUTE_COUNT records)"
else
    fail "No UUID-based routes found"
fi
echo ""

echo "Checking reference tables were dropped..."
for table in "routes_reference" "route_stops_reference" "students_reference"; do
    if docker exec postgres psql -U postgres -d sbms -c "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
        fail "Reference table '$table' still exists (should be dropped)"
    else
        pass "Reference table '$table' was successfully dropped"
    fi
done
echo ""

echo "Running TypeScript compilation checks..."
pushd "$ROOT" > /dev/null
if tsc --noEmit --project services/api-gateway/tsconfig.json 2>&1 | grep -q "error TS"; then
    fail "TypeScript compilation has errors in api-gateway"
else
    pass "api-gateway TypeScript compilation successful"
fi
popd > /dev/null
echo ""

echo "Checking admin dashboard..."
if [ -d "$ROOT/apps/admin-dashboard/dist" ]; then
    pass "Admin dashboard is built"
else
    warn "Admin dashboard not built - run 'cd apps/admin-dashboard && npm run build'"
fi
echo ""

echo "Checking parent dashboard..."
if [ -d "$ROOT/apps/parent-dashboard/web/dist" ]; then
    pass "Parent dashboard is built"
else
    warn "Parent dashboard not built - run 'cd apps/parent-dashboard/web && npm run build'"
fi
echo ""

echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}Validation Summary${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "Passed:   ${GREEN}${PASSED}${NC}"
echo -e "Failed:   ${RED}${FAILED}${NC}"
echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run tests: npm test"
    echo "  2. Start simulation: ./scripts/simulation/SimulationOnlyOnSeededDB.sh"
    echo "  3. Access admin dashboard: http://localhost:5173"
    echo "  4. Access parent portal: http://localhost:5174"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Restart services: docker-compose restart"
    echo "  - Reset database: ./scripts/schema-seed/reset-demo-db.sh"
    echo "  - Check logs: docker-compose logs [service-name]"
    exit 1
fi
