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

read_env_value() {
  local key="$1"
  local raw=""
  raw=$(grep -E "^${key}=" "${ENV_FILE}" | head -1 | cut -d'=' -f2- || true)
  raw="${raw%$'\r'}"

  # Strip matching single/double quotes.
  if [[ "${raw}" =~ ^\".*\"$ ]]; then
    raw="${raw:1:${#raw}-2}"
  elif [[ "${raw}" =~ ^\'.*\'$ ]]; then
    raw="${raw:1:${#raw}-2}"
  fi
  printf '%s' "${raw}"
}

JWT_SECRET="$(read_env_value JWT_SECRET)"
DB_PASSWORD="$(read_env_value DB_PASSWORD)"
DATABASE_URL="$(read_env_value DATABASE_URL)"
REDIS_URL="$(read_env_value REDIS_URL)"
FCM_SERVER_KEY="$(read_env_value FCM_SERVER_KEY)"
TWILIO_AUTH_TOKEN="$(read_env_value TWILIO_AUTH_TOKEN)"
TWILIO_ACCOUNT_SID="$(read_env_value TWILIO_ACCOUNT_SID)"
AZURE_STORAGE_CONNECTION_STRING="$(read_env_value AZURE_STORAGE_CONNECTION_STRING)"
APPLICATIONINSIGHTS_CONNECTION_STRING="$(read_env_value APPLICATIONINSIGHTS_CONNECTION_STRING)"

# Derive DB_HOST/DB_PORT/DB_USER/DB_NAME from DATABASE_URL so services that
# read individual values (TypeORM config in app.module.ts) can connect.
# Format: postgresql://<user>:<pwd>@<host>:<port>/<db>?<query>
DB_HOST=""
DB_PORT="5432"
DB_USER=""
DB_NAME=""
if [[ -n "${DATABASE_URL}" ]]; then
  DB_USER=$(printf '%s' "${DATABASE_URL}" | sed -nE 's#^postgres(ql)?://([^:]+):.*#\2#p')
  DB_HOST=$(printf '%s' "${DATABASE_URL}" | sed -nE 's#^postgres(ql)?://[^@]+@([^:/]+).*#\2#p')
  DB_PORT_RAW=$(printf '%s' "${DATABASE_URL}" | sed -nE 's#^postgres(ql)?://[^@]+@[^:/]+:([0-9]+)/.*#\2#p')
  [[ -n "${DB_PORT_RAW}" ]] && DB_PORT="${DB_PORT_RAW}"
  DB_NAME=$(printf '%s' "${DATABASE_URL}" | sed -nE 's#^postgres(ql)?://[^@]+@[^/]+/([^?]+).*#\2#p')
fi

# ── Strength check for critical secrets ───────────────────────────────────────
if [[ -n "${JWT_SECRET:-}" ]] && [[ "${#JWT_SECRET}" -lt 32 ]]; then
  echo "ERROR: JWT_SECRET is too short (${#JWT_SECRET} chars). Use at least 32 random characters."
  echo "       Generate: openssl rand -base64 48"
  exit 1
fi
if [[ -n "${DB_PASSWORD:-}" ]] && [[ "${#DB_PASSWORD}" -lt 12 ]]; then
  echo "ERROR: DB_PASSWORD is too short (${#DB_PASSWORD} chars). Use at least 12 characters."
  exit 1
fi

set_secret() {
  local name="$1"
  local value="$2"
  local optional="${3:-no}"
  if [[ -z "${value}" ]]; then
    if [[ "${optional}" == "yes" ]]; then
      # Seed a placeholder so the CSI Secrets Store mount succeeds even when
      # the integration is disabled. Services should treat 'disabled-demo' as
      # "feature off".
      value="disabled-demo"
      echo "  SET   ${name} (placeholder: feature disabled)"
    else
      echo "  SKIP  ${name} (empty value)"
      return
    fi
  else
    echo "  SET   ${name}"
  fi
  az keyvault secret set \
    --vault-name "${KV_NAME}" \
    --name "${name}" \
    --value "${value}" \
    --output none
}

echo "==> Seeding Key Vault: ${KV_NAME}"

# Verify the Key Vault is accessible before attempting to write
if ! az keyvault show --name "${KV_NAME}" --output none 2>/dev/null; then
  echo "ERROR: Key Vault '${KV_NAME}' not found or not accessible."
  echo "       Run provision-azure.sh first, then re-run this script."
  exit 1
fi

# Core secrets
set_secret "sbtm-jwt-secret"                  "${JWT_SECRET:-}"
set_secret "sbtm-db-password"                 "${DB_PASSWORD:-}"
set_secret "sbtm-database-url"                "${DATABASE_URL:-}"
set_secret "sbtm-redis-connection-string"     "${REDIS_URL:-}"

# Individual DB connection components (services that read DB_HOST/DB_PORT/DB_USER/DB_NAME)
set_secret "sbtm-db-host"                     "${DB_HOST:-}"
set_secret "sbtm-db-port"                     "${DB_PORT:-5432}"
set_secret "sbtm-db-user"                     "${DB_USER:-sbtmadmin}"
set_secret "sbtm-db-name"                     "${DB_NAME:-sbms}"

# Notification secrets (optional integrations — placeholder seeded if empty so
# the CSI Secrets Store mount succeeds without FCM/Twilio credentials)
set_secret "sbtm-fcm-server-key"              "${FCM_SERVER_KEY:-}"          yes
set_secret "sbtm-twilio-auth-token"           "${TWILIO_AUTH_TOKEN:-}"       yes
set_secret "sbtm-twilio-account-sid"          "${TWILIO_ACCOUNT_SID:-}"      yes

# Storage
set_secret "sbtm-blob-connection-string"      "${AZURE_STORAGE_CONNECTION_STRING:-}"

# Observability (optional)
set_secret "sbtm-appinsights-connection-string" "${APPLICATIONINSIGHTS_CONNECTION_STRING:-}"

echo "==> Key Vault seeding complete: ${KV_NAME}"
echo ""
echo "    Verifying secrets were written:"
WRITTEN=$(az keyvault secret list --vault-name "${KV_NAME}" --query "length(@)" -o tsv 2>/dev/null || echo "0")
echo "    ✓ ${WRITTEN} secret(s) present in ${KV_NAME}"
az keyvault secret list --vault-name "${KV_NAME}" --query "[].name" -o tsv 2>/dev/null | sed 's/^/    ✓ /' || true
