#!/usr/bin/env bash
# scripts/azure/teardown-azure.sh
# DESTROYS the entire Azure resource group and every resource within it.
# This stops all monthly Azure charges for that environment.
#
# Usage:
#   bash scripts/azure/teardown-azure.sh demo
#   bash scripts/azure/teardown-azure.sh production
#
# Resource groups:
#   demo       -> sbtm-demo-rg
#   production -> sbtm-rg
#
# After teardown, run scripts/azure/provision-azure.sh to recreate.
# WARNING: All data (DB, blobs, secrets) is permanently deleted.
# Soft-deleted Key Vault is purged so the same name can be re-used.

set -euo pipefail

ENVIRONMENT="${1:-}"
if [[ -z "${ENVIRONMENT}" ]]; then
  echo "Usage: $0 [demo|production]"
  exit 1
fi

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RESOURCE_GROUP="sbtm-rg"
else
  RESOURCE_GROUP="sbtm-demo-rg"
fi

# Persistent DNS resource group — NEVER deleted by this script. Holds the
# public DNS zone so registrar NS delegation stays stable across teardowns.
DNS_RESOURCE_GROUP="${DNS_RESOURCE_GROUP:-sbtm-dns-rg}"

if ! az group show --name "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  echo "Resource group ${RESOURCE_GROUP} does not exist. Nothing to do."
  exit 0
fi

echo ""
echo "  ⚠️  This will DELETE the entire resource group: ${RESOURCE_GROUP}"
echo "  All data, secrets, container images, and infrastructure will be PERMANENTLY destroyed."
echo "  Monthly charges for ${RESOURCE_GROUP} will stop after deletion completes (~5-15 min)."
echo ""

if [[ "${ENVIRONMENT}" == "production" ]]; then
  echo "  ❌ You are tearing down PRODUCTION."
  read -r -p "  Type 'DELETE PRODUCTION' to confirm: " CONFIRM
  if [[ "${CONFIRM}" != "DELETE PRODUCTION" ]]; then
    echo "Aborted."
    exit 0
  fi
else
  read -r -p "  Type 'yes' to confirm: " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo "==> Capturing Key Vault name(s) for purge after RG delete"
KV_NAMES=$(az keyvault list --resource-group "${RESOURCE_GROUP}" --query "[].name" -o tsv || true)

# ── Pre-delete cleanup of SWA custom-domain bindings + DNS records ──────────
echo "==> Cleaning up Static Web App custom-domain bindings"
SWA_NAMES=$(az staticwebapp list -g "${RESOURCE_GROUP}" --query "[].name" -o tsv 2>/dev/null || true)
for SWA in ${SWA_NAMES}; do
  HOSTS=$(az staticwebapp hostname list -g "${RESOURCE_GROUP}" -n "${SWA}" --query "[?!contains(name, 'azurestaticapps.net')].name" -o tsv 2>/dev/null || true)
  for H in ${HOSTS}; do
    echo "    Removing custom hostname ${H} from ${SWA}"
    az staticwebapp hostname delete -g "${RESOURCE_GROUP}" -n "${SWA}" --hostname "${H}" --yes --output none 2>/dev/null || true
  done
done

echo "==> Cleaning up Azure DNS records in persistent zone (admin/parent/api + _dnsauth TXT)"
echo "    DNS RG ${DNS_RESOURCE_GROUP} itself is preserved — NS records stay stable."
DNS_ZONES=$(az network dns zone list -g "${DNS_RESOURCE_GROUP}" --query "[].name" -o tsv 2>/dev/null || true)
for ZONE in ${DNS_ZONES}; do
  for SUB in admin parent api; do
    az network dns record-set cname delete -g "${DNS_RESOURCE_GROUP}" -z "${ZONE}" -n "${SUB}" --yes --output none 2>/dev/null || true
    az network dns record-set a     delete -g "${DNS_RESOURCE_GROUP}" -z "${ZONE}" -n "${SUB}" --yes --output none 2>/dev/null || true
    az network dns record-set txt   delete -g "${DNS_RESOURCE_GROUP}" -z "${ZONE}" -n "_dnsauth.${SUB}" --yes --output none 2>/dev/null || true
  done
  echo "    Cleared admin/parent/api records from zone ${ZONE} (zone preserved)"
done

echo "==> Deleting resource group ${RESOURCE_GROUP} (no-wait)"
az group delete --name "${RESOURCE_GROUP}" --yes --no-wait
echo "    Submitted. Use 'az group show --name ${RESOURCE_GROUP}' to track."

if [[ -n "${KV_NAMES}" ]]; then
  echo "==> Waiting 60s before purging soft-deleted Key Vaults (so they appear in deleted list)"
  sleep 60
  for KV in ${KV_NAMES}; do
    echo "    Purging Key Vault: ${KV}"
    az keyvault purge --name "${KV}" --no-wait || echo "    (Skipped — may not yet be in soft-deleted state)"
  done
fi

# ── Post-delete verification ─────────────────────────────────────────────────
echo "==> Waiting for resource group deletion to complete (timeout 15 min)"
WAIT=0
while [[ "${WAIT}" -lt 900 ]]; do
  if ! az group show --name "${RESOURCE_GROUP}" --output none 2>/dev/null; then
    echo "    ✓ Resource group ${RESOURCE_GROUP} deleted"
    break
  fi
  sleep 30
  WAIT=$((WAIT + 30))
done
if az group show --name "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  echo "    ⚠  Resource group still present after 15 min — Azure delete may continue in background"
else
  REMAINING_SWA=$(az staticwebapp list -g "${RESOURCE_GROUP}" --query "[].name" -o tsv 2>/dev/null || echo "")
  REMAINING_DNS=$(az network dns zone list -g "${RESOURCE_GROUP}" --query "[].name" -o tsv 2>/dev/null || echo "")
  if [[ -z "${REMAINING_SWA}" ]]; then echo "    ✓ No Static Web Apps remain in ${RESOURCE_GROUP}"; fi
  if [[ -z "${REMAINING_DNS}" ]]; then echo "    ✓ No DNS zones remain in ${RESOURCE_GROUP}"; fi
fi

# ── Subscription-wide stray sweep ────────────────────────────────────────────
echo "==> Scanning entire subscription for stray sbtm-* resources outside ${DNS_RESOURCE_GROUP}"
STRAYS=$(az resource list \
  --query "[?(starts_with(name,'sbtm') || starts_with(name,'sbtmacr') || starts_with(name,'sbtmblob')) && resourceGroup != '${DNS_RESOURCE_GROUP}' && !starts_with(resourceGroup,'MC_')].{name:name,rg:resourceGroup,type:type}" \
  -o tsv 2>/dev/null || true)
if [[ -z "${STRAYS}" ]]; then
  echo "    ✓ No stray sbtm-* resources detected. Subscription is clean."
else
  echo "    ⚠  Stray resources detected (review and delete manually if unwanted):"
  echo "${STRAYS}" | sed 's/^/      /'
fi

cat <<EOF

==> Teardown initiated for ${ENVIRONMENT} (${RESOURCE_GROUP}).

    Removed:
      - Static Web Apps (admin + parent portals)
      - Azure DNS *records* for admin/parent/api + _dnsauth.* (zone preserved)
      - All compute / data resources inside ${RESOURCE_GROUP}

    Preserved:
      - DNS resource group: ${DNS_RESOURCE_GROUP}
      - DNS zone:           sbtm.ca (NS records unchanged — NO registrar action needed on rebuild)

    Verify completion:
      az group show --name ${RESOURCE_GROUP} 2>&1 | grep -q ResourceGroupNotFound && echo "Deleted" || echo "Still deleting"

    To recreate (NS at registrar already correct, no re-paste):
      POSTGRES_ADMIN_PASSWORD='<new-password>' bash scripts/azure/bootstrap.sh ${ENVIRONMENT}

    To completely remove DNS too (rare — forces NS re-paste at registrar on next bootstrap):
      az group delete --name ${DNS_RESOURCE_GROUP} --yes

EOF
