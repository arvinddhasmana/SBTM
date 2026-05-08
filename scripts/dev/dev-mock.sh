#!/usr/bin/env bash
# =============================================================================
# SBTM Dev: Mock Mode (UI Only — Zero Backend)
# =============================================================================
# Starts the Admin Dashboard with mock data. No Docker, no backend services.
# Perfect for UI development, styling, and layout work.
#
# Usage:
#   ./scripts/dev-mock.sh              # Start admin dashboard in mock mode
#   ./scripts/dev-mock.sh --port 3000  # Use a custom port
# =============================================================================
set -e

CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
NC='\033[0m' # No Color

PORT=5173

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --port) PORT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        SBTM • Mock Mode (Zero Backend)           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Mode:${NC}  Frontend Mock — no Docker, no backend services"
echo -e "${YELLOW}App:${NC}   Admin Dashboard"
echo -e "${YELLOW}URL:${NC}   http://localhost:${PORT}"
echo -e "${YELLOW}Login:${NC} Any email/password works in mock mode"
echo ""

# Navigate to admin dashboard and start with mock env
export VITE_USE_MOCK=true
exec npx --prefix apps/admin-dashboard vite --port "$PORT"
