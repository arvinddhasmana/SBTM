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
  ENV_FILE="${ENV_FILE:-.env.production}"
  if [[ -f "${ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^\s*#' "${ENV_FILE}" | grep -v '^\s*$')
    set +a
    CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING:-}"
  fi
fi

# Prefer the persistent storage account in sbtm-dns-rg when present, so the
# OSRM dataset is uploaded once and reused across teardown/rebuild cycles.
DNS_RESOURCE_GROUP="${DNS_RESOURCE_GROUP:-sbtm-dns-rg}"
PERSISTENT_OSRM_SA=$(az storage account list -g "${DNS_RESOURCE_GROUP}" \
  --query "[?starts_with(name,'sbtmpersist')].name | [0]" -o tsv 2>/dev/null || true)
if [[ -n "${PERSISTENT_OSRM_SA}" ]]; then
  PERSIST_KEY=$(az storage account keys list -g "${DNS_RESOURCE_GROUP}" -n "${PERSISTENT_OSRM_SA}" --query "[0].value" -o tsv 2>/dev/null || true)
  if [[ -n "${PERSIST_KEY}" ]]; then
    CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=${PERSISTENT_OSRM_SA};AccountKey=${PERSIST_KEY};EndpointSuffix=core.windows.net"
    STORAGE_ACCOUNT="${PERSISTENT_OSRM_SA}"
    echo "==> Using persistent OSRM storage account: ${PERSISTENT_OSRM_SA} (RG ${DNS_RESOURCE_GROUP})"
  fi
fi

if [[ -z "${CONNECTION_STRING}" ]]; then
  echo "ERROR: AZURE_STORAGE_CONNECTION_STRING not set."
  exit 1
fi

if [[ "${CONNECTION_STRING}" == *"<"*">"* || "${CONNECTION_STRING}" == "DefaultEndpointsProtocol=https,"* ]]; then
  echo "ERROR: AZURE_STORAGE_CONNECTION_STRING appears invalid or placeholder-like."
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

if [[ -z "${STORAGE_ACCOUNT}" ]]; then
  STORAGE_ACCOUNT=$(echo "${CONNECTION_STRING}" | sed -n 's/.*AccountName=\([^;]*\).*/\1/p')
fi
if [[ -z "${STORAGE_ACCOUNT}" ]]; then
  echo "ERROR: Could not determine storage account name from connection string."
  exit 1
fi

SAS_TOKEN=$(az storage container generate-sas \
  --connection-string "${CONNECTION_STRING}" \
  --name "${CONTAINER_NAME}" \
  --permissions rwl \
  --expiry "$(date -u -d '1 hour' '+%Y-%m-%dT%H:%MZ')" \
  --https-only \
  --output tsv)
DEST_URL="https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER_NAME}?${SAS_TOKEN}"

# Use azcopy for reliable large-file upload with progress
azcopy copy "${OSRM_DATA_DIR}/*" \
  "${DEST_URL}" \
  --recursive

echo "==> OSRM data upload complete"
echo ""
echo "    Verifying uploaded blobs:"
az storage blob list \
  --connection-string "${CONNECTION_STRING}" \
  --container-name "${CONTAINER_NAME}" \
  --query "[].{name:name, size:properties.contentLength}" \
  -o table 2>/dev/null || echo "    (Could not list blobs — verify manually in the portal)"
