# GCP Architecture

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-29

This document describes the SBTM GCP deployment topology. For the parallel
Azure architecture (and shared design rationale) see
[`../Azure/Architecture.md`](../Azure/Architecture.md).

## High-Level Diagram

```
                    Internet
                       │
                       ▼
        ┌────────────────────────────┐
        │  GCP Global Static IP      │   ← persistent (sbtm-gcp-ingress-ip)
        │  api.gcp.sbtm.ca           │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  GKE Autopilot             │
        │  ─────────────             │
        │  NGINX Ingress             │
        │  cert-manager (LE)         │
        │  ─────────────             │
        │  api-gateway               │
        │  gps-tracking              │
        │  emergency-alerts          │
        │  student-presence          │
        │  student-management        │
        │  compliance-management     │
        │  video-service             │
        │  notification-service      │
        │  osrm                      │
        └────────────┬───────────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
  ┌────────┐   ┌──────────┐   ┌────────┐
  │ Cloud  │   │ Memory-  │   │ Secret │
  │  SQL   │   │ store    │   │ Mgr    │
  │ Postgres│  │ (Redis)  │   │        │
  └────────┘   └──────────┘   └────────┘
```

## Persistent vs Ephemeral Resources

| Layer      | Resource                                       | Lifecycle                   | Cost when torn down         |
| ---------- | ---------------------------------------------- | --------------------------- | --------------------------- |
| Persistent | Cloud DNS zone `sbtm-gcp-zone` (`gcp.sbtm.ca`) | Created once, never deleted | ~$0.20/mo                   |
| Persistent | Global static IP `sbtm-gcp-ingress-ip`         | Created once, never deleted | $0 (in use) / ~$1.50 (idle) |
| Persistent | Artifact Registry `sbtm-shared`                | Created once, never deleted | ~$0.10/GB/mo                |
| Persistent | GCS bucket `${PROJECT_ID}-sbtm-osrm-persist`   | Created once, never deleted | ~$0.02/mo                   |
| Ephemeral  | GKE Autopilot cluster                          | `terraform destroy` removes | $0                          |
| Ephemeral  | Cloud SQL Postgres                             | `terraform destroy` removes | $0                          |
| Ephemeral  | Memorystore Redis                              | `terraform destroy` removes | $0                          |
| Ephemeral  | Secret Manager secrets                         | `terraform destroy` removes | $0                          |
| Ephemeral  | Per-env GCS bucket (videos)                    | `terraform destroy` removes | $0                          |
| Ephemeral  | VPC + subnets + private service connection     | `terraform destroy` removes | $0                          |

## Service Mapping (Azure ↔ GCP)

| Capability         | Azure                        | GCP                                |
| ------------------ | ---------------------------- | ---------------------------------- |
| Kubernetes         | AKS                          | GKE Autopilot                      |
| Container registry | ACR (`sbtmacrshared`)        | Artifact Registry (`sbtm-shared`)  |
| DNS                | Azure DNS (`sbtm.ca`)        | Cloud DNS (`gcp.sbtm.ca`)          |
| Static ingress IP  | Public IP Standard SKU       | Global static IP                   |
| Postgres           | Postgres Flexible Server     | Cloud SQL                          |
| Cache              | Azure Cache for Redis        | Memorystore                        |
| Secrets            | Key Vault + CSI driver       | Secret Manager + Workload Identity |
| Object storage     | Blob Storage                 | Cloud Storage (GCS)                |
| Frontend hosting   | Static Web Apps (Azure)      | (uses Azure SWAs cross-cloud)      |
| Telemetry          | Application Insights         | Cloud Logging + Monitoring         |
| TLS                | cert-manager + Let's Encrypt | cert-manager + Let's Encrypt       |

> Frontends (`admin.sbtm.ca`, `parent.sbtm.ca`) live on **Azure Static Web
> Apps** regardless of which cloud the API is deployed on. SWAs can target
> any HTTPS API endpoint via configured `apiUrl`, so the same admin/parent
> bundles work against `api.sbtm.ca` or `api.gcp.sbtm.ca`.

## Cost Tiers (demo defaults)

See [`../Azure/CostAnalysis.md`](../Azure/CostAnalysis.md) for the cost framework — GCP follows the same persistent-vs-ephemeral model with comparable steady-state costs.

## Related Documents

- [README.md](README.md) — quick start
- [DeploymentChecklist.md](DeploymentChecklist.md) — prerequisites
- [CustomDomainSetup.md](CustomDomainSetup.md) — DNS delegation + TLS
- [InfrastructureAsCode.md](InfrastructureAsCode.md) — Terraform modules
