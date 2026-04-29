#!/usr/bin/env bash
# scripts/gcp/setup-persistent-resources.sh
#
# One-time, idempotent setup for the persistent SBTM GCP resources that
# survive the teardown / rebuild cycle. Run this ONCE per GCP project;
# subsequent invocations are no-ops.
#
# What it creates in the persistent set (kept across teardowns):
#
#   1. Cloud DNS Managed Zone  →  sbtm-gcp-zone (gcp.sbtm.ca)
#         The four NS records returned here must be inserted ONCE into the
#         parent Azure DNS zone sbtm.ca to delegate the `gcp.sbtm.ca`
#         subdomain. Use the helper:
#             bash scripts/azure/setup-gcp-delegation.sh
#         The zone itself costs ~$0.20 USD/mo and persists forever.
#
#   2. Global static IP  →  sbtm-gcp-ingress-ip
#         Used as the GKE NGINX ingress LoadBalancer IP. Persists across
#         teardowns so api.gcp.sbtm.ca A record never has to change and
#         Let's Encrypt cert keeps validating cleanly. Free (in use) /
#         ~$1.50/mo (idle).
#
#   3. Artifact Registry  →  sbtm-shared
#         Holds container images so each rebuild does not have to re-run
#         `gcloud builds submit` for all 8 services. Cost: ~$0.10 USD/GB/mo.
#
#   4. Persistent GCS bucket  →  ${PROJECT_ID}-sbtm-osrm-persist
#         Holds the immutable OSRM road network dataset (~600 MB) so it
#         doesn't have to be re-uploaded on every rebuild. Cost: ~$0.02/mo.
#
# Usage:
#   bash scripts/gcp/setup-persistent-resources.sh [customSubdomain] [region]
#
#   bash scripts/gcp/setup-persistent-resources.sh gcp.sbtm.ca us-central1
#
# Required env: GCP_PROJECT_ID
#
# Re-runnable: every step checks for existence first.
#
# After this completes, run `bash scripts/gcp/bootstrap.sh demo` as usual.

set -euo pipefail

CUSTOM_SUBDOMAIN="${1:-${CUSTOM_SUBDOMAIN:-gcp.sbtm.ca}}"
REGION="${2:-${REGION:-us-central1}}"

PROJECT_ID="${GCP_PROJECT_ID:-}"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: GCP_PROJECT_ID env var is required."
  exit 1
fi

DNS_ZONE_NAME="${DNS_ZONE_NAME:-sbtm-gcp-zone}"
PERSISTENT_IP_NAME="${PERSISTENT_IP_NAME:-sbtm-gcp-ingress-ip}"
PERSISTENT_AR_NAME="${PERSISTENT_AR_NAME:-sbtm-shared}"
PERSISTENT_BUCKET_NAME="${PERSISTENT_BUCKET_NAME:-${PROJECT_ID}-sbtm-osrm-persist}"

# Ensure the subdomain has a trailing dot for DNS, normalised separately.
DNS_NAME="${CUSTOM_SUBDOMAIN%.}."

ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠  $*"; }
step() { echo ""; echo "── $*"; }

gcloud config set project "${PROJECT_ID}" --quiet >/dev/null

step "Ensuring required GCP APIs are enabled"
gcloud services enable \
  compute.googleapis.com \
  dns.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  --quiet
ok "APIs enabled"

step "Cloud DNS managed zone ${DNS_ZONE_NAME} (${CUSTOM_SUBDOMAIN})"
if gcloud dns managed-zones describe "${DNS_ZONE_NAME}" >/dev/null 2>&1; then
  ok "Managed zone ${DNS_ZONE_NAME} already exists"
else
  gcloud dns managed-zones create "${DNS_ZONE_NAME}" \
    --description="SBTM persistent zone for ${CUSTOM_SUBDOMAIN} (delegated from Azure DNS)" \
    --dns-name="${DNS_NAME}" \
    --visibility=public \
    --labels=persistent=true,managedby=script
  ok "Created managed zone ${DNS_ZONE_NAME}"
fi

NS_RECORDS=$(gcloud dns managed-zones describe "${DNS_ZONE_NAME}" \
  --format="value(nameServers)" | tr ';' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$')

step "Global static IP ${PERSISTENT_IP_NAME}"
if gcloud compute addresses describe "${PERSISTENT_IP_NAME}" --global >/dev/null 2>&1; then
  ok "Static IP ${PERSISTENT_IP_NAME} already exists"
else
  gcloud compute addresses create "${PERSISTENT_IP_NAME}" --global \
    --description="SBTM persistent ingress IP — survives GKE teardown"
  ok "Created global static IP ${PERSISTENT_IP_NAME}"
fi
PERSISTENT_IP_ADDRESS=$(gcloud compute addresses describe "${PERSISTENT_IP_NAME}" --global --format="value(address)")

step "Cloud DNS A record api.${CUSTOM_SUBDOMAIN} → ${PERSISTENT_IP_ADDRESS}"
A_FQDN="api.${CUSTOM_SUBDOMAIN%.}."
EXISTING_A=$(gcloud dns record-sets list --zone="${DNS_ZONE_NAME}" \
  --name="${A_FQDN}" --type=A --format="value(rrdatas[0])" 2>/dev/null || true)
if [[ "${EXISTING_A}" == "${PERSISTENT_IP_ADDRESS}" ]]; then
  ok "A record api.${CUSTOM_SUBDOMAIN} already → ${PERSISTENT_IP_ADDRESS}"
else
  if [[ -n "${EXISTING_A}" ]]; then
    gcloud dns record-sets delete "${A_FQDN}" --zone="${DNS_ZONE_NAME}" --type=A --quiet || true
  fi
  gcloud dns record-sets create "${A_FQDN}" \
    --zone="${DNS_ZONE_NAME}" \
    --type=A --ttl=300 \
    --rrdatas="${PERSISTENT_IP_ADDRESS}"
  ok "Set api.${CUSTOM_SUBDOMAIN} → ${PERSISTENT_IP_ADDRESS}"
fi

step "Artifact Registry repository ${PERSISTENT_AR_NAME} (${REGION})"
if gcloud artifacts repositories describe "${PERSISTENT_AR_NAME}" --location="${REGION}" >/dev/null 2>&1; then
  ok "Artifact Registry ${PERSISTENT_AR_NAME} already exists"
else
  gcloud artifacts repositories create "${PERSISTENT_AR_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="SBTM persistent container registry — survives GKE teardown" \
    --labels=persistent=true,managedby=script
  ok "Created Artifact Registry ${PERSISTENT_AR_NAME}"
fi

step "Persistent GCS bucket ${PERSISTENT_BUCKET_NAME}"
if gcloud storage buckets describe "gs://${PERSISTENT_BUCKET_NAME}" >/dev/null 2>&1; then
  ok "Bucket gs://${PERSISTENT_BUCKET_NAME} already exists"
else
  gcloud storage buckets create "gs://${PERSISTENT_BUCKET_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --default-storage-class=STANDARD \
    --uniform-bucket-level-access
  gcloud storage buckets update "gs://${PERSISTENT_BUCKET_NAME}" \
    --update-labels=persistent=true,managedby=script || true
  ok "Created bucket gs://${PERSISTENT_BUCKET_NAME}"
fi

cat <<EOF

==================================================================
✓ Persistent GCP resources are ready.

Cloud DNS zone:        ${DNS_ZONE_NAME}  (${CUSTOM_SUBDOMAIN})
Static ingress IP:     ${PERSISTENT_IP_ADDRESS}  (${PERSISTENT_IP_NAME})
Artifact Registry:     ${REGION}-docker.pkg.dev/${PROJECT_ID}/${PERSISTENT_AR_NAME}
OSRM bucket:           gs://${PERSISTENT_BUCKET_NAME}

Approximate steady-state cost when fully torn down: <\$2/mo

──────────────────────────────────────────────────────────────────
ONE-TIME DELEGATION (run once on Azure side):

The four nameservers below must be inserted into the parent Azure
DNS zone sbtm.ca as an NS record set named "gcp":

EOF
echo "${NS_RECORDS}" | sed 's/^/    /'
cat <<EOF

Use the helper:

    bash scripts/azure/setup-gcp-delegation.sh \\
$(echo "${NS_RECORDS}" | awk '{printf "        %s%s\n", $0, (NR<4?" \\":"")}')

──────────────────────────────────────────────────────────────────
Next step:

    bash scripts/gcp/bootstrap.sh demo
==================================================================
EOF
