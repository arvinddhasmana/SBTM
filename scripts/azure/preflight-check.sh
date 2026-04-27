#!/usr/bin/env bash
# scripts/azure/preflight-check.sh
# Verifies prerequisites before running provision-azure.sh.
# Run this BEFORE every fresh deployment of demo or production.
#
# Usage: bash scripts/azure/preflight-check.sh [demo|production]

set -euo pipefail

ENVIRONMENT="${1:-demo}"
FAIL=0

ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠  $*"; }
fail() { echo "  ✗ $*"; FAIL=1; }

# ── CLI tools ──────────────────────────────────────────────────────────────────
echo "==> CLI tools"
command -v az >/dev/null       && ok  "az CLI installed ($(az version --query '"azure-cli"' -o tsv))"  || fail "az CLI missing — install: https://aka.ms/azcli"
command -v kubectl >/dev/null  && ok  "kubectl installed"   || fail "kubectl missing — https://kubernetes.io/docs/tasks/tools/"
command -v helm >/dev/null     && ok  "helm installed"      || fail "helm missing — https://helm.sh/docs/intro/install/"
command -v jq >/dev/null       && ok  "jq installed"        || fail "jq missing"
if command -v kustomize >/dev/null; then
  ok "kustomize installed ($(kustomize version --short 2>/dev/null || kustomize version))"
  KUSTOMIZE_CMD="kustomize"
elif kubectl kustomize --help >/dev/null 2>&1; then
  warn "standalone kustomize missing — using kubectl kustomize (built-in)"
  KUSTOMIZE_CMD="kubectl kustomize"
else
  fail "kustomize not available"
  KUSTOMIZE_CMD=""
fi
command -v psql >/dev/null && ok "psql installed" || warn "psql missing — needed for setup-db.sh from your workstation"

# ── Azure session ──────────────────────────────────────────────────────────────
echo ""
echo "==> Azure session"
SUB_ID=""
if az account show --output none 2>/dev/null; then
  SUB=$(az account show --query name -o tsv)
  SUB_ID=$(az account show --query id -o tsv)
  ok "Logged into subscription: ${SUB} (${SUB_ID})"
else
  fail "Not logged into Azure — run: az login"
fi

# ── Environment variables ──────────────────────────────────────────────────────
echo ""
echo "==> Required environment variables"
[[ -n "${POSTGRES_ADMIN_PASSWORD:-}" ]] && ok "POSTGRES_ADMIN_PASSWORD is set" || fail "POSTGRES_ADMIN_PASSWORD not set (export a strong password)"

# ── Resource group ─────────────────────────────────────────────────────────────
if [[ "${ENVIRONMENT}" == "production" ]]; then
  RG="sbtm-rg"
else
  RG="sbtm-demo-rg"
fi

echo ""
echo "==> Target resource group: ${RG}"
if az group show --name "${RG}" --output none 2>/dev/null; then
  warn "Resource group ${RG} already exists — provisioning will UPDATE it"
else
  ok "Resource group ${RG} does not exist — will be created"
fi

# ── Required files ─────────────────────────────────────────────────────────────
echo ""
echo "==> Required files"
[[ -f "infra/azure/main.bicep" ]] \
  && ok "main.bicep present" \
  || fail "infra/azure/main.bicep missing"

PARAM_FILE="infra/azure/parameters.${ENVIRONMENT}.json"
[[ -f "${PARAM_FILE}" ]] \
  && ok "${PARAM_FILE} present" \
  || fail "Missing parameter file: ${PARAM_FILE}"

[[ -f ".env.${ENVIRONMENT}" ]] \
  && ok ".env.${ENVIRONMENT} present (source for Key Vault secrets)" \
  || warn ".env.${ENVIRONMENT} missing — setup-keyvault.sh will fail until present"

# ── Bicep lint ─────────────────────────────────────────────────────────────────
echo ""
echo "==> Bicep validation"
if command -v az >/dev/null && az bicep version >/dev/null 2>&1; then
  if az bicep build --file infra/azure/main.bicep --stdout >/dev/null 2>&1; then
    ok "main.bicep compiles without errors"
  else
    fail "main.bicep has compilation errors — run: az bicep build --file infra/azure/main.bicep"
  fi
else
  warn "az bicep not available — skipping Bicep lint"
fi

# ── Kustomize dry-run ──────────────────────────────────────────────────────────
echo ""
echo "==> Kustomize overlay validation"
OVERLAY="infra/k8s/overlays/${ENVIRONMENT}"
if [[ -n "${KUSTOMIZE_CMD:-}" ]] && [[ -d "${OVERLAY}" ]]; then
  if ${KUSTOMIZE_CMD} build "${OVERLAY}" >/dev/null 2>&1; then
    RESOURCE_COUNT=$(${KUSTOMIZE_CMD} build "${OVERLAY}" 2>/dev/null | grep -c "^kind:" || true)
    ok "${OVERLAY} builds successfully (${RESOURCE_COUNT} resources)"
  else
    BUILD_ERR=$(${KUSTOMIZE_CMD} build "${OVERLAY}" 2>&1 | tail -3)
    fail "${OVERLAY} failed to build: ${BUILD_ERR}"
  fi
else
  warn "Skipping kustomize build (kustomize or overlay not available)"
fi

# ── vCPU quota ─────────────────────────────────────────────────────────────────
echo ""
echo "==> vCPU quota (advisory)"
if [[ -n "${SUB_ID}" ]]; then
  LOCATION="${LOCATION:-eastus}"
  # Pick the VM family that matches the env's aksNodeSize (demo=B2as_v2 → Bsv2 family,
  # production=D4s_v3 → DSv3 family). Falls back to DSv3 if param file is unreadable.
  AKS_NODE_SIZE=$(jq -r '.parameters.aksNodeSize.value // ""' "infra/azure/parameters.${ENVIRONMENT}.json" 2>/dev/null || true)
  case "${AKS_NODE_SIZE}" in
    Standard_B*as_v2|Standard_B*s_v2)  VM_FAMILY="standardBsv2Family" ;;
    Standard_B*ms|Standard_B*s)         VM_FAMILY="standardBSFamily" ;;
    Standard_B*)                        VM_FAMILY="standardBSFamily" ;;
    Standard_D*s_v3|Standard_D*as_v3)   VM_FAMILY="standardDSv3Family" ;;
    Standard_D*s_v4|Standard_D*as_v4)   VM_FAMILY="standardDSv4Family" ;;
    Standard_D*s_v5|Standard_D*as_v5)   VM_FAMILY="standardDSv5Family" ;;
    *)                                   VM_FAMILY="standardDSv3Family" ;;
  esac
  FAMILY_QUOTA=$(az vm list-usage --location "${LOCATION}" \
    --query "[?name.value=='${VM_FAMILY}'].{current:currentValue,limit:limit}" \
    -o json 2>/dev/null || echo '[]')
  if [[ "${FAMILY_QUOTA}" != "[]" ]] && [[ "${FAMILY_QUOTA}" != "null" ]]; then
    CURRENT=$(echo "${FAMILY_QUOTA}" | jq -r '.[0].current // 0')
    LIMIT=$(echo "${FAMILY_QUOTA}"   | jq -r '.[0].limit  // 0')
    NEEDED=$([[ "${ENVIRONMENT}" == "production" ]] && echo "16" || echo "4")
    AVAILABLE=$(( LIMIT - CURRENT ))
    if [[ "${AVAILABLE}" -ge "${NEEDED}" ]]; then
      ok "${VM_FAMILY} in ${LOCATION}: ${CURRENT} used / ${LIMIT} limit (${AVAILABLE} available, need ${NEEDED})"
    else
      warn "${VM_FAMILY} in ${LOCATION}: only ${AVAILABLE} vCPUs available, need ${NEEDED} — request quota increase"
    fi
  else
    warn "Could not retrieve vCPU quota for ${VM_FAMILY} in ${LOCATION}"
  fi
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  echo "==> Preflight PASSED — safe to run: bash scripts/azure/provision-azure.sh ${ENVIRONMENT}"
  exit 0
else
  echo "==> Preflight FAILED — fix the ✗ items above before provisioning."
  exit 1
fi
