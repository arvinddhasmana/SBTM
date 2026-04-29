#!/usr/bin/env bash
# scripts/gcp/teardown-gcp.sh
#
# Tears down the EPHEMERAL SBTM GCP resources, leaving the persistent ones
# (Cloud DNS zone, static ingress IP, Artifact Registry, OSRM bucket) intact
# so the next `bootstrap.sh` can rebuild in ~30 min without re-doing
# DNS delegation, image rebuild or OSRM upload.
#
# Mirrors scripts/azure/teardown-azure.sh.
#
# Usage:
#   bash scripts/gcp/teardown-gcp.sh demo
#   bash scripts/gcp/teardown-gcp.sh production    # blocked unless ALLOW_PROD_TEARDOWN=1
#
# What gets DELETED (the entire ephemeral Terraform state):
#   • GKE Autopilot cluster (sbtm-${env})
#   • Cloud SQL Postgres instance(s)
#   • Memorystore Redis
#   • Secret Manager secrets created by the env
#   • Per-env Cloud Storage (videos, etc.)
#   • Networking (VPC, subnets, peering) provisioned by Terraform
#
# What is PRESERVED (one-time persistent set, ~$2/mo total):
#   • Cloud DNS zone sbtm-gcp-zone (gcp.sbtm.ca) — including:
#       - All NS records
#       - api.gcp.sbtm.ca → persistent static IP
#       - admin.gcp.sbtm.ca / parent.gcp.sbtm.ca CNAMEs (if added)
#       - All _dnsauth.* TXT validations
#   • Global static IP sbtm-gcp-ingress-ip
#   • Artifact Registry sbtm-shared (all container images)
#   • GCS bucket ${PROJECT_ID}-sbtm-osrm-persist (OSRM road network)
#
# To purge persistent resources too, run:
#   gcloud dns managed-zones delete sbtm-gcp-zone
#   gcloud compute addresses delete sbtm-gcp-ingress-ip --global
#   gcloud artifacts repositories delete sbtm-shared --location=<region>
#   gcloud storage rm -r gs://${PROJECT_ID}-sbtm-osrm-persist
# (only do this if you are decommissioning GCP entirely.)

set -euo pipefail

ENVIRONMENT="${1:-demo}"

if [[ "${ENVIRONMENT}" != "demo" && "${ENVIRONMENT}" != "production" ]]; then
  echo "Usage: $0 [demo|production]"
  exit 1
fi

if [[ "${ENVIRONMENT}" == "production" && "${ALLOW_PROD_TEARDOWN:-}" != "1" ]]; then
  echo "Refusing to tear down production by default. To force, set ALLOW_PROD_TEARDOWN=1."
  exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-}"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: GCP_PROJECT_ID env var is required."
  exit 1
fi

# Persistent set — never deleted by this script.
PERSISTENT_DNS_ZONE="${PERSISTENT_DNS_ZONE:-sbtm-gcp-zone}"
PERSISTENT_IP_NAME="${PERSISTENT_IP_NAME:-sbtm-gcp-ingress-ip}"
PERSISTENT_AR_NAME="${PERSISTENT_AR_NAME:-sbtm-shared}"
PERSISTENT_BUCKET_NAME="${PERSISTENT_BUCKET_NAME:-${PROJECT_ID}-sbtm-osrm-persist}"

NAMESPACE="sbtm-${ENVIRONMENT}-gcp"

ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠  $*"; }
step() { echo ""; echo "── $*"; }

gcloud config set project "${PROJECT_ID}" --quiet >/dev/null

step "Confirmation"
cat <<EOF
This will DESTROY the GCP ephemeral SBTM ${ENVIRONMENT} environment in project:
    ${PROJECT_ID}

The following PERSISTENT resources will be PRESERVED:
    Cloud DNS zone:    ${PERSISTENT_DNS_ZONE}
    Static IP:         ${PERSISTENT_IP_NAME}
    Artifact Registry: ${PERSISTENT_AR_NAME}
    OSRM bucket:       gs://${PERSISTENT_BUCKET_NAME}

Type 'yes' to continue:
EOF
read -r CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

# ── 1. Drain Kubernetes namespace (best-effort) ─────────────────────────────
step "Removing GKE workloads in namespace ${NAMESPACE} (best effort)"
if kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl delete namespace "${NAMESPACE}" --ignore-not-found --timeout=120s || \
    warn "Namespace deletion timed out — Terraform destroy will reap remaining resources."
else
  ok "Namespace ${NAMESPACE} not present."
fi

# ── 2. Terraform destroy (the canonical ephemeral teardown) ─────────────────
step "Running terraform destroy for ephemeral infrastructure"
INFRA_DIR="$(cd "$(dirname "$0")/../../infra/gcp" && pwd)"
if [[ -d "${INFRA_DIR}" && -f "${INFRA_DIR}/main.tf" ]]; then
  pushd "${INFRA_DIR}" >/dev/null
  if [[ ! -f backend.tf ]]; then
    cat > backend.tf <<EOF
terraform {
  backend "gcs" {
    bucket = "${PROJECT_ID}-tfstate"
    prefix = "sbtm/${ENVIRONMENT}"
  }
}
EOF
  fi
  terraform init -input=false >/dev/null
  terraform destroy \
    -var-file="environments/${ENVIRONMENT}.tfvars" \
    -var="project_id=${PROJECT_ID}" \
    -auto-approve
  popd >/dev/null
  ok "Terraform destroy complete."
else
  warn "infra/gcp not found — skipping terraform destroy."
fi

# ── 3. Defensively clear ephemeral DNS records in the persistent zone ───────
step "Clearing ephemeral A records in ${PERSISTENT_DNS_ZONE} (api preserved — points to persistent IP)"
# Per-env app records (e.g., admin-demo / parent-demo) — clean if present.
# api.gcp.sbtm.ca / _dnsauth.api are PRESERVED because they point at the
# persistent ingress IP and are reused on every rebuild.
for LABEL in "admin-${ENVIRONMENT}" "parent-${ENVIRONMENT}"; do
  for TYPE in A CNAME; do
    FQDN="${LABEL}.gcp.sbtm.ca."
    if gcloud dns record-sets describe "${FQDN}" --zone="${PERSISTENT_DNS_ZONE}" --type="${TYPE}" >/dev/null 2>&1; then
      gcloud dns record-sets delete "${FQDN}" --zone="${PERSISTENT_DNS_ZONE}" --type="${TYPE}" --quiet || true
      ok "Cleared ${TYPE} ${FQDN}"
    fi
  done
done

# ── 4. Verify persistent resources still exist ───────────────────────────────
step "Verifying persistent resources are still intact"
gcloud dns managed-zones describe "${PERSISTENT_DNS_ZONE}" >/dev/null 2>&1 \
  && ok "Cloud DNS zone ${PERSISTENT_DNS_ZONE} preserved" \
  || warn "Cloud DNS zone ${PERSISTENT_DNS_ZONE} is MISSING (run setup-persistent-resources.sh)"

gcloud compute addresses describe "${PERSISTENT_IP_NAME}" --global >/dev/null 2>&1 \
  && ok "Static IP ${PERSISTENT_IP_NAME} preserved" \
  || warn "Static IP ${PERSISTENT_IP_NAME} is MISSING"

# Artifact Registry / bucket existence check is region-dependent — skip listing
# and just trust that terraform destroy did not touch them (they are not
# managed by infra/gcp/main.tf).

cat <<EOF

==================================================================
✓ GCP ephemeral teardown complete for ${ENVIRONMENT}.

Persistent resources still cost ~\$2/mo in total.

To rebuild:
    bash scripts/gcp/bootstrap.sh ${ENVIRONMENT}
==================================================================
EOF
