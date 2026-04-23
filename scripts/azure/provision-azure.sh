#!/usr/bin/env bash
# scripts/azure/provision-azure.sh
# One-time Azure infrastructure provisioning for SBTM.
#
# Usage:
#   bash scripts/azure/provision-azure.sh demo [eastus] [false]
#   bash scripts/azure/provision-azure.sh production [canadacentral] [false]
#
# Args:
#   $1 = environment (demo|production), default demo
#   $2 = location, default eastus
#   $3 = isDevTestSubscription (true|false), default false
#
# Resource groups (per-environment):
#   demo       -> sbtm-demo-rg
#   production -> sbtm-rg
#
# Prerequisites:
#   - az CLI installed and logged in (az login)
#   - kubectl + helm installed
#   - PostgreSQL admin password available as POSTGRES_ADMIN_PASSWORD env var
#   - For complete prerequisite list, run: bash scripts/azure/preflight-check.sh

set -euo pipefail

ENVIRONMENT="${1:-demo}"
LOCATION="${2:-eastus}"
IS_DEVTEST="${3:-false}"

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RESOURCE_GROUP="sbtm-rg"
else
  RESOURCE_GROUP="sbtm-demo-rg"
fi

PARAMETERS_FILE="infra/azure/parameters.${ENVIRONMENT}.json"

if [[ ! -f "${PARAMETERS_FILE}" ]]; then
  echo "ERROR: Parameters file not found: ${PARAMETERS_FILE}"
  exit 1
fi

if [[ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]]; then
  echo "ERROR: POSTGRES_ADMIN_PASSWORD environment variable must be set."
  echo "Generate a strong password and export it before running this script."
  exit 1
fi

echo "==> [1/7] Creating resource group: ${RESOURCE_GROUP} in ${LOCATION}"
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --tags environment="${ENVIRONMENT}" application=sbtm managedBy=bicep devTestEligible="${IS_DEVTEST}" \
  --output none

echo "==> [2/7] Deploying Bicep templates (environment: ${ENVIRONMENT}, devTest: ${IS_DEVTEST})"
DEPLOYMENT_OUTPUT=$(az deployment group create \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file infra/azure/main.bicep \
  --parameters "@${PARAMETERS_FILE}" \
  --parameters postgresAdminPassword="${POSTGRES_ADMIN_PASSWORD}" isDevTestSubscription="${IS_DEVTEST}" \
  --query "properties.outputs" \
  --output json)

# Parse outputs
AKS_CLUSTER=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.aksClusterName.value')
ACR_SERVER=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.acrLoginServer.value')
KV_NAME=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.keyVaultName.value')
KV_URI=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.keyVaultUri.value')
WORKLOAD_CLIENT_ID=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.workloadIdentityClientId.value')

echo "    Resource group:   ${RESOURCE_GROUP}"
echo "    AKS cluster:      ${AKS_CLUSTER}"
echo "    ACR server:       ${ACR_SERVER}"
echo "    Key Vault:        ${KV_NAME}"
echo "    Workload ID:      ${WORKLOAD_CLIENT_ID}"

echo "==> [3/7] Getting AKS credentials"
az aks get-credentials \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${AKS_CLUSTER}" \
  --overwrite-existing

echo "==> [4/7] Installing NGINX Ingress Controller"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz \
  --wait

echo "==> [5/7] Installing cert-manager (Let's Encrypt)"
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --wait

echo "==> [6/7] Applying namespaces + base SBTM manifests via Kustomize"
OVERLAY_PATH="infra/k8s/overlays/${ENVIRONMENT}"
if [[ ! -d "${OVERLAY_PATH}" ]]; then
  echo "ERROR: Kustomize overlay not found: ${OVERLAY_PATH}"
  exit 1
fi
if command -v kustomize >/dev/null 2>&1; then
  KUSTOMIZE_CMD="kustomize"
else
  KUSTOMIZE_CMD="kubectl kustomize"
fi
echo "    Validating overlay (build + kubectl dry-run): ${OVERLAY_PATH}"
if ! ${KUSTOMIZE_CMD} build "${OVERLAY_PATH}" | kubectl apply --dry-run=client -f - >/dev/null 2>&1; then
  echo "ERROR: Kustomize overlay failed validation."
  echo "       Run: ${KUSTOMIZE_CMD} build ${OVERLAY_PATH} | kubectl apply --dry-run=client -f -"
  exit 1
fi
RESOURCE_COUNT=$(${KUSTOMIZE_CMD} build "${OVERLAY_PATH}" 2>/dev/null | grep -c "^kind:" || true)
echo "    Overlay valid — ${RESOURCE_COUNT} resources."
# Create namespace (idempotent)
kubectl create namespace "sbtm-${ENVIRONMENT}" --dry-run=client -o yaml | kubectl apply -f -

echo "==> [7/7] Seeding Key Vault secrets"
# Per-environment env file: .env.demo or .env.production
ENV_FILE_FOR_KV=".env.${ENVIRONMENT}"
if [[ -f "${ENV_FILE_FOR_KV}" ]]; then
  KV_NAME="${KV_NAME}" ENV_FILE="${ENV_FILE_FOR_KV}" bash scripts/azure/setup-keyvault.sh
else
  echo "  ⚠  ${ENV_FILE_FOR_KV} not found — skipping Key Vault seeding."
  echo "     Copy .env.${ENVIRONMENT}.template, fill in values, then run:"
  echo "     KV_NAME=${KV_NAME} ENV_FILE=${ENV_FILE_FOR_KV} bash scripts/azure/setup-keyvault.sh"
fi

cat <<EOF

==> Provisioning complete!

    Resource group:    ${RESOURCE_GROUP}
    Environment:       ${ENVIRONMENT}
    Dev/Test pricing:  ${IS_DEVTEST}
    ACR login server:  ${ACR_SERVER}
    Workload ID:       ${WORKLOAD_CLIENT_ID}

    Next steps:
    1. Run: bash scripts/azure/setup-db.sh migrate
    2. Run: bash scripts/azure/osrm-upload.sh
    3. Update infra/k8s/base/secrets/keyvault-csi.yaml with KV_NAME=${KV_NAME}
    4. Update ingress-rules.yaml with your domain name
    5. Run: kubectl apply -k infra/k8s/overlays/${ENVIRONMENT}

    To stop costs without deleting data:  bash scripts/azure/cost-stop.sh ${ENVIRONMENT}
    To resume:                            bash scripts/azure/cost-start.sh ${ENVIRONMENT}
    To DELETE everything:                 bash scripts/azure/teardown-azure.sh ${ENVIRONMENT}

EOF
