# SBTM Deployment Prerequisites & Checklist

- Document owner: Engineering and DevOps
- Last reviewed: 2026-04-22
- Audience: Anyone running a fresh Demo or Production deployment

This document is the **single starting point** before deploying SBTM to Azure. Run through every section in order. The matching automation lives at `scripts/azure/preflight-check.sh`.

---

## 0. Environment Model (read this first)

SBTM has **two Azure environments**, each isolated in its own resource group:

| Environment    | Resource Group | AKS Cluster           | ACR                            | Key Vault            | K8s Namespace     | Region          |
| -------------- | -------------- | --------------------- | ------------------------------ | -------------------- | ----------------- | --------------- |
| **Demo**       | `sbtm-demo-rg` | `sbtm-aks-demo`       | `sbtmacrdemo.azurecr.io`       | `sbtm-kv-demo`       | `sbtm-demo`       | `eastus`        |
| **Production** | `sbtm-rg`      | `sbtm-aks-production` | `sbtmacrproduction.azurecr.io` | `sbtm-kv-production` | `sbtm-production` | `canadacentral` |

> "Pilot" is a **business stage** (early-customer rollout), not a separate environment. Pilots run on the Production environment behind feature flags and a per-tenant rollout list. The cost docs no longer list a dedicated Pilot tier.

---

## 1. One-Time Account Setup

### Azure

- [ ] Active Azure subscription (note the **Subscription ID**)
- [ ] You have **Owner** or **Contributor + User Access Administrator** role on the subscription (needed for role assignments inside Bicep)
- [ ] (Optional, recommended for Demo) Convert subscription to **Azure Dev/Test pricing** for ~40% VM discount — see [CostAnalysis.md](CostAnalysis.md#azure-devtest-pricing)
- [ ] Quotas: at least **8 vCPUs of Dsv3 family** in the target region (16 for production)

### GitHub

- [ ] Repository admin access (to create environments and secrets)
- [ ] An OIDC federated identity created (see [AzureCICD.md](AzureCICD.md#setting-up-azure-oidc))

### Mobile (only if shipping the driver app)

- [ ] Expo organization account
- [ ] Google Play Console account ($25 one-time)
- [ ] Apple Developer Program account ($99/year)
- [ ] Firebase project for FCM

### External SaaS

- [ ] Twilio account (SMS for emergency alerts) — get Account SID + Auth Token
- [ ] Domain name registered + DNS provider with API access (for cert-manager DNS-01 challenge)

---

## 2. Local Workstation Tools

| Tool        | Min version       | Install                                                                   |
| ----------- | ----------------- | ------------------------------------------------------------------------- |
| `az` CLI    | 2.60+             | https://aka.ms/azcli                                                      |
| `kubectl`   | 1.28+             | https://kubernetes.io/docs/tasks/tools/                                   |
| `kustomize` | 5.0+              | https://kubectl.docs.kubernetes.io/installation/kustomize/                |
| `helm`      | 3.13+             | https://helm.sh/docs/intro/install/                                       |
| `psql`      | 15+               | `apt install postgresql-client` / `brew install postgresql`               |
| `jq`        | any               | `apt install jq` / `brew install jq`                                      |
| `bicep`     | 0.24+             | bundled with `az` CLI; verify `az bicep version`                          |
| `swa` CLI   | 1.x               | `npm i -g @azure/static-web-apps-cli` (used by step 11 of `bootstrap.sh`) |
| Node + pnpm | Node 20+, pnpm 9+ | required to build the admin and parent web bundles                        |

Run `bash scripts/azure/preflight-check.sh demo` to verify all of the above.

---

## 3. GitHub Repository Secrets — Where to Set

Go to **Settings → Secrets and variables → Actions → New repository secret**.

### Per-environment secrets (set under Settings → Environments → `demo` and `production`)

| Secret                    | Demo value                   | Production value                                                             | How to get                                                        |
| ------------------------- | ---------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `AZURE_CLIENT_ID`         | demo SP client ID            | prod SP client ID                                                            | `az ad sp create-for-rbac` output                                 |
| `AZURE_TENANT_ID`         | tenant ID                    | tenant ID                                                                    | `az account show --query tenantId -o tsv`                         |
| `AZURE_SUBSCRIPTION_ID`   | subscription ID              | subscription ID                                                              | `az account show --query id -o tsv`                               |
| `AKS_DEMO_RESOURCE_GROUP` | `sbtm-demo-rg`               | n/a                                                                          | constant                                                          |
| `AKS_DEMO_CLUSTER_NAME`   | `sbtm-aks-demo`              | n/a                                                                          | constant                                                          |
| `AKS_PROD_RESOURCE_GROUP` | n/a                          | `sbtm-rg`                                                                    | constant                                                          |
| `AKS_PROD_CLUSTER_NAME`   | n/a                          | `sbtm-aks-production`                                                        | constant                                                          |
| `ACR_DEMO_LOGIN_SERVER`   | `sbtmacrdemo.azurecr.io`     | n/a                                                                          | `az acr show --name sbtmacrdemo --query loginServer -o tsv`       |
| `ACR_PROD_LOGIN_SERVER`   | n/a                          | `sbtmacrproduction.azurecr.io`                                               | `az acr show --name sbtmacrproduction --query loginServer -o tsv` |
| `DATABASE_URL_PROD`       | n/a                          | `postgresql://sbtmadmin:...@sbtm-pg-production...:5432/sbms?sslmode=require` | from Bicep outputs + KV password                                  |
| `EXPO_TOKEN`              | shared                       | shared                                                                       | https://expo.dev → Account Settings → Access Tokens               |
| `GOOGLE_PLAY_KEY`         | shared (base64-encoded JSON) | shared                                                                       | Google Play Console → Setup → API access                          |

> **Application secrets (JWT, DB password, FCM key, Twilio key) are NOT GitHub secrets.** They live in Azure Key Vault and are seeded via `scripts/azure/setup-keyvault.sh` (see step 6 below).

### Creating GitHub Environments (for approval gates)

1. **Settings → Environments → New environment → `demo`** — no required reviewers; URL = `https://api.demo.sbtm.example.com/health`
2. **Settings → Environments → New environment → `production`** — **add Required reviewers (≥1)**; URL = `https://api.sbtm.example.com/health`; deployment branches = `main` only

---

## 4. Pre-Provision Checklist (before running `provision-azure.sh`)

- [ ] `az login && az account set --subscription "<id>"` — correct subscription selected
- [ ] `az account show --query name` matches the target subscription name
- [ ] Strong PostgreSQL admin password generated and exported: `export POSTGRES_ADMIN_PASSWORD='...'` (16+ chars, mixed case, digits, symbols)
- [ ] DNS for `api.demo.sbtm.example.com` (demo) or `api.sbtm.example.com` (production) is ready to be CNAMEd to the ingress IP after provisioning
- [ ] You own a public domain (e.g. `sbtm.ca`) and have access to its registrar to update the four NS records (one-time delegation to Azure DNS — see [CustomDomainSetup.md](CustomDomainSetup.md))
- [ ] **Map tile provider key**: export `MAPTILER_KEY=<key>` (free tier at <https://cloud.maptiler.com/account/keys/>) before running bootstrap. Without this, the SPA portals build successfully but live/planner maps will be blocked by the OpenStreetMap volunteer-tile-server usage policy. The key is baked in at build time as `VITE_MAPTILER_KEY` and is treated as a public client-side key (restrict it by HTTP referrer in MapTiler's dashboard).
- [ ] After bootstrap completes, run `bash scripts/azure/verify-portals.sh demo` — expect all checks PASS
- [ ] `bash scripts/azure/preflight-check.sh demo` (or `production`) passes with no `✗` rows

---

## 5. Provision Infrastructure

### Option A — Single-command bootstrap (steps 5, 6, 7 in one go)

```bash
bash scripts/azure/bootstrap.sh demo eastus              # demo  → sbtm-demo-rg, B1ms/D2s_v3 SKUs
bash scripts/azure/bootstrap.sh production canadacentral # prod  → sbtm-rg
```

The script will:

1. Install missing WSL/Ubuntu prereqs (`az`, `kubectl`, `helm`, `kustomize`, `azcopy`, `jq`, `psql`, `bicep`).
2. Run `az login` if needed and prompt to confirm subscription.
3. Prompt for `POSTGRES_ADMIN_PASSWORD` and `JWT_SECRET` (offers to auto-generate); FCM/Twilio prompts are optional (Enter to skip).
4. Run `preflight-check.sh`.
5. Run `provision-azure.sh`.
6. Build `.env.<env>` (chmod 600, gitignored) by querying Azure for FQDN/keys/connection strings.
7. Run `setup-keyvault.sh` to seed Key Vault.
8. Run `setup-db.sh migrate` — automatically falls back to `db-migrate-via-aks.sh` if local `psql` cannot reach the private Postgres endpoint.
9. Run `osrm-upload.sh` (skipped if `infra/osrm-data/` is empty).

Notes:

- PostgreSQL Flexible Server defaults to `postgresLocation=eastus2` unless overridden (for better reliability when eastus offers are restricted).
- If `.env.<env>` still contains template placeholders (`<...>`), Key Vault seeding is skipped until the file is materialized with real values.

Re-runnable: every step detects existing resources and skips no-op work.

### Option B — Manual provisioning

```bash
# Demo (cheap, ephemeral, eastus, dev/test SKUs)
export POSTGRES_ADMIN_PASSWORD='...'
bash scripts/azure/preflight-check.sh demo
bash scripts/azure/provision-azure.sh demo eastus true
#                                    │     │      └── isDevTestSubscription
#                                    │     └────────── location
#                                    └──────────────── environment

# Optional: override default PostgreSQL region (default is eastus2)
# POSTGRES_LOCATION=centralus bash scripts/azure/provision-azure.sh demo eastus true

# Production
export POSTGRES_ADMIN_PASSWORD='...'
bash scripts/azure/preflight-check.sh production
bash scripts/azure/provision-azure.sh production canadacentral false
```

Or via GitHub Actions: **Actions → Infrastructure Provisioning → Run workflow → choose environment**.

> Bicep parameter files are `infra/azure/parameters.demo.json` and `infra/azure/parameters.production.json` (the filename matches the `ENVIRONMENT` argument exactly).

---

## 6. Seed Key Vault Secrets

Each environment uses its own gitignored env file:

- Demo: `.env.demo` (template: [.env.demo.template](../../.env.demo.template))
- Production: `.env.production` (template: `.env.production.template`)

Copy the template and fill in real values, then:

```bash
KV_NAME=sbtm-kv-demo       ENV_FILE=.env.demo       bash scripts/azure/setup-keyvault.sh
KV_NAME=sbtm-kv-production ENV_FILE=.env.production bash scripts/azure/setup-keyvault.sh
```

> The bootstrap script populates `.env.<env>` automatically from Azure outputs; you only need to do this manually if you ran `provision-azure.sh` directly.

Required keys in `.env.<env>`:

- `JWT_SECRET` — generate with `openssl rand -base64 48`
- `DB_PASSWORD` — **same value as `POSTGRES_ADMIN_PASSWORD`** used during provisioning
- `DATABASE_URL` — `postgresql://sbtmadmin:<password>@<pg-fqdn>:5432/sbms?sslmode=require`
- `REDIS_URL` — `rediss://:<key>@<redis-host>:6380`
- `FCM_SERVER_KEY` — from Firebase Console (optional)
- `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID` — from Twilio (optional)
- `AZURE_STORAGE_CONNECTION_STRING` — `az storage account show-connection-string -g <rg> -n <storage>`
- `APPLICATIONINSIGHTS_CONNECTION_STRING` — `az monitor app-insights component show -g <rg> -a <ai>`

> **Yes — both Demo and Production read secrets from Azure Key Vault** at runtime via the Key Vault CSI driver + Workload Identity. No secrets are ever baked into images or stored as Kubernetes Secrets.

---

## 7. Database Migration

Postgres uses a **private endpoint**, so workstation `psql` cannot reach it directly. Pick the cheapest option that works for your situation:

| Option                            | Cost              | Command                                                     | Notes                                                                                                                                                                                                 |
| --------------------------------- | ----------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **In-AKS pod** (recommended)      | **$0**            | `bash scripts/azure/db-migrate-via-aks.sh demo migrate`     | Runs `postgres:16-alpine` as a one-shot Job inside the cluster (already in the VNET). Auto-cleans up. Sub-commands: `migrate`, `seed-demo`, `backup`, `psql`.                                         |
| **Temporary jumpbox VM**          | ~$0.02/run        | `bash scripts/azure/db-jumpbox.sh demo migrate`             | Spins up a `Standard_B1s` VM in `services-subnet` with NSG locked to **your current public IP**, runs the command, and **always deletes the VM on exit** (even on Ctrl+C). Use when AKS isn't up yet. |
| **Local `psql` over VPN/Bastion** | Bastion ≈ $140/mo | `ENV_FILE=.env.demo bash scripts/azure/setup-db.sh migrate` | Only if you already have private connectivity.                                                                                                                                                        |

Demo seeding (after `migrate`):

```bash
bash scripts/azure/db-migrate-via-aks.sh demo seed-demo
# OR (cost <$0.02)
bash scripts/azure/db-jumpbox.sh demo seed-demo
```

Ad-hoc backup with download to `./backups/`:

```bash
bash scripts/azure/db-jumpbox.sh demo backup
```

Interactive psql session (no cost — uses AKS):

```bash
bash scripts/azure/db-migrate-via-aks.sh demo psql
```

---

## 8. First Deployment

```bash
# Demo
bash scripts/azure/deploy-services.sh demo

# Production (requires explicit confirmation)
bash scripts/azure/deploy-services.sh production
```

After deploy:

- [x] `kubectl get pods -n sbtm-demo` (or `sbtm-production`) — all `Running`
- [ ] `kubectl get ingress -n sbtm-demo` — note the EXTERNAL-IP _(skipped for demo: no DNS; ingress + ClusterIssuer dropped via overlay)_
- [ ] DNS A/CNAME → ingress IP _(skipped for demo)_
- [x] `curl https://api.demo.sbtm.example.com/health` returns 200 _(verified via `kubectl port-forward`: all 8 services return HTTP 200 on `/health` or `/api/v1/health`)_

> **Demo verification (April 2026):** All 9 deployments Ready (api-gateway 2/2, gps-tracking 2/2, emergency-alerts 2/2, all others 1/1; 12 pods Running). KV-synced `sbtm-secrets` has 8 keys. See [memory: azure-deployment-demo.md] for gotchas (WI label vs annotation, Azure PG SSL, NestJS `DB_*` env contract, OSRM TCP probe + blob filename, NGINX snippet rejection).

---

## 9. After-Demo Cost Cleanup (Demo only)

```bash
# Pause: stops AKS + PostgreSQL, preserves data (~$30/mo residual)
bash scripts/azure/cost-stop.sh demo

# Resume:
bash scripts/azure/cost-start.sh demo

# Full delete of application RG (zero monthly cost; DNS RG sbtm-dns-rg is preserved):
bash scripts/azure/teardown-azure.sh demo
```

### Recreate after teardown

```bash
POSTGRES_ADMIN_PASSWORD='<value>' MAPTILER_KEY='<value>' \
  bash scripts/azure/bootstrap.sh demo eastus
```

The `sbtm-dns-rg` resource group (containing the public `sbtm.ca` zone) is **never deleted by `teardown-azure.sh`**. The four NS records you pasted at the registrar stay valid forever — no re-paste needed on rebuild. `bootstrap.sh` detects the existing zone and reuses it.

To completely remove the DNS zone too (forces NS re-paste at registrar on the next bootstrap):

```bash
az group delete --name sbtm-dns-rg --yes
```

> **Resource-location note:** `sbtm-pg-demo-centralus` lives in `sbtm-demo-rg` but runs in **Central US** because eastus has no Postgres Flex quota — handled automatically by bootstrap. It is **not stray** and is removed by teardown along with the rest of the RG. The teardown script ends with a subscription-wide sweep that prints any lingering `sbtm-*` resources outside `sbtm-dns-rg` so leaks are visible immediately.

---

## 10. Production-Only Additional Checks

- [ ] Production approver list configured in GitHub Environment
- [ ] Backup strategy verified — `bash scripts/azure/setup-db.sh backup` succeeds
- [ ] Azure Monitor alerts enabled (CrashLoopBackOff, error rate, DB connection saturation)
- [ ] WAF / Front Door enabled (planned post-pilot — not in current Bicep)
- [ ] Privacy policy URL live and linked in app stores
- [ ] On-call rotation defined and runbook reviewed

---

## Related Documents

- [AzureCICD.md](AzureCICD.md) — workflow definitions and OIDC setup
- [InfrastructureAsCode.md](InfrastructureAsCode.md) — how to change tier configuration
- [CostAnalysis.md](CostAnalysis.md) — cost breakdown, Dev/Test pricing, namespace sharing
- [MobileStoreDeployment.md](MobileStoreDeployment.md) — mobile build & submit
