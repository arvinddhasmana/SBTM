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

ensure_kv_data_plane_access() {
  local kv_name="$1"
  local kv_id=""
  local assignee=""

  kv_id=$(az keyvault show --name "${kv_name}" --query id -o tsv 2>/dev/null || true)
  assignee=$(az account show --query user.name -o tsv 2>/dev/null || true)

  if [[ -z "${kv_id}" || -z "${assignee}" ]]; then
    echo "  ⚠  Could not resolve Key Vault scope or current identity; skipping auto-RBAC fix"
    return
  fi

  if az keyvault secret list --vault-name "${kv_name}" --maxresults 1 --query "[0].name" -o tsv >/dev/null 2>&1; then
    return
  fi

  echo "  ⚠  Current identity lacks Key Vault secret permissions; ensuring RBAC role assignment"
  local existing_roles=""
  existing_roles=$(az role assignment list \
    --assignee "${assignee}" \
    --scope "${kv_id}" \
    --query "[?roleDefinitionName=='Key Vault Secrets Officer' || roleDefinitionName=='Key Vault Administrator'].roleDefinitionName" \
    -o tsv 2>/dev/null || true)

  if [[ -z "${existing_roles}" ]]; then
    if az role assignment create \
      --assignee "${assignee}" \
      --role "Key Vault Secrets Officer" \
      --scope "${kv_id}" \
      --output none >/dev/null 2>&1; then
      echo "  ✓ Assigned 'Key Vault Secrets Officer' to ${assignee}"
    else
      echo "  ⚠  Could not auto-assign Key Vault role for ${assignee}."
      return
    fi
  fi

  for _ in {1..24}; do
    if az keyvault secret list --vault-name "${kv_name}" --maxresults 1 --query "[0].name" -o tsv >/dev/null 2>&1; then
      echo "  ✓ Key Vault data-plane access confirmed"
      return
    fi
    sleep 5
  done

  echo "  ⚠  Key Vault RBAC may still be propagating"
}

env_file_has_placeholders() {
  local env_file="$1"
  grep -Eq '^[A-Z_][A-Z0-9_]*=<.*>$' "${env_file}" 2>/dev/null
}

echo "==> [1/7] Creating resource group: ${RESOURCE_GROUP} in ${LOCATION}"
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --tags environment="${ENVIRONMENT}" application=sbtm managedBy=bicep devTestEligible="${IS_DEVTEST}" \
  --output none

echo "==> [1.5/7] Ensuring required Azure resource providers are registered"
REQUIRED_RPS=(
  "Microsoft.ContainerService"
  "Microsoft.OperationsManagement"
  "Microsoft.OperationalInsights"
  "Microsoft.DBforPostgreSQL"
  "Microsoft.Network"
)
for RP in "${REQUIRED_RPS[@]}"; do
  STATE=$(az provider show --namespace "${RP}" --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")
  if [[ "${STATE}" != "Registered" ]]; then
    echo "    Registering ${RP} (current: ${STATE})"
    az provider register --namespace "${RP}" --output none || true
    # Poll for a short bounded period to avoid hanging indefinitely on subscriptions
    # where registration can remain in 'Registering' for a long time.
    ATTEMPTS=0
    MAX_ATTEMPTS=6
    while [[ "${ATTEMPTS}" -lt "${MAX_ATTEMPTS}" ]]; do
      STATE=$(az provider show --namespace "${RP}" --query registrationState -o tsv 2>/dev/null || echo "Unknown")
      if [[ "${STATE}" == "Registered" ]]; then
        break
      fi
      ATTEMPTS=$((ATTEMPTS + 1))
    done
  fi

  if [[ "${STATE}" == "Registered" ]]; then
    echo "    ✓ ${RP} registered"
  else
    echo "    ⚠ ${RP} still ${STATE}; continuing (Azure may finish registration asynchronously)"
  fi
done

echo "==> [2/7] Deploying Bicep templates (environment: ${ENVIRONMENT}, devTest: ${IS_DEVTEST})"
# Default PostgreSQL region to eastus2 unless explicitly overridden.
POSTGRES_LOCATION="${POSTGRES_LOCATION:-eastus2}"
DEPLOY_ERR_LOG=$(mktemp)
PG_SERVER_BASE_NAME="sbtm-pg-${ENVIRONMENT}"
PG_SERVER_NAME="${PG_SERVER_BASE_NAME}"
DEPLOYMENT_NAME="main-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"
echo "    Deployment name: ${DEPLOYMENT_NAME}"

echo "    Cleaning up stale running deployments in ${RESOURCE_GROUP}"
RUNNING_DEPLOYMENTS=$(az deployment group list -g "${RESOURCE_GROUP}" --query "[?properties.provisioningState=='Running'].name" -o tsv 2>/dev/null || true)
if [[ -n "${RUNNING_DEPLOYMENTS}" ]]; then
  while IFS= read -r d; do
    [[ -z "${d}" ]] && continue
    az deployment group cancel -g "${RESOURCE_GROUP}" -n "${d}" >/dev/null 2>&1 || true
  done <<< "${RUNNING_DEPLOYMENTS}"
fi

# If any matching server already exists, pin both name and location for idempotency.
# Notes:
#   * Use `az postgres flexible-server list` rather than the generic `az resource list`
#     because the latter is occasionally stale.
#   * The JMESPath form `[?filter][0].name` does NOT return the first matching item's
#     name (it indexes into the inner projection and yields empty for our shape).
#     The correct form is `[?filter] | [0].name`.
#   * Allow operators to override via the POSTGRES_SERVER_NAME env var.
EXISTING_PG_NAME="${POSTGRES_SERVER_NAME:-}"
EXISTING_PG_LOCATION=""
if [[ -z "${EXISTING_PG_NAME}" ]]; then
  EXISTING_PG_NAME=$(az postgres flexible-server list \
    --resource-group "${RESOURCE_GROUP}" \
    --query "[?starts_with(name, '${PG_SERVER_BASE_NAME}')] | [0].name" \
    -o tsv 2>/dev/null || true)
fi
if [[ -n "${EXISTING_PG_NAME}" ]]; then
  EXISTING_PG_LOCATION=$(az postgres flexible-server show \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${EXISTING_PG_NAME}" \
    --query location -o tsv 2>/dev/null || true)
  # `flexible-server show` returns the display name (e.g. "Central US") but
  # Bicep / ARM expect the canonical region slug (e.g. "centralus"). Normalize.
  if [[ -n "${EXISTING_PG_LOCATION}" ]]; then
    EXISTING_PG_LOCATION=$(echo "${EXISTING_PG_LOCATION}" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
  fi
  if [[ -n "${EXISTING_PG_LOCATION}" ]]; then
    PG_SERVER_NAME="${EXISTING_PG_NAME}"
    POSTGRES_LOCATION="${EXISTING_PG_LOCATION}"
    echo "    Detected existing ${PG_SERVER_NAME} in ${POSTGRES_LOCATION}; pinning postgresLocation/postgresServerName"
  else
    echo "    ⚠ Found PG server name '${EXISTING_PG_NAME}' but could not read its location; falling back to defaults"
    EXISTING_PG_NAME=""
  fi
fi

run_deployment() {
  local pg_location="${1:-${POSTGRES_LOCATION:-${LOCATION}}}"
  local pg_private_network="true"
  local pg_server_name="${PG_SERVER_BASE_NAME}"
  if [[ "${pg_location}" != "${LOCATION}" ]]; then
    pg_server_name="${PG_SERVER_BASE_NAME}-${pg_location//-/}"
    pg_private_network="false"
  fi
  # Keep existing server name when we discovered one earlier.
  if [[ -n "${EXISTING_PG_NAME:-}" ]]; then
    pg_server_name="${PG_SERVER_NAME}"
    if [[ "${POSTGRES_LOCATION}" != "${LOCATION}" ]]; then
      pg_private_network="false"
    fi
  fi
  az deployment group create \
    --name "${DEPLOYMENT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --template-file infra/azure/main.bicep \
    --parameters "@${PARAMETERS_FILE}" \
    --parameters postgresAdminPassword="${POSTGRES_ADMIN_PASSWORD}" isDevTestSubscription="${IS_DEVTEST}" deploymentSuffix="${DEPLOYMENT_NAME}" postgresLocation="${pg_location}" postgresServerName="${pg_server_name}" postgresUsePrivateNetwork="${pg_private_network}" \
    --query "properties.outputs" \
    --output json
}

is_postgres_location_restricted() {
  local err_file="$1"
  if grep -Eqi "LocationIsOfferRestricted|restricted from provisioning in location|request-quota-increase" "${err_file}"; then
    return 0
  fi

  # Some Azure CLI failures don't surface the nested module error text on stderr.
  # Probe the failed nested DB deployment directly for restricted-location errors.
  local nested="database-${DEPLOYMENT_NAME}"
  local nested_msg=""
  nested_msg=$(az deployment operation group list \
    -g "${RESOURCE_GROUP}" \
    -n "${nested}" \
    --query "[?properties.provisioningState=='Failed'].properties.statusMessage.error.message" \
    -o tsv 2>/dev/null || true)

  if [[ -n "${nested_msg}" ]] && echo "${nested_msg}" | grep -Eqi "restricted from provisioning in location|LocationIsOfferRestricted|request-quota-increase"; then
    return 0
  fi

  return 1
}

set +e
DEPLOYMENT_OUTPUT=$(run_deployment "${POSTGRES_LOCATION}" 2>"${DEPLOY_ERR_LOG}")
DEPLOY_EXIT=$?
set -e

if [[ "${DEPLOY_EXIT}" -ne 0 ]] && is_postgres_location_restricted "${DEPLOY_ERR_LOG}"; then
  echo "    ⚠  PostgreSQL offer restricted in ${POSTGRES_LOCATION}; retrying with fallback regions"
  for FALLBACK in eastus2 centralus westus2 canadacentral; do
    [[ "${FALLBACK}" == "${POSTGRES_LOCATION}" ]] && continue
    echo "    → Retrying deployment with postgresLocation=${FALLBACK}"
    set +e
    DEPLOYMENT_OUTPUT=$(run_deployment "${FALLBACK}" 2>"${DEPLOY_ERR_LOG}")
    DEPLOY_EXIT=$?
    set -e
    if [[ "${DEPLOY_EXIT}" -eq 0 ]]; then
      POSTGRES_LOCATION="${FALLBACK}"
      break
    fi
  done
fi

if [[ "${DEPLOY_EXIT}" -ne 0 ]]; then
  cat "${DEPLOY_ERR_LOG}" >&2
  rm -f "${DEPLOY_ERR_LOG}"
  exit "${DEPLOY_EXIT}"
fi

rm -f "${DEPLOY_ERR_LOG}"
echo "    PostgreSQL location used: ${POSTGRES_LOCATION}"

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
  if env_file_has_placeholders "${ENV_FILE_FOR_KV}"; then
    echo "  ⚠  ${ENV_FILE_FOR_KV} still has template placeholders — skipping Key Vault seeding."
    echo "     Bootstrap step 6 will materialize values, then seed Key Vault in step 7."
  else
    ensure_kv_data_plane_access "${KV_NAME}"
    KV_SEED_LOG=$(mktemp)
    set +e
    KV_NAME="${KV_NAME}" ENV_FILE="${ENV_FILE_FOR_KV}" bash scripts/azure/setup-keyvault.sh >"${KV_SEED_LOG}" 2>&1
    KV_SEED_EXIT=$?
    set -e
    if [[ "${KV_SEED_EXIT}" -ne 0 ]]; then
      if grep -Eqi "ForbiddenByRbac|Caller is not authorized to perform action" "${KV_SEED_LOG}"; then
        echo "  ⚠  Key Vault seeding skipped due to RBAC denial for current identity."
        echo "     Grant 'Key Vault Secrets Officer' on ${KV_NAME}, then re-run:"
        echo "     KV_NAME=${KV_NAME} ENV_FILE=${ENV_FILE_FOR_KV} bash scripts/azure/setup-keyvault.sh"
      else
        cat "${KV_SEED_LOG}" >&2
        rm -f "${KV_SEED_LOG}"
        exit "${KV_SEED_EXIT}"
      fi
    else
      cat "${KV_SEED_LOG}"
    fi
    rm -f "${KV_SEED_LOG}"
  fi
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
