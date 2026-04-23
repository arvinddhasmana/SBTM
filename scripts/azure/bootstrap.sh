#!/usr/bin/env bash
# scripts/azure/bootstrap.sh
# End-to-end Azure bootstrap for SBTM (demo or production).
#
# Steps:
#   1. Install missing prerequisite tools on WSL/Ubuntu (azcopy, kustomize, etc.)
#   2. Ensure Azure login + subscription is selected
#   3. Prompt for required secrets (POSTGRES_ADMIN_PASSWORD, JWT_SECRET, optional FCM/Twilio)
#   4. Run preflight-check.sh
#   5. Run provision-azure.sh   (creates RG, AKS, ACR, Postgres, Redis, Storage, KV, App Insights)
#   6. Materialize .env.<env> from .env.<env>.template by querying Azure for FQDNs / keys / conn strings
#   7. Run setup-keyvault.sh    (seeds Key Vault from .env.<env>)
#   8. Run setup-db.sh migrate  (+ seed-demo for the demo environment)
#   9. Run osrm-upload.sh       (uploads OSRM road network to Blob Storage)
#
# Usage:
#   bash scripts/azure/bootstrap.sh [demo|production] [location]
#   bash scripts/azure/bootstrap.sh demo eastus
#
# Re-runnable: any step that detects "already done" is skipped. Safe to re-execute.

set -euo pipefail

ENVIRONMENT="${1:-demo}"
LOCATION="${2:-eastus}"

if [[ "${ENVIRONMENT}" != "demo" && "${ENVIRONMENT}" != "production" ]]; then
  echo "ERROR: environment must be 'demo' or 'production' (got '${ENVIRONMENT}')"
  exit 1
fi

if [[ "${ENVIRONMENT}" == "production" ]]; then
  RESOURCE_GROUP="sbtm-rg"
  IS_DEVTEST="false"
else
  RESOURCE_GROUP="sbtm-demo-rg"
  IS_DEVTEST="true"
fi

ENV_FILE=".env.${ENVIRONMENT}"
ENV_TEMPLATE=".env.${ENVIRONMENT}.template"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

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
  read -r -p "  ${msg} [y/N]: " ans || true
  [[ "${ans}" =~ ^[Yy]$ ]]
}

# ── 1. Prerequisite tools ──────────────────────────────────────────────────────
hr "Step 1/9 — Install prerequisite tools"

install_apt() {
  local pkg="$1"
  if ! command -v "${pkg}" >/dev/null 2>&1; then
    step "Installing ${pkg} via apt"
    sudo apt-get update -qq
    sudo apt-get install -y -qq "${pkg}"
  fi
  ok "${pkg} present ($(command -v "${pkg}"))"
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
install_apt postgresql-client       # provides psql
install_az
install_kubectl
install_helm
install_kustomize
install_azcopy
# bicep is bundled inside az CLI; ensure it is downloaded
az bicep version >/dev/null 2>&1 || az bicep install >/dev/null 2>&1 || true
ok "az bicep present ($(az bicep version 2>/dev/null | head -1 || echo 'installed'))"

# ── 2. Azure login + subscription ──────────────────────────────────────────────
hr "Step 2/9 — Azure login"
if ! az account show --output none 2>/dev/null; then
  step "Running az login (a browser/device-code prompt will appear)"
  az login --use-device-code
fi

CURRENT_SUB=$(az account show --query name -o tsv)
CURRENT_SUB_ID=$(az account show --query id -o tsv)
ok "Current subscription: ${CURRENT_SUB} (${CURRENT_SUB_ID})"
if confirm "Use a different subscription?"; then
  az account list --query "[].{Name:name,Id:id}" -o table
  read -r -p "  Enter subscription ID or name: " SUB_CHOICE
  az account set --subscription "${SUB_CHOICE}"
  ok "Switched to: $(az account show --query name -o tsv)"
fi

# ── 3. Collect required secrets ────────────────────────────────────────────────
hr "Step 3/9 — Collect required secrets"
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

# ── 4. Preflight ───────────────────────────────────────────────────────────────
hr "Step 4/9 — Preflight check"
bash scripts/azure/preflight-check.sh "${ENVIRONMENT}" || \
  warn "preflight reported warnings/errors above — review before continuing"
if ! confirm "Continue with provisioning?"; then
  die "Aborted by user after preflight"
fi

# ── 5. Provision Azure ────────────────────────────────────────────────────────
hr "Step 5/9 — Provision Azure resources"
# provision-azure.sh will skip Key Vault seeding because ${ENV_FILE} doesn't
# exist yet — that's expected; we seed it explicitly in step 7.
bash scripts/azure/provision-azure.sh "${ENVIRONMENT}" "${LOCATION}" "${IS_DEVTEST}"

# ── 6. Materialize .env.<env> from Azure outputs ──────────────────────────────
hr "Step 6/9 — Build ${ENV_FILE} from Azure resource outputs"

[[ -f "${ENV_TEMPLATE}" ]] || die "${ENV_TEMPLATE} not found; cannot scaffold ${ENV_FILE}"

if [[ -f "${ENV_FILE}" ]]; then
  warn "${ENV_FILE} already exists — backing up to ${ENV_FILE}.bak.$(date +%s)"
  cp "${ENV_FILE}" "${ENV_FILE}.bak.$(date +%s)"
fi
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
AI_NAME=$(az monitor app-insights component list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv 2>/dev/null || true)
AI_CS=""
if [[ -n "${AI_NAME}" ]]; then
  AI_CS=$(az monitor app-insights component show -g "${RESOURCE_GROUP}" -a "${AI_NAME}" --query connectionString -o tsv 2>/dev/null || true)
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
import os, re, sys
path = sys.argv[1]
keys = [
    "JWT_SECRET", "DB_PASSWORD", "DATABASE_URL", "REDIS_URL",
    "FCM_SERVER_KEY", "TWILIO_AUTH_TOKEN", "TWILIO_ACCOUNT_SID",
    "AZURE_STORAGE_CONNECTION_STRING", "APPLICATIONINSIGHTS_CONNECTION_STRING",
]
values = {k: os.environ.get(k, "") for k in keys}
with open(path) as f:
    lines = f.readlines()
out = []
seen = set()
for line in lines:
    m = re.match(r"^([A-Z_][A-Z0-9_]*)=", line)
    if m and m.group(1) in values:
        key = m.group(1)
        out.append(f"{key}={values[key]}\n")
        seen.add(key)
    else:
        out.append(line)
# Append any missing keys at end (shouldn't happen if template is complete)
for k in keys:
    if k not in seen and values[k]:
        out.append(f"{k}={values[k]}\n")
with open(path, "w") as f:
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

# ── 7. Seed Key Vault ─────────────────────────────────────────────────────────
hr "Step 7/9 — Seed Azure Key Vault"
KV_NAME=$(az keyvault list -g "${RESOURCE_GROUP}" --query "[0].name" -o tsv)
[[ -n "${KV_NAME}" ]] || die "No Key Vault found in ${RESOURCE_GROUP}"
ok "Key Vault: ${KV_NAME}"
KV_NAME="${KV_NAME}" ENV_FILE="${ENV_FILE}" bash scripts/azure/setup-keyvault.sh

# ── 8. Database migration + seed ──────────────────────────────────────────────
hr "Step 8/9 — Database migration"
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

# ── 9. OSRM upload ─────────────────────────────────────────────────────────────
hr "Step 9/9 — Upload OSRM road network"
if [[ -d infra/osrm-data ]] && compgen -G "infra/osrm-data/*" >/dev/null; then
  ENV_FILE="${ENV_FILE}" bash scripts/azure/osrm-upload.sh || \
    warn "osrm-upload.sh failed — run later: ENV_FILE=${ENV_FILE} bash scripts/azure/osrm-upload.sh"
else
  warn "infra/osrm-data is empty — skipping OSRM upload"
  warn "Generate routing data first (see scripts/setup-osrm.sh), then re-run osrm-upload.sh"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
hr "Bootstrap complete for environment: ${ENVIRONMENT}"
cat <<EOF

  Resource group:   ${RESOURCE_GROUP}
  Location:         ${LOCATION}
  Env file:         ${ENV_FILE} (chmod 600, gitignored)
  Key Vault:        ${KV_NAME}
  Postgres:         ${PG_FQDN:-<n/a>}
  Redis:            ${REDIS_HOST:-<n/a>}
  Storage:          ${STORAGE_NAME:-<n/a>}
  App Insights:     ${AI_NAME:-<n/a>}

  Next:
    kubectl get nodes
    kubectl apply -k infra/k8s/overlays/${ENVIRONMENT}

  Cost controls:
    bash scripts/azure/cost-stop.sh  ${ENVIRONMENT}     # pause without losing data
    bash scripts/azure/cost-start.sh ${ENVIRONMENT}     # resume
    bash scripts/azure/teardown-azure.sh ${ENVIRONMENT} # DELETE everything

EOF
