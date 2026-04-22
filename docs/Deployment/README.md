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

```bash
# 0. Run the prerequisites checker
bash scripts/azure/preflight-check.sh demo

# 1. Provision all Azure resources for the demo environment (one-time)
export POSTGRES_ADMIN_PASSWORD='<strong-password>'
bash scripts/azure/provision-azure.sh demo eastus false
#                                    │     │      └── isDevTestSubscription
#                                    │     └────────── location
#                                    └──────────────── environment (demo|production)

# 2. Seed secrets into Key Vault
KV_NAME=sbtm-kv-demo bash scripts/azure/setup-keyvault.sh

# 3. Run database migration
DATABASE_URL='postgresql://...' bash scripts/azure/setup-db.sh migrate

# 4. Deploy all services to demo
bash scripts/azure/deploy-services.sh demo

# 5. Upload OSRM Ottawa routing data
ENVIRONMENT=demo bash scripts/azure/osrm-upload.sh
```

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
