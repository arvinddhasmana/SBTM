#!/usr/bin/env bash
# scripts/azure/setup-persistent-resources.sh
#
# One-time, idempotent setup for the persistent SBTM Azure resources that
# survive the teardown / rebuild cycle. Run this ONCE per Azure subscription;
# subsequent invocations are no-ops.
#
# What it creates in the persistent resource group (default: sbtm-dns-rg):
#
#   1. Static Public IP (Standard SKU)  →  sbtm-ingress-ip
#         Used as the AKS NGINX ingress LoadBalancer IP. Persists across
#         teardowns so the api.<domain> A record never has to change and the
#         Let's Encrypt cert keeps validating cleanly. Cost: ~$3.65 USD/mo.
#
#   2. DNS A record  api.<customDomain>  →  <persistent IP>
#         Created once and never deleted. Eliminates the
#         ERR_NAME_NOT_RESOLVED window between teardown and rebuild.
#
#   3. Azure Container Registry (Basic SKU)  →  sbtmacrshared
#         Holds container images so each rebuild does not have to re-run
#         `az acr build` for all 8 services (~10-15 min savings per cycle).
#         Cost: ~$5 USD/mo. Cross-RG AcrPull is granted to the AKS kubelet
#         identity by bootstrap.sh after each AKS provision.
#
#   4. Persistent Storage Account  →  sbtmpersist<rand>
#         Holds the immutable OSRM road network dataset (~600 MB) so it
#         doesn't have to be re-uploaded on every rebuild (~5-10 min
#         savings per cycle). Cost: ~$0.02 USD/mo for the data.
#         Container "osrm-data" is created automatically.
#
# Usage:
#   bash scripts/azure/setup-persistent-resources.sh [customDomain] [location]
#
#   bash scripts/azure/setup-persistent-resources.sh sbtm.ca canadacentral
#
# Re-runnable: every step checks for existence first.
#
# After this completes, run `bash scripts/azure/bootstrap.sh demo` as usual.
# Bootstrap will auto-detect each persistent resource and skip the equivalent
# ephemeral provisioning step.

set -euo pipefail

CUSTOM_DOMAIN="${1:-${CUSTOM_DOMAIN:-sbtm.ca}}"
LOCATION="${2:-${LOCATION:-canadacentral}}"
DNS_RESOURCE_GROUP="${DNS_RESOURCE_GROUP:-sbtm-dns-rg}"
PERSISTENT_IP_NAME="${PERSISTENT_IP_NAME:-sbtm-ingress-ip}"
PERSISTENT_ACR_NAME="${PERSISTENT_ACR_NAME:-sbtmacrshared}"
# Storage names must be globally unique + lowercase + 3-24 chars + alphanumeric.
PERSISTENT_STORAGE_NAME="${PERSISTENT_STORAGE_NAME:-}"

ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠  $*"; }
step() { echo ""; echo "── $*"; }

step "Ensuring persistent resource group ${DNS_RESOURCE_GROUP} (${LOCATION})"
if az group show -n "${DNS_RESOURCE_GROUP}" --output none 2>/dev/null; then
  ok "Resource group ${DNS_RESOURCE_GROUP} exists"
else
  az group create -n "${DNS_RESOURCE_GROUP}" -l "${LOCATION}" --tags persistent=true managedBy=script --output none
  ok "Created resource group ${DNS_RESOURCE_GROUP}"
fi

# ── 1. Static Public IP (Standard SKU) ───────────────────────────────────────
step "Ensuring static Public IP ${PERSISTENT_IP_NAME} in ${DNS_RESOURCE_GROUP}"
EXISTING_IP=$(az network public-ip show -g "${DNS_RESOURCE_GROUP}" -n "${PERSISTENT_IP_NAME}" \
  --query "ipAddress" -o tsv 2>/dev/null || true)
if [[ -n "${EXISTING_IP}" ]]; then
  ok "Public IP exists: ${EXISTING_IP}"
  PUBLIC_IP="${EXISTING_IP}"
else
  PUBLIC_IP=$(az network public-ip create \
    -g "${DNS_RESOURCE_GROUP}" \
    -n "${PERSISTENT_IP_NAME}" \
    --sku Standard \
    --allocation-method Static \
    --tier Regional \
    --location "${LOCATION}" \
    --tags persistent=true purpose=aks-ingress \
    --query "publicIp.ipAddress" -o tsv)
  ok "Created Standard static Public IP: ${PUBLIC_IP}"
fi

# ── 2. DNS A record  api.<customDomain> → static IP ─────────────────────────
if az network dns zone show -g "${DNS_RESOURCE_GROUP}" -n "${CUSTOM_DOMAIN}" --output none 2>/dev/null; then
  step "Ensuring DNS A record api.${CUSTOM_DOMAIN} → ${PUBLIC_IP}"
  CURRENT_A=$(az network dns record-set a show \
    -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n api \
    --query "ARecords[0].ipv4Address" -o tsv 2>/dev/null || true)
  if [[ "${CURRENT_A}" == "${PUBLIC_IP}" ]]; then
    ok "A record api.${CUSTOM_DOMAIN} already points to ${PUBLIC_IP}"
  else
    [[ -n "${CURRENT_A}" ]] && \
      az network dns record-set a delete \
        -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n api --yes --output none 2>/dev/null || true
    az network dns record-set a add-record \
      -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n api \
      --ipv4-address "${PUBLIC_IP}" --ttl 300 --output none
    ok "A record api.${CUSTOM_DOMAIN} → ${PUBLIC_IP} created"
  fi
else
  warn "DNS zone ${CUSTOM_DOMAIN} not found in ${DNS_RESOURCE_GROUP}; A record will be wired later by bootstrap.sh"
fi

# ── 3. Persistent Azure Container Registry ───────────────────────────────────
step "Ensuring persistent ACR ${PERSISTENT_ACR_NAME}"
if az acr show -g "${DNS_RESOURCE_GROUP}" -n "${PERSISTENT_ACR_NAME}" --output none 2>/dev/null; then
  ok "ACR ${PERSISTENT_ACR_NAME} exists"
else
  az acr create \
    -g "${DNS_RESOURCE_GROUP}" \
    -n "${PERSISTENT_ACR_NAME}" \
    --sku Basic \
    --location "${LOCATION}" \
    --tags persistent=true \
    --output none
  ok "Created ACR ${PERSISTENT_ACR_NAME}.azurecr.io"
fi

# ── 4. Persistent Storage Account (for OSRM only) ────────────────────────────
step "Ensuring persistent Storage Account for OSRM in ${DNS_RESOURCE_GROUP}"
if [[ -z "${PERSISTENT_STORAGE_NAME}" ]]; then
  EXISTING_PERSIST_SA=$(az storage account list -g "${DNS_RESOURCE_GROUP}" \
    --query "[?starts_with(name,'sbtmpersist')].name | [0]" -o tsv 2>/dev/null || true)
  if [[ -n "${EXISTING_PERSIST_SA}" ]]; then
    PERSISTENT_STORAGE_NAME="${EXISTING_PERSIST_SA}"
  else
    # Reproducible name: sbtmpersist + 6 hex chars derived from subscription ID.
    SUFFIX=$(az account show --query id -o tsv | sha1sum | cut -c1-6)
    PERSISTENT_STORAGE_NAME="sbtmpersist${SUFFIX}"
  fi
fi
if az storage account show -g "${DNS_RESOURCE_GROUP}" -n "${PERSISTENT_STORAGE_NAME}" --output none 2>/dev/null; then
  ok "Storage account ${PERSISTENT_STORAGE_NAME} exists"
else
  az storage account create \
    -g "${DNS_RESOURCE_GROUP}" \
    -n "${PERSISTENT_STORAGE_NAME}" \
    --location "${LOCATION}" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Hot \
    --allow-blob-public-access false \
    --min-tls-version TLS1_2 \
    --tags persistent=true purpose=osrm-data \
    --output none
  ok "Created storage account ${PERSISTENT_STORAGE_NAME}"
fi

PERSISTENT_STORAGE_KEY=$(az storage account keys list \
  -g "${DNS_RESOURCE_GROUP}" -n "${PERSISTENT_STORAGE_NAME}" \
  --query "[0].value" -o tsv)

step "Ensuring blob container 'osrm-data' in ${PERSISTENT_STORAGE_NAME}"
az storage container create \
  --account-name "${PERSISTENT_STORAGE_NAME}" \
  --account-key "${PERSISTENT_STORAGE_KEY}" \
  --name "osrm-data" \
  --output none 2>/dev/null || true
ok "Container osrm-data ready"

PERSISTENT_STORAGE_CS="DefaultEndpointsProtocol=https;AccountName=${PERSISTENT_STORAGE_NAME};AccountKey=${PERSISTENT_STORAGE_KEY};EndpointSuffix=core.windows.net"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Persistent resources ready in ${DNS_RESOURCE_GROUP}"
echo "════════════════════════════════════════════════════════════════"
cat <<EOF

  Static Public IP:         ${PUBLIC_IP}
    Resource:               ${DNS_RESOURCE_GROUP}/${PERSISTENT_IP_NAME}
    DNS:                    api.${CUSTOM_DOMAIN}  →  ${PUBLIC_IP}

  Persistent ACR:           ${PERSISTENT_ACR_NAME}.azurecr.io
    Resource:               ${DNS_RESOURCE_GROUP}/${PERSISTENT_ACR_NAME}

  Persistent Storage Acct:  ${PERSISTENT_STORAGE_NAME}
    Container:              osrm-data
    Connection-string env:  PERSISTENT_STORAGE_CONNECTION_STRING

  Estimated monthly cost:   ~\$8.65 USD
    Static IP (Standard):   ~\$3.65
    ACR (Basic):            ~\$5.00
    Storage (~600 MB):      ~\$0.02

  Next step:
    POSTGRES_ADMIN_PASSWORD='<value>' MAPTILER_KEY='<value>' \\
      bash scripts/azure/bootstrap.sh demo

  Bootstrap will auto-detect these resources and:
    • Install NGINX ingress with the static IP (no DNS rotation)
    • Push images to ${PERSISTENT_ACR_NAME} (no rebuild if SHA matches)
    • Skip OSRM upload if container already populated

EOF

# Helpful: emit shell-eval-friendly export lines for callers (e.g. CI).
if [[ "${EMIT_EXPORTS:-false}" == "true" ]]; then
  echo "export PERSISTENT_PUBLIC_IP=${PUBLIC_IP}"
  echo "export PERSISTENT_PUBLIC_IP_RG=${DNS_RESOURCE_GROUP}"
  echo "export PERSISTENT_PUBLIC_IP_NAME=${PERSISTENT_IP_NAME}"
  echo "export PERSISTENT_ACR_NAME=${PERSISTENT_ACR_NAME}"
  echo "export PERSISTENT_STORAGE_NAME=${PERSISTENT_STORAGE_NAME}"
  echo "export PERSISTENT_STORAGE_CONNECTION_STRING='${PERSISTENT_STORAGE_CS}'"
fi
