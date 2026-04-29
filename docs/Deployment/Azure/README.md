# SBTM — Azure Deployment

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-22
- Audience: DevOps engineers, architects, project managers

This section covers everything required to deploy and operate the SBTM platform on Azure, publish the Driver App to mobile stores, and understand the cost model.

## Documents in This Section

| Document                                                      | Purpose                                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [DeploymentChecklist.md](DeploymentChecklist.md)              | **Start here.** Prerequisites, GitHub secrets, environment setup, and pre-deploy checklist         |
| [Architecture.md](Architecture.md)                            | Azure AKS architecture with C4 diagrams, Azure Well-Architected analysis, and service mapping      |
| [CustomDomainSetup.md](CustomDomainSetup.md)                  | Map `sbtm.ca` to admin/parent portals + API gateway via Azure DNS + Static Web Apps + cert-manager |
| [InfrastructureAsCode.md](InfrastructureAsCode.md)            | Bicep templates (`infra/azure/`), Kustomize overlays (`infra/k8s/`), and tier-change instructions  |
| [CICD.md](CICD.md)                                            | GitHub Actions CI/CD pipeline: build → push to ACR → deploy to AKS                                 |
| [MobileStoreDeployment.md](../DriverMobileStoreDeployment.md) | EAS Build + Google Play + Apple App Store deployment guide                                         |
| [CostAnalysis.md](CostAnalysis.md)                            | Azure cost breakdown, Dev/Test pricing, namespace sharing, teardown automation                     |

> **Debugging a deployed environment?** See
> [`docs/dev/cloud_debugging_guide.md`](../../dev/cloud_debugging_guide.md) for the
> standard practice (seven-layer stack, App Insights KQL, `mirrord`, common
> failure playbooks).

## Environment Model

SBTM uses **two Azure environments**, each in a dedicated resource group:

| Environment    | Resource Group | Region          | Cluster               | Namespace         |
| -------------- | -------------- | --------------- | --------------------- | ----------------- |
| **Demo**       | `sbtm-demo-rg` | `canadacentral` | `sbtm-aks-demo`       | `sbtm-demo`       |
| **Production** | `sbtm-rg`      | `canadacentral` | `sbtm-aks-production` | `sbtm-production` |

> The persistent **DNS resource group** `sbtm-dns-rg` (zone `sbtm.ca` plus the
> two Static Web Apps `sbtm-admin-demo` / `sbtm-parent-demo`) lives outside both
> environments and is **never touched by `teardown-azure.sh`**, so registrar
> NS records and SWA custom-domain bindings stay stable across teardown /
> rebuild cycles. Combined cost: ~$0.50/mo (Azure DNS zone; SWAs are Free).

> "Pilot" is a business stage, not a separate environment. Pilots run on Production behind tenant feature flags, OR on the Demo cluster in a dedicated namespace — see [CostAnalysis.md](CostAnalysis.md#sharing-infrastructure-between-environments-k8s-namespaces).

## Quick Start — Deploy to Azure

### One-shot automated bootstrap (recommended)

`scripts/azure/bootstrap.sh` runs the entire flow end-to-end: installs missing
WSL/Ubuntu prereqs, prompts for required secrets, runs preflight, provisions
Azure, materializes `.env.<env>` from live Azure outputs, seeds Key Vault, runs
the DB migration (auto-falling back to an in-cluster pod if the private endpoint
blocks local `psql`), and uploads the OSRM data.

```bash
bash scripts/azure/bootstrap.sh demo                   # location auto-read from infra/azure/parameters.demo.json (canadacentral)
bash scripts/azure/bootstrap.sh production             # ditto for production
```

The one-shot bootstrap is **fully idempotent** — re-running picks up where the
previous run left off and refreshes anything that drifted (e.g. SWA validation
tokens, kustomize overlay UAMI clientID/Key Vault name, ingress LB IP).

### Manual step-by-step (equivalent)

```bash
# 0. Prerequisites checker
bash scripts/azure/preflight-check.sh demo

# 1. Provision all Azure resources for the demo environment (one-time)
export POSTGRES_ADMIN_PASSWORD='<strong-password>'
bash scripts/azure/provision-azure.sh demo canadacentral false
#                                    │     │            └── isDevTestSubscription
#                                    │     └──────────────── location
#                                    └────────────────────── environment (demo|production)

# 2. Build .env.<env> from .env.<env>.template (fill in values from Azure outputs)
cp .env.demo.template .env.demo  # then edit; see template comments for az queries

# 3. Seed secrets into Key Vault
# Key Vault name has a `-temp` suffix on demo (`sbtm-kv-demo-temp`) to avoid
# colliding with soft-deleted vaults from prior teardowns. Resolve dynamically:
KV_NAME=$(az keyvault list -g sbtm-demo-rg --query "[0].name" -o tsv) \
  ENV_FILE=.env.demo bash scripts/azure/setup-keyvault.sh

# If .env.demo still has template placeholders (<...>), provisioning/bootstrap
# will skip Key Vault seeding until real values are materialized.

# 4. Run database migration (private endpoint — see options below)
ENV_FILE=.env.demo bash scripts/azure/setup-db.sh migrate                # local psql (needs VPN/Bastion)
bash scripts/azure/db-migrate-via-aks.sh demo migrate                    # FREE — runs in AKS pod (cheapest)
bash scripts/azure/db-jumpbox.sh demo migrate                            # ~$0.02 — temporary B1s VM

# 5. Deploy all services to demo
bash scripts/azure/deploy-services.sh demo

# 6. Upload OSRM Ottawa routing data
ENV_FILE=.env.demo bash scripts/azure/osrm-upload.sh
```

### Connecting to private-endpoint Postgres

Postgres has a private endpoint, so DB scripts cannot reach it from your
workstation directly. Three options, cheapest first:

| Option                               | Cost                                                     | When to use                                       |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------------- |
| `db-migrate-via-aks.sh`              | **$0** (uses AKS)                                        | AKS cluster already provisioned (the normal case) |
| `db-jumpbox.sh`                      | ~$0.02/run (B1s VM, NSG-locked to your IP, auto-deletes) | AKS not yet up, or for ad-hoc backups             |
| Local `setup-db.sh` over VPN/Bastion | Bastion = ~$140/mo                                       | You already have private connectivity             |

## Pause / Tear-Down (Demo)

```bash
bash scripts/azure/cost-stop.sh demo      # pause AKS+DB, keep data (~$30/mo)
bash scripts/azure/cost-start.sh demo     # resume
bash scripts/azure/teardown-azure.sh demo # delete everything (zero cost)
```

### What `teardown-azure.sh` preserves (zero-cost essentials)

`teardown-azure.sh` deletes **only** the environment resource group
(`sbtm-demo-rg` or `sbtm-rg`) and purges its soft-deleted Key Vaults. It
**preserves** (all together <$1/mo):

- The DNS resource group `sbtm-dns-rg` (Azure DNS zones cost ~$0.50/mo and
  contain the registrar-delegated NS records for `sbtm.ca`).
- The DNS zone `sbtm.ca` itself, plus the `admin` / `parent` CNAMEs and
  `_dnsauth.admin` / `_dnsauth.parent` TXT records.
- All NS records — so on the next `bootstrap.sh demo` run, no registrar
  re-paste is required.
- **Both Static Web Apps** (`sbtm-admin-demo`, `sbtm-parent-demo`) which now
  also live in `sbtm-dns-rg` (Free tier = $0/mo). Their default
  `*.azurestaticapps.net` hostnames, custom-domain bindings (`admin.sbtm.ca`,
  `parent.sbtm.ca`) and TLS cert validations all stay valid forever — no
  more `Validating` flapping after each rebuild.

Before deleting the RG, the script also:

- Defensively sweeps any stale SWAs that may still be parked in the env RG
  from older bootstraps (none after the persistent-SWA refactor).
- Clears the `api` CNAME / A / `_dnsauth.api` TXT records (these point at the
  AKS ingress LB IP which changes every rebuild). `admin` / `parent` records
  are preserved.

### What `bootstrap.sh demo` does end-to-end

The full demo deployment is a single command:

```bash
bash scripts/azure/bootstrap.sh demo
```

This runs all 12 steps:

1. Install missing prerequisite tools (az CLI, kubectl, helm, kustomize, etc.).
2. Ensure Azure login + subscription is selected.
3. Prompt for / auto-generate `POSTGRES_ADMIN_PASSWORD`, `JWT_SECRET`, optional
   FCM/Twilio.
4. Run `preflight-check.sh`.
5. Run `provision-azure.sh` (Bicep deployment of RG, AKS, ACR, Postgres,
   Redis, Storage, KV, App Insights, plus the Postgres Private DNS zone VNet
   link to the AKS VNet). **Static Web Apps are NOT in Bicep** — they are
   created idempotently by step 10 directly into the persistent
   `sbtm-dns-rg` so they survive teardowns.
6. Materialize `.env.demo` from live Azure outputs.
7. Grant the caller `Key Vault Secrets Officer` (if missing) and seed Key Vault.
8. Run database migration (with automatic AKS-pod fallback for the private
   endpoint) and seed demo data.
9. Upload OSRM road network to Blob Storage.
10. Ensure both Static Web Apps exist in `sbtm-dns-rg` (Free tier, idempotent),
    upsert `admin`/`parent` CNAMEs in `sbtm.ca` and bind custom domains. If
    bindings are already `Ready` (the steady state across rebuilds) this is a
    no-op. Only refreshes `_dnsauth.*` TXT tokens when a fresh validation is
    actually required.
11. Build admin + parent web bundles and deploy via the SWA CLI.
12. Build & push all 8 service container images via ACR, auto-patch the
    kustomize overlay with live UAMI clientID + Key Vault name, apply the
    overlay, wait for the ingress LoadBalancer IP and upsert `api.sbtm.ca`,
    rollout-restart all deployments, and run `verify-portals.sh`.

Demo super-admin credentials seeded by step 8: `super.admin@sbtm.demo /
Admin123!`.

## Related Documents

- [DeploymentArchitecture.md](../../Design/DeploymentArchitecture.md) — Environment matrix and topology overview
- [DeploymentGuide.md](../../Operations/DeploymentGuide.md) — Step-by-step local and cloud deployment procedures
- [ProductionIntegrationChecklist.md](../../prd/v4/ProductionIntegrationChecklist.md) — Full production readiness checklist
- [ProductionRolloutGuide.md](../../prd/v4/ProductionRolloutGuide.md) — First-time production deployment sequence
