#!/usr/bin/env bash
# scripts/azure/db-jumpbox.sh
# Spin up the cheapest possible jumpbox VM in the services subnet, run a DB
# operation, then DELETE the VM. Use this when the AKS cluster isn't available
# (e.g. provision-azure.sh failed mid-way) — otherwise prefer
# db-migrate-via-aks.sh which costs $0.
#
# SKU: Standard_B1s (1 vCPU, 1 GiB RAM) — ~$0.0104/hour ≈ $0.01 per migration.
#      Disk: Standard_LRS 30 GiB OS disk (~$0.05 per VM-month, prorated to seconds).
#      Public IP: Basic Static (~$0.0036/hour). Total: <$0.02 per run.
#
# Network: VM gets a public IP; NSG rule allows SSH from CALLER'S CURRENT
#          PUBLIC IP ONLY. The VM is destroyed on completion (always — even
#          on failure or Ctrl+C).
#
# Usage:
#   bash scripts/azure/db-jumpbox.sh [demo|production] [migrate|seed-demo|backup]
#
# Example:
#   bash scripts/azure/db-jumpbox.sh demo migrate

set -euo pipefail

ENVIRONMENT="${1:-demo}"
COMMAND="${2:-migrate}"
ENV_FILE=".env.${ENVIRONMENT}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RG="sbtm-rg"
else
  RG="sbtm-demo-rg"
fi

[[ -f "${ENV_FILE}" ]] || { echo "ERROR: ${ENV_FILE} not found"; exit 1; }
command -v az >/dev/null    || { echo "ERROR: az CLI not installed"; exit 1; }
command -v ssh >/dev/null   || { echo "ERROR: ssh not installed"; exit 1; }
command -v scp >/dev/null   || { echo "ERROR: scp not installed"; exit 1; }

set -a; source <(grep -v '^\s*#' "${ENV_FILE}" | grep -v '^\s*$'); set +a
[[ -n "${DATABASE_URL:-}" ]] || { echo "ERROR: DATABASE_URL not set in ${ENV_FILE}"; exit 1; }

# Discover services subnet
VNET_NAME=$(az network vnet list -g "${RG}" --query "[0].name" -o tsv)
SUBNET_ID=$(az network vnet subnet show -g "${RG}" --vnet-name "${VNET_NAME}" \
  --name services-subnet --query id -o tsv 2>/dev/null) || true
[[ -n "${SUBNET_ID}" ]] || { echo "ERROR: services-subnet not found in ${VNET_NAME}"; exit 1; }

VM_NAME="sbtm-jumpbox-$(date +%s)"
NSG_NAME="${VM_NAME}-nsg"
PIP_NAME="${VM_NAME}-pip"
NIC_NAME="${VM_NAME}-nic"
SSH_KEY="${HOME}/.ssh/sbtm-jumpbox-${ENVIRONMENT}"
ADMIN_USER="azureuser"

# Get caller's public IP for NSG lock-down
MY_IP=$(curl -s --max-time 5 https://api.ipify.org || true)
[[ -n "${MY_IP}" ]] || { echo "ERROR: could not determine caller public IP"; exit 1; }
echo "==> Caller IP: ${MY_IP} (will be only IP allowed SSH)"

cleanup() {
  echo ""
  echo "==> Tearing down jumpbox ${VM_NAME}"
  az vm delete -g "${RG}" -n "${VM_NAME}" --yes --no-wait 2>/dev/null || true
  az network nic delete -g "${RG}" --name "${NIC_NAME}" --no-wait 2>/dev/null || true
  az network nsg delete -g "${RG}" --name "${NSG_NAME}" --no-wait 2>/dev/null || true
  az network public-ip delete -g "${RG}" --name "${PIP_NAME}" --no-wait 2>/dev/null || true
  # OS disk has --delete-option=Delete (set below) so it goes with the VM.
  echo "==> Cleanup submitted (async)."
}
trap cleanup EXIT

# Ensure SSH key
if [[ ! -f "${SSH_KEY}" ]]; then
  echo "==> Generating SSH key ${SSH_KEY}"
  ssh-keygen -t ed25519 -N "" -f "${SSH_KEY}" -C "sbtm-jumpbox-${ENVIRONMENT}"
fi

echo "==> Creating NSG locked to ${MY_IP}"
az network nsg create -g "${RG}" -n "${NSG_NAME}" --output none
az network nsg rule create -g "${RG}" --nsg-name "${NSG_NAME}" \
  --name AllowSSHFromCaller --priority 100 --direction Inbound --access Allow \
  --protocol Tcp --source-address-prefixes "${MY_IP}" \
  --destination-port-ranges 22 --output none

echo "==> Creating Public IP + NIC"
az network public-ip create -g "${RG}" -n "${PIP_NAME}" --sku Basic --allocation-method Static --output none
az network nic create -g "${RG}" -n "${NIC_NAME}" \
  --subnet "${SUBNET_ID}" --network-security-group "${NSG_NAME}" \
  --public-ip-address "${PIP_NAME}" --output none

echo "==> Creating VM (Standard_B1s, Ubuntu 22.04 LTS, ephemeral OS-disk-on-delete)"
az vm create -g "${RG}" -n "${VM_NAME}" \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --nics "${NIC_NAME}" \
  --admin-username "${ADMIN_USER}" \
  --ssh-key-values "${SSH_KEY}.pub" \
  --os-disk-delete-option Delete \
  --output none

PUBLIC_IP=$(az network public-ip show -g "${RG}" -n "${PIP_NAME}" --query ipAddress -o tsv)
echo "==> Jumpbox ready at ${PUBLIC_IP}"

# Wait for SSH
echo "==> Waiting for SSH"
for i in $(seq 1 30); do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "${SSH_KEY}" \
       "${ADMIN_USER}@${PUBLIC_IP}" "echo ok" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "${SSH_KEY}")

echo "==> Installing psql on jumpbox"
ssh "${SSH_OPTS[@]}" "${ADMIN_USER}@${PUBLIC_IP}" \
  "sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-client >/dev/null"

echo "==> Copying SQL scripts"
scp "${SSH_OPTS[@]}" -q \
  scripts/init-db.sql scripts/rls-policies.sql \
  scripts/seed-standard.sql scripts/seed-demo.sql \
  "${ADMIN_USER}@${PUBLIC_IP}:/tmp/"

case "${COMMAND}" in
  migrate)
    REMOTE_CMD='set -e
      export PGPASSWORD_QUIET=1
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/init-db.sql
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/rls-policies.sql
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/seed-standard.sql
      psql "$DATABASE_URL" -c "\dt"'
    ;;
  seed-demo)
    REMOTE_CMD='psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/seed-demo.sql'
    ;;
  backup)
    REMOTE_CMD='TS=$(date +%Y%m%d-%H%M%S)
      pg_dump "$DATABASE_URL" --clean --if-exists | gzip -c > /tmp/sbtm-backup-$TS.sql.gz
      echo "BACKUP_FILE=/tmp/sbtm-backup-$TS.sql.gz"
      ls -lh /tmp/sbtm-backup-$TS.sql.gz'
    ;;
  *)
    echo "ERROR: unknown command '${COMMAND}'"; exit 1 ;;
esac

echo "==> Running '${COMMAND}' on jumpbox"
ssh "${SSH_OPTS[@]}" "${ADMIN_USER}@${PUBLIC_IP}" \
  "DATABASE_URL='${DATABASE_URL}' bash -c '${REMOTE_CMD}'"

if [[ "${COMMAND}" == "backup" ]]; then
  TS_FILE=$(ssh "${SSH_OPTS[@]}" "${ADMIN_USER}@${PUBLIC_IP}" "ls -t /tmp/sbtm-backup-*.sql.gz | head -1")
  LOCAL_DIR="${REPO_ROOT}/backups"
  mkdir -p "${LOCAL_DIR}"
  echo "==> Downloading backup to ${LOCAL_DIR}/"
  scp "${SSH_OPTS[@]}" "${ADMIN_USER}@${PUBLIC_IP}:${TS_FILE}" "${LOCAL_DIR}/"
  echo "    Saved: ${LOCAL_DIR}/$(basename "${TS_FILE}")"
fi

echo "==> ✓ '${COMMAND}' completed successfully"
