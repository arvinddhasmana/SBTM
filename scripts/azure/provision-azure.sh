#!/usr/bin/env bash
# scripts/azure/provision-azure.sh
# One-time Azure infrastructure provisioning for SBTM.
# Usage: bash scripts/azure/provision-azure.sh [demo|production]
#
# Prerequisites:
#   - az CLI installed and logged in (az login)
#   - kubectl installed
#   - helm installed

set -euo pipefail

ENVIRONMENT="${1:-demo}"
RESOURCE_GROUP="sbtm-rg"
LOCATION="${2:-eastus}"
PARAMETERS_FILE="infra/azure/parameters.${ENVIRONMENT}.json"

if [[ ! -f "${PARAMETERS_FILE}" ]]; then
  echo "ERROR: Parameters file not found: ${PARAMETERS_FILE}"
  exit 1
fi

echo "==> [1/7] Creating resource group: ${RESOURCE_GROUP} in ${LOCATION}"
az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" --output none

echo "==> [2/7] Deploying Bicep templates (environment: ${ENVIRONMENT})"
DEPLOYMENT_OUTPUT=$(az deployment group create \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file infra/azure/main.bicep \
  --parameters "@${PARAMETERS_FILE}" \
  --query "properties.outputs" \
  --output json)

# Parse outputs
AKS_CLUSTER=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.aksClusterName.value')
ACR_SERVER=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.acrLoginServer.value')
KV_NAME=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.keyVaultName.value')
KV_URI=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.keyVaultUri.value')
WORKLOAD_CLIENT_ID=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.workloadIdentityClientId.value')

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

echo "==> [6/7] Applying SBTM namespaces"
kubectl apply -f infra/k8s/base/namespace.yaml

echo "==> [7/7] Seeding Key Vault secrets"
KV_NAME="${KV_NAME}" bash scripts/azure/setup-keyvault.sh

echo ""
echo "==> Provisioning complete!"
echo ""
echo "    Next steps:"
echo "    1. Run: bash scripts/azure/setup-db.sh migrate"
echo "    2. Run: bash scripts/azure/osrm-upload.sh"
echo "    3. Update infra/k8s/base/secrets/keyvault-csi.yaml with KV_NAME=${KV_NAME}"
echo "    4. Update ingress-rules.yaml with your domain name"
echo "    5. Run: kubectl apply -k infra/k8s/overlays/${ENVIRONMENT}"
echo ""
echo "    ACR login server: ${ACR_SERVER}"
echo "    Workload identity client ID (for pod annotations): ${WORKLOAD_CLIENT_ID}"
