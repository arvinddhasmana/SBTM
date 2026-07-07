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

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
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
    "integration-importer"
)

SERVICE_COMMANDS=(
    "api-gateway:pnpm run start:dev"
    "gps-tracking:pnpm run dev"
    "emergency-alerts:pnpm run start:dev"
    "student-presence:pnpm run start:dev"
    "video-service:pnpm run start:dev"
    "student-management:pnpm run start:dev"
    "compliance-management:pnpm run start:dev"
    "notification-service:pnpm run start:dev"
    "integration-importer:pnpm run start:dev"
)

# Per-service local-dev PORT (matches docker-compose.yml + admin-dashboard
# Vite env defaults). Several services default to the same internal port in
# their main.ts, so we MUST inject distinct PORTs to avoid collisions.
SERVICE_PORTS=(
    "api-gateway:3001"
    "gps-tracking:3002"
    "emergency-alerts:3003"
    "student-presence:3004"
    "video-service:3005"
    "student-management:3006"
    "compliance-management:3007"
    "notification-service:3008"
    "integration-importer:3010"
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
    echo "pnpm run start:dev"
}

get_service_port() {
    local svc=$1
    for entry in "${SERVICE_PORTS[@]}"; do
        local name="${entry%%:*}"
        local port="${entry#*:}"
        if [[ "$name" == "$svc" ]]; then
            echo "$port"
            return
        fi
    done
    echo ""
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
    wait_for_service "OSRM" "curl -s http://localhost:5000/nearest/v1/driving/0,0 | grep -q code" || true
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
    echo -e "${DIM}Run services manually with: cd services/<name> && pnpm run start:dev${NC}"
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
    port=$(get_service_port "$svc")
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

    # Start service in background. PORT is injected so each service binds to
    # a distinct port (several services share the same default in main.ts).
    # DB_* / REDIS_* point at the docker-compose infra brought up in step 2.
    (cd "$svc_dir" && \
        PORT="$port" \
        DB_HOST=localhost \
        DB_PORT=5433 \
        DB_USERNAME=postgres \
        DB_PASSWORD=mysecretpassword \
        DB_DATABASE=sbms \
        DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5433/sbms" \
        REDIS_HOST=localhost \
        REDIS_PORT=6379 \
        JWT_SECRET="${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}" \
        JWT_EXPIRATION="${JWT_EXPIRATION:-24h}" \
        INTERNAL_SERVICE_SECRET="${INTERNAL_SERVICE_SECRET:-dev_internal_secret_change_me_in_prod}" \
        SBTM_PII_KEY="${SBTM_PII_KEY:-A86xdo4A+EWjTJ2zwz6JNIt5Ck8ncd9Ut3rkgq7JBD8=}" \
        CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,http://localhost:5174,http://localhost:5175}" \
        GPS_SERVICE_URL=http://localhost:3002 \
        ALERTS_SERVICE_URL=http://localhost:3003 \
        PRESENCE_SERVICE_URL=http://localhost:3004 \
        VIDEO_SERVICE_URL=http://localhost:3005 \
        STUDENT_SERVICE_URL=http://localhost:3006 \
        COMPLIANCE_SERVICE_URL=http://localhost:3007 \
        NOTIFICATION_SERVICE_URL=http://localhost:3008 \
        IMPORTER_SERVICE_URL=http://localhost:3010 \
        OSRM_BASE_URL=http://localhost:5000 \
        STORAGE_TYPE="${STORAGE_TYPE:-local}" \
        STORAGE_BASE_URL="${STORAGE_BASE_URL:-http://localhost:3005}" \
        MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}" \
        MINIO_PORT="${MINIO_PORT:-9000}" \
        MINIO_USE_SSL="${MINIO_USE_SSL:-false}" \
        MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-dev_minio_access_key}" \
        MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-dev_minio_secret_key}" \
        MINIO_BUCKET_NAME="${MINIO_BUCKET_NAME:-videos}" \
        STORAGE_TYPE="${STORAGE_TYPE:-minio}" \
        STORAGE_BASE_URL="${STORAGE_BASE_URL:-http://localhost:3005}" \
        MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}" \
        MINIO_PORT="${MINIO_PORT:-9000}" \
        MINIO_USE_SSL="${MINIO_USE_SSL:-false}" \
        MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}" \
        MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}" \
        MINIO_BUCKET_NAME="${MINIO_BUCKET_NAME:-videos}" \
        $cmd > "$log_file" 2>&1 &
     echo $! > "$pid_file")

    echo -e "  ${GREEN}✓${NC} $svc ${DIM}(port: ${port:-default}, PID: $(cat "$pid_file"), log: .dev-logs/${svc}.log)${NC}"
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

    (cd "$PROJECT_ROOT/apps/admin-dashboard" && pnpm exec vite --port 5173 --strictPort > "$dash_log" 2>&1 &
     echo $! > "$dash_pid")

    echo -e "  ${GREEN}✓${NC} admin-dashboard ${DIM}(PID: $(cat "$dash_pid"), log: .dev-logs/admin-dashboard.log)${NC}"

    # Start parent dashboard pinned to 5174 (must be in CORS_ORIGINS above)
    if [[ -d "$PROJECT_ROOT/apps/parent-dashboard/web" ]]; then
        parent_log="$LOG_DIR/parent-dashboard.log"
        parent_pid="$PID_DIR/parent-dashboard.pid"

        if [[ -f "$parent_pid" ]]; then
            old_pid=$(cat "$parent_pid")
            kill "$old_pid" 2>/dev/null || true
            rm -f "$parent_pid"
        fi

        (cd "$PROJECT_ROOT/apps/parent-dashboard/web" && pnpm exec vite --port 5174 --strictPort > "$parent_log" 2>&1 &
         echo $! > "$parent_pid")

        echo -e "  ${GREEN}✓${NC} parent-dashboard ${DIM}(PID: $(cat "$parent_pid"), log: .dev-logs/parent-dashboard.log)${NC}"
    fi
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
echo -e "${YELLOW}Admin Dashboard:${NC}   http://localhost:5173"
echo -e "${YELLOW}Parent Dashboard:${NC}  http://localhost:5174"
echo -e "${YELLOW}API:${NC}               http://localhost:3001/api/v1"
echo ""
echo -e "${DIM}Logs: .dev-logs/<service>.log${NC}"
echo -e "${DIM}Stop: ./scripts/dev-stop.sh${NC}"
echo -e "${DIM}Credentials: run ./scripts/schema-seed/import-and-seed.sh to see dev accounts${NC}"
