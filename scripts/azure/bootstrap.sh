#!/usr/bin/env bash
# scripts/azure/bootstrap.sh
# End-to-end Azure bootstrap for SBTM (demo or production).
#
# Steps:
#   1. Install missing prerequisite tools on WSL/Ubuntu (azcopy, kustomize, etc.)
#   2. Ensure Azure login + subscription is selected
#   3. Prompt for required secrets (POSTGRES_ADMIN_PASSWORD, JWT_SECRET, optional FCM/Twilio)
#   4. Run preflight-check.sh
#   5. Run provision-azure.sh   (creates RG, AKS, ACR, Postgres, Redis, Storage, KV, App Insights,
#                                Static Web Apps for admin/parent portals, Azure DNS zone)
#   6. Materialize .env.<env> from .env.<env>.template by querying Azure for FQDNs / keys / conn strings
#   7. Run setup-keyvault.sh    (seeds Key Vault from .env.<env>)
#   8. Run setup-db.sh migrate  (+ seed-demo for the demo environment)
#   9. Run osrm-upload.sh       (uploads OSRM road network to Blob Storage)
#  10. Wire custom-domain DNS records for admin/parent portals + api in Azure DNS
#  11. Build admin + parent web bundles and upload via the Azure SWA CLI
#  12. Re-enable NGINX Ingress + Let's Encrypt for api.sbtm.ca and run verify-portals.sh
#
# Usage:
#   bash scripts/azure/bootstrap.sh [demo|production] [location]
#   bash scripts/azure/bootstrap.sh demo eastus
#
# Re-runnable: any step that detects "already done" is skipped. Safe to re-execute.

set -euo pipefail

ENVIRONMENT="${1:-demo}"
# Default location is resolved after we cd to REPO_ROOT (a few lines down) so
# this works regardless of caller's pwd. Override with $2 to force a region.
LOCATION_ARG="${2:-}"
shift $(( $# > 2 ? 2 : $# )) 2>/dev/null || true

# Optional flags (after positional args):
#   --from-step N      Skip steps 1..N-1; run N..12.
#   --portals-only     Shortcut for "run only the steps needed to (re)deploy the
#                      admin + parent portals on top of an existing backend":
#                      runs steps {5, 10, 11, 12}.
FROM_STEP=1
PORTALS_ONLY="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-step) FROM_STEP="${2:-1}"; shift 2 ;;
    --from-step=*) FROM_STEP="${1#*=}"; shift ;;
    --portals-only) PORTALS_ONLY="true"; shift ;;
    *) echo "WARN: ignoring unknown arg '$1'"; shift ;;
  esac
done

if [[ "${ENVIRONMENT}" != "demo" && "${ENVIRONMENT}" != "production" ]]; then
  echo "ERROR: environment must be 'demo' or 'production' (got '${ENVIRONMENT}')"
  exit 1
fi

# Build the step allow-list.
if [[ "${PORTALS_ONLY}" == "true" ]]; then
  STEPS_TO_RUN=" 5 10 11 12 "
else
  STEPS_TO_RUN=""
  for n in 1 2 3 4 5 6 7 8 9 10 11 12; do
    (( n >= FROM_STEP )) && STEPS_TO_RUN+=" ${n}"
  done
  STEPS_TO_RUN="${STEPS_TO_RUN} "
fi

should_run() { [[ "${STEPS_TO_RUN}" == *" $1 "* ]]; }

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RESOURCE_GROUP="sbtm-rg"
  IS_DEVTEST="false"
else
  RESOURCE_GROUP="sbtm-demo-rg"
  IS_DEVTEST="false"
fi

# Persistent DNS resource group — survives teardown so registrar NS records
# never need to be re-pasted. Override with DNS_RESOURCE_GROUP env var.
DNS_RESOURCE_GROUP="${DNS_RESOURCE_GROUP:-sbtm-dns-rg}"

# Persistent SWA resource group — Static Web Apps live here permanently
# (Free tier = $0/mo) so default *.azurestaticapps.net hostnames + custom-domain
# bindings + cert validations all survive teardown. No more re-binding /
# re-validating after each rebuild. Override with SWA_RESOURCE_GROUP env var.
SWA_RESOURCE_GROUP="${SWA_RESOURCE_GROUP:-${DNS_RESOURCE_GROUP}}"
# SWA region (SWAs serve via global CDN — region only governs control plane).
SWA_LOCATION="${SWA_LOCATION:-centralus}"

ENV_FILE=".env.${ENVIRONMENT}"
ENV_TEMPLATE=".env.${ENVIRONMENT}.template"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

# Resolve LOCATION from parameters.<env>.json (canadacentral by default for demo)
# unless the caller explicitly passed a 2nd positional arg.
if [[ -n "${LOCATION_ARG}" ]]; then
  LOCATION="${LOCATION_ARG}"
else
  LOCATION=$(jq -r '.parameters.location.value // "canadacentral"' "infra/azure/parameters.${ENVIRONMENT}.json" 2>/dev/null || echo "canadacentral")
fi

# ── Helpers ────────────────────────────────────────────────────────────────────
hr()   { echo ""; echo "════════════════════════════════════════════════════════════════"; echo "  $*"; echo "════════════════════════════════════════════════════════════════"; }
step() { echo ""; echo "── $*"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠  $*"; }
die()  { echo "  ✗ $*" >&2; exit 1; }

prompt_secret() {
  # $1 = var name, $2 = description, $3 = "yes" if optional
  local name="$1"; local desc="$2"; local optional="${3:-no}"
  local current="${!name:-}"
  if [[ -n "${current}" ]]; then
    ok "${name} already set in environment"
    return
  fi
  if [[ "${AUTO_YES:-false}" == "true" && "${optional}" == "yes" ]]; then
    export "${name}="
    ok "${name} auto-skipped (AUTO_YES=true)"
    return
  fi
  local prompt_msg="  Enter ${desc}"
  [[ "${optional}" == "yes" ]] && prompt_msg+=" (optional, press Enter to skip)"
  prompt_msg+=": "
  local value=""
  read -r -s -p "${prompt_msg}" value || true
  echo ""
  if [[ -z "${value}" && "${optional}" != "yes" ]]; then
    die "${name} is required"
  fi
  export "${name}=${value}"
}

confirm() {
  local msg="$1"; local ans=""
  if [[ "${AUTO_YES:-false}" == "true" ]]; then
    echo "  ${msg} [y/N]: y (AUTO_YES=true)"
    return 0
  fi
  read -r -p "  ${msg} [y/N]: " ans || true
  [[ "${ans}" =~ ^[Yy]$ ]]
}

ensure_kv_data_plane_access() {
  local kv_name="$1"
  local kv_id=""
  local me_oid=""
  local me_upn=""

  kv_id=$(az keyvault show --name "${kv_name}" --query id -o tsv 2>/dev/null || true)
  # Use object-id (works for personal MS accounts, guests, and AAD users alike).
  me_oid=$(az ad signed-in-user show --query id -o tsv 2>/dev/null || true)
  me_upn=$(az account show --query user.name -o tsv 2>/dev/null || true)

  if [[ -z "${kv_id}" || -z "${me_oid}" ]]; then
    warn "Could not resolve Key Vault scope or current identity object-id; skipping auto-RBAC fix"
    return
  fi

  if az keyvault secret list --vault-name "${kv_name}" --maxresults 1 --query "[0].name" -o tsv >/dev/null 2>&1; then
    ok "Current identity already has Key Vault data-plane access"
    return
  fi

  warn "Current identity (${me_upn:-${me_oid}}) lacks Key Vault secret permissions; ensuring RBAC role assignment"
  local existing_roles=""
  existing_roles=$(az role assignment list \
    --assignee "${me_oid}" \
    --scope "${kv_id}" \
    --query "[?roleDefinitionName=='Key Vault Secrets Officer' || roleDefinitionName=='Key Vault Administrator'].roleDefinitionName" \
    -o tsv 2>/dev/null || true)

  if [[ -z "${existing_roles}" ]]; then
    if az role assignment create \
      --assignee-object-id "${me_oid}" \
      --assignee-principal-type User \
      --role "Key Vault Secrets Officer" \
      --scope "${kv_id}" \
      --output none >/dev/null 2>&1; then
      ok "Assigned 'Key Vault Secrets Officer' to ${me_upn:-${me_oid}}"
    else
      warn "Could not auto-assign Key Vault role. Ensure your identity has 'Key Vault Secrets Officer' on ${kv_name}."
      return
    fi
  else
    ok "Existing Key Vault data role detected: ${existing_roles//$'\n'/, }"
  fi

  # RBAC propagation can take a short while; wait until data-plane access works.
  for _ in {1..24}; do
    if az keyvault secret list --vault-name "${kv_name}" --maxresults 1 --query "[0].name" -o tsv >/dev/null 2>&1; then
      ok "Key Vault data-plane access confirmed"
      return
    fi
    sleep 5
  done

  warn "Key Vault RBAC may still be propagating; Step 7 may need one re-run in a minute"
}

# ── 1. Prerequisite tools ────────────────────────────────────────────────────────────
if should_run 1; then
hr "Step 1/12 — Install prerequisite tools"

install_apt() {
  local pkg="$1"
  local cmd="${2:-$1}"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    step "Installing ${pkg} via apt"
    sudo apt-get update -qq
    sudo apt-get install -y -qq "${pkg}"
  fi
  ok "${pkg} present ($(command -v "${cmd}"))"
}

install_az() {
  if command -v az >/dev/null 2>&1; then ok "az CLI present ($(az version --query '"azure-cli"' -o tsv))"; return; fi
  step "Installing Azure CLI"
  curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
}

install_kubectl() {
  if command -v kubectl >/dev/null 2>&1; then ok "kubectl present"; return; fi
  step "Installing kubectl via az"
  sudo az aks install-cli
}

install_helm() {
  if command -v helm >/dev/null 2>&1; then ok "helm present"; return; fi
  step "Installing helm"
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
}

install_kustomize() {
  if command -v kustomize >/dev/null 2>&1; then ok "kustomize present"; return; fi
  step "Installing kustomize"
  ( cd /tmp && curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash )
  sudo mv /tmp/kustomize /usr/local/bin/
}

install_azcopy() {
  if command -v azcopy >/dev/null 2>&1; then ok "azcopy present"; return; fi
  step "Installing azcopy"
  ( cd /tmp \
    && curl -sL https://aka.ms/downloadazcopy-v10-linux -o azcopy.tgz \
    && tar -xzf azcopy.tgz \
    && sudo cp ./azcopy_linux_amd64_*/azcopy /usr/local/bin/ \
    && rm -rf azcopy.tgz azcopy_linux_amd64_* )
}

install_apt jq
install_apt curl
install_apt postgresql-client psql  # package name differs from executable
install_az
install_kubectl
install_helm
install_kustomize
install_azcopy
# bicep is bundled inside az CLI; ensure it is downloaded
az bicep version >/dev/null 2>&1 || az bicep install >/dev/null 2>&1 || true
ok "az bicep present ($(az bicep version 2>/dev/null | head -1 || echo 'installed'))"

fi  # end step 1

# ── 2. Azure login + subscription ──────────────────────────────────────────────
if should_run 2; then
hr "Step 2/12 — Azure login"
if ! az account show --output none 2>/dev/null; then
  step "Running az login (a browser/device-code prompt will appear)"
  az login --use-device-code
fi

CURRENT_SUB=$(az account show --query name -o tsv)
CURRENT_SUB_ID=$(az account show --query id -o tsv)
ok "Current subscription: ${CURRENT_SUB} (${CURRENT_SUB_ID})"
if confirm "Use a different subscription?"; then
  az account list --query "[].{Name:name,Id:id}" -o table
  if [[ "${AUTO_YES:-false}" == "true" ]]; then
    SUB_CHOICE="${CURRENT_SUB_ID}"
    echo "  Enter subscription ID or name: ${SUB_CHOICE} (AUTO_YES=true)"
  else
    read -r -p "  Enter subscription ID or name: " SUB_CHOICE
  fi
  az account set --subscription "${SUB_CHOICE}"
  ok "Switched to: $(az account show --query name -o tsv)"
fi

fi  # end step 2

# ── 3. Collect required secrets ─────────────────────────────────────────────────────
if should_run 3; then
hr "Step 3/12 — Collect required secrets"
echo "  Environment:    ${ENVIRONMENT}"
echo "  Resource group: ${RESOURCE_GROUP}"
echo "  Location:       ${LOCATION}"
echo "  Dev/Test SKUs:  ${IS_DEVTEST}"
echo ""

if [[ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]]; then
  if confirm "Auto-generate a strong POSTGRES_ADMIN_PASSWORD?"; then
    export POSTGRES_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)Aa1!"
    ok "Generated POSTGRES_ADMIN_PASSWORD (${#POSTGRES_ADMIN_PASSWORD} chars)"
  else
    prompt_secret POSTGRES_ADMIN_PASSWORD "PostgreSQL admin password (≥12 chars)"
  fi
fi
[[ "${#POSTGRES_ADMIN_PASSWORD}" -ge 12 ]] || die "POSTGRES_ADMIN_PASSWORD must be ≥12 chars"

if [[ -z "${JWT_SECRET:-}" ]]; then
  if confirm "Auto-generate JWT_SECRET (openssl rand -base64 48)?"; then
    export JWT_SECRET="$(openssl rand -base64 48)"
    ok "Generated JWT_SECRET (${#JWT_SECRET} chars)"
  else
    prompt_secret JWT_SECRET "JWT signing secret (≥32 chars)"
  fi
fi
[[ "${#JWT_SECRET}" -ge 32 ]] || die "JWT_SECRET must be ≥32 chars"

# Optional integrations — left empty if user skips
prompt_secret FCM_SERVER_KEY      "Firebase Cloud Messaging server key" yes
prompt_secret TWILIO_AUTH_TOKEN   "Twilio Auth Token"                   yes
prompt_secret TWILIO_ACCOUNT_SID  "Twilio Account SID"                  yes

fi  # end step 3

# ── 4. Preflight ─────────────────────────────────────────────────────────────────
if should_run 4; then
hr "Step 4/12 — Preflight check"
bash scripts/azure/preflight-check.sh "${ENVIRONMENT}" || \
  warn "preflight reported warnings/errors above — review before continuing"
if ! confirm "Continue with provisioning?"; then
  die "Aborted by user after preflight"
fi

fi  # end step 4

# ── 5. Provision Azure ────────────────────────────────────────────────────────────
if should_run 5; then
# Auto-fetch the Postgres admin password from Key Vault if we are jumping into
# step 5 without having run step 3 (e.g. --portals-only resume).
if [[ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]]; then
  KV_LOOKUP=$(az keyvault list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)
  if [[ -n "${KV_LOOKUP}" ]]; then
    for secret_name in sbtm-db-password postgres-admin-password db-password; do
      POSTGRES_ADMIN_PASSWORD=$(az keyvault secret show --vault-name "${KV_LOOKUP}" --name "${secret_name}" --query value -o tsv 2>/dev/null || true)
      if [[ -n "${POSTGRES_ADMIN_PASSWORD}" ]]; then
        export POSTGRES_ADMIN_PASSWORD
        echo "  ✓ Recovered POSTGRES_ADMIN_PASSWORD from Key Vault ${KV_LOOKUP} (secret: ${secret_name})"
        break
      fi
    done
  fi
  if [[ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]]; then
    echo "  ✗ POSTGRES_ADMIN_PASSWORD not set and could not be recovered from Key Vault." >&2
    echo "     Export it manually: export POSTGRES_ADMIN_PASSWORD='<value>'" >&2
    exit 1
  fi
fi
hr "Step 5/12 — Provision Azure resources"
# provision-azure.sh will skip Key Vault seeding because ${ENV_FILE} doesn't
# exist yet — that's expected; we seed it explicitly in step 7.
bash scripts/azure/provision-azure.sh "${ENVIRONMENT}" "${LOCATION}" "${IS_DEVTEST}"

fi  # end step 5

# ── 6. Materialize .env.<env> from Azure outputs ──────────────────────────────
if should_run 6; then
hr "Step 6/12 — Build ${ENV_FILE} from Azure resource outputs"

[[ -f "${ENV_TEMPLATE}" ]] || die "${ENV_TEMPLATE} not found; cannot scaffold ${ENV_FILE}"

cp "${ENV_TEMPLATE}" "${ENV_FILE}"
ok "Copied ${ENV_TEMPLATE} → ${ENV_FILE}"

step "Querying Azure for resource details"
PG_FQDN=$(az postgres flexible-server list -g "${RESOURCE_GROUP}" --query "[0].fullyQualifiedDomainName" -o tsv 2>/dev/null || true)
PG_ADMIN=$(az postgres flexible-server list -g "${RESOURCE_GROUP}" --query "[0].administratorLogin" -o tsv 2>/dev/null || echo "sbtmadmin")
REDIS_NAME=$(az redis list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)
REDIS_HOST=$(az redis list -g "${RESOURCE_GROUP}" --query "[0].hostName" -o tsv 2>/dev/null || true)
REDIS_KEY=""
if [[ -n "${REDIS_NAME}" ]]; then
  REDIS_KEY=$(az redis list-keys -g "${RESOURCE_GROUP}" -n "${REDIS_NAME}" --query primaryKey -o tsv 2>/dev/null || true)
fi
STORAGE_NAME=$(az storage account list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)
STORAGE_CS=""
if [[ -n "${STORAGE_NAME}" ]]; then
  STORAGE_CS=$(az storage account show-connection-string -g "${RESOURCE_GROUP}" -n "${STORAGE_NAME}" --query connectionString -o tsv 2>/dev/null || true)
fi
AI_NAME=$(az resource list -g "${RESOURCE_GROUP}" --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv 2>/dev/null || true)
AI_CS=""
if [[ -n "${AI_NAME}" ]]; then
  AI_CS=$(az resource show -g "${RESOURCE_GROUP}" -n "${AI_NAME}" --resource-type "Microsoft.Insights/components" --query "properties.ConnectionString" -o tsv 2>/dev/null || true)
fi

DB_NAME="sbms"
DATABASE_URL=""
if [[ -n "${PG_FQDN}" ]]; then
  DATABASE_URL="postgresql://${PG_ADMIN}:${POSTGRES_ADMIN_PASSWORD}@${PG_FQDN}:5432/${DB_NAME}?sslmode=require"
fi
REDIS_URL=""
if [[ -n "${REDIS_HOST}" && -n "${REDIS_KEY}" ]]; then
  REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380"
fi

echo "    Postgres FQDN:      ${PG_FQDN:-<not found>}"
echo "    Redis host:         ${REDIS_HOST:-<not found>}"
echo "    Storage account:    ${STORAGE_NAME:-<not found>}"
echo "    App Insights:       ${AI_NAME:-<not found>}"

# Replace each KEY=<...> placeholder line with the real value (sed-safe via python).
write_env() {
  python3 - "$ENV_FILE" <<'PY'
import os
import re
import shlex
import sys

path = sys.argv[1]
keys = [
  "JWT_SECRET",
  "DB_PASSWORD",
  "DATABASE_URL",
  "REDIS_URL",
  "FCM_SERVER_KEY",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_ACCOUNT_SID",
  "AZURE_STORAGE_CONNECTION_STRING",
  "APPLICATIONINSIGHTS_CONNECTION_STRING",
]
values = {k: os.environ.get(k, "") for k in keys}

with open(path, "r", encoding="utf-8") as f:
  lines = f.readlines()

out = []
seen = set()
for line in lines:
  m = re.match(r"^([A-Z_][A-Z0-9_]*)=", line)
  if m and m.group(1) in values:
    key = m.group(1)
    out.append(f"{key}={shlex.quote(values[key])}\n")
    seen.add(key)
  else:
    out.append(line)

for k in keys:
  if k not in seen and values[k]:
    out.append(f"{k}={shlex.quote(values[k])}\n")

with open(path, "w", encoding="utf-8") as f:
  f.writelines(out)
PY
}

DB_PASSWORD="${POSTGRES_ADMIN_PASSWORD}" \
JWT_SECRET="${JWT_SECRET}" \
DATABASE_URL="${DATABASE_URL}" \
REDIS_URL="${REDIS_URL}" \
FCM_SERVER_KEY="${FCM_SERVER_KEY:-}" \
TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}" \
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}" \
AZURE_STORAGE_CONNECTION_STRING="${STORAGE_CS}" \
APPLICATIONINSIGHTS_CONNECTION_STRING="${AI_CS}" \
write_env

chmod 600 "${ENV_FILE}"
ok "Wrote ${ENV_FILE} (chmod 600)"

fi  # end step 6

# ── 7. Seed Key Vault ─────────────────────────────────────────────────────────────
if should_run 7; then
hr "Step 7/12 — Seed Azure Key Vault"
KV_NAME=$(az keyvault list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv)
[[ -n "${KV_NAME}" ]] || die "No Key Vault found in ${RESOURCE_GROUP}"
ok "Key Vault: ${KV_NAME}"
ensure_kv_data_plane_access "${KV_NAME}"
KV_SEED_LOG=$(mktemp)
set +e
KV_NAME="${KV_NAME}" ENV_FILE="${ENV_FILE}" bash scripts/azure/setup-keyvault.sh >"${KV_SEED_LOG}" 2>&1
KV_SEED_EXIT=$?
set -e
if [[ "${KV_SEED_EXIT}" -ne 0 ]]; then
  if grep -Eqi "ForbiddenByRbac|Caller is not authorized to perform action" "${KV_SEED_LOG}"; then
    warn "Key Vault seeding skipped due to RBAC denial for current identity"
    warn "Grant 'Key Vault Secrets Officer' on ${KV_NAME}, then re-run:"
    warn "    KV_NAME=${KV_NAME} ENV_FILE=${ENV_FILE} bash scripts/azure/setup-keyvault.sh"
  else
    cat "${KV_SEED_LOG}" >&2
    rm -f "${KV_SEED_LOG}"
    exit "${KV_SEED_EXIT}"
  fi
else
  cat "${KV_SEED_LOG}"
fi
rm -f "${KV_SEED_LOG}"

fi  # end step 7

# ── 8. Database migration + seed ──────────────────────────────────────────────────────
if should_run 8; then
hr "Step 8/12 — Database migration"
# Allow-list required PostgreSQL extensions on Azure Flexible Server
PG_SERVER_NAME=$(az postgres flexible-server list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)
if [[ -n "${PG_SERVER_NAME}" ]]; then
  az postgres flexible-server parameter set \
    -g "${RESOURCE_GROUP}" -s "${PG_SERVER_NAME}" \
    --name azure.extensions \
    --value "PGCRYPTO,UUID-OSSP,CITEXT,POSTGIS" \
    -o none 2>/dev/null && ok "PostgreSQL extensions allow-listed" || \
    warn "Could not allow-list extensions — migration may fail if pgcrypto/uuid-ossp/postgis are missing"
fi

# Postgres uses a private endpoint, so psql from WSL won't reach it.
# Strategy: try local psql first (works if you're on VPN/Bastion), and
# automatically fall back to running psql inside the AKS cluster (free,
# already in the VNET).
run_db() {
  local cmd="$1"
  if ENV_FILE="${ENV_FILE}" bash scripts/azure/setup-db.sh "${cmd}" 2>/dev/null; then
    return 0
  fi
  warn "Local psql cannot reach private Postgres — falling back to AKS pod"
  bash scripts/azure/db-migrate-via-aks.sh "${ENVIRONMENT}" "${cmd}"
}
if run_db migrate; then
  ok "Schema migrated"
  if [[ "${ENVIRONMENT}" == "demo" ]]; then
    run_db seed-demo || warn "seed-demo failed — re-run later: bash scripts/azure/db-migrate-via-aks.sh demo seed-demo"
  fi
else
  warn "Migration failed via both local psql AND in-cluster pod."
  warn "As a last resort, spin up a temporary jumpbox VM (~\$0.02 one-time):"
  warn "    bash scripts/azure/db-jumpbox.sh ${ENVIRONMENT} migrate"
fi

fi  # end step 8

# ── 9. OSRM upload ───────────────────────────────────────────────────────────────────
if should_run 9; then
hr "Step 9/12 — Upload OSRM road network"
if [[ -d infra/osrm-data ]] && compgen -G "infra/osrm-data/*" >/dev/null; then
  ENV_FILE="${ENV_FILE}" bash scripts/azure/osrm-upload.sh || \
    warn "osrm-upload.sh failed — run later: ENV_FILE=${ENV_FILE} bash scripts/azure/osrm-upload.sh"
else
  warn "infra/osrm-data is empty — skipping OSRM upload"
  warn "Generate routing data first (see scripts/setup-osrm.sh), then re-run osrm-upload.sh"
fi

fi  # end step 9

# ── 10. Static Web App custom-domain DNS records ──────────────────────────────
# Provisions Azure DNS records that bind admin.<domain> and parent.<domain> to
# their respective SWA default hostnames, plus _dnsauth TXT records used by
# the SWA dns-txt-token validation flow.

if should_run 10; then
hr "Step 10/12 — Wire custom-domain DNS records for portals"

CUSTOM_DOMAIN=$(jq -r '.parameters.customDomain.value // ""' "infra/azure/parameters.${ENVIRONMENT}.json")
MANAGE_DNS_ZONE=$(jq -r '.parameters.manageDnsZone.value // false' "infra/azure/parameters.${ENVIRONMENT}.json")
ADMIN_SWA_NAME="sbtm-admin-${ENVIRONMENT}"
PARENT_SWA_NAME="sbtm-parent-${ENVIRONMENT}"
ADMIN_DEFAULT_HOST=""
PARENT_DEFAULT_HOST=""
DNS_NAME_SERVERS=""

# Ensure persistent RG for SWAs exists (idempotent; same as DNS RG by default).
if ! az group show -n "${SWA_RESOURCE_GROUP}" --output none 2>/dev/null; then
  step "Creating persistent SWA resource group ${SWA_RESOURCE_GROUP}"
  az group create -n "${SWA_RESOURCE_GROUP}" -l "${LOCATION}" \
    --tags purpose=persistent-swa project=sbtm --output none
  ok "SWA RG ${SWA_RESOURCE_GROUP} ready"
fi

ensure_persistent_swa() {
  # $1 = swa name. Creates Free-tier SWA in SWA_RESOURCE_GROUP if missing,
  # otherwise reuses (preserves default hostname + cert + bindings).
  local swa="$1"
  if az staticwebapp show -g "${SWA_RESOURCE_GROUP}" -n "${swa}" --output none 2>/dev/null; then
    return 0
  fi
  # Migration: if a stale SWA exists in the env RG (from older bootstraps),
  # remove it so we get a clean create in the persistent RG. Then teardown will
  # never need to touch SWAs again.
  if az staticwebapp show -g "${RESOURCE_GROUP}" -n "${swa}" --output none 2>/dev/null; then
    warn "Found stale ${swa} in ${RESOURCE_GROUP} — deleting before recreating in ${SWA_RESOURCE_GROUP}"
    az staticwebapp delete -g "${RESOURCE_GROUP}" -n "${swa}" --yes --output none 2>/dev/null || true
  fi
  step "Creating Static Web App ${swa} in ${SWA_RESOURCE_GROUP} (Free tier)"
  az staticwebapp create -g "${SWA_RESOURCE_GROUP}" -n "${swa}" \
    -l "${SWA_LOCATION}" --sku Free \
    --tags purpose=persistent-swa project=sbtm environment="${ENVIRONMENT}" \
    --output none
  ok "${swa} created"
}

ensure_persistent_swa "${ADMIN_SWA_NAME}"
ensure_persistent_swa "${PARENT_SWA_NAME}"

if az staticwebapp show -g "${SWA_RESOURCE_GROUP}" -n "${ADMIN_SWA_NAME}" --output none 2>/dev/null; then
  ADMIN_DEFAULT_HOST=$(az staticwebapp show -g "${SWA_RESOURCE_GROUP}" -n "${ADMIN_SWA_NAME}" --query defaultHostname -o tsv)
  ok "Admin SWA: ${ADMIN_SWA_NAME} (${SWA_RESOURCE_GROUP}) → ${ADMIN_DEFAULT_HOST}"
else
  warn "Admin Static Web App ${ADMIN_SWA_NAME} not found in ${SWA_RESOURCE_GROUP}"
fi
if az staticwebapp show -g "${SWA_RESOURCE_GROUP}" -n "${PARENT_SWA_NAME}" --output none 2>/dev/null; then
  PARENT_DEFAULT_HOST=$(az staticwebapp show -g "${SWA_RESOURCE_GROUP}" -n "${PARENT_SWA_NAME}" --query defaultHostname -o tsv)
  ok "Parent SWA: ${PARENT_SWA_NAME} (${SWA_RESOURCE_GROUP}) → ${PARENT_DEFAULT_HOST}"
else
  warn "Parent Static Web App ${PARENT_SWA_NAME} not found in ${SWA_RESOURCE_GROUP}"
fi

bind_swa_custom_domain() {
  # $1 = SWA resource name, $2 = subdomain (admin/parent), $3 = default hostname
  local swa="$1"; local sub="$2"; local default_host="$3"
  local fqdn="${sub}.${CUSTOM_DOMAIN}"

  # 1. CNAME <sub>.<domain> → <default_host>
  step "Upserting CNAME ${fqdn} → ${default_host}"
  az network dns record-set cname set-record \
    -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n "${sub}" \
    --cname "${default_host}" --ttl 300 --output none
  ok "CNAME ${fqdn} ready"

  # 2. Register hostname with the SWA using dns-txt-token validation. This
  #    surfaces a validationToken which we then write as a TXT record on
  #    _dnsauth.<sub>.
  step "Registering ${fqdn} on Static Web App ${swa}"
  local existing_status=""
  existing_status=$(az staticwebapp hostname show -g "${SWA_RESOURCE_GROUP}" -n "${swa}" --hostname "${fqdn}" --query status -o tsv 2>/dev/null || true)
  if [[ "${existing_status}" == "Ready" ]]; then
    ok "${fqdn} already bound to ${swa} (Ready) — persistent SWA, no rebind needed"
    return
  fi
  if [[ "${existing_status}" == "Validating" ]]; then
    # Stuck in Validating usually means Azure cached a failed lookup against an
    # older/missing TXT token. Force a fresh token by deleting and re-adding the
    # binding, then refresh the TXT record.
    warn "${fqdn} stuck in Validating — recreating binding to force fresh token"
    az staticwebapp hostname delete -g "${SWA_RESOURCE_GROUP}" -n "${swa}" --hostname "${fqdn}" --yes --output none 2>/dev/null || true
    sleep 5
  fi
  # Initiate validation (idempotent, may print a token to capture).
  # Use --no-wait so we don't block on Azure's DNS validation, which cannot
  # complete until NS delegation is done at the registrar.
  az staticwebapp hostname set \
    -g "${SWA_RESOURCE_GROUP}" -n "${swa}" \
    --hostname "${fqdn}" --validation-method dns-txt-token --no-wait \
    --output none 2>/dev/null || true
  # Token isn't always returned synchronously; poll the hostname resource.
  local token=""
  for _ in {1..12}; do
    token=$(az staticwebapp hostname show \
      -g "${SWA_RESOURCE_GROUP}" -n "${swa}" --hostname "${fqdn}" \
      --query validationToken -o tsv 2>/dev/null || true)
    [[ -n "${token}" ]] && break
    sleep 5
  done
  if [[ -n "${token}" ]]; then
    step "Refreshing _dnsauth.${sub} TXT record (delete + add to clear stale tokens)"
    az network dns record-set txt delete \
      -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n "_dnsauth.${sub}" \
      --yes --output none 2>/dev/null || true
    az network dns record-set txt create \
      -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n "_dnsauth.${sub}" \
      --ttl 60 --output none 2>/dev/null || true
    az network dns record-set txt add-record \
      -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n "_dnsauth.${sub}" \
      --value "${token}" --output none 2>/dev/null || true
    ok "_dnsauth.${sub}.${CUSTOM_DOMAIN} TXT record set (token: ${token:0:8}…)"
  else
    warn "No validationToken yet for ${fqdn}; check 'az staticwebapp hostname show' after NS delegation"
  fi
}

if [[ -n "${CUSTOM_DOMAIN}" ]]; then
  # Ensure persistent DNS RG + zone exist (idempotent; zone is preserved across
  # teardown of ${RESOURCE_GROUP} so registrar NS records stay stable).
  if ! az group show -n "${DNS_RESOURCE_GROUP}" --output none 2>/dev/null; then
    step "Creating persistent DNS resource group ${DNS_RESOURCE_GROUP}"
    az group create -n "${DNS_RESOURCE_GROUP}" -l "${LOCATION}" \
      --tags purpose=persistent-dns project=sbtm --output none
    ok "DNS RG ${DNS_RESOURCE_GROUP} ready"
  fi
  if ! az network dns zone show -g "${DNS_RESOURCE_GROUP}" -n "${CUSTOM_DOMAIN}" --output none 2>/dev/null; then
    step "Creating DNS zone ${CUSTOM_DOMAIN} in ${DNS_RESOURCE_GROUP}"
    az network dns zone create -g "${DNS_RESOURCE_GROUP}" -n "${CUSTOM_DOMAIN}" --output none
    ok "DNS zone ${CUSTOM_DOMAIN} created (paste new NS records at registrar — see summary)"
  fi
  DNS_NAME_SERVERS=$(az network dns zone show -g "${DNS_RESOURCE_GROUP}" -n "${CUSTOM_DOMAIN}" --query nameServers -o tsv | paste -sd ' ')
  ok "DNS zone ${CUSTOM_DOMAIN} present in ${DNS_RESOURCE_GROUP}"
  [[ -n "${ADMIN_DEFAULT_HOST}" ]]  && bind_swa_custom_domain "${ADMIN_SWA_NAME}"  "admin"  "${ADMIN_DEFAULT_HOST}"
  [[ -n "${PARENT_DEFAULT_HOST}" ]] && bind_swa_custom_domain "${PARENT_SWA_NAME}" "parent" "${PARENT_DEFAULT_HOST}"
else
  warn "customDomain is empty — skipping DNS automation"
  warn "See docs/Deployment/CustomDomainSetup.md for manual steps"
fi

fi  # end step 10

# ── 11. Build & deploy admin + parent portals via SWA CLI ────────────────────
if should_run 11; then
# Re-derive CUSTOM_DOMAIN/MANAGE_DNS_ZONE if we skipped step 10.
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-$(jq -r '.parameters.customDomain.value // ""' "infra/azure/parameters.${ENVIRONMENT}.json")}"
ADMIN_SWA_NAME="${ADMIN_SWA_NAME:-sbtm-admin-${ENVIRONMENT}}"
PARENT_SWA_NAME="${PARENT_SWA_NAME:-sbtm-parent-${ENVIRONMENT}}"
hr "Step 11/12 — Build and deploy admin + parent portals"

if ! command -v swa >/dev/null 2>&1; then
  step "Installing @azure/static-web-apps-cli globally (pnpm)"
  pnpm add -g @azure/static-web-apps-cli >/dev/null 2>&1 || \
    warn "Could not install swa CLI globally — try: sudo pnpm add -g @azure/static-web-apps-cli"
fi
ok "swa CLI: $(swa --version 2>/dev/null || echo 'not installed — portal upload will be skipped')"

API_BASE_URL="https://api.${CUSTOM_DOMAIN}"
[[ -z "${CUSTOM_DOMAIN}" ]] && API_BASE_URL=""

# Map tile provider key (MapTiler). Required for production map tiles — public
# OSM tile servers block traffic from busy sites per their usage policy.
# Set MAPTILER_KEY in the environment (or in parameters.<env>.json future field)
# to enable; otherwise the build still succeeds but maps will fail to load.
MAPTILER_KEY="${MAPTILER_KEY:-$(jq -r '.parameters.mapTilerKey.value // ""' "infra/azure/parameters.${ENVIRONMENT}.json" 2>/dev/null || echo "")}"
if [[ -z "${MAPTILER_KEY}" ]]; then
  warn "MAPTILER_KEY not set — map tiles will be blocked in production. Get a free key at https://cloud.maptiler.com/account/keys/ and re-run with MAPTILER_KEY=<key>"
fi

deploy_portal() {
  # $1 = friendly name, $2 = working dir, $3 = SWA resource name
  local label="$1"; local dir="$2"; local swa="$3"
  step "Building ${label} (${dir})"
  if [[ ! -d "${dir}" ]]; then
    warn "${dir} not found — skipping ${label}"
    return
  fi
  ( cd "${dir}" && VITE_API_URL="${API_BASE_URL}" VITE_MAPTILER_KEY="${MAPTILER_KEY}" pnpm install --frozen-lockfile >/dev/null 2>&1 || true )
  if ! ( cd "${dir}" && VITE_API_URL="${API_BASE_URL}" VITE_MAPTILER_KEY="${MAPTILER_KEY}" pnpm run build ); then
    warn "Build failed for ${label} — skipping deploy"
    return
  fi
  ok "${label} build complete"
  if ! command -v swa >/dev/null 2>&1; then
    warn "swa CLI missing — cannot deploy ${label}; install it and re-run Step 11"
    return
  fi
  step "Fetching deployment token for ${swa}"
  local token=""
  token=$(az staticwebapp secrets list -g "${SWA_RESOURCE_GROUP}" -n "${swa}" \
    --query properties.apiKey -o tsv 2>/dev/null || true)
  if [[ -z "${token}" ]]; then
    warn "Could not retrieve deployment token for ${swa}; skipping ${label}"
    return
  fi
  step "Deploying ${label} via swa CLI"
  ( cd "${dir}" && swa deploy ./dist --deployment-token "${token}" --env production >/dev/null )
  ok "${label} deployed"
}

deploy_portal "admin portal"  "apps/admin-dashboard" "${ADMIN_SWA_NAME}"
deploy_portal "parent portal" "apps/parent-dashboard/web"  "${PARENT_SWA_NAME}"

fi  # end step 11

# ── 12. Re-enable API ingress for api.<domain> + run verify-portals ───────────
if should_run 12; then
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-$(jq -r '.parameters.customDomain.value // ""' "infra/azure/parameters.${ENVIRONMENT}.json")}"
hr "Step 12/12 — Build images, deploy workloads, wire ingress, verify"

# 12a. Build & push container images (server-side ACR build, no local Docker).
step "Building and pushing all service container images via ACR"
bash scripts/azure/build-images.sh "${ENVIRONMENT}" || \
  warn "Some image builds failed — pods will stay in ImagePullBackOff until rebuilt"

# 12b. Patch the kustomize overlay with the LIVE workload-identity client ID and
# Key Vault name so we never carry a stale value across teardowns.
step "Syncing workload-identity clientID + Key Vault name into kustomize overlay"
WI_NAME="sbtm-workload-identity-${ENVIRONMENT}"
LIVE_WI_CLIENTID=$(az identity show -g "${RESOURCE_GROUP}" -n "${WI_NAME}" --query clientId -o tsv 2>/dev/null || true)
LIVE_KV_NAME=$(az keyvault list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)
LIVE_TENANT_ID=$(az account show --query tenantId -o tsv 2>/dev/null || true)
OVERLAY_KFILE="infra/k8s/overlays/${ENVIRONMENT}/kustomization.yaml"
if [[ -n "${LIVE_WI_CLIENTID}" && -f "${OVERLAY_KFILE}" ]]; then
  python3 - "${OVERLAY_KFILE}" "${LIVE_WI_CLIENTID}" "${LIVE_TENANT_ID}" "${LIVE_KV_NAME}" <<'PY'
import re, sys
path, client_id, tenant_id, kv_name = sys.argv[1:5]
with open(path) as f:
    txt = f.read()
def patch_path(json_path, new_value):
    global txt
    if not new_value:
        return
    pat = re.compile(
        r"(path:\s*" + re.escape(json_path) + r"\s*\n\s*value:\s*).+",
        re.MULTILINE,
    )
    txt = pat.sub(lambda m: m.group(1) + new_value, txt)
patch_path("/spec/parameters/keyvaultName", kv_name)
patch_path("/spec/parameters/clientID", client_id)
patch_path("/spec/parameters/tenantId", tenant_id)
patch_path("/metadata/annotations/azure.workload.identity~1client-id", client_id)
patch_path("/metadata/annotations/azure.workload.identity~1tenant-id", tenant_id)
with open(path, "w") as f:
    f.write(txt)
PY
  ok "Overlay synced: clientID=${LIVE_WI_CLIENTID}, keyvault=${LIVE_KV_NAME}"
else
  warn "Could not auto-patch overlay (UAMI ${WI_NAME} not found); kubectl apply may use stale values"
fi

if [[ -n "${CUSTOM_DOMAIN}" ]]; then
  step "Applying demo overlay (kustomize) so the api.sbtm.ca ingress + ClusterIssuer are created"
  kubectl apply -k "infra/k8s/overlays/${ENVIRONMENT}" >/dev/null 2>&1 || \
    warn "kubectl apply failed; review with: kubectl apply -k infra/k8s/overlays/${ENVIRONMENT}"

  step "Waiting for ingress LoadBalancer to receive an external IP (timeout 5 min)"
  LB_IP=""
  for _ in {1..30}; do
    LB_IP=$(kubectl get svc -A -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.status.loadBalancer.ingress[0].ip}{"\n"}{end}' 2>/dev/null \
      | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
    [[ -n "${LB_IP}" ]] && break
    sleep 10
  done
  if [[ -n "${LB_IP}" ]]; then
    ok "Ingress LoadBalancer IP: ${LB_IP}"
    step "Upserting A record api.${CUSTOM_DOMAIN} → ${LB_IP}"
    az network dns record-set a delete -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n api --yes --output none 2>/dev/null || true
    az network dns record-set a add-record \
      -g "${DNS_RESOURCE_GROUP}" -z "${CUSTOM_DOMAIN}" -n api \
      --ipv4-address "${LB_IP}" --ttl 300 --output none
    ok "A record api.${CUSTOM_DOMAIN} → ${LB_IP} ready"
  else
    warn "No ingress LoadBalancer IP yet; create A record manually once it appears"
  fi
else
  warn "Custom domain unset — skipping ingress wiring"
fi

step "Restarting workload deployments to pick up freshly built images / patched WI clientID"
NS="sbtm-${ENVIRONMENT}"
DEPLOYS=$(kubectl -n "${NS}" get deploy -o name 2>/dev/null || true)
if [[ -n "${DEPLOYS}" ]]; then
  echo "${DEPLOYS}" | xargs -r -I{} kubectl -n "${NS}" rollout restart {} >/dev/null 2>&1 && \
    ok "Restarted $(echo "${DEPLOYS}" | wc -l) deployment(s) in namespace ${NS}"
else
  warn "rollout restart skipped (namespace ${NS} has no deployments yet)"
fi

step "Running verify-portals.sh"
if bash scripts/azure/verify-portals.sh "${ENVIRONMENT}"; then
  ok "Portal verification passed"
else
  warn "Portal verification reported issues; see output above. DNS/TLS may still be propagating."
fi

fi  # end step 12

# ── Done ──────────────────────────────────────────────────────────────────────
hr "Bootstrap complete for environment: ${ENVIRONMENT}"
# Make sure summary variables exist even when steps that set them were skipped.
KV_NAME="${KV_NAME:-$(az keyvault list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)}"
PG_FQDN="${PG_FQDN:-$(az postgres flexible-server list -g "${RESOURCE_GROUP}" --query "[0].fullyQualifiedDomainName" -o tsv 2>/dev/null || true)}"
REDIS_HOST="${REDIS_HOST:-$(az redis list -g "${RESOURCE_GROUP}" --query "[0].hostName" -o tsv 2>/dev/null || true)}"
STORAGE_NAME="${STORAGE_NAME:-$(az storage account list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)}"
AI_NAME="${AI_NAME:-$(az resource list -g "${RESOURCE_GROUP}" --resource-type "Microsoft.Insights/components" --query "[0].name" -o tsv 2>/dev/null || true)}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-$(jq -r '.parameters.customDomain.value // ""' "infra/azure/parameters.${ENVIRONMENT}.json" 2>/dev/null || true)}"
ADMIN_DEFAULT_HOST="${ADMIN_DEFAULT_HOST:-$(az staticwebapp show -g "${SWA_RESOURCE_GROUP}" -n "sbtm-admin-${ENVIRONMENT}" --query defaultHostname -o tsv 2>/dev/null || true)}"
PARENT_DEFAULT_HOST="${PARENT_DEFAULT_HOST:-$(az staticwebapp show -g "${SWA_RESOURCE_GROUP}" -n "sbtm-parent-${ENVIRONMENT}" --query defaultHostname -o tsv 2>/dev/null || true)}"
LB_IP="${LB_IP:-$(kubectl get svc -A -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.status.loadBalancer.ingress[0].ip}{"\n"}{end}' 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)}"
if [[ -z "${DNS_NAME_SERVERS:-}" && -n "${CUSTOM_DOMAIN}" ]]; then
  DNS_NAME_SERVERS=$(az network dns zone show -g "${DNS_RESOURCE_GROUP}" -n "${CUSTOM_DOMAIN}" --query nameServers -o tsv 2>/dev/null | paste -sd ' ' || true)
fi
DNS_NAME_SERVERS="${DNS_NAME_SERVERS:-}"
cat <<EOF

  Resource group:   ${RESOURCE_GROUP}
  DNS RG (persist): ${DNS_RESOURCE_GROUP}   (survives teardown — NS stays stable)
  Location:         ${LOCATION}
  Env file:         ${ENV_FILE} (chmod 600, gitignored)
  Key Vault:        ${KV_NAME}
  Postgres:         ${PG_FQDN:-<n/a>}
  Redis:            ${REDIS_HOST:-<n/a>}
  Storage:          ${STORAGE_NAME:-<n/a>}
  App Insights:     ${AI_NAME:-<n/a>}

  Frontends (Azure Static Web Apps):
    Admin portal:   https://admin.${CUSTOM_DOMAIN:-<domain>}   (default: ${ADMIN_DEFAULT_HOST:-<n/a>})
    Parent portal:  https://parent.${CUSTOM_DOMAIN:-<domain>}  (default: ${PARENT_DEFAULT_HOST:-<n/a>})
    API gateway:    https://api.${CUSTOM_DOMAIN:-<domain>}     (LB: ${LB_IP:-<pending>})

  DNS delegation — paste these NS records at your domain registrar for ${CUSTOM_DOMAIN:-<domain>}
  (one-time only; the zone lives in persistent RG ${DNS_RESOURCE_GROUP} and is NOT touched by teardown):
$(if [[ -n "${DNS_NAME_SERVERS}" ]]; then for ns in ${DNS_NAME_SERVERS}; do echo "    ${ns}"; done; else echo "    (DNS zone not present)"; fi)

  Next:
    kubectl get nodes
    kubectl apply -k infra/k8s/overlays/${ENVIRONMENT}
    bash scripts/azure/verify-portals.sh ${ENVIRONMENT}

  Cost controls:
    bash scripts/azure/cost-stop.sh  ${ENVIRONMENT}     # pause without losing data
    bash scripts/azure/cost-start.sh ${ENVIRONMENT}     # resume
    bash scripts/azure/teardown-azure.sh ${ENVIRONMENT} # DELETE everything

EOF
