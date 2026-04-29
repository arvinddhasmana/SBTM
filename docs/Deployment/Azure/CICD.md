# SBTM Azure CI/CD Pipeline

- Document owner: Engineering
- Last reviewed: 2026-04-22
- Audience: DevOps engineers, contributors

## Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  GitHub Push / PR                                                            │
│                                                                              │
│  ci.yml                                                                      │
│  ├── lint & format check                                                     │
│  ├── build (turbo)                                                           │
│  ├── unit tests (jest)                                                       │
│  ├── integration tests (postgres + redis)                                    │
│  └── [on main only] → build-images.yml                                       │
│                          └── build + push all 8 service images → ACR (demo)  │
│                              └── deploy-demo.yml                             │
│                                  └── kubectl apply -k overlays/demo          │
│                                      └── namespace sbtm-demo                 │
│                                                                              │
│  GitHub Release (v*.*.*)                                                     │
│  └── deploy-production.yml                                                   │
│       ├── [manual approval gate via GitHub Environment "production"]         │
│       └── kubectl apply -k overlays/production                               │
│           └── namespace sbtm-production (cluster sbtm-aks-production)        │
│                                                                              │
│  Release tag (mobile)                                                        │
│  └── mobile-build.yml                                                        │
│       ├── EAS Cloud Build → Android AAB                                      │
│       ├── EAS Cloud Build → iOS IPA                                          │
│       └── EAS Submit → Play Store (internal) + TestFlight                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **There is no separate "Pilot" pipeline.** Pilot rollouts are gated via tenant feature flags on the Production environment, OR (for low-risk pre-pilot trials) deployed to a `sbtm-pilot` namespace on the Demo AKS cluster — see [CostAnalysis.md](CostAnalysis.md#sharing-infrastructure-between-environments-k8s-namespaces).

---

## Workflow Files

| File                                      | Trigger                                          | Description                                                                     |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                | Push to main; PR to main                         | Lint, build, unit tests, integration tests                                      |
| `.github/workflows/build-images.yml`      | Called by ci.yml (main branch only)              | Build all 8 Docker images and push to **demo** ACR                              |
| `.github/workflows/deploy-demo.yml`       | On completion of build-images                    | Deploy latest images to AKS `sbtm-demo` namespace on `sbtm-aks-demo`            |
| `.github/workflows/deploy-production.yml` | GitHub Release tag `v*.*.*`                      | Manual approval gate → deploy to AKS `sbtm-production` on `sbtm-aks-production` |
| `.github/workflows/mobile-build.yml`      | Release tag or push to `mobile/**`               | EAS Cloud Build + EAS Submit to stores                                          |
| `.github/workflows/infra-provision.yml`   | Manual dispatch (env input: `demo`/`production`) | Run Bicep deployment for Azure resource provisioning                            |

---

## Required GitHub Secrets

Set under **Settings → Environments → `demo`** and **Settings → Environments → `production`** (NOT under repo-level Secrets — environment scoping enables approval gates).

### Per-environment secrets

| Secret                    | Demo Environment             | Production Environment         | Source                                                        |
| ------------------------- | ---------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `AZURE_CLIENT_ID`         | demo SP client ID            | prod SP client ID              | `az ad sp create-for-rbac` output                             |
| `AZURE_TENANT_ID`         | tenant ID                    | tenant ID                      | `az account show --query tenantId -o tsv`                     |
| `AZURE_SUBSCRIPTION_ID`   | subscription ID              | subscription ID                | `az account show --query id -o tsv`                           |
| `AKS_DEMO_RESOURCE_GROUP` | `sbtm-demo-rg`               | —                              | constant                                                      |
| `AKS_DEMO_CLUSTER_NAME`   | `sbtm-aks-demo`              | —                              | constant                                                      |
| `ACR_DEMO_LOGIN_SERVER`   | `sbtmacrdemo.azurecr.io`     | —                              | `az acr show -n sbtmacrdemo --query loginServer -o tsv`       |
| `AKS_PROD_RESOURCE_GROUP` | —                            | `sbtm-rg`                      | constant                                                      |
| `AKS_PROD_CLUSTER_NAME`   | —                            | `sbtm-aks-production`          | constant                                                      |
| `ACR_PROD_LOGIN_SERVER`   | —                            | `sbtmacrproduction.azurecr.io` | `az acr show -n sbtmacrproduction --query loginServer -o tsv` |
| `EXPO_TOKEN`              | shared                       | shared                         | Expo dashboard → Account Settings → Access Tokens             |
| `GOOGLE_PLAY_KEY`         | shared (base64-encoded JSON) | shared                         | Google Play Console → Setup → API access                      |

> **Application secrets (JWT, DB password, Twilio, FCM) are NOT in GitHub Secrets.** They live in Azure Key Vault and are seeded by `scripts/azure/setup-keyvault.sh`. Pods read them via the Key Vault CSI driver + Workload Identity. See [DeploymentChecklist.md](DeploymentChecklist.md#6-seed-key-vault-secrets).

### Setting Up Azure OIDC (Federated Credentials — no long-lived secrets)

```bash
# Create one service principal per environment (recommended)
az ad sp create-for-rbac --name sbtm-github-demo --role Contributor \
  --scopes /subscriptions/<SUB>/resourceGroups/sbtm-demo-rg

az ad sp create-for-rbac --name sbtm-github-prod --role Contributor \
  --scopes /subscriptions/<SUB>/resourceGroups/sbtm-rg

# Demo: federated credential for "demo" environment in GitHub
az ad app federated-credential create \
  --id <DEMO_APP_ID> \
  --parameters '{
    "name": "sbtm-github-demo",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<owner>/SBTM:environment:demo",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Production: federated credential for "production" environment
az ad app federated-credential create \
  --id <PROD_APP_ID> \
  --parameters '{
    "name": "sbtm-github-production",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<owner>/SBTM:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

---

## build-images.yml — Image Build and Push

Every merge to `main` (after CI passes) builds all 8 backend service images and pushes to the **demo ACR** with two tags:

- `latest` — always points to the most recent main build
- `sha-<commit>` — immutable reference for rollback

**Image naming convention:**

```
sbtmacrdemo.azurecr.io/sbtm/<service-name>:sha-abc1234
sbtmacrdemo.azurecr.io/sbtm/<service-name>:latest
```

For production releases, images are imported from demo ACR to production ACR with the release tag (or rebuilt — depending on policy):

```bash
az acr import --name sbtmacrproduction \
  --source sbtmacrdemo.azurecr.io/sbtm/api-gateway:sha-abc1234 \
  --image sbtm/api-gateway:v1.2.0
```

Services built:

- `api-gateway`, `gps-tracking`, `emergency-alerts`, `student-presence`,
  `student-management`, `compliance-management`, `video-service`, `notification-service`

---

## deploy-demo.yml — Demo Deployment

Runs immediately after `build-images.yml` on `main` branch. Uses GitHub Environment `demo` (no approval required).

Steps:

1. Authenticate to Azure (OIDC, environment=demo)
2. `az aks get-credentials --resource-group $AKS_DEMO_RESOURCE_GROUP --name $AKS_DEMO_CLUSTER_NAME`
3. Update image tags in `infra/k8s/overlays/demo` to `sha-<commit>`
4. `kubectl apply -k infra/k8s/overlays/demo`
5. `kubectl rollout status deployment -n sbtm-demo --timeout=300s`
6. Smoke test: `curl https://api.demo.sbtm.example.com/health`

---

## deploy-production.yml — Production Deployment

Triggered by GitHub Release tag matching `v*.*.*`. Requires **manual approval** from designated reviewers (configure in **GitHub → Settings → Environments → `production` → Required reviewers**).

Steps:

1. Await approval
2. Authenticate to Azure (OIDC, environment=production)
3. Pre-deployment DB backup: `bash scripts/azure/setup-db.sh backup`
4. Update image tags to release tag (e.g. `v1.2.0`)
5. `kubectl apply -k infra/k8s/overlays/production`
6. `kubectl rollout status deployment -n sbtm-production --timeout=600s`
7. Run smoke test suite
8. Post deployment status comment to release

**Rollback:** If rollout fails, the workflow automatically runs `kubectl rollout undo deployment -n sbtm-production` for each service.

---

## mobile-build.yml — Mobile App Build and Submit

Triggered by release tag or push to `mobile/**` branch.

Steps:

1. Install Expo CLI and EAS CLI
2. Authenticate with `EXPO_TOKEN`
3. `eas build --platform android --profile production --non-interactive` → `.aab`
4. `eas build --platform ios --profile production --non-interactive` → `.ipa`
5. `eas submit --platform android --profile production` → Google Play internal testing
6. `eas submit --platform ios --profile production` → Apple TestFlight

`apps/driver-app/eas.json` is already configured for AAB output and non-simulator iOS builds.

---

## infra-provision.yml — Infrastructure Provisioning

Manual dispatch only. Inputs:

| Input                   | Required | Default | Description                                             |
| ----------------------- | -------- | ------- | ------------------------------------------------------- |
| `environment`           | yes      | `demo`  | `demo` → RG `sbtm-demo-rg`; `production` → RG `sbtm-rg` |
| `location`              | no       | derived | Defaults: demo=`eastus`, production=`canadacentral`     |
| `isDevTestSubscription` | no       | `false` | Tags resources for Dev/Test cost reporting              |

Steps:

1. Authenticate to Azure (OIDC)
2. `az group create --name $RG --location $LOCATION --tags env=$ENV`
3. `az deployment group create --resource-group $RG --template-file infra/azure/main.bicep --parameters @infra/azure/parameters.$ENV.json`
4. Configure AKS addons (Key Vault CSI, Workload Identity, Container Insights)
5. Install NGINX Ingress Controller + cert-manager
6. Create ACR → AKS pull role assignment

---

## Local Development vs CI Environment Variables

| Variable          | Local Dev (`.env`)                                           | AKS (Key Vault)                   | CI (GitHub Secrets)                |
| ----------------- | ------------------------------------------------------------ | --------------------------------- | ---------------------------------- |
| `DATABASE_URL`    | `postgresql://postgres:mysecretpassword@localhost:5433/sbms` | Key Vault secret                  | Not used in CI (uses ephemeral PG) |
| `JWT_SECRET`      | `dev-secret`                                                 | Key Vault secret                  | Not needed                         |
| `FCM_SERVER_KEY`  | (optional, dry-run mode)                                     | Key Vault secret                  | Not needed                         |
| `AZURE_CLIENT_ID` | Not used                                                     | Workload Identity (auto-injected) | GitHub OIDC secret                 |
| `NODE_ENV`        | `development`                                                | `production`                      | `test`                             |

---

## Related Documents

- [DeploymentChecklist.md](DeploymentChecklist.md) — prerequisites before any deployment
- [InfrastructureAsCode.md](InfrastructureAsCode.md) — Kustomize manifests, Bicep templates, tier-change instructions
- [CostAnalysis.md](CostAnalysis.md) — Dev/Test pricing, namespace sharing, cost stop/start
- [Architecture.md](Architecture.md) — Azure service overview
