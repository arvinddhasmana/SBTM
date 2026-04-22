#!/usr/bin/env bash
# scripts/azure/cost-start.sh
# Restarts the AKS cluster and PostgreSQL after cost-stop.sh.
#
# Usage:
#   bash scripts/azure/cost-start.sh demo
#   bash scripts/azure/cost-start.sh production

set -euo pipefail

ENVIRONMENT="${1:-demo}"

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RESOURCE_GROUP="sbtm-rg"
else
  RESOURCE_GROUP="sbtm-demo-rg"
fi

AKS_NAME="sbtm-aks-${ENVIRONMENT}"
PG_NAME="sbtm-pg-${ENVIRONMENT}"
NAMESPACE="sbtm-${ENVIRONMENT}"

# ── verify resource group exists ─────────────────────────────────────────────
if ! az group show --name "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  echo "ERROR: Resource group ${RESOURCE_GROUP} not found. Has the environment been provisioned?"
  exit 1
fi

echo "==> [1/5] Starting PostgreSQL Flexible Server: ${PG_NAME}"
PG_STATE=$(az postgres flexible-server show --resource-group "${RESOURCE_GROUP}" --name "${PG_NAME}" \
  --query "state" -o tsv 2>/dev/null || echo "Unknown")
if [[ "${PG_STATE}" == "Ready" ]]; then
  echo "    Already running."
else
  az postgres flexible-server start --resource-group "${RESOURCE_GROUP}" --name "${PG_NAME}" 2>/dev/null \
    && echo "    ✓ PostgreSQL start command issued." \
    || echo "    ⚠  Could not start PostgreSQL."
fi

echo "==> [2/5] Starting AKS cluster: ${AKS_NAME} (takes ~5-10 minutes)"
AKS_STATE=$(az aks show --resource-group "${RESOURCE_GROUP}" --name "${AKS_NAME}" \
  --query "powerState.code" -o tsv 2>/dev/null || echo "Unknown")
if [[ "${AKS_STATE}" == "Running" ]]; then
  echo "    Already running."
else
  az aks start --resource-group "${RESOURCE_GROUP}" --name "${AKS_NAME}"
  echo "    ✓ AKS start command issued."
fi

echo "==> [3/5] Refreshing kubectl credentials"
az aks get-credentials --resource-group "${RESOURCE_GROUP}" --name "${AKS_NAME}" --overwrite-existing

echo "==> [4/5] Waiting for nodes to be Ready (timeout 5 min)"
kubectl wait --for=condition=Ready nodes --all --timeout=300s
echo "    ✓ All nodes are Ready"
kubectl get nodes

echo "==> [5/5] Verifying pod status in namespace: ${NAMESPACE}"
sleep 10
NOT_RUNNING=$(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null \
  | grep -vc -E "Running|Completed" || true)
kubectl get pods -n "${NAMESPACE}"

if [[ "${NOT_RUNNING}" -gt 0 ]]; then
  echo ""
  echo "  ⚠  ${NOT_RUNNING} pod(s) not yet Running. They may still be pulling images."
  echo "     Wait a minute then check: kubectl get pods -n ${NAMESPACE}"
  echo "     If pods are CrashLooping:  kubectl logs <pod-name> -n ${NAMESPACE}"
else
  echo "  ✓ All pods are Running or Completed."
fi

# ── PostgreSQL readiness check ────────────────────────────────────────────────
echo ""
echo "==> Waiting for PostgreSQL to reach Ready state (timeout 5 min)"
PG_WAIT=0
PG_FINAL="Unknown"
while [[ "${PG_WAIT}" -lt 300 ]]; do
  PG_FINAL=$(az postgres flexible-server show \
    --resource-group "${RESOURCE_GROUP}" --name "${PG_NAME}" \
    --query "state" -o tsv 2>/dev/null || echo "Unknown")
  if [[ "${PG_FINAL}" == "Ready" ]]; then
    echo "    ✓ PostgreSQL is Ready"
    break
  fi
  echo "    PostgreSQL state: ${PG_FINAL} — waiting..."
  sleep 20
  PG_WAIT=$((PG_WAIT + 20))
done
if [[ "${PG_FINAL}" != "Ready" ]]; then
  echo "    ⚠  PostgreSQL did not reach Ready state within 5 minutes. Check the portal."
fi

cat <<EOF

==> ${ENVIRONMENT} resumed.

    Verify pods:         kubectl get pods -n ${NAMESPACE}
    Re-deploy if needed: kubectl apply -k infra/k8s/overlays/${ENVIRONMENT}
    View logs:           kubectl logs -n ${NAMESPACE} deployment/<name>

EOF
