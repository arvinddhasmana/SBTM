#!/usr/bin/env bash
# scripts/azure/deploy-services.sh
# Deploy or update all SBTM services to AKS using Kustomize overlays.
#
# Usage: bash scripts/azure/deploy-services.sh [demo|production]
#
# Requires: kubectl configured with AKS credentials (az aks get-credentials)

set -euo pipefail

ENVIRONMENT="${1:-demo}"

if [[ "${ENVIRONMENT}" != "demo" ]] && [[ "${ENVIRONMENT}" != "production" ]]; then
  echo "Usage: $0 [demo|production]"
  exit 1
fi

OVERLAY_PATH="infra/k8s/overlays/${ENVIRONMENT}"
NAMESPACE="sbtm-${ENVIRONMENT}"

if [[ ! -d "${OVERLAY_PATH}" ]]; then
  echo "ERROR: Overlay not found: ${OVERLAY_PATH}"
  exit 1
fi

# ── pick kustomize binary ─────────────────────────────────────────────────────
if command -v kustomize >/dev/null 2>&1; then
  KUSTOMIZE_CMD="kustomize"
elif kubectl kustomize version >/dev/null 2>&1; then
  KUSTOMIZE_CMD="kubectl kustomize"
else
  echo "ERROR: Neither 'kustomize' nor 'kubectl kustomize' is available. Install kustomize first."
  exit 1
fi

# ── production gate ───────────────────────────────────────────────────────────
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

echo "==> [1/5] Validating Kustomize overlay (build + kubectl dry-run)"
if ! ${KUSTOMIZE_CMD} build "${OVERLAY_PATH}" | kubectl apply --dry-run=client -f - >/dev/null 2>&1; then
  echo "ERROR: Overlay dry-run failed — aborting deployment."
  echo "       Debug with: ${KUSTOMIZE_CMD} build ${OVERLAY_PATH} | kubectl apply --dry-run=client -f -"
  exit 1
fi
RESOURCE_COUNT=$(${KUSTOMIZE_CMD} build "${OVERLAY_PATH}" 2>/dev/null | grep -c "^kind:" || true)
echo "    ✓ Overlay ${OVERLAY_PATH} valid — ${RESOURCE_COUNT} resources"

echo "==> [2/5] Checking kubectl connectivity to namespace: ${NAMESPACE}"
if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  echo "    Namespace ${NAMESPACE} not found — creating it"
  kubectl create namespace "${NAMESPACE}"
fi
CURRENT_CLUSTER=$(kubectl config current-context 2>/dev/null || echo "(unknown)")
echo "    kubectl context: ${CURRENT_CLUSTER}"

echo "==> [3/5] Applying Kustomize overlay: ${OVERLAY_PATH}"
kubectl apply -k "${OVERLAY_PATH}"

echo "==> [4/5] Waiting for rollout (timeout 600s)"
DEPLOYMENTS=$(kubectl get deployments -n "${NAMESPACE}" -o name 2>/dev/null || true)
if [[ -z "${DEPLOYMENTS}" ]]; then
  echo "    No Deployments in ${NAMESPACE} yet — skipping rollout wait."
else
  ROLLOUT_FAIL=0
  for D in ${DEPLOYMENTS}; do
    echo "    Waiting: ${D}"
    if ! kubectl rollout status "${D}" -n "${NAMESPACE}" --timeout=600s; then
      echo "    ✗ Rollout FAILED for ${D}"
      kubectl describe "${D}" -n "${NAMESPACE}" | tail -15
      ROLLOUT_FAIL=1
    else
      echo "    ✓ ${D##*/} ready"
    fi
  done
  if [[ "${ROLLOUT_FAIL}" -eq 1 ]]; then
    echo "ERROR: One or more deployments failed to roll out."
    exit 1
  fi
fi

echo "==> [5/5] Post-deploy verification"
echo ""
echo "  --- Pod status ---"
kubectl get pods -n "${NAMESPACE}"
echo ""
echo "  --- Ingress status ---"
kubectl get ingress -n "${NAMESPACE}"

# ── smoke test — derive URL from actual ingress ───────────────────────────────
INGRESS_IP=$(kubectl get ingress -n "${NAMESPACE}" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
INGRESS_HOST=$(kubectl get ingress -n "${NAMESPACE}" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || true)
SMOKE_TARGET="${INGRESS_HOST:-${INGRESS_IP}}"

echo ""
if [[ -n "${SMOKE_TARGET}" ]]; then
  HEALTH_URL="https://${SMOKE_TARGET}/health"
  echo "  --- Smoke test: ${HEALTH_URL} ---"
  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_URL}" || echo "000")
  if [[ "${HTTP_CODE}" == "200" ]]; then
    echo "  ✓ Health check passed (HTTP 200)"
  elif [[ "${HTTP_CODE}" == "000" ]]; then
    echo "  ⚠  Health check timed out — DNS may not be pointed to the ingress IP yet."
    echo "     Get ingress IP: kubectl get ingress -n ${NAMESPACE}"
  else
    echo "  ⚠  Health check returned HTTP ${HTTP_CODE} — pods may still be starting."
  fi
else
  echo "  --- Smoke test skipped (no ingress IP/host assigned yet) ---"
  echo "     Point your domain A/CNAME to: kubectl get ingress -n ${NAMESPACE}"
fi

echo ""
echo "==> Deployment to ${ENVIRONMENT} complete."
