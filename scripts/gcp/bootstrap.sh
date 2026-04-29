#!/usr/bin/env bash
# scripts/gcp/bootstrap.sh
#
# Idempotent end-to-end deployment of the SBTM ephemeral environment to GCP.
# Mirrors scripts/azure/bootstrap.sh.
#
# Re-uses the persistent set created once by:
#     bash scripts/gcp/setup-persistent-resources.sh
#
# Usage:
#   bash scripts/gcp/bootstrap.sh demo
#   bash scripts/gcp/bootstrap.sh production
#
# Required env: GCP_PROJECT_ID

set -euo pipefail

ENVIRONMENT="${1:-demo}"

if [[ "${ENVIRONMENT}" != "demo" && "${ENVIRONMENT}" != "production" ]]; then
  echo "Usage: $0 [demo|production]"
  exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-}"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: GCP_PROJECT_ID env var is required."
  echo "Set with: export GCP_PROJECT_ID=<your-gcp-project-id>"
  exit 1
fi

PERSISTENT_DNS_ZONE="${PERSISTENT_DNS_ZONE:-sbtm-gcp-zone}"
PERSISTENT_IP_NAME="${PERSISTENT_IP_NAME:-sbtm-gcp-ingress-ip}"
PERSISTENT_AR_NAME="${PERSISTENT_AR_NAME:-sbtm-shared}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

step() { echo ""; echo "════ $* ════"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠  $*"; }

gcloud config set project "${PROJECT_ID}" --quiet >/dev/null

# ── Step 1: prerequisites ──────────────────────────────────────────────────
step "1/8 Verifying prerequisites"
for tool in gcloud kubectl terraform kustomize; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    if [[ "${tool}" == "kustomize" ]] && kubectl kustomize version >/dev/null 2>&1; then
      ok "kustomize via kubectl"
      continue
    fi
    echo "ERROR: ${tool} not installed."
    exit 1
  fi
  ok "${tool} installed"
done

# ── Step 2: persistent resources must exist ────────────────────────────────
step "2/8 Verifying persistent resources"
MISSING=()
gcloud dns managed-zones describe "${PERSISTENT_DNS_ZONE}" >/dev/null 2>&1 || MISSING+=("Cloud DNS zone ${PERSISTENT_DNS_ZONE}")
gcloud compute addresses describe "${PERSISTENT_IP_NAME}" --global >/dev/null 2>&1 || MISSING+=("static IP ${PERSISTENT_IP_NAME}")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  echo "Missing persistent resources:"
  printf '  - %s\n' "${MISSING[@]}"
  echo ""
  echo "Run once before bootstrap:"
  echo "    bash scripts/gcp/setup-persistent-resources.sh"
  exit 1
fi
ok "All persistent resources present."

PERSISTENT_IP_ADDRESS=$(gcloud compute addresses describe "${PERSISTENT_IP_NAME}" --global --format="value(address)")
ok "Static ingress IP: ${PERSISTENT_IP_ADDRESS}"

# ── Step 3: GCP project setup (idempotent) ─────────────────────────────────
step "3/8 GCP project setup"
bash "${REPO_ROOT}/scripts/gcp/setup-gcp-project.sh" "${PROJECT_ID}"

# ── Step 4: Provision ephemeral infrastructure (Terraform) ─────────────────
step "4/8 Provisioning ephemeral GCP infrastructure (terraform apply)"
bash "${REPO_ROOT}/scripts/gcp/provision-gcp.sh" "${ENVIRONMENT}" apply

# ── Step 5: Get GKE credentials ────────────────────────────────────────────
step "5/8 Fetching GKE credentials"
pushd "${REPO_ROOT}/infra/gcp" >/dev/null
CLUSTER_NAME=$(terraform output -raw gke_cluster_name)
CLUSTER_LOCATION=$(terraform output -raw gke_cluster_location)
popd >/dev/null
gcloud container clusters get-credentials "${CLUSTER_NAME}" --region "${CLUSTER_LOCATION}" --project "${PROJECT_ID}"
ok "kubectl context → ${CLUSTER_NAME}"

# ── Step 6: Build & push images to persistent Artifact Registry ────────────
step "6/8 Building & pushing service images to ${PERSISTENT_AR_NAME}"
REGION="${CLUSTER_LOCATION%%-*}"  # e.g. us-central1-a → us-central1; or already a region
# fall back if region is just "us-central1"
if ! gcloud artifacts repositories describe "${PERSISTENT_AR_NAME}" --location="${CLUSTER_LOCATION}" >/dev/null 2>&1; then
  REGION="${CLUSTER_LOCATION}"
fi

REGISTRY_HOST="${REGION}-docker.pkg.dev/${PROJECT_ID}/${PERSISTENT_AR_NAME}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet >/dev/null

SERVICES=(api-gateway gps-tracking emergency-alerts student-presence student-management compliance-management video-service notification-service)
for svc in "${SERVICES[@]}"; do
  IMG="${REGISTRY_HOST}/${svc}:latest"
  if gcloud artifacts docker images describe "${IMG}" >/dev/null 2>&1; then
    ok "${svc} image already in registry — skipping build"
    continue
  fi
  echo "  → Building ${svc}..."
  ( cd "${REPO_ROOT}" && \
    gcloud builds submit \
      --tag "${IMG}" \
      --project "${PROJECT_ID}" \
      --quiet \
      "services/${svc}" )
  ok "Built & pushed ${svc}"
done

# ── Step 7: Patch overlay with live registry path & deploy ─────────────────
step "7/8 Deploying services to GKE namespace sbtm-${ENVIRONMENT}-gcp"
OVERLAY="${REPO_ROOT}/infra/k8s/overlays/gcp-${ENVIRONMENT}/kustomization.yaml"
if [[ -f "${OVERLAY}" ]]; then
  # Substitute PROJECT_ID + region in image newName lines (idempotent regex)
  python3 - <<EOF
import re, pathlib
p = pathlib.Path("${OVERLAY}")
text = p.read_text()
new_registry = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${PERSISTENT_AR_NAME}"
# match  newName: <region>-docker.pkg.dev/<anything>/<repo>/<svc>
text = re.sub(
    r"newName:\s*\S+-docker\.pkg\.dev/[^/]+/[^/]+/",
    f"newName: {new_registry}/",
    text,
)
p.write_text(text)
EOF
  ok "Patched overlay with ${REGION}-docker.pkg.dev/${PROJECT_ID}/${PERSISTENT_AR_NAME}"
fi
bash "${REPO_ROOT}/scripts/gcp/deploy-services.sh" "${ENVIRONMENT}"

# ── Step 8: Bind ingress to persistent static IP & upsert api A record ─────
step "8/8 Binding ingress + DNS"
NAMESPACE="sbtm-${ENVIRONMENT}-gcp"
INGRESS_NAME=$(kubectl get ingress -n "${NAMESPACE}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [[ -n "${INGRESS_NAME}" ]]; then
  # Bind the persistent global IP via annotation (works for GKE Ingress / NEG)
  kubectl annotate ingress "${INGRESS_NAME}" -n "${NAMESPACE}" \
    "kubernetes.io/ingress.global-static-ip-name=${PERSISTENT_IP_NAME}" \
    --overwrite >/dev/null
  ok "Ingress ${INGRESS_NAME} bound to ${PERSISTENT_IP_NAME}"
fi

# A record was already pointed at PERSISTENT_IP_ADDRESS by setup-persistent-resources.sh
ok "api.gcp.sbtm.ca already points at ${PERSISTENT_IP_ADDRESS} (persistent)"

cat <<EOF

==================================================================
✓ GCP bootstrap complete for ${ENVIRONMENT}.

Cluster:     ${CLUSTER_NAME} (${CLUSTER_LOCATION})
Namespace:   ${NAMESPACE}
Ingress IP:  ${PERSISTENT_IP_ADDRESS}
API URL:     https://api.gcp.sbtm.ca

Pause:       bash scripts/gcp/cost-stop.sh ${ENVIRONMENT}
Resume:      bash scripts/gcp/cost-start.sh ${ENVIRONMENT}
Tear down:   bash scripts/gcp/teardown-gcp.sh ${ENVIRONMENT}
==================================================================
EOF
