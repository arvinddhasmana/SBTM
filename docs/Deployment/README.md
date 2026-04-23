# SBTM Deployment Documentation

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-22
- Audience: DevOps engineers, architects, project managers

This section covers everything required to deploy and operate the SBTM platform on Azure, publish the Driver App to mobile stores, and understand the cost model.

## Documents in This Section

| Document                                             | Purpose                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [DeploymentChecklist.md](DeploymentChecklist.md)     | **Start here.** Prerequisites, GitHub secrets, environment setup, and pre-deploy checklist        |
| [AzureArchitecture.md](AzureArchitecture.md)         | Azure AKS architecture with C4 diagrams, Azure Well-Architected analysis, and service mapping     |
| [InfrastructureAsCode.md](InfrastructureAsCode.md)   | Bicep templates (`infra/azure/`), Kustomize overlays (`infra/k8s/`), and tier-change instructions |
| [AzureCICD.md](AzureCICD.md)                         | GitHub Actions CI/CD pipeline: build → push to ACR → deploy to AKS                                |
| [MobileStoreDeployment.md](MobileStoreDeployment.md) | EAS Build + Google Play + Apple App Store deployment guide                                        |
| [CostAnalysis.md](CostAnalysis.md)                   | Azure cost breakdown, Dev/Test pricing, namespace sharing, teardown automation                    |

## Environment Model

SBTM uses **two Azure environments**, each in a dedicated resource group:

| Environment    | Resource Group | Region          | Cluster               | Namespace         |
| -------------- | -------------- | --------------- | --------------------- | ----------------- |
| **Demo**       | `sbtm-demo-rg` | `eastus`        | `sbtm-aks-demo`       | `sbtm-demo`       |
| **Production** | `sbtm-rg`      | `canadacentral` | `sbtm-aks-production` | `sbtm-production` |

> "Pilot" is a business stage, not a separate environment. Pilots run on Production behind tenant feature flags, OR on the Demo cluster in a dedicated namespace — see [CostAnalysis.md](CostAnalysis.md#sharing-infrastructure-between-environments-k8s-namespaces).

## Quick Start — Deploy to Azure

### One-shot automated bootstrap (recommended)

`scripts/azure/bootstrap.sh` runs the entire flow end-to-end: installs missing
WSL/Ubuntu prereqs, prompts for required secrets, runs preflight, provisions
Azure, materializes `.env.<env>` from live Azure outputs, seeds Key Vault, runs
the DB migration (auto-falling back to an in-cluster pod if the private endpoint
blocks local `psql`), and uploads the OSRM data.

```bash
bash scripts/azure/bootstrap.sh demo eastus            # demo, dev/test SKUs
bash scripts/azure/bootstrap.sh production canadacentral
```

### Manual step-by-step (equivalent)

```bash
# 0. Prerequisites checker
bash scripts/azure/preflight-check.sh demo

# 1. Provision all Azure resources for the demo environment (one-time)
export POSTGRES_ADMIN_PASSWORD='<strong-password>'
bash scripts/azure/provision-azure.sh demo eastus true   # true = dev/test SKUs
#                                    │     │      └── isDevTestSubscription
#                                    │     └────────── location
#                                    └──────────────── environment (demo|production)

# 2. Build .env.<env> from .env.<env>.template (fill in values from Azure outputs)
cp .env.demo.template .env.demo  # then edit; see template comments for az queries

# 3. Seed secrets into Key Vault
KV_NAME=sbtm-kv-demo ENV_FILE=.env.demo bash scripts/azure/setup-keyvault.sh

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

## Related Documents

- [DeploymentArchitecture.md](../Design/DeploymentArchitecture.md) — Environment matrix and topology overview
- [DeploymentGuide.md](../Operations/DeploymentGuide.md) — Step-by-step local and cloud deployment procedures
- [ProductionIntegrationChecklist.md](../prd/v4/ProductionIntegrationChecklist.md) — Full production readiness checklist
- [ProductionRolloutGuide.md](../prd/v4/ProductionRolloutGuide.md) — First-time production deployment sequence
