#!/usr/bin/env bash
# scripts/azure/cost-stop.sh
# Stops resources to minimize cost WITHOUT deleting data.
# Use this between demos to avoid running compute charges.
#
# Usage:
#   bash scripts/azure/cost-stop.sh demo
#   bash scripts/azure/cost-stop.sh production    # blocked by default; ALLOW_PROD_STOP=1 to force
#
# Still billing after stop: PostgreSQL storage, Redis (Basic C0 ~$16/mo),
#   Blob Storage, ACR, Key Vault, Public IP, Log Analytics.
# To stop ALL charges, use teardown-azure.sh instead.

set -euo pipefail

ENVIRONMENT="${1:-demo}"

if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo "Refusing to stop production by default. To force, set ALLOW_PROD_STOP=1."
  if [[ "${ALLOW_PROD_STOP:-}" != "1" ]]; then
    exit 1
  fi
  RESOURCE_GROUP="sbtm-rg"
else
  RESOURCE_GROUP="sbtm-demo-rg"
fi

AKS_NAME="sbtm-aks-${ENVIRONMENT}"
PG_NAME="sbtm-pg-${ENVIRONMENT}"

# ── verify resource group exists ─────────────────────────────────────────────
if ! az group show --name "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  echo "ERROR: Resource group ${RESOURCE_GROUP} not found. Has the environment been provisioned?"
  exit 1
fi

echo "==> [1/4] Stopping AKS cluster: ${AKS_NAME}"
AKS_STATE=$(az aks show --resource-group "${RESOURCE_GROUP}" --name "${AKS_NAME}" \
  --query "powerState.code" -o tsv 2>/dev/null || echo "Unknown")
if [[ "${AKS_STATE}" == "Stopped" ]]; then
  echo "    Already stopped."
else
  az aks stop --resource-group "${RESOURCE_GROUP}" --name "${AKS_NAME}"
  echo "    ✓ AKS stop command issued."
fi

echo "==> [2/4] Stopping PostgreSQL Flexible Server: ${PG_NAME}"
PG_STATE=$(az postgres flexible-server show --resource-group "${RESOURCE_GROUP}" --name "${PG_NAME}" \
  --query "state" -o tsv 2>/dev/null || echo "Unknown")
if [[ "${PG_STATE}" == "Stopped" ]]; then
  echo "    Already stopped."
else
  az postgres flexible-server stop --resource-group "${RESOURCE_GROUP}" --name "${PG_NAME}" 2>/dev/null \
    && echo "    ✓ PostgreSQL stop command issued." \
    || echo "    ⚠  Could not stop PostgreSQL (may already be stopping)."
fi

echo "==> [3/4] Verifying AKS power state (wait up to 3 min)"
WAIT=0
AKS_FINAL="Unknown"
while [[ "${WAIT}" -lt 180 ]]; do
  AKS_FINAL=$(az aks show --resource-group "${RESOURCE_GROUP}" --name "${AKS_NAME}" \
    --query "powerState.code" -o tsv 2>/dev/null || echo "Unknown")
  if [[ "${AKS_FINAL}" == "Stopped" ]]; then
    echo "    ✓ AKS is Stopped"
    break
  fi
  echo "    AKS state: ${AKS_FINAL} — waiting..."
  sleep 15
  WAIT=$((WAIT + 15))
done
if [[ "${AKS_FINAL}" != "Stopped" ]]; then
  echo "    ⚠  AKS did not reach Stopped state within 3 minutes."
  echo "       Check: az aks show --resource-group ${RESOURCE_GROUP} --name ${AKS_NAME} --query powerState.code"
fi

echo "==> [4/4] Current resource states"
PG_FINAL=$(az postgres flexible-server show --resource-group "${RESOURCE_GROUP}" --name "${PG_NAME}" \
  --query "state" -o tsv 2>/dev/null || echo "unknown")
echo "    AKS:        ${AKS_FINAL}"
echo "    PostgreSQL: ${PG_FINAL}"

cat <<EOF

==> Cost-stop complete for ${ENVIRONMENT}.

    Stopped (no compute charges):
      - AKS cluster ${AKS_NAME}
      - PostgreSQL ${PG_NAME}  ⚠  Azure auto-resumes PG after 7 days

    Still billing (data preserved):
      - PostgreSQL storage  ~\$0.10/GB/month
      - Redis Cache         (Basic C0 ~\$16/mo even when idle)
      - Blob Storage        ~\$0.02/GB/month
      - Container Registry  ~\$5/mo (Basic)
      - Key Vault           ~\$0.03/10K ops
      - Public IP           ~\$4/mo
      - Log Analytics       ingestion-based

    Resume:      bash scripts/azure/cost-start.sh ${ENVIRONMENT}
    Full delete: bash scripts/azure/teardown-azure.sh ${ENVIRONMENT}

EOF
