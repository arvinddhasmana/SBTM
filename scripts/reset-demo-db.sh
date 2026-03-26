#!/usr/bin/env bash
# =============================================================================
# SBTM Demo DB Reset (Destructive)
# Drops Docker volumes (fresh Postgres + Redis), recreates the stack, seeds demo data,
# and runs verification.
#
# Usage:
#   ./scripts/reset-demo-db.sh
#   ./scripts/reset-demo-db.sh --no-build
#   ./scripts/reset-demo-db.sh --skip-verify
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
NO_BUILD=false
SKIP_VERIFY=false

for arg in "$@"; do
  case "$arg" in
    --no-build)  NO_BUILD=true ;;
    --skip-verify) SKIP_VERIFY=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

pushd "$ROOT" > /dev/null

echo -e "\033[36m--- SBTM Demo DB Reset (DESTRUCTIVE) ---\033[0m"
echo -e "\033[33mStopping stack and deleting volumes...\033[0m"

docker compose down -v

echo -e "\033[33mStarting stack...\033[0m"
if [ "$NO_BUILD" = true ]; then
  docker compose up -d
else
  docker compose up -d --build
fi

echo -e "\033[33mWaiting for services to become healthy...\033[0m"
MAX_WAIT=90
ELAPSED=0
API_HEALTHY=false

while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
  if curl -sf http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    API_HEALTHY=true
    echo -e "\033[32mAPI Gateway is healthy after $ELAPSED seconds\033[0m"
    break
  fi

  if [ "$ELAPSED" -eq 0 ]; then
    echo -e "\033[90m  API Gateway not ready yet, waiting...\033[0m"
  elif [ $((ELAPSED % 15)) -eq 0 ]; then
    echo -e "\033[90m  Still waiting for API Gateway... ($ELAPSED/$MAX_WAIT seconds)\033[0m"
  fi

  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

if [ "$API_HEALTHY" = false ]; then
  echo -e "\033[31mERROR: API Gateway did not become healthy within timeout\033[0m"
  echo -e "\033[33mCheck logs with: docker compose logs api-gateway\033[0m"
  echo -e "\033[33mCheck logs with: docker compose logs student-presence\033[0m"
  exit 1
fi

echo -e "\033[33mSeeding demo data...\033[0m"
bash "$SCRIPT_DIR/init-db.sh"

echo -e "\033[33mWaiting for services to process schema changes...\033[0m"
sleep 10

if [ "$SKIP_VERIFY" = false ]; then
  echo -e "\033[33mRunning verification...\033[0m"
  bash "$SCRIPT_DIR/verify-demo.sh"
fi

popd > /dev/null

echo -e "\033[32mReset complete.\033[0m"
