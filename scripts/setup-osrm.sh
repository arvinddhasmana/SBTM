#!/usr/bin/env bash
# =============================================================================
# SBTM OSRM Setup Script
# Downloads Ottawa OSM data and prepares it for the OSRM backend.
# =============================================================================
set -euo pipefail

DATA_DIR="./infra/osrm-data"
mkdir -p "$DATA_DIR"

# Ottawa bounding box approx: -76.0, 45.1, -75.3, 45.6
OTTAWA_OSM="$DATA_DIR/ottawa.osm"
OTTAWA_OSRM="$DATA_DIR/ottawa.osrm"

echo -e "\033[36m--- SBTM OSRM Setup ---\033[0m"

if [ ! -f "$OTTAWA_OSM" ] || [ "${FORCE_DOWNLOAD:-}" = "1" ]; then
    echo "Downloading Ottawa map data from Overpass..."
    # Wider bbox covering Ottawa south-west region for both demo areas:
    # - Existing Greenfield demo:  (45.38, -75.69)
    # - Dynamic simulation area:   ~(45.25-45.42, -75.91 to -75.67)
    # BBox: south=45.24, west=-75.92, north=45.43, east=-75.66
    curl -L -o "$OTTAWA_OSM" "https://overpass-api.de/api/map?bbox=-75.92,45.24,-75.66,45.43"
fi

echo "Processing OSRM data (this may take a few minutes)..."
docker run -t -v "$(pwd)/$DATA_DIR:/data" ghcr.io/project-osrm/osrm-backend:v5.27.1 osrm-extract -p /usr/local/share/osrm/profiles/car.lua /data/ottawa.osm
docker run -t -v "$(pwd)/$DATA_DIR:/data" ghcr.io/project-osrm/osrm-backend:v5.27.1 osrm-partition /data/ottawa.osm
docker run -t -v "$(pwd)/$DATA_DIR:/data" ghcr.io/project-osrm/osrm-backend:v5.27.1 osrm-customize /data/ottawa.osm

echo -e "\033[32m✅ OSRM data prepared successfully!\033[0m"
