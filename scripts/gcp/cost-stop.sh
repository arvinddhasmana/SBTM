#!/usr/bin/env bash
# scripts/gcp/cost-stop.sh
# Stops resources to minimize cost WITHOUT deleting data.
# Use this between demos to avoid running compute charges.
#
# Usage:
#   bash scripts/gcp/cost-stop.sh demo
#   bash scripts/gcp/cost-stop.sh production    # blocked unless ALLOW_PROD_STOP=1
#
# What gets paused:
#   • Cloud SQL (Postgres) instance — STOPPED (storage still billed ~$0.17/GB/mo)
#   • All Deployments in sbtm-${env}-gcp namespace scaled to 0 replicas
#     (GKE Autopilot bills per-pod; zero pods = $0 compute)
#
# What KEEPS billing after stop:
#   • Cloud SQL storage (~$0.17/GB/mo)
#   • Memorystore Redis (Basic tier ~$35/mo for 1GB) — has no stop API,
#     destroy via teardown-gcp.sh to fully remove
#   • Persistent disks attached to GKE
#   • Persistent resources from setup-persistent-resources.sh
#     (Cloud DNS, static IP, Artifact Registry, OSRM bucket — all <$2/mo)
#
# To stop ALL ephemeral charges, use scripts/gcp/teardown-gcp.sh instead.

set -euo pipefail

ENVIRONMENT="${1:-demo}"

if [[ "${ENVIRONMENT}" != "demo" && "${ENVIRONMENT}" != "production" ]]; then
  echo "Usage: $0 [demo|production]"
  exit 1
fi

if [[ "${ENVIRONMENT}" == "production" && "${ALLOW_PROD_STOP:-}" != "1" ]]; then
  echo "Refusing to stop production by default. To force, set ALLOW_PROD_STOP=1."
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

echo "==> [1/3] Scaling all GKE Deployments to 0 in namespace ${NAMESPACE}"
if kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  DEPS=$(kubectl get deployments -n "${NAMESPACE}" -o name 2>/dev/null || true)
  if [[ -n "${DEPS}" ]]; then
    for D in ${DEPS}; do
      kubectl scale "${D}" -n "${NAMESPACE}" --replicas=0 >/dev/null
      echo "    ✓ scaled ${D} → 0"
    done
  else
    echo "    No Deployments to scale."
  fi
else
  echo "    Namespace ${NAMESPACE} not found — skipping (cluster may already be down)."
fi

echo "==> [2/3] Stopping Cloud SQL instance(s) starting with ${SQL_INSTANCE_PREFIX}"
SQL_INSTANCES=$(gcloud sql instances list \
  --filter="name~^${SQL_INSTANCE_PREFIX}" \
  --format="value(name)" 2>/dev/null || true)
if [[ -z "${SQL_INSTANCES}" ]]; then
  echo "    No matching Cloud SQL instances."
else
  for INST in ${SQL_INSTANCES}; do
    STATE=$(gcloud sql instances describe "${INST}" --format="value(state)" 2>/dev/null || echo "Unknown")
    if [[ "${STATE}" == "STOPPED" ]]; then
      echo "    Already stopped: ${INST}"
    else
      gcloud sql instances patch "${INST}" --activation-policy=NEVER --quiet >/dev/null
      echo "    ✓ stop issued: ${INST} (was ${STATE})"
    fi
  done
fi

echo "==> [3/3] Done."
echo ""
echo "  To resume: bash scripts/gcp/cost-start.sh ${ENVIRONMENT}"
echo "  To fully tear down ephemeral: bash scripts/gcp/teardown-gcp.sh ${ENVIRONMENT}"
