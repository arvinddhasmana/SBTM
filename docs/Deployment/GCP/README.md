# SBTM — GCP Deployment

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-29
- Audience: DevOps engineers deploying SBTM to Google Cloud

This folder covers everything required to deploy and operate the SBTM platform
on **Google Cloud Platform** (GKE Autopilot). For the cross-cloud topology
overview see [`../README.md`](../README.md).

## Documents in This Section

| Document                                           | Purpose                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [DeploymentChecklist.md](DeploymentChecklist.md)   | **Start here.** Prerequisites, GCP project setup, IAM, pre-deploy checklist            |
| [Architecture.md](Architecture.md)                 | GCP/GKE Autopilot architecture, service mapping, cost tiers                            |
| [CustomDomainSetup.md](CustomDomainSetup.md)       | Map `*.gcp.sbtm.ca` via Cloud DNS + Let's Encrypt, plus the one-time delegation        |
| [InfrastructureAsCode.md](InfrastructureAsCode.md) | Terraform modules in `infra/gcp/` and Kustomize overlays in `infra/k8s/overlays/gcp-*` |

## Environment Model

SBTM uses **two GCP environments** in a single GCP project (configurable):

| Environment    | Namespace             | GKE Cluster       | Cloud SQL      | Region        |
| -------------- | --------------------- | ----------------- | -------------- | ------------- |
| **Demo**       | `sbtm-demo-gcp`       | `sbtm-demo`       | `sbtm-demo-pg` | `us-central1` |
| **Production** | `sbtm-production-gcp` | `sbtm-production` | `sbtm-prod-pg` | `us-central1` |

> The persistent **Cloud DNS zone** `sbtm-gcp-zone` (for `gcp.sbtm.ca`),
> static IP `sbtm-gcp-ingress-ip`, Artifact Registry `sbtm-shared`, and
> OSRM-data bucket `${PROJECT_ID}-sbtm-osrm-persist` live outside both
> environments and are **never touched by `teardown-gcp.sh`**, so the
> Azure-DNS NS delegation, custom-domain bindings, and TLS certs stay stable
> across teardown / rebuild cycles. Combined cost: <$2/mo.

## Quick Start — Deploy to GCP

### Pre-requisite: persistent resources (one-time, lifetime of GCP project)

```bash
export GCP_PROJECT_ID=<your-gcp-project-id>
bash scripts/gcp/setup-persistent-resources.sh                 # creates DNS zone, IP, Artifact Registry, GCS bucket
# Script prints the four Cloud DNS NS records — feed them into Azure:
bash scripts/azure/setup-gcp-delegation.sh ns1 ns2 ns3 ns4     # adds NS gcp.sbtm.ca → Cloud DNS
```

> **One-time only.** Both scripts are idempotent — re-running is safe.

### One-shot automated bootstrap (recommended)

```bash
export GCP_PROJECT_ID=<your-gcp-project-id>
bash scripts/gcp/bootstrap.sh demo                  # full ephemeral provision
bash scripts/gcp/bootstrap.sh production            # production
```

This runs all 8 steps:

1. Verifies prerequisites (`gcloud`, `kubectl`, `terraform`, `kustomize`).
2. Verifies persistent resources exist (Cloud DNS zone + static IP).
3. Runs `setup-gcp-project.sh` (enables APIs, creates Terraform state bucket
   - Terraform service account).
4. Runs `provision-gcp.sh ${env} apply` (Terraform: VPC, GKE Autopilot,
   Cloud SQL, Memorystore Redis, GCS, Secret Manager, Monitoring).
5. Fetches GKE credentials.
6. Builds & pushes any missing service images to the persistent Artifact
   Registry `sbtm-shared` (skips images that already exist — saves ~10-15 min
   per cycle).
7. Patches the kustomize overlay with the live `${PROJECT_ID}` and applies it.
8. Binds the GKE Ingress to the persistent global static IP.

### Manual step-by-step (equivalent)

```bash
# 0. GCP project setup (one-time per project)
bash scripts/gcp/setup-gcp-project.sh "${GCP_PROJECT_ID}"

# 1. Provision ephemeral infrastructure
bash scripts/gcp/provision-gcp.sh demo apply

# 2. Get GKE credentials
gcloud container clusters get-credentials sbtm-demo --region us-central1 --project "${GCP_PROJECT_ID}"

# 3. Build & push images (one per service)
gcloud builds submit --tag us-central1-docker.pkg.dev/${GCP_PROJECT_ID}/sbtm-shared/api-gateway:latest services/api-gateway

# 4. Deploy services
bash scripts/gcp/deploy-services.sh demo
```

## Pause / Tear-Down (Demo)

```bash
bash scripts/gcp/cost-stop.sh demo      # scale Deployments to 0 + stop Cloud SQL (~$0.20/mo storage only)
bash scripts/gcp/cost-start.sh demo     # resume
bash scripts/gcp/teardown-gcp.sh demo   # destroy ephemeral, preserve persistent (<$2/mo)
```

### What `teardown-gcp.sh` preserves (zero-cost essentials)

`teardown-gcp.sh` runs `terraform destroy` on the ephemeral state and
**preserves** all persistent resources (total <$2/mo):

- **Cloud DNS zone** `sbtm-gcp-zone` (for `gcp.sbtm.ca`), including all NS
  records, the `api.gcp.sbtm.ca` A record (pointing at the persistent IP),
  and any `_dnsauth.*` TXT validations.
- **Global static IP** `sbtm-gcp-ingress-ip` — the AKS-style "stable LB IP"
  pattern. The `api.gcp.sbtm.ca` A record never has to change.
- **Artifact Registry** `sbtm-shared` — all built container images stay,
  so the next `bootstrap.sh` skips the image build phase.
- **GCS bucket** `${PROJECT_ID}-sbtm-osrm-persist` — the OSRM road-network
  dataset (~600 MB) stays, no re-upload needed.

Before destroying, the script also clears any per-env DNS records like
`admin-demo.gcp.sbtm.ca` / `parent-demo.gcp.sbtm.ca` (best-effort), but
**preserves** `api.gcp.sbtm.ca` / `_dnsauth.api` because they point at the
persistent IP and are reused on every rebuild.

To rebuild after teardown:

```bash
bash scripts/gcp/bootstrap.sh demo
```

## Related Documents

- [`../README.md`](../README.md) — multi-cloud topology overview
- [`../Azure/README.md`](../Azure/README.md) — Azure deployment (parent DNS owner)
- [`../Azure/CostAnalysis.md`](../Azure/CostAnalysis.md) — cost framework (applies to both clouds)
- [`../../dev/cloud_debugging_guide.md`](../../dev/cloud_debugging_guide.md) — debugging deployed environments
