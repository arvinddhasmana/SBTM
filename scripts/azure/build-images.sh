#!/usr/bin/env bash
# scripts/azure/build-images.sh
# Build & push all SBTM service container images to Azure Container Registry
# using `az acr build` (server-side build — no local Docker daemon required).
#
# Usage: bash scripts/azure/build-images.sh [demo|production] [--force]
#
#   --force   Rebuild even when the :latest tag already exists in ACR.
#
# Image list and Dockerfile contexts mirror what the Kustomize overlays
# expect (see infra/k8s/overlays/<env>/kustomization.yaml `images:` block).

set -euo pipefail

ENVIRONMENT="${1:-demo}"
FORCE="false"
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE="true"; shift ;;
    *) echo "WARN: ignoring unknown arg '$1'"; shift ;;
  esac
done

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RESOURCE_GROUP="sbtm-rg"
else
  RESOURCE_GROUP="sbtm-demo-rg"
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

# Prefer the persistent ACR (sbtmacrshared in sbtm-dns-rg) when present so
# images are reused across teardown/rebuild cycles. Falls back to per-env ACR.
DNS_RESOURCE_GROUP="${DNS_RESOURCE_GROUP:-sbtm-dns-rg}"
PERSISTENT_ACR_NAME="${PERSISTENT_ACR_NAME:-sbtmacrshared}"
ACR_NAME=$(az acr show -g "${DNS_RESOURCE_GROUP}" -n "${PERSISTENT_ACR_NAME}" --query name -o tsv 2>/dev/null || true)
if [[ -n "${ACR_NAME}" ]]; then
  ACR_RG="${DNS_RESOURCE_GROUP}"
  echo "==> Using persistent ACR: ${ACR_NAME} (RG ${ACR_RG})"
else
  ACR_NAME=$(az acr list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)
  ACR_RG="${RESOURCE_GROUP}"
  if [[ -z "${ACR_NAME}" ]]; then
    echo "ERROR: No ACR found in ${DNS_RESOURCE_GROUP} (persistent) or ${RESOURCE_GROUP} (env)." >&2
    echo "       Run scripts/azure/setup-persistent-resources.sh OR scripts/azure/provision-azure.sh." >&2
    exit 1
  fi
  echo "==> Using per-environment ACR: ${ACR_NAME} (RG ${ACR_RG})"
fi
echo "==> Building images in ACR: ${ACR_NAME}"

# Service list — most build from the repo root; gps-tracking has its own
# build context (see infra/k8s memory note #6).
declare -a SERVICES=(
  "api-gateway:."
  "emergency-alerts:."
  "student-presence:."
  "student-management:."
  "compliance-management:."
  "video-service:."
  "notification-service:."
  "gps-tracking:services/gps-tracking"
)

image_exists() {
  local svc="$1"
  az acr repository show-tags -n "${ACR_NAME}" --repository "sbtm/${svc}" \
    --query "contains(@, 'latest')" -o tsv 2>/dev/null | grep -q true
}

build_one() {
  local svc="$1"
  local context="$2"
  if [[ "${FORCE}" != "true" ]] && image_exists "${svc}"; then
    echo "  ✓ sbtm/${svc}:latest already in ACR (use --force to rebuild)"
    return 0
  fi
  echo "  → building sbtm/${svc}:latest (context=${context})"
  if ! az acr build \
        --registry "${ACR_NAME}" \
        --image "sbtm/${svc}:latest" \
        --file "services/${svc}/Dockerfile" \
        "${context}" \
        --output none >/dev/null 2>&1; then
    echo "  ✗ build failed for ${svc}" >&2
    return 1
  fi
  echo "  ✓ sbtm/${svc}:latest pushed"
}

FAILED=()
for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  ctx="${entry#*:}"
  build_one "${svc}" "${ctx}" || FAILED+=("${svc}")
done

echo ""
echo "==> ACR repositories:"
az acr repository list -n "${ACR_NAME}" -o tsv | sed 's/^/    /'

if [[ "${#FAILED[@]}" -gt 0 ]]; then
  echo ""
  echo "✗ Failed builds: ${FAILED[*]}" >&2
  exit 1
fi
echo ""
echo "✓ All service images present in ${ACR_NAME}"
