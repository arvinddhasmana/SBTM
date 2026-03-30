#!/usr/bin/env bash
# =============================================================================
# SBTM Dev: Stop All Local Services & Infrastructure
# =============================================================================
# Cleanly shuts down all locally running services (via PID files) and
# optionally stops Docker infrastructure containers.
#
# Usage:
#   ./scripts/dev-stop.sh          # Stop local services + Docker infra
#   ./scripts/dev-stop.sh --keep-infra  # Stop services only, keep Docker running
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

KEEP_INFRA=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-infra) KEEP_INFRA=true; shift ;;
        *) shift ;;
    esac
done

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        SBTM • Stopping Dev Environment           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Stop Local Services ──────────────────────────────────────────────────────
stopped=0
if [[ -d "$PID_DIR" ]]; then
    for pid_file in "$PID_DIR"/*.pid; do
        [[ -f "$pid_file" ]] || continue
        svc_name=$(basename "$pid_file" .pid)
        pid=$(cat "$pid_file")

        if kill -0 "$pid" 2>/dev/null; then
            # Kill the process tree (service + child processes)
            kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
            echo -e "  ${GREEN}✓${NC} Stopped ${svc_name} (PID: $pid)"
            stopped=$((stopped + 1))
        else
            echo -e "  ${DIM}○ ${svc_name} was not running${NC}"
        fi

        rm -f "$pid_file"
    done
fi

if [[ $stopped -eq 0 ]]; then
    echo -e "  ${DIM}No local services were running.${NC}"
fi

# ─── Stop Docker Infrastructure ───────────────────────────────────────────────
echo ""
if [[ "$KEEP_INFRA" == "true" ]]; then
    echo -e "${YELLOW}Docker infrastructure kept running (--keep-infra).${NC}"
else
    echo -e "${CYAN}Stopping Docker infrastructure...${NC}"
    (cd "$PROJECT_ROOT" && docker compose down 2>&1) || true
    echo -e "  ${GREEN}✓${NC} Docker containers stopped"
fi

# ─── Cleanup ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Dev environment stopped.${NC}"

if [[ -d "$LOG_DIR" ]]; then
    echo -e "${DIM}Logs preserved in: .dev-logs/${NC}"
fi
echo ""
