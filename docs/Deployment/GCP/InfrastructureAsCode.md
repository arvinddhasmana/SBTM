# GCP Infrastructure as Code

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-29

This document describes the GCP infrastructure code that lives under
[`infra/gcp/`](../../../infra/gcp/) (Terraform) and
[`infra/k8s/overlays/gcp-*/`](../../../infra/k8s/overlays/) (Kustomize).

For the Azure equivalent (Bicep), see
[`../Azure/InfrastructureAsCode.md`](../Azure/InfrastructureAsCode.md).

## Layout

```
infra/gcp/
  main.tf                       # orchestrator — wires all modules
  variables.tf                  # input variables
  outputs.tf                    # cluster name, region, IP, etc.
  backend.tf.example            # GCS state backend (copy → backend.tf)
  environments/
    demo.tfvars                 # demo: GKE Autopilot on, db-custom-1-3840, Redis Basic 1GB
    production.tfvars           # production: HA Postgres, larger Redis, prod log retention
  modules/
    networking/                 # VPC + subnets + private service connection
    gke/                        # GKE Autopilot cluster + Workload Identity
    artifact-registry/          # (per-env — superseded by persistent sbtm-shared)
    database/                   # Cloud SQL Postgres
    redis/                      # Memorystore Redis
    storage/                    # Per-env GCS bucket (videos)
    secrets/                    # Secret Manager seeding
    dns/                        # (optional — only if you opt-in via create_dns_zone)
    monitoring/                 # Cloud Logging / Monitoring
    k8s-addons/                 # cert-manager, External-DNS, NGINX-Ingress

infra/k8s/overlays/
  gcp-demo/                     # Kustomize overlay for demo (namespace sbtm-demo-gcp)
  gcp-production/               # Kustomize overlay for production (namespace sbtm-production-gcp)
```

## Persistent Resources are NOT in Terraform

By design, the persistent set lives **outside** Terraform state:

- Cloud DNS zone `sbtm-gcp-zone`
- Global static IP `sbtm-gcp-ingress-ip`
- Artifact Registry `sbtm-shared`
- GCS bucket `${PROJECT_ID}-sbtm-osrm-persist`

This mirrors the Azure pattern: persistent resources are owned by
`scripts/gcp/setup-persistent-resources.sh` and are intentionally **not** in
the ephemeral Terraform state. That way `terraform destroy` can never delete
them by accident, and there is no cross-state drift to worry about.

## Common Tasks

### Plan / apply / destroy

```bash
export GCP_PROJECT_ID=<project>

bash scripts/gcp/provision-gcp.sh demo plan
bash scripts/gcp/provision-gcp.sh demo apply
bash scripts/gcp/provision-gcp.sh demo destroy   # ephemeral only
```

### Change a SKU / tier

Edit `infra/gcp/environments/demo.tfvars` (or `production.tfvars`) and re-run:

```bash
bash scripts/gcp/provision-gcp.sh demo apply
```

Common variables:

- `database_tier` — Cloud SQL machine type (e.g. `db-custom-2-7680`)
- `database_high_availability` — true for prod
- `redis_memory_size` — GB
- `enable_gke_autopilot` — false for GKE Standard

### Customize the kustomize overlay

`scripts/gcp/bootstrap.sh` patches the overlay with the live `${PROJECT_ID}`
and `${REGION}` at deploy time, so the file can stay generic in source control.
The base `image:` lines reference `sbtmacrdemo.azurecr.io/sbtm/<svc>` (matching
the Azure base) and the GCP overlay's `images:` block rewrites them to
`<region>-docker.pkg.dev/<project>/sbtm-shared/<svc>:latest`.

## Related Documents

- [README.md](README.md) — quick start
- [Architecture.md](Architecture.md) — service mapping
- [CustomDomainSetup.md](CustomDomainSetup.md) — DNS delegation
- [`../Azure/InfrastructureAsCode.md`](../Azure/InfrastructureAsCode.md) — Azure Bicep equivalent
