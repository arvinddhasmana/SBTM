# SBTM Deployment Documentation

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-29
- Audience: DevOps engineers, architects, project managers

This section covers everything required to deploy and operate the SBTM platform
on **Azure** or **GCP** (multi-cloud), publish the Driver / Parent mobile apps
to mobile stores, and understand the cost model.

## Multi-Cloud Topology

SBTM can run on either Azure (AKS) or GCP (GKE Autopilot), or both at once.
The DNS root `sbtm.ca` is hosted in **Azure DNS** and stays the single source
of truth. GCP is delegated a subdomain `gcp.sbtm.ca` so each cloud has fully
independent ingress, TLS certificates and Let's Encrypt rate-limit budget.

| Cloud | Domain          | Cluster       | Object storage      | Container registry    |
| ----- | --------------- | ------------- | ------------------- | --------------------- |
| Azure | `*.sbtm.ca`     | AKS           | Azure Blob Storage  | ACR (`sbtmacrshared`) |
| GCP   | `*.gcp.sbtm.ca` | GKE Autopilot | Cloud Storage (GCS) | Artifact Registry     |

> **Domain registrar is untouched** — it still points at the four Azure DNS
> nameservers. The `gcp.sbtm.ca` subdomain is a one-time `NS` record inserted
> _into_ Azure DNS pointing to Cloud DNS — see
> [`Azure/CustomDomainSetup.md`](Azure/CustomDomainSetup.md#delegating-gcpsbtmca-to-cloud-dns)
> and [`GCP/CustomDomainSetup.md`](GCP/CustomDomainSetup.md).

## Folder Layout

| Folder / File                                                    | Purpose                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`Azure/`](Azure/README.md)                                      | Azure-specific deployment: AKS, ACR, Static Web Apps, Bicep, Key Vault          |
| [`GCP/`](GCP/README.md)                                          | GCP-specific deployment: GKE Autopilot, Artifact Registry, Cloud SQL, Terraform |
| [`Azure/CostAnalysis.md`](Azure/CostAnalysis.md)                 | Azure cost breakdown, Dev/Test pricing, teardown automation                     |
| [DriverMobileStoreDeployment.md](DriverMobileStoreDeployment.md) | EAS Build + Google Play + Apple App Store — Driver app                          |
| [ParentMobileStoreDeployment.md](ParentMobileStoreDeployment.md) | EAS Build + stores — Parent app                                                 |

> **Debugging a deployed environment?** See
> [`docs/dev/cloud_debugging_guide.md`](../dev/cloud_debugging_guide.md) for the
> standard practice (seven-layer stack, App Insights / Cloud Logging KQL,
> `mirrord`, common failure playbooks).

## Cost-Saving Architecture (both clouds)

Both Azure and GCP follow the **same persistent-vs-ephemeral split** so a full
teardown costs <$1/mo while preserving DNS, TLS bindings, container images and
the OSRM road-network dataset:

| Layer                | Azure (persistent in `sbtm-dns-rg`)          | GCP (persistent project-wide)        |
| -------------------- | -------------------------------------------- | ------------------------------------ |
| DNS zone             | `sbtm.ca` (Azure DNS)                        | `gcp.sbtm.ca` (Cloud DNS)            |
| Static IP            | `sbtm-ingress-ip` (Standard SKU)             | `sbtm-gcp-ingress-ip` (global)       |
| Container registry   | `sbtmacrshared` (ACR Basic)                  | `sbtm-shared` (Artifact Registry)    |
| OSRM dataset storage | `sbtmpersist*` (Blob Storage)                | `sbtm-osrm-persist` (GCS bucket)     |
| Static Web Apps      | `sbtm-admin-demo`, `sbtm-parent-demo` (Free) | n/a (frontends served by Azure SWAs) |

Teardown deletes only the **ephemeral** resource group / project resources
(cluster, managed Postgres, Redis, Key Vault / Secret Manager, env-specific
storage). Re-running `bootstrap.sh` rebuilds the ephemeral side in ~30 min
without registrar / DNS / TLS / image-rebuild steps.

## Quick Start

| Goal                        | Command                                     | Reference                            |
| --------------------------- | ------------------------------------------- | ------------------------------------ |
| Deploy demo to Azure        | `bash scripts/azure/bootstrap.sh demo`      | [`Azure/README.md`](Azure/README.md) |
| Deploy demo to GCP          | `bash scripts/gcp/bootstrap.sh demo`        | [`GCP/README.md`](GCP/README.md)     |
| Pause Azure (keep data)     | `bash scripts/azure/cost-stop.sh demo`      | [`Azure/README.md`](Azure/README.md) |
| Pause GCP (keep data)       | `bash scripts/gcp/cost-stop.sh demo`        | [`GCP/README.md`](GCP/README.md)     |
| Tear down Azure (~$0.50/mo) | `bash scripts/azure/teardown-azure.sh demo` | [`Azure/README.md`](Azure/README.md) |
| Tear down GCP (~$0.30/mo)   | `bash scripts/gcp/teardown-gcp.sh demo`     | [`GCP/README.md`](GCP/README.md)     |

## Related Documents

- [DeploymentArchitecture.md](../Design/DeploymentArchitecture.md) — environment matrix and topology overview
- [DeploymentGuide.md](../Operations/DeploymentGuide.md) — step-by-step local and cloud deployment procedures
- [ProductionIntegrationChecklist.md](../prd/v4/ProductionIntegrationChecklist.md) — full production readiness checklist
- [ProductionRolloutGuide.md](../prd/v4/ProductionRolloutGuide.md) — first-time production deployment sequence
