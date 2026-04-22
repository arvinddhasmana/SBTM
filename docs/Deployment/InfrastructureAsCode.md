# SBTM Infrastructure as Code

- Document owner: Engineering and DevOps
- Last reviewed: 2026-04-21
- Audience: DevOps engineers, cloud architects

## Overview

Infrastructure is managed at two layers:

| Layer                          | Technology | Location       | Purpose                                       |
| ------------------------------ | ---------- | -------------- | --------------------------------------------- |
| Azure resource provisioning    | Bicep      | `infra/azure/` | Create and configure all Azure services       |
| Kubernetes workload deployment | Kustomize  | `infra/k8s/`   | Deploy and configure all application services |

---

## Azure Provisioning (Bicep)

### Structure

```
infra/azure/
├── main.bicep              # Orchestrator: deploys all modules in order
├── parameters.demo.json    # Parameter values for demo tier
├── parameters.prod.json    # Parameter values for production tier
└── modules/
    ├── network.bicep       # VNET, subnets, NSGs
    ├── aks.bicep           # AKS cluster + node pools
    ├── acr.bicep           # Azure Container Registry
    ├── database.bicep      # PostgreSQL Flexible Server + PostGIS
    ├── redis.bicep         # Azure Cache for Redis
    ├── storage.bicep       # Blob Storage + containers
    ├── keyvault.bicep      # Key Vault + access policies
    └── monitoring.bicep    # Log Analytics workspace + App Insights
```

### First-Time Provisioning

```bash
# 1. Login and set subscription
az login
az account set --subscription "<SUBSCRIPTION_ID>"

# 2. Create resource group
az group create --name sbtm-rg --location eastus

# 3. Deploy all resources (demo tier)
az deployment group create \
  --resource-group sbtm-rg \
  --template-file infra/azure/main.bicep \
  --parameters @infra/azure/parameters.demo.json

# 4. Or use the provision script (handles K8s addons too)
bash scripts/azure/provision-azure.sh demo
```

### Parameters

| Parameter           | Demo Value        | Production Value  | Description                       |
| ------------------- | ----------------- | ----------------- | --------------------------------- |
| `environment`       | `demo`            | `production`      | Used as suffix for resource names |
| `location`          | `eastus`          | `canadacentral`   | Azure region                      |
| `aksNodeCount`      | `2`               | `3`               | Initial app node pool count       |
| `aksNodeSize`       | `Standard_D2s_v3` | `Standard_D4s_v3` | Node VM SKU                       |
| `postgresSkuName`   | `Standard_B2ms`   | `Standard_D4s_v3` | PostgreSQL SKU                    |
| `postgresStorageGB` | `32`              | `256`             | PostgreSQL storage                |
| `redisSkuName`      | `Basic`           | `Standard`        | Redis SKU                         |
| `redisSkuCapacity`  | `0`               | `1`               | Redis capacity code (C0=0, C1=1)  |

---

## Kubernetes Manifests (Kustomize)

### Structure

```
infra/k8s/
├── base/                           # Cloud-agnostic base manifests
│   ├── namespace.yaml              # sbtm-staging and sbtm-production namespaces
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── gps-tracking/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── emergency-alerts/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── student-presence/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── student-management/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── compliance-management/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── video-service/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── notification-service/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── osrm/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── ingress/
│   │   ├── nginx-ingress.yaml      # NGINX Ingress Controller (Helm values override)
│   │   └── ingress-rules.yaml      # Ingress routing rules
│   └── secrets/
│       └── keyvault-csi.yaml       # SecretProviderClass for Azure Key Vault
├── overlays/
│   ├── staging/
│   │   └── kustomization.yaml      # 1 replica, debug logging, staging domain
│   └── production/
│       └── kustomization.yaml      # 2+ replicas, info logging, production domain
└── README.md
```

### Deploying to Staging

```bash
# Get AKS credentials
az aks get-credentials --resource-group sbtm-rg --name sbtm-aks

# Apply staging overlay
kubectl apply -k infra/k8s/overlays/staging

# Verify pods
kubectl get pods -n sbtm-staging
kubectl get ingress -n sbtm-staging

# Or use the deploy script
bash scripts/azure/deploy-services.sh staging
```

### Deploying to Production

```bash
# Production requires explicit confirmation
bash scripts/azure/deploy-services.sh production

# Or directly (requires AKS credentials)
kubectl apply -k infra/k8s/overlays/production
kubectl rollout status deployment -n sbtm-production --timeout=600s
```

### How Secrets Work (Key Vault CSI)

Each pod mounts secrets from Azure Key Vault via a `SecretProviderClass`. No secrets are hardcoded in manifests.

**Key Vault secret names → environment variable mapping:**

| Key Vault Secret               | Service                  | Env Variable                      |
| ------------------------------ | ------------------------ | --------------------------------- |
| `sbtm-jwt-secret`              | api-gateway              | `JWT_SECRET`                      |
| `sbtm-db-password`             | all services             | `DB_PASSWORD`                     |
| `sbtm-database-url`            | gps-tracking             | `DATABASE_URL`                    |
| `sbtm-redis-connection-string` | all services using Redis | `REDIS_URL`                       |
| `sbtm-fcm-server-key`          | notification-service     | `FCM_SERVER_KEY`                  |
| `sbtm-twilio-auth-token`       | notification-service     | `TWILIO_AUTH_TOKEN`               |
| `sbtm-blob-connection-string`  | video-service, osrm      | `AZURE_STORAGE_CONNECTION_STRING` |

Seed these secrets before first deployment:

```bash
bash scripts/azure/setup-keyvault.sh
```

---

## Database Migration

Run schema migrations against the Azure PostgreSQL instance:

```bash
bash scripts/azure/setup-db.sh migrate
```

This script:

1. Connects to Azure PostgreSQL via private endpoint (requires being on VNET or using Azure Bastion)
2. Runs `scripts/init-db.sql` for schema creation
3. Applies `scripts/rls-policies.sql` for Row-Level Security policies
4. Runs `scripts/seed-standard.sql` for initial data

For demo seeding, run additionally:

```bash
bash scripts/azure/setup-db.sh seed-demo
```

---

## OSRM Setup

The Ottawa road network data (~300MB) must be uploaded to Azure Blob Storage before OSRM pods can start:

```bash
# Upload from local infra/osrm-data/ to Azure Blob Storage
bash scripts/azure/osrm-upload.sh

# Verify OSRM pod starts correctly
kubectl logs -n sbtm-staging deployment/osrm
```

The OSRM deployment mounts the Blob Storage container as an init container using `azcopy`.

---

## Kustomize Overlay Differences

| Setting                | Staging                      | Production                              |
| ---------------------- | ---------------------------- | --------------------------------------- |
| Replica count          | 1 per service                | 2 per service (api-gateway, alerts: 3)  |
| Resource requests      | Low (500m CPU, 256Mi memory) | Standard (1 CPU, 512Mi memory)          |
| Resource limits        | Moderate                     | Higher (2 CPU, 1Gi memory)              |
| Log level              | `debug`                      | `info`                                  |
| `NODE_ENV`             | `staging`                    | `production`                            |
| HPA enabled            | No                           | Yes (api-gateway, gps-tracking, alerts) |
| Pod disruption budgets | No                           | Yes (min 1 available)                   |
| Image pull policy      | `Always`                     | `IfNotPresent`                          |

---

## Related Documents

- [AzureArchitecture.md](AzureArchitecture.md) — Azure service design and security model
- [AzureCICD.md](AzureCICD.md) — GitHub Actions pipeline that uses these manifests
- [CostAnalysis.md](CostAnalysis.md) — SKU choices and cost breakdown per tier
- [DeploymentGuide.md](../Operations/DeploymentGuide.md) — Step-by-step deployment procedures
