#!/usr/bin/env bash
# scripts/azure/setup-gcp-delegation.sh
#
# One-time, idempotent helper that delegates the `gcp.sbtm.ca` subdomain from
# the parent Azure DNS zone to GCP Cloud DNS. Run this ONCE on the Azure side
# *after* `scripts/gcp/setup-persistent-resources.sh` has created the Cloud
# DNS managed zone and printed the four nameservers.
#
# What it creates:
#
#   NS record set in zone sbtm.ca:
#       gcp.sbtm.ca   IN NS   ns-cloud-X1.googledomains.com.
#                     IN NS   ns-cloud-X2.googledomains.com.
#                     IN NS   ns-cloud-X3.googledomains.com.
#                     IN NS   ns-cloud-X4.googledomains.com.
#
# This NS record is automatically preserved by `teardown-azure.sh` (which
# only ever clears `api` / `_dnsauth.api` records).
#
# Usage:
#   bash scripts/azure/setup-gcp-delegation.sh \\
#        ns-cloud-a1.googledomains.com. \\
#        ns-cloud-a2.googledomains.com. \\
#        ns-cloud-a3.googledomains.com. \\
#        ns-cloud-a4.googledomains.com.
#
# Or with environment overrides:
#   SUBDOMAIN_LABEL=gcp PARENT_ZONE=sbtm.ca DNS_RG=sbtm-dns-rg \\
#     bash scripts/azure/setup-gcp-delegation.sh ns1 ns2 ns3 ns4

set -euo pipefail

DNS_RG="${DNS_RG:-sbtm-dns-rg}"
PARENT_ZONE="${PARENT_ZONE:-sbtm.ca}"
SUBDOMAIN_LABEL="${SUBDOMAIN_LABEL:-gcp}"

if [[ $# -lt 4 ]]; then
  cat >&2 <<EOF
Usage: $0 <ns1> <ns2> <ns3> <ns4>

Get the four GCP nameservers with:
    gcloud dns managed-zones describe sbtm-gcp-zone --format='value(nameServers)'

Or simply re-run scripts/gcp/setup-persistent-resources.sh — it prints the
exact command at the end.
EOF
  exit 1
fi

NS1="$1"; NS2="$2"; NS3="$3"; NS4="$4"

ok() { echo "  ✓ $*"; }
step() { echo ""; echo "── $*"; }

step "Verifying Azure DNS zone ${PARENT_ZONE} in ${DNS_RG}"
if ! az network dns zone show -g "${DNS_RG}" -n "${PARENT_ZONE}" --output none 2>/dev/null; then
  echo "ERROR: Zone ${PARENT_ZONE} not found in resource group ${DNS_RG}." >&2
  echo "       Run scripts/azure/setup-persistent-resources.sh first." >&2
  exit 1
fi
ok "Zone ${PARENT_ZONE} exists"

step "Upserting NS record ${SUBDOMAIN_LABEL}.${PARENT_ZONE}"
# Create record set (idempotent — succeeds if missing, no-op if already there)
az network dns record-set ns create \
  -g "${DNS_RG}" -z "${PARENT_ZONE}" \
  -n "${SUBDOMAIN_LABEL}" \
  --ttl 3600 \
  --output none 2>/dev/null || true

# Snapshot current NS records, then add any missing — this is idempotent.
EXISTING=$(az network dns record-set ns show \
  -g "${DNS_RG}" -z "${PARENT_ZONE}" -n "${SUBDOMAIN_LABEL}" \
  --query "NSRecords[].nsdname" -o tsv 2>/dev/null || true)

for ns in "${NS1}" "${NS2}" "${NS3}" "${NS4}"; do
  # gcloud strips trailing dots in some output formats — normalise both sides.
  ns_norm="${ns%.}"
  if echo "${EXISTING}" | tr -d '\r' | sed 's/\.$//' | grep -qx "${ns_norm}"; then
    ok "NS already present: ${ns}"
    continue
  fi
  az network dns record-set ns add-record \
    -g "${DNS_RG}" -z "${PARENT_ZONE}" \
    -n "${SUBDOMAIN_LABEL}" \
    --nsdname "${ns}" \
    --output none
  ok "Added NS: ${ns}"
done

step "Verification"
az network dns record-set ns show \
  -g "${DNS_RG}" -z "${PARENT_ZONE}" -n "${SUBDOMAIN_LABEL}" \
  --query "{name:fqdn, ttl:TTL, ns:NSRecords[].nsdname}" \
  -o table

cat <<EOF

==================================================================
✓ Subdomain ${SUBDOMAIN_LABEL}.${PARENT_ZONE} delegated to Cloud DNS.

This NS record set is automatically preserved by teardown-azure.sh —
no further action is required on the Azure side.

Verify external resolution (may take 1-5 min to propagate):
    dig +short NS ${SUBDOMAIN_LABEL}.${PARENT_ZONE} @8.8.8.8
==================================================================
EOF
