#!/usr/bin/env bash
# scripts/azure/deploy-services.sh
# Deploy or update all SBTM services to AKS using Kustomize overlays.
#
# Usage: bash scripts/azure/deploy-services.sh [staging|production]
#
# Requires: kubectl configured with AKS credentials (az aks get-credentials)

set -euo pipefail

ENVIRONMENT="${1:-staging}"

if [[ "${ENVIRONMENT}" != "staging" ]] && [[ "${ENVIRONMENT}" != "production" ]]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

OVERLAY_PATH="infra/k8s/overlays/${ENVIRONMENT}"
NAMESPACE="sbtm-${ENVIRONMENT}"

if [[ ! -d "${OVERLAY_PATH}" ]]; then
  echo "ERROR: Overlay not found: ${OVERLAY_PATH}"
  exit 1
fi

if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo ""
  echo "  ⚠️  You are about to deploy to PRODUCTION."
  echo "  Resource group: sbtm-rg"
  echo "  Namespace: ${NAMESPACE}"
  echo ""
  read -r -p "  Type 'yes' to confirm: " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo "==> [1/4] Applying Kustomize overlay: ${OVERLAY_PATH}"
kubectl apply -k "${OVERLAY_PATH}"

echo "==> [2/4] Waiting for rollout (timeout 600s)"
kubectl rollout status deployment -n "${NAMESPACE}" --timeout=600s

echo "==> [3/4] Pod status"
kubectl get pods -n "${NAMESPACE}"

echo "==> [4/4] Ingress status"
kubectl get ingress -n "${NAMESPACE}"

echo ""
echo "==> Deployment to ${ENVIRONMENT} complete"
