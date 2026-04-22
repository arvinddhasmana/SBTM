# SBTM Azure CI/CD Pipeline

- Document owner: Engineering
- Last reviewed: 2026-04-21
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
│  └── [on main only] → build-images.yml                                      │
│                           └── build + push all 8 service images → ACR       │
│                               └── deploy-staging.yml                         │
│                                       └── kubectl apply -k overlays/staging  │
│                                                                              │
│  GitHub Release (v*.*.*)                                                     │
│  └── deploy-production.yml                                                  │
│       ├── [manual approval gate]                                             │
│       └── kubectl apply -k overlays/production                              │
│                                                                              │
│  Release tag (mobile)                                                        │
│  └── mobile-build.yml                                                       │
│       ├── EAS Cloud Build → Android AAB                                     │
│       ├── EAS Cloud Build → iOS IPA                                         │
│       └── EAS Submit → Play Store (internal testing)                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Files

| File                                      | Trigger                             | Description                                                      |
| ----------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `.github/workflows/ci.yml`                | Push to main; PR to main            | Lint, build, unit tests, integration tests                       |
| `.github/workflows/build-images.yml`      | Called by ci.yml (main branch only) | Build all 8 Docker images and push to ACR                        |
| `.github/workflows/deploy-staging.yml`    | On completion of build-images       | Deploy latest images to AKS `sbtm-staging` namespace             |
| `.github/workflows/deploy-production.yml` | GitHub Release tag `v*.*.*`         | Manual approval gate → deploy to AKS `sbtm-production` namespace |
| `.github/workflows/mobile-build.yml`      | Release tag or push to `mobile/**`  | EAS Cloud Build + EAS Submit to stores                           |
| `.github/workflows/infra-provision.yml`   | Manual dispatch                     | Run Bicep deployment for Azure resource provisioning             |

---

## Required GitHub Repository Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret Name             | Description                                       | How to Obtain                                     |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `AZURE_CLIENT_ID`       | Service principal client ID for federated OIDC    | `az ad sp create-for-rbac`                        |
| `AZURE_TENANT_ID`       | Azure AD tenant ID                                | Azure Portal → Entra ID → Overview                |
| `AZURE_SUBSCRIPTION_ID` | Target Azure subscription ID                      | `az account show --query id`                      |
| `ACR_LOGIN_SERVER`      | ACR server URL (e.g. `sbtmacr.azurecr.io`)        | `az acr show --name sbtmacr --query loginServer`  |
| `AKS_RESOURCE_GROUP`    | Resource group containing AKS                     | e.g. `sbtm-rg`                                    |
| `AKS_CLUSTER_NAME`      | AKS cluster name                                  | e.g. `sbtm-aks`                                   |
| `EXPO_TOKEN`            | Expo EAS API token                                | Expo dashboard → Account Settings → Access Tokens |
| `GOOGLE_PLAY_KEY`       | Google Play service account JSON (base64-encoded) | Google Play Console → Setup → API access          |

> **Note:** All application secrets (JWT secret, DB passwords, FCM keys) are managed via Azure Key Vault — do NOT add them to GitHub Secrets. Only Azure identity and deployment credentials go here.

### Setting Up Azure OIDC (Federated Credentials — no long-lived secrets)

```bash
# Create service principal with minimum permissions
az ad sp create-for-rbac --name sbtm-github-actions --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/sbtm-rg

# Add federated credential for GitHub Actions
az ad app federated-credential create \
  --id <APP_ID> \
  --parameters '{
    "name": "sbtm-github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<owner>/SBTM:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Save AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID to GitHub Secrets
```

---

## build-images.yml — Image Build and Push

Every merge to `main` (after CI passes) builds all 8 backend service images and pushes to ACR with two tags:

- `latest` — always points to the most recent main build
- `sha-<commit>` — immutable reference for rollback

**Image naming convention:**

```
sbtmacr.azurecr.io/sbtm/<service-name>:sha-abc1234
sbtmacr.azurecr.io/sbtm/<service-name>:latest
```

Services built:

- `api-gateway`
- `gps-tracking`
- `emergency-alerts`
- `student-presence`
- `student-management`
- `compliance-management`
- `video-service`
- `notification-service`

---

## deploy-staging.yml — Staging Deployment

Runs immediately after `build-images.yml` on `main` branch.

Steps:

1. Authenticate to Azure (OIDC)
2. Get AKS credentials (`az aks get-credentials`)
3. Update image tags in Kustomize overlay to `sha-<commit>`
4. `kubectl apply -k infra/k8s/overlays/staging`
5. `kubectl rollout status deployment -n sbtm-staging --timeout=300s`
6. Run smoke test: `curl https://staging.sbtm.example.com/health`

---

## deploy-production.yml — Production Deployment

Triggered by GitHub Release tag matching `v*.*.*`. Requires **manual environment approval** (configure in GitHub → Environments → `production`).

Steps:

1. Await approval from designated reviewers
2. Authenticate to Azure (OIDC)
3. Create pre-deployment DB backup (runs `scripts/azure/setup-db.sh backup`)
4. Update image tags to release tag (e.g. `v1.2.0`)
5. `kubectl apply -k infra/k8s/overlays/production`
6. `kubectl rollout status deployment -n sbtm-production --timeout=600s`
7. Run smoke test suite
8. Create GitHub deployment status comment

**Rollback:** If rollout fails, the workflow automatically runs `kubectl rollout undo deployment -n sbtm-production` for each service.

---

## mobile-build.yml — Mobile App Build and Submit

Triggered by release tag or push to `mobile/**` branch.

Steps:

1. Install Expo CLI and EAS CLI
2. Authenticate with `EXPO_TOKEN`
3. `eas build --platform android --profile production --non-interactive` → produces `.aab`
4. `eas build --platform ios --profile production --non-interactive` → produces `.ipa` (requires Apple cert in EAS)
5. On success: `eas submit --platform android --profile production` → Google Play internal testing
6. On success: `eas submit --platform ios --profile production` → Apple TestFlight

---

## infra-provision.yml — Infrastructure Provisioning

Manual dispatch only. Used for initial setup or infrastructure changes.

Steps:

1. Authenticate to Azure (OIDC)
2. `az deployment group create --resource-group sbtm-rg --template-file infra/azure/main.bicep --parameters @infra/azure/parameters.json`
3. Configure AKS addons (Key Vault CSI, Workload Identity, Container Insights)
4. Install NGINX Ingress Controller
5. Install cert-manager
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

- [InfrastructureAsCode.md](InfrastructureAsCode.md) — Kustomize manifests and Bicep templates
- [DeploymentGuide.md](../Operations/DeploymentGuide.md) — Manual deployment procedures
- [AzureArchitecture.md](AzureArchitecture.md) — Azure service overview
