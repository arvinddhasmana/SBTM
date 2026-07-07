#!/usr/bin/env bash
# =============================================================================
# Build OSRM routing data for SBTM.
#
# Downloads a Geofabrik regional OSM extract and runs OSRM's
# extract → partition → customize pipeline (mld algorithm), producing the
# `<region>.osrm*` files that the `osrm` container in docker-compose mounts.
#
# Usage:
#   scripts/osrm/build-osrm-data.sh [region]            # default: ontario
#   scripts/osrm/build-osrm-data.sh ontario --force     # rebuild even if exists
#
# Requires: docker, ~5 GB free RAM during build, ~2 GB disk for ontario.
# Run-time: ~5–15 min for ontario on a typical dev laptop.
#
# Region examples (Geofabrik path under north-america/canada/):
#   ontario, ottawa (city extract via bbbike), quebec, british-columbia
# =============================================================================
set -euo pipefail

REGION="${1:-ontario}"
FORCE=0
for arg in "${@:2}"; do
  case "$arg" in
    --force) FORCE=1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="$REPO_ROOT/infra/osrm-data"
IMAGE="ghcr.io/project-osrm/osrm-backend:v5.27.1"
PROFILE="/opt/car.lua"

# Geofabrik URL — Canadian provincial extracts live under canada/.
PBF_URL="https://download.geofabrik.de/north-america/canada/${REGION}-latest.osm.pbf"

mkdir -p "$DATA_DIR"

if [[ -f "$DATA_DIR/${REGION}.osrm.fileIndex" && $FORCE -eq 0 ]]; then
  echo "[osrm-data] ${REGION}.osrm* already built in $DATA_DIR (pass --force to rebuild)"
  exit 0
fi

if [[ ! -f "$DATA_DIR/${REGION}-latest.osm.pbf" || $FORCE -eq 1 ]]; then
  echo "[osrm-data] Downloading $PBF_URL ..."
  curl -fL --retry 3 -o "$DATA_DIR/${REGION}-latest.osm.pbf" "$PBF_URL"
fi

# Clean any prior partial build of the same region so extract starts fresh.
find "$DATA_DIR" -maxdepth 1 -name "${REGION}.osrm*" -delete 2>/dev/null || true

run_osrm() {
  local cmd="$1"; shift
  echo "[osrm-data] osrm-$cmd $*"
  docker run --rm -v "$DATA_DIR":/data "$IMAGE" "osrm-$cmd" "$@"
}

run_osrm extract -p "$PROFILE" "/data/${REGION}-latest.osm.pbf"
# osrm-extract emits <pbf-basename>.osrm; rename to <region>.osrm so the
# partition/customize commands and the docker-compose mount line both find it.
if [[ -f "$DATA_DIR/${REGION}-latest.osrm.fileIndex" ]]; then
  for f in "$DATA_DIR/${REGION}-latest.osrm"*; do
    mv "$f" "${f/${REGION}-latest/${REGION}}"
  done
fi
run_osrm partition  "/data/${REGION}.osrm"
run_osrm customize  "/data/${REGION}.osrm"

echo "[osrm-data] ✓ ${REGION}.osrm* built in $DATA_DIR"
echo "[osrm-data] Start the OSRM container with: docker compose up -d osrm"
