#!/bin/bash
# =============================================================================
# SBTM Demo Setup - macOS/Linux
# Starts all containers and seeds demo data in one command.
# =============================================================================

set -e

NO_BUILD=false
NO_SEED=false

for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=true ;;
    --no-seed) NO_SEED=true ;;
  esac
  shift || true
done

echo "--- SBTM Demo Setup (macOS/Linux) ---"

if [ "$NO_BUILD" = true ]; then
  echo "Starting docker compose (no build)..."
  docker compose up -d
else
  echo "Starting docker compose (build)..."
  docker compose up -d --build
fi

if [ "$NO_SEED" = false ]; then
  echo "Seeding demo data..."
  "$(dirname "$0")/seed-demo-data.sh"
fi

echo "Demo setup complete."
