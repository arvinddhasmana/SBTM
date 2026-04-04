#!/usr/bin/env bash
# =============================================================================
# SBTM Dev: Hybrid Mode (Docker Infra + Local Services)
# =============================================================================
# Starts infrastructure (Postgres, Redis, OSRM) in Docker, then optionally
# starts selected backend services and the admin dashboard locally.
#
# Usage:
#   ./scripts/dev-hybrid.sh                          # Infra + ALL services + dashboard
#   ./scripts/dev-hybrid.sh api-gateway gps-tracking # Infra + only specified services
#   ./scripts/dev-hybrid.sh --infra-only             # Infra only, no local services
#   ./scripts/dev-hybrid.sh --no-dashboard           # Infra + services, no dashboard
# =============================================================================
set -e

CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
DIM='\033[2m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$PROJECT_ROOT/.dev-pids"
LOG_DIR="$PROJECT_ROOT/.dev-logs"

ALL_SERVICES=(
    "api-gateway"
    "gps-tracking"
    "emergency-alerts"
    "student-presence"
    "video-service"
    "student-management"
    "compliance-management"
    "notification-service"
)

SERVICE_COMMANDS=(
    "api-gateway:npm run start:dev"
    "gps-tracking:npm run dev"
    "emergency-alerts:npm run start:dev"
    "student-presence:npm run start:dev"
    "video-service:npm run start:dev"
    "student-management:npm run start:dev"
    "compliance-management:npm run start:dev"
    "notification-service:npm run start:dev"
)

INFRA_ONLY=false
NO_DASHBOARD=false
SELECTED_SERVICES=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --infra-only)   INFRA_ONLY=true; shift ;;
        --no-dashboard) NO_DASHBOARD=true; shift ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS] [service-name ...]"
            echo ""
            echo "Options:"
            echo "  --infra-only     Start only Docker infrastructure"
            echo "  --no-dashboard   Skip starting the admin dashboard"
            echo "  --help           Show this help"
            echo ""
            echo "Services: ${ALL_SERVICES[*]}"
            exit 0
            ;;
        *)
            SELECTED_SERVICES+=("$1"); shift ;;
    esac
done

# Default to all services if none specified
if [[ ${#SELECTED_SERVICES[@]} -eq 0 ]]; then
    SELECTED_SERVICES=("${ALL_SERVICES[@]}")
fi

# Setup directories
mkdir -p "$PID_DIR" "$LOG_DIR"

get_service_cmd() {
    local svc=$1
    for entry in "${SERVICE_COMMANDS[@]}"; do
        local name="${entry%%:*}"
        local cmd="${entry#*:}"
        if [[ "$name" == "$svc" ]]; then
            echo "$cmd"
            return
        fi
    done
    echo "npm run start:dev"
}

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        SBTM • Hybrid Development Mode            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Step 1: Start Docker Infrastructure ──────────────────────────────────────
echo -e "${CYAN}[1/3] Starting Docker infrastructure...${NC}"
(cd "$PROJECT_ROOT" && docker compose -f docker-compose.yml -f docker-compose.infra.yml up -d 2>&1) || {
    echo -e "${RED}✗ Failed to start Docker infrastructure${NC}"
    echo -e "${DIM}  Make sure Docker is running and docker-compose.infra.yml exists.${NC}"
    exit 1
}

# ─── Step 2: Wait for Infrastructure Health ───────────────────────────────────
echo -e "${CYAN}[2/3] Waiting for infrastructure to be healthy...${NC}"

wait_for_service() {
    local name=$1
    local check_cmd=$2
    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if eval "$check_cmd" &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} $name is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    echo -e "  ${RED}✗${NC} $name failed to start after ${max_attempts}s"
    return 1
}

wait_for_service "PostgreSQL" "docker exec \$(docker compose -f $PROJECT_ROOT/docker-compose.yml ps -q postgres 2>/dev/null) pg_isready -U postgres"
wait_for_service "Redis" "docker exec \$(docker compose -f $PROJECT_ROOT/docker-compose.yml ps -q redis 2>/dev/null) redis-cli ping"

# OSRM may not always be available (requires map data setup)
if docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps -q osrm &>/dev/null 2>&1; then
    wait_for_service "OSRM" "curl -sf http://localhost:5000/health" || true
fi

echo ""

if [[ "$INFRA_ONLY" == "true" ]]; then
    echo -e "${GREEN}✅ Infrastructure is running!${NC}"
    echo ""
    echo -e "${YELLOW}Endpoints:${NC}"
    echo "  PostgreSQL: localhost:5433"
    echo "  Redis:      localhost:6379"
    echo "  OSRM:       localhost:5000"
    echo ""
    echo -e "${DIM}Run services manually with: cd services/<name> && npm run start:dev${NC}"
    exit 0
fi

# ─── Step 3: Start Local Services ─────────────────────────────────────────────
echo -e "${CYAN}[3/3] Starting local services...${NC}"

# Copy env template if no .env exists for services
for svc in "${SELECTED_SERVICES[@]}"; do
    svc_dir="$PROJECT_ROOT/services/$svc"
    if [[ ! -d "$svc_dir" ]]; then
        echo -e "  ${YELLOW}⚠${NC} Service directory not found: services/$svc (skipping)"
        continue
    fi

    cmd=$(get_service_cmd "$svc")
    log_file="$LOG_DIR/${svc}.log"
    pid_file="$PID_DIR/${svc}.pid"

    # Kill old process if still running
    if [[ -f "$pid_file" ]]; then
        old_pid=$(cat "$pid_file")
        if kill -0 "$old_pid" 2>/dev/null; then
            kill "$old_pid" 2>/dev/null || true
            sleep 0.5
        fi
        rm -f "$pid_file"
    fi

    # Start service in background
    (cd "$svc_dir" && $cmd > "$log_file" 2>&1 &
     echo $! > "$pid_file")

    echo -e "  ${GREEN}✓${NC} $svc ${DIM}(PID: $(cat "$pid_file"), log: .dev-logs/${svc}.log)${NC}"
done

# Start admin dashboard if not disabled
if [[ "$NO_DASHBOARD" != "true" ]]; then
    echo ""
    echo -e "${CYAN}Starting Admin Dashboard...${NC}"
    dash_log="$LOG_DIR/admin-dashboard.log"
    dash_pid="$PID_DIR/admin-dashboard.pid"

    if [[ -f "$dash_pid" ]]; then
        old_pid=$(cat "$dash_pid")
        kill "$old_pid" 2>/dev/null || true
        rm -f "$dash_pid"
    fi

    (cd "$PROJECT_ROOT/apps/admin-dashboard" && npx vite > "$dash_log" 2>&1 &
     echo $! > "$dash_pid")

    echo -e "  ${GREEN}✓${NC} admin-dashboard ${DIM}(PID: $(cat "$dash_pid"), log: .dev-logs/admin-dashboard.log)${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Hybrid Dev Mode is Running!           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Infrastructure:${NC}"
echo "  PostgreSQL: localhost:5433"
echo "  Redis:      localhost:6379"
echo "  OSRM:       localhost:5000"
echo ""
echo -e "${YELLOW}Services:${NC}"
for svc in "${SELECTED_SERVICES[@]}"; do
    echo "  $svc"
done
echo ""
echo -e "${YELLOW}Dashboard:${NC}  http://localhost:5173"
echo -e "${YELLOW}API:${NC}        http://localhost:3001/api/v1"
echo ""
echo -e "${DIM}Logs: .dev-logs/<service>.log${NC}"
echo -e "${DIM}Stop: ./scripts/dev-stop.sh${NC}"
