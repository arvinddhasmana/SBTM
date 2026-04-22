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

cat <<EOF

==> Teardown initiated for ${ENVIRONMENT} (${RESOURCE_GROUP}).

    Verify completion:
      az group show --name ${RESOURCE_GROUP} 2>&1 | grep -q ResourceGroupNotFound && echo "Deleted" || echo "Still deleting"

    To recreate:
      POSTGRES_ADMIN_PASSWORD='<new-password>' bash scripts/azure/provision-azure.sh ${ENVIRONMENT}

EOF
