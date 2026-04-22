#!/usr/bin/env bash
# scripts/azure/osrm-upload.sh
# Uploads Ottawa OSRM road network data from infra/osrm-data/ to Azure Blob Storage.
# OSRM pods mount this container on startup via an init container.
#
# Usage: AZURE_STORAGE_CONNECTION_STRING=... bash scripts/azure/osrm-upload.sh
#
# Requires: azcopy installed (https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)

set -euo pipefail

OSRM_DATA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/infra/osrm-data"
CONTAINER_NAME="osrm-data"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-}"
CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING:-}"

if [[ -z "${STORAGE_ACCOUNT}" ]] && [[ -z "${CONNECTION_STRING}" ]]; then
  ENV_FILE=".env.production"
  if [[ -f "${ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^\s*#' "${ENV_FILE}" | grep -v '^\s*$')
    set +a
    CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING:-}"
  fi
fi

if [[ -z "${CONNECTION_STRING}" ]]; then
  echo "ERROR: AZURE_STORAGE_CONNECTION_STRING not set."
  exit 1
fi

# Verify azcopy is available
if ! command -v azcopy >/dev/null 2>&1; then
  echo "ERROR: 'azcopy' not found."
  echo "Install: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10"
  exit 1
fi

if [[ ! -d "${OSRM_DATA_DIR}" ]]; then
  echo "ERROR: OSRM data directory not found: ${OSRM_DATA_DIR}"
  echo "Download the Ottawa OSRM dataset and place it in infra/osrm-data/"
  exit 1
fi

echo "==> Ensuring Blob container exists: ${CONTAINER_NAME}"
az storage container create \
  --connection-string "${CONNECTION_STRING}" \
  --name "${CONTAINER_NAME}" \
  --output none 2>/dev/null || true

echo "==> Uploading OSRM data from ${OSRM_DATA_DIR} to Blob Storage container: ${CONTAINER_NAME}"

# Use azcopy for reliable large-file upload with progress
azcopy copy "${OSRM_DATA_DIR}/*" \
  "$(az storage container generate-sas \
    --connection-string "${CONNECTION_STRING}" \
    --name "${CONTAINER_NAME}" \
    --permissions rwl \
    --expiry "$(date -u -d '1 hour' '+%Y-%m-%dT%H:%MZ')" \
    --https-only \
    --output tsv)" \
  --recursive

echo "==> OSRM data upload complete"
echo ""
echo "    Verifying uploaded blobs:"
az storage blob list \
  --connection-string "${CONNECTION_STRING}" \
  --container-name "${CONTAINER_NAME}" \
  --query "[].{name:name, size:properties.contentLength}" \
  -o table 2>/dev/null || echo "    (Could not list blobs — verify manually in the portal)"
