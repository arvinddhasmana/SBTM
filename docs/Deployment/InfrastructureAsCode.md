# SBTM Infrastructure as Code

- Document owner: Engineering and DevOps
- Last reviewed: 2026-04-22
- Audience: DevOps engineers, cloud architects

## Overview

Infrastructure is managed at two layers:

| Layer                          | Technology | Location       | Purpose                                       |
| ------------------------------ | ---------- | -------------- | --------------------------------------------- |
| Azure resource provisioning    | Bicep      | `infra/azure/` | Create and configure all Azure services       |
| Kubernetes workload deployment | Kustomize  | `infra/k8s/`   | Deploy and configure all application services |

Each environment lives in its own Azure resource group:

| Environment    | Resource Group | AKS Cluster           | ACR Registry        | Key Vault            |
| -------------- | -------------- | --------------------- | ------------------- | -------------------- |
| **Demo**       | `sbtm-demo-rg` | `sbtm-aks-demo`       | `sbtmacrdemo`       | `sbtm-kv-demo`       |
| **Production** | `sbtm-rg`      | `sbtm-aks-production` | `sbtmacrproduction` | `sbtm-kv-production` |

---

## Azure Provisioning (Bicep)

### Structure

```
infra/azure/
├── main.bicep              # Orchestrator: deploys all modules in order
├── parameters.demo.json          # Parameter values for demo tier
├── parameters.production.json    # Parameter values for production tier
└── modules/
    ├── network.bicep       # VNET, subnets, NSGs
    ├── aks.bicep           # AKS cluster + node pools
    ├── acr.bicep           # Azure Container Registry
    ├── database.bicep      # PostgreSQL Flexible Server + PostGIS
    ├── redis.bicep         # Azure Cache for Redis
    ├── storage.bicep       # Blob Storage + containers
    ├── keyvault.bicep      # Key Vault + Workload Identity federation
    └── monitoring.bicep    # Log Analytics workspace + App Insights
```

### First-Time Provisioning

Always run `scripts/azure/preflight-check.sh` first — see [DeploymentChecklist.md](DeploymentChecklist.md).

```bash
# 1. Login and set subscription
az login
az account set --subscription "<SUBSCRIPTION_ID>"

# 2. Export PostgreSQL admin password (passed via CLI, never committed)
export POSTGRES_ADMIN_PASSWORD='<strong-password>'

# 3. Provision the demo environment (creates RG sbtm-demo-rg if missing)
bash scripts/azure/provision-azure.sh demo eastus false
#                                    │     │      └── isDevTestSubscription
#                                    │     └────────── location override (optional)
#                                    └──────────────── environment

# 4. Provision production (separate RG, different region)
bash scripts/azure/provision-azure.sh production canadacentral false
```

### How to Change Tier Configuration (Lower/Higher SKUs)

All sizing is parameterised. There are two ways to change a tier:

**1. Edit the per-environment parameters file** (persistent, version-controlled):

`infra/azure/parameters.demo.json`:

```json
{
  "parameters": {
    "aksNodeCount":      { "value": 2 },
    "aksNodeSize":       { "value": "Standard_D2s_v3" },   ← change here for cheaper/larger AKS
    "postgresSkuName":   { "value": "Standard_B2ms" },     ← change here for PG
    "postgresSkuTier":   { "value": "Burstable" },
    "postgresStorageGB": { "value": 32 },
    "redisSkuName":      { "value": "Basic" },
    "redisSkuCapacity":  { "value": 0 }
  }
}
```

Then re-run `bash scripts/azure/provision-azure.sh demo` — Bicep is idempotent and does an in-place update for SKU changes (note: PG tier change _between Burstable and GeneralPurpose_ requires a brief restart).

**2. One-off override via CLI** (temporary):

```bash
az deployment group create \
  --resource-group sbtm-demo-rg \
  --template-file infra/azure/main.bicep \
  --parameters @infra/azure/parameters.demo.json \
  --parameters aksNodeCount=4 aksNodeSize=Standard_D4s_v3
```

### Parameter Reference

| Parameter               | Demo Value        | Prod Value        | Description                                                                                                              |
| ----------------------- | ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `environment`           | `demo`            | `production`      | Suffix for resource names; sets K8s namespace                                                                            |
| `location`              | `eastus`          | `canadacentral`   | Azure region                                                                                                             |
| `aksNodeCount`          | `2`               | `3`               | Initial app node pool count                                                                                              |
| `aksNodeSize`           | `Standard_D2s_v3` | `Standard_D4s_v3` | Node VM SKU                                                                                                              |
| `postgresSkuName`       | `Standard_B2ms`   | `Standard_D4s_v3` | PostgreSQL SKU                                                                                                           |
| `postgresSkuTier`       | `Burstable`       | `GeneralPurpose`  | PostgreSQL tier                                                                                                          |
| `postgresStorageGB`     | `32`              | `256`             | PostgreSQL storage                                                                                                       |
| `redisSkuName`          | `Basic`           | `Standard`        | Redis SKU                                                                                                                |
| `redisSkuCapacity`      | `0`               | `1`               | Redis capacity (C0=0, C1=1, C2=2)                                                                                        |
| `storageSkuName`        | `Standard_LRS`    | `Standard_ZRS`    | Blob redundancy                                                                                                          |
| `acrSkuName`            | `Basic`           | `Standard`        | Container Registry SKU                                                                                                   |
| `isDevTestSubscription` | `false`           | `false`           | Tags resources for Dev/Test cost reporting (see [CostAnalysis.md](CostAnalysis.md#azure-devtest-pricing-40-vm-discount)) |

### Common Tier-Change Recipes

| Goal                                  | Edit                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Cheapest demo (single-node, ~$130/mo) | `aksNodeCount=1`, `redisSkuCapacity=0`                                    |
| Heavy-load demo (load test, ~$400/mo) | `aksNodeCount=3`, `aksNodeSize=Standard_D4s_v3`                           |
| Production HA upgrade                 | `postgresSkuTier=GeneralPurpose`, set `postgresHA=ZoneRedundant` in Bicep |
| Add node autoscaling                  | Set `aksAutoscaleMin/Max` in `aks.bicep`                                  |
| Switch to Spot instances (demo only)  | Edit `aks.bicep` agentPoolProfile: `priority: 'Spot'`                     |

---

## Kubernetes Manifests (Kustomize)

### Structure

```
infra/k8s/
├── base/                           # Cloud-agnostic base manifests
│   ├── namespace.yaml              # sbtm-demo and sbtm-production namespaces
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── gps-tracking/
│   ├── emergency-alerts/
│   ├── student-presence/
│   ├── student-management/
│   ├── compliance-management/
│   ├── video-service/
│   ├── notification-service/
│   ├── osrm/
│   ├── ingress/
│   │   ├── nginx-ingress.yaml      # NGINX Ingress Controller (Helm values override)
│   │   └── ingress-rules.yaml      # Ingress routing rules
│   └── secrets/
│       └── keyvault-csi.yaml       # SecretProviderClass for Azure Key Vault
├── overlays/
│   ├── demo/
│   │   └── kustomization.yaml      # 1 replica, debug logging, demo domain, sbtm-kv-demo
│   └── production/
│       └── kustomization.yaml      # 2+ replicas, info logging, production domain, sbtm-kv-production
└── README.md
```

### Deploying to Demo

```bash
# Get AKS credentials
az aks get-credentials --resource-group sbtm-demo-rg --name sbtm-aks-demo

# Apply demo overlay
kubectl apply -k infra/k8s/overlays/demo

# Verify
kubectl get pods -n sbtm-demo
kubectl get ingress -n sbtm-demo

# Or use the deploy script
bash scripts/azure/deploy-services.sh demo
```

### Deploying to Production

```bash
# Production requires explicit confirmation
bash scripts/azure/deploy-services.sh production

# Or directly (requires AKS credentials for the prod cluster)
az aks get-credentials --resource-group sbtm-rg --name sbtm-aks-production
kubectl apply -k infra/k8s/overlays/production
kubectl rollout status deployment -n sbtm-production --timeout=600s
```

### How Secrets Work (Key Vault CSI + Workload Identity)

Pods authenticate to Azure Key Vault via **Workload Identity** (no passwords). The federated credential subject is set in `keyvault.bicep` to `system:serviceaccount:sbtm-${environment}:sbtm-workload-sa`, so:

- The demo cluster's pods (in namespace `sbtm-demo`) read from `sbtm-kv-demo`
- The production cluster's pods (in namespace `sbtm-production`) read from `sbtm-kv-production`

**Yes — both Demo and Production read all runtime secrets from Azure Key Vault**, never from GitHub Secrets, never baked into images.

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

Seed before first deployment:

```bash
KV_NAME=sbtm-kv-demo ENV_FILE=.env.demo bash scripts/azure/setup-keyvault.sh
```

If `.env.demo` still has template placeholders (`<...>`), seeding will be skipped/fail until the file is populated with real values.

---

## Sharing Infrastructure: Multiple Environments on One Cluster

The Demo AKS cluster (`sbtm-aks-demo`) can host multiple isolated workloads via Kubernetes namespaces — see [CostAnalysis.md](CostAnalysis.md#sharing-infrastructure-between-environments-k8s-namespaces).

Default namespaces:

| Cluster               | Namespace         | Overlay                         | Purpose                 |
| --------------------- | ----------------- | ------------------------------- | ----------------------- |
| `sbtm-aks-demo`       | `sbtm-demo`       | `infra/k8s/overlays/demo`       | Live demo + integration |
| `sbtm-aks-demo`       | `sbtm-pilot` \*   | clone `demo` → `pilot`          | Optional pilot rollout  |
| `sbtm-aks-demo`       | `sbtm-test` \*    | clone `demo` → `test`           | Optional QA / per-PR    |
| `sbtm-aks-production` | `sbtm-production` | `infra/k8s/overlays/production` | Production traffic only |

\* Optional — create on demand.

**Important:** The federated credential in `keyvault.bicep` only grants access to the namespace matching the environment name. To add a new namespace that needs Key Vault access, add an additional federated credential (one per namespace) or grant the new SA access via a shared identity.

---

## Database Migration

Postgres uses a private endpoint, so workstation `psql` can't reach it directly. Three options (cheapest first):

```bash
# Option A — FREE: run migrations from a one-shot pod inside AKS (already in the VNET)
bash scripts/azure/db-migrate-via-aks.sh demo migrate
bash scripts/azure/db-migrate-via-aks.sh demo seed-demo
bash scripts/azure/db-migrate-via-aks.sh demo psql       # interactive shell

# Option B — ~$0.02/run: temporary B1s jumpbox VM (NSG locked to caller IP, auto-deletes)
bash scripts/azure/db-jumpbox.sh demo migrate
bash scripts/azure/db-jumpbox.sh demo backup             # downloads dump to ./backups/

# Option C — local psql, only if you already have VPN or Azure Bastion connectivity
ENV_FILE=.env.demo bash scripts/azure/setup-db.sh migrate
```

All three paths run the same SQL: `scripts/init-db.sql` (schema) → `scripts/rls-policies.sql` (RLS) → `scripts/seed-standard.sql` (reference data). Demo seeding adds `scripts/seed-demo.sql`.

> The single-command [`bootstrap.sh`](../../scripts/azure/bootstrap.sh) automatically tries Option C first and falls back to Option A on connection failure.

---

## OSRM Setup

The Ottawa road network data (~300MB) must be uploaded to Azure Blob Storage before OSRM pods can start:

```bash
ENVIRONMENT=demo bash scripts/azure/osrm-upload.sh
kubectl logs -n sbtm-demo deployment/osrm
```

---

## Kustomize Overlay Differences

| Setting                | Demo                         | Production                              |
| ---------------------- | ---------------------------- | --------------------------------------- |
| Replica count          | 1 per service                | 2 per service (api-gateway, alerts: 3)  |
| Resource requests      | Low (500m CPU, 256Mi memory) | Standard (1 CPU, 512Mi memory)          |
| Resource limits        | Moderate                     | Higher (2 CPU, 1Gi memory)              |
| Log level              | `debug`                      | `info`                                  |
| `NODE_ENV`             | `demo`                       | `production`                            |
| HPA enabled            | No                           | Yes (api-gateway, gps-tracking, alerts) |
| Pod disruption budgets | No                           | Yes (min 1 available)                   |
| Image pull policy      | `Always`                     | `IfNotPresent`                          |
| Ingress host           | `api.demo.sbtm.example.com`  | `api.sbtm.example.com`                  |

---

## Tearing Down / Pausing

| Goal                                | Command                                     |
| ----------------------------------- | ------------------------------------------- |
| Pause AKS + DB (keep data, ~$30/mo) | `bash scripts/azure/cost-stop.sh demo`      |
| Resume from pause                   | `bash scripts/azure/cost-start.sh demo`     |
| Full delete (zero residual cost)    | `bash scripts/azure/teardown-azure.sh demo` |

> Production teardown requires typing the literal string `DELETE PRODUCTION` to confirm.

---

## Related Documents

- [DeploymentChecklist.md](DeploymentChecklist.md) — full prerequisites before any provisioning
- [AzureArchitecture.md](AzureArchitecture.md) — Azure service design and security model
- [AzureCICD.md](AzureCICD.md) — GitHub Actions pipeline that uses these manifests
- [CostAnalysis.md](CostAnalysis.md) — SKU choices, Dev/Test pricing, namespace sharing
