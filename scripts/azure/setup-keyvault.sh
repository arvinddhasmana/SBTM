#!/usr/bin/env bash
# scripts/azure/setup-keyvault.sh
# Seeds Azure Key Vault with all secrets required by SBTM services.
# Run after provision-azure.sh has created the Key Vault.
#
# Usage: KV_NAME=sbtm-kv-demo bash scripts/azure/setup-keyvault.sh
#
# Reads plaintext values from .env.production (gitignored).
# Secrets are never committed to source control.

set -euo pipefail

KV_NAME="${KV_NAME:-}"
if [[ -z "${KV_NAME}" ]]; then
  echo "ERROR: KV_NAME environment variable not set."
  echo "Usage: KV_NAME=sbtm-kv-demo bash scripts/azure/setup-keyvault.sh"
  exit 1
fi

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found. Copy .env.production.template and fill in values."
  exit 1
fi

# Load env file (strips comments and empty lines)
set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "${ENV_FILE}" | grep -v '^\s*$')
set +a

set_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    echo "  SKIP  ${name} (empty value)"
    return
  fi
  echo "  SET   ${name}"
  az keyvault secret set \
    --vault-name "${KV_NAME}" \
    --name "${name}" \
    --value "${value}" \
    --output none
}

echo "==> Seeding Key Vault: ${KV_NAME}"

# Core secrets
set_secret "sbtm-jwt-secret"                  "${JWT_SECRET:-}"
set_secret "sbtm-db-password"                 "${DB_PASSWORD:-}"
set_secret "sbtm-database-url"                "${DATABASE_URL:-}"
set_secret "sbtm-redis-connection-string"     "${REDIS_URL:-}"

# Notification secrets
set_secret "sbtm-fcm-server-key"              "${FCM_SERVER_KEY:-}"
set_secret "sbtm-twilio-auth-token"           "${TWILIO_AUTH_TOKEN:-}"
set_secret "sbtm-twilio-account-sid"          "${TWILIO_ACCOUNT_SID:-}"

# Storage
set_secret "sbtm-blob-connection-string"      "${AZURE_STORAGE_CONNECTION_STRING:-}"

# Observability (optional)
set_secret "sbtm-appinsights-connection-string" "${APPLICATIONINSIGHTS_CONNECTION_STRING:-}"

echo ""
echo "==> Key Vault seeding complete: ${KV_NAME}"
echo "    Verify with: az keyvault secret list --vault-name ${KV_NAME} --query '[].name' -o tsv"
