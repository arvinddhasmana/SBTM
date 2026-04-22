# SBTM Deployment Documentation

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-21
- Audience: DevOps engineers, architects, project managers

This section covers everything required to deploy and operate the SBTM platform on Azure, publish the Driver App to mobile stores, and understand the cost model.

## Documents in This Section

| Document                                             | Purpose                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [AzureArchitecture.md](AzureArchitecture.md)         | Azure AKS architecture with C4 diagrams, Azure Well-Architected analysis, and service mapping     |
| [InfrastructureAsCode.md](InfrastructureAsCode.md)   | How to use the Bicep templates (`infra/azure/`) and Kubernetes Kustomize manifests (`infra/k8s/`) |
| [AzureCICD.md](AzureCICD.md)                         | GitHub Actions CI/CD pipeline: build → push to ACR → deploy to AKS                                |
| [MobileStoreDeployment.md](MobileStoreDeployment.md) | EAS Build + Google Play + Apple App Store deployment guide                                        |
| [CostAnalysis.md](CostAnalysis.md)                   | Azure cost breakdown for demo, pilot, and production tiers with scaling guidance                  |

## Quick Start — Deploy to Azure

```bash
# 1. Provision all Azure resources (one-time)
bash scripts/azure/provision-azure.sh

# 2. Seed secrets into Key Vault
bash scripts/azure/setup-keyvault.sh

# 3. Run database migration
bash scripts/azure/setup-db.sh

# 4. Deploy all services to staging
bash scripts/azure/deploy-services.sh staging

# 5. Upload OSRM Ottawa routing data
bash scripts/azure/osrm-upload.sh
```

## Related Documents

- [DeploymentArchitecture.md](../Design/DeploymentArchitecture.md) — Environment matrix and topology overview
- [DeploymentGuide.md](../Operations/DeploymentGuide.md) — Step-by-step local and cloud deployment procedures
- [ProductionIntegrationChecklist.md](../prd/v4/ProductionIntegrationChecklist.md) — Full production readiness checklist
- [ProductionRolloutGuide.md](../prd/v4/ProductionRolloutGuide.md) — First-time production deployment sequence
