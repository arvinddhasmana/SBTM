#!/usr/bin/env bash
# scripts/gcp/cost-start.sh
# Resume resources previously paused by cost-stop.sh.
#
# Usage:
#   bash scripts/gcp/cost-start.sh demo
#   bash scripts/gcp/cost-start.sh production    # blocked unless ALLOW_PROD_START=1

set -euo pipefail

ENVIRONMENT="${1:-demo}"

if [[ "${ENVIRONMENT}" != "demo" && "${ENVIRONMENT}" != "production" ]]; then
  echo "Usage: $0 [demo|production]"
  exit 1
fi

if [[ "${ENVIRONMENT}" == "production" && "${ALLOW_PROD_START:-}" != "1" ]]; then
  echo "Refusing to start production by default. To force, set ALLOW_PROD_START=1."
  exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-}"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: GCP_PROJECT_ID env var is required."
  exit 1
fi

NAMESPACE="sbtm-${ENVIRONMENT}-gcp"
SQL_INSTANCE_PREFIX="sbtm-${ENVIRONMENT}"

gcloud config set project "${PROJECT_ID}" --quiet >/dev/null

echo "==> [1/3] Starting Cloud SQL instance(s) starting with ${SQL_INSTANCE_PREFIX}"
SQL_INSTANCES=$(gcloud sql instances list \
  --filter="name~^${SQL_INSTANCE_PREFIX}" \
  --format="value(name)" 2>/dev/null || true)
if [[ -z "${SQL_INSTANCES}" ]]; then
  echo "    No matching Cloud SQL instances."
else
  for INST in ${SQL_INSTANCES}; do
    STATE=$(gcloud sql instances describe "${INST}" --format="value(state)" 2>/dev/null || echo "Unknown")
    if [[ "${STATE}" == "RUNNABLE" ]]; then
      echo "    Already running: ${INST}"
    else
      gcloud sql instances patch "${INST}" --activation-policy=ALWAYS --quiet >/dev/null
      echo "    ✓ start issued: ${INST}"
    fi
  done
fi

echo "==> [2/3] Scaling all GKE Deployments back to 1 in namespace ${NAMESPACE}"
if kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  DEPS=$(kubectl get deployments -n "${NAMESPACE}" -o name 2>/dev/null || true)
  if [[ -n "${DEPS}" ]]; then
    for D in ${DEPS}; do
      kubectl scale "${D}" -n "${NAMESPACE}" --replicas=1 >/dev/null
      echo "    ✓ scaled ${D} → 1"
    done
  else
    echo "    No Deployments to scale."
  fi
else
  echo "    Namespace ${NAMESPACE} not found — re-run scripts/gcp/bootstrap.sh ${ENVIRONMENT}"
fi

echo "==> [3/3] Done. Allow ~2 min for pods + Cloud SQL to reach Ready."
