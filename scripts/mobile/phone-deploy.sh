#!/usr/bin/env bash
# =====================================================================
# phone-deploy.sh — Start SBTM backend + tunnel for real phone testing
# =====================================================================
#
# Usage:
#   ./scripts/phone-deploy.sh                 # auto-detect method
#   ./scripts/phone-deploy.sh --ngrok         # force ngrok
#   ./scripts/phone-deploy.sh --lan           # LAN-only (WiFi)
#   ./scripts/phone-deploy.sh --cloudflare    # Cloudflare Tunnel
#
# Prerequisites:
#   - Docker + Docker Compose
#   - One of: ngrok, cloudflared (optional, for internet access while driving)
# =====================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DRIVER_APP_DIR="$PROJECT_DIR/apps/driver-app"
API_PORT=3001
DASHBOARD_PORT=5173
PARENT_PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SBTM]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ─── Detect tunnel method ────────────────────────────────────────
TUNNEL_METHOD="${1:-auto}"

detect_tunnel() {
    if [[ "$TUNNEL_METHOD" != "auto" ]]; then
        TUNNEL_METHOD="${TUNNEL_METHOD#--}"
        return
    fi

    if command -v ngrok &>/dev/null; then
        TUNNEL_METHOD="ngrok"
    elif command -v cloudflared &>/dev/null; then
        TUNNEL_METHOD="cloudflare"
    else
        TUNNEL_METHOD="lan"
    fi
}

get_lan_ip() {
    if command -v ip &>/dev/null; then
        ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1
    elif command -v ifconfig &>/dev/null; then
        ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1
    else
        hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost"
    fi
}

# ─── Main ─────────────────────────────────────────────────────────
main() {
    detect_tunnel
    cd "$PROJECT_DIR"

    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║    SBTM — Real Phone Deployment Setup       ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo ""

    # ── Step 1: Start minimal Docker stack ─────────────────────────
    log "Starting backend services (postgres, redis, api-gateway, gps-tracking, emergency-alerts, student-presence)..."
    docker compose up -d postgres redis
    log "Waiting for infrastructure..."
    sleep 5

    # Initialize database if needed
    log "Ensuring database schema is initialized..."
    docker compose exec -T postgres psql -U postgres -d sbms -c "SELECT 1 FROM users LIMIT 1" &>/dev/null 2>&1 || {
        log "Seeding database..."
        docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql
    }

    docker compose up -d api-gateway gps-tracking emergency-alerts student-presence
    log "Waiting for services to be ready..."
    sleep 10

    # Health check
    for i in {1..30}; do
        if curl -sf "http://localhost:${API_PORT}/api/v1/health" &>/dev/null; then
            log "API Gateway is healthy!"
            break
        fi
        if [[ $i -eq 30 ]]; then
            err "API Gateway did not become healthy. Check: docker compose logs api-gateway"
            exit 1
        fi
        sleep 2
    done

    # ── Step 2: Optionally start web dashboards ────────────────────
    log "Starting admin dashboard and parent portal..."
    docker compose up -d admin-dashboard parent-dashboard 2>/dev/null || true

    # ── Step 3: Set up tunnel / get URL ────────────────────────────
    local API_URL=""
    local LAN_IP
    LAN_IP=$(get_lan_ip)

    case "$TUNNEL_METHOD" in
        ngrok)
            log "Starting ngrok tunnel on port ${API_PORT}..."
            # Kill existing ngrok if running
            pkill -f "ngrok http" 2>/dev/null || true
            sleep 1
            ngrok http "$API_PORT" --log=stdout > /tmp/ngrok-sbtm.log 2>&1 &
            NGROK_PID=$!

            # Wait for tunnel URL
            for i in {1..20}; do
                API_URL=$(curl -sf http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null || true)
                if [[ -n "$API_URL" ]]; then break; fi
                sleep 1
            done

            if [[ -z "$API_URL" ]]; then
                err "Failed to get ngrok URL. Is ngrok authenticated? Run: ngrok config add-authtoken <token>"
                err "Get a free token at https://dashboard.ngrok.com"
                kill $NGROK_PID 2>/dev/null || true
                API_URL="http://${LAN_IP}:${API_PORT}"
                TUNNEL_METHOD="lan"
                warn "Falling back to LAN mode."
            fi
            ;;

        cloudflare)
            log "Starting Cloudflare Tunnel on port ${API_PORT}..."
            pkill -f "cloudflared tunnel" 2>/dev/null || true
            sleep 1
            cloudflared tunnel --url "http://localhost:${API_PORT}" > /tmp/cloudflared-sbtm.log 2>&1 &
            CF_PID=$!

            for i in {1..20}; do
                API_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cloudflared-sbtm.log 2>/dev/null | head -1 || true)
                if [[ -n "$API_URL" ]]; then break; fi
                sleep 1
            done

            if [[ -z "$API_URL" ]]; then
                err "Failed to get Cloudflare Tunnel URL."
                kill $CF_PID 2>/dev/null || true
                API_URL="http://${LAN_IP}:${API_PORT}"
                TUNNEL_METHOD="lan"
                warn "Falling back to LAN mode."
            fi
            ;;

        lan)
            API_URL="http://${LAN_IP}:${API_PORT}"
            ;;
    esac

    # ── Step 4: Write driver app .env ─────────────────────────────
    local DRIVER_ENV="${DRIVER_APP_DIR}/.env"
    echo "EXPO_PUBLIC_API_URL=${API_URL}/api/v1" > "$DRIVER_ENV"
    log "Wrote driver app .env: ${DRIVER_ENV}"

    # ── Step 5: Print summary ─────────────────────────────────────
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║                    DEPLOYMENT READY                         ║${NC}"
    echo -e "${BOLD}${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC} Tunnel Method: ${BOLD}${TUNNEL_METHOD}${NC}"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}API Gateway:${NC}      ${API_URL}/api/v1"
    echo -e "${CYAN}║${NC} ${BOLD}Admin Dashboard:${NC}  http://${LAN_IP}:${DASHBOARD_PORT}"
    echo -e "${CYAN}║${NC} ${BOLD}Parent Portal:${NC}    http://${LAN_IP}:${PARENT_PORT}"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}Driver Credentials:${NC}"
    echo -e "${CYAN}║${NC}   Email:    ${GREEN}driver1@sbtm.demo${NC}"
    echo -e "${CYAN}║${NC}   Password: ${GREEN}Admin123!${NC}"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}Admin Credentials:${NC}"
    echo -e "${CYAN}║${NC}   Email:    ${GREEN}superadmin@sbtm.demo${NC}"
    echo -e "${CYAN}║${NC}   Password: ${GREEN}Admin123!${NC}"
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}Driver App .env:${NC}"
    echo -e "${CYAN}║${NC}   EXPO_PUBLIC_API_URL=${API_URL}/api/v1"
    echo -e "${CYAN}║${NC}"
    if [[ "$TUNNEL_METHOD" == "lan" ]]; then
        echo -e "${CYAN}║${NC} ${YELLOW}NOTE: LAN mode — phone must be on same WiFi network.${NC}"
        echo -e "${CYAN}║${NC} ${YELLOW}For driving (mobile data), install ngrok for free:${NC}"
        echo -e "${CYAN}║${NC} ${YELLOW}  https://ngrok.com/download${NC}"
    fi
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Next steps:${NC}"
    echo "  1. cd apps/driver-app"
    echo "  2. npx expo install   (install new deps)"
    echo "  3. npx eas build --platform android --profile preview"
    echo "     OR: npx expo prebuild && cd android && ./gradlew assembleRelease"
    echo "  4. Install the APK on your phone"
    echo "  5. Log in with: driver1@sbtm.demo / Admin123!"
    echo "  6. Open Admin Dashboard at http://${LAN_IP}:${DASHBOARD_PORT}"
    echo "     (login: superadmin@sbtm.demo / Admin123!)"
    echo ""
    echo -e "${BOLD}To stop:${NC} docker compose down"
    if [[ "$TUNNEL_METHOD" == "ngrok" ]]; then
        echo -e "${BOLD}To stop tunnel:${NC} pkill -f 'ngrok http'"
    elif [[ "$TUNNEL_METHOD" == "cloudflare" ]]; then
        echo -e "${BOLD}To stop tunnel:${NC} pkill -f 'cloudflared tunnel'"
    fi
    echo ""
}

main "$@"
