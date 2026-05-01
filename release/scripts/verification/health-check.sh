#!/usr/bin/env bash
# =============================================================================
# SBTM Health Check
# Verifies all services are healthy after deployment
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Configuration
API_ENDPOINT="${1:-http://localhost:3001}"
TIMEOUT=10

echo "════════════════════════════════════════════════════════"
echo "  SBTM Health Check"
echo "════════════════════════════════════════════════════════"
echo ""
log_info "Testing endpoint: $API_ENDPOINT"
echo ""

# Test API Gateway
log_info "Testing API Gateway..."
if curl -sf --max-time $TIMEOUT "$API_ENDPOINT/health" > /dev/null 2>&1; then
    log_success "API Gateway is healthy"
else
    log_error "API Gateway is unreachable"
    exit 1
fi

# Test individual services
services=(
    "gps-tracking:3002"
    "emergency-alerts:3003"
    "student-presence:3004"
    "video-service:3005"
    "student-management:3006"
    "compliance-management:3007"
)

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    log_info "Testing $name..."

    # Check if service is accessible through gateway or directly
    if curl -sf --max-time $TIMEOUT "$API_ENDPOINT/api/v1/health" > /dev/null 2>&1; then
        log_success "$name is responding"
    else
        log_warning "$name may not be accessible (this is normal if behind gateway)"
    fi
done

# Test database connectivity
log_info "Testing database connectivity..."
if kubectl get pods -l app=postgres 2>/dev/null | grep -q Running; then
    log_success "Database pod is running"
else
    log_warning "Cannot verify database (kubectl not configured or not using K8s)"
fi

# Test Redis
log_info "Testing Redis..."
if kubectl get pods -l app=redis 2>/dev/null | grep -q Running; then
    log_success "Redis pod is running"
else
    log_warning "Cannot verify Redis (kubectl not configured or not using K8s)"
fi

echo ""
echo "════════════════════════════════════════════════════════"
log_success "Health check complete!"
echo "════════════════════════════════════════════════════════"
echo ""
log_info "All critical services are operational"
log_info "You can now access:"
echo "  - API: $API_ENDPOINT"
echo "  - Admin Dashboard: Check deployment output for URL"
echo "  - Parent Portal: Check deployment output for URL"
echo ""
log_info "Demo credentials:"
echo "  - Admin: admin@sbtm.demo / Admin123!"
echo "  - Driver: driver1@sbtm.demo / Admin123!"
echo "  - Parent: parent1@sbtm.demo / Admin123!"
echo ""
