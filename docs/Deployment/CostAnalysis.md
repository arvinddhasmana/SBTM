# SBTM Azure Cost Analysis

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-22
- Audience: Project managers, architects, client stakeholders

## Environment Model

SBTM uses **only two Azure environments** — Demo and Production — each in its own resource group:

| Environment    | Resource Group | Region          | Use Case                                      | Est. Monthly Cost (USD) |
| -------------- | -------------- | --------------- | --------------------------------------------- | ----------------------- |
| **Demo**       | `sbtm-demo-rg` | `eastus`        | Demos, dev/test, pilot rollouts, ~10–50 users | ~$215–235               |
| **Production** | `sbtm-rg`      | `canadacentral` | Full board (6+ schools, 100+ users)           | ~$900–1,500             |

> **What happened to "Pilot"?** Pilot is a _business stage_, not a separate environment. Early-customer pilots run on the Production environment behind tenant feature flags, OR (for cheaper pre-pilot trials) in a separate `sbtm-pilot` namespace on the Demo AKS cluster — see "Sharing infrastructure between environments" below.

---

## Demo Tier Breakdown

Suitable for: client presentations, proof-of-concept validation, developer testing, low-traffic pilots.

| Azure Service                                               | SKU                                                  | Est. Cost/month    |
| ----------------------------------------------------------- | ---------------------------------------------------- | ------------------ |
| AKS cluster (control plane)                                 | Free tier (Standard tier disabled for demo)          | $0                 |
| AKS system node pool                                        | 1× Standard_B2as_v2 (2 vCPU, 8GB RAM, AMD burstable) | ~$42               |
| Azure DB for PostgreSQL Flexible                            | Standard_B1ms (1 vCPU, 2GB), 32GB storage            | ~$28               |
| Azure Cache for Redis                                       | Basic C0 (250MB)                                     | ~$16               |
| Azure Blob Storage                                          | LRS, Hot tier, ~50GB                                 | ~$2                |
| Azure Container Registry                                    | Basic                                                | ~$5                |
| Azure Key Vault                                             | Standard (10K operations)                            | ~$3                |
| Azure Monitor + App Insights                                | ~5GB logs/month                                      | ~$8                |
| Public IP (ingress)                                         | Standard                                             | ~$4                |
| Static Web Apps (admin + parent)                            | Free × 2                                             | $0                 |
| Azure DNS public zone (sbtm.ca)                             | 1 zone, low query volume                             | ~$0.50             |
| **Total (24×7)**                                            |                                                      | **~$108.50/month** |
| **Total with `cost-stop.sh` between sessions (~10h/wk on)** |                                                      | **~$10–15/month**  |

---

## Production Tier Breakdown

Suitable for: full board deployment (6+ schools, 50+ drivers, 500+ parents, real-time operations).

| Azure Service                    | SKU                                          | Est. Cost/month         |
| -------------------------------- | -------------------------------------------- | ----------------------- |
| AKS cluster (control plane)      | Standard tier (uptime SLA)                   | ~$73                    |
| AKS system node pool             | 2× Standard_D2s_v3                           | ~$140                   |
| AKS app node pool                | 3× Standard_D4s_v3 (autoscale to 5)          | ~$420–700               |
| Azure DB for PostgreSQL Flexible | GP_Standard_D4s_v3, 256GB, Zone Redundant HA | ~$380                   |
| Azure Cache for Redis            | Standard C2 (6GB, replica)                   | ~$150                   |
| Azure Blob Storage               | ZRS, Hot + Cool tiers, ~1TB                  | ~$25                    |
| Azure Container Registry         | Standard                                     | ~$20                    |
| Azure Key Vault                  | Standard                                     | ~$10                    |
| Azure Static Web Apps            | Standard ($9 × 2 apps)                       | ~$18                    |
| Azure DNS public zone (sbtm.ca)  | 1 zone, moderate query volume                | ~$1                     |
| Azure Monitor + App Insights     | ~50GB logs/month                             | ~$50                    |
| Azure Front Door Standard (WAF)  | 1 profile + WAF                              | ~$35                    |
| Public IP + DNS                  | Standard × 2                                 | ~$16                    |
| **Total**                        |                                              | **~$1,337–1,617/month** |

---

## Pay-As-You-Go: Removing All Resources Stops All Charges

Every Azure resource in SBTM is billed **per-second pay-as-you-go**. There are no upfront commitments and no Reserved Instances purchased by default. To stop ALL charges for an environment, delete the resource group:

```bash
# Demo only — all data destroyed, monthly cost goes to $0
bash scripts/azure/teardown-azure.sh demo

# Production — guarded with explicit "DELETE PRODUCTION" prompt
bash scripts/azure/teardown-azure.sh production
```

The teardown script:

1. Deletes the entire resource group (AKS, ACR, PostgreSQL, Redis, Blob, KV, networking)
2. Purges the soft-deleted Key Vault so the same name can be reused
3. Submits async — typical completion 5–15 minutes

To recreate from scratch (~10–15 min):

```bash
export POSTGRES_ADMIN_PASSWORD='...'
bash scripts/azure/provision-azure.sh demo eastus false
```

### Demo Workflow: Spin Up → Demo → Tear Down

```
Day before demo                Day of demo                After demo
─────────────────              ─────────                  ─────────
preflight-check.sh             cost-start.sh (if paused)  cost-stop.sh        ← stop charges, keep data
provision-azure.sh demo        deploy-services.sh demo    teardown-azure.sh   ← zero charges, lose data
setup-keyvault.sh              run demo
setup-db.sh migrate
deploy-services.sh demo
```

---

## Pause Without Delete (cost-stop.sh)

If you want to pause between demos but keep data:

```bash
bash scripts/azure/cost-stop.sh demo   # stops AKS + PostgreSQL
bash scripts/azure/cost-start.sh demo  # resumes (~5–10 min)
```

| What stops billing     | What keeps billing                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------- |
| AKS compute (~$140/mo) | PostgreSQL storage ($3–10/mo), Redis Basic (~$16/mo), Blob storage, ACR storage, KV |

Estimated cost while paused: **~$30–40/month** (vs ~$228 running).

> **Note:** Azure auto-restarts a stopped PostgreSQL Flexible Server after **7 days**. For longer pauses, use teardown.

---

## Azure Dev/Test Pricing (~40% VM Discount)

**Eligibility** (set at the **subscription level**, not per resource):

- Visual Studio Subscription holders
- Enterprise Agreement / MCA customers with Dev/Test enrollment
- Pay-As-You-Go Dev/Test offers

### How to enable

1. Convert subscription via [Azure Portal → Subscriptions → "Change offer"](https://portal.azure.com) — pick **Pay-As-You-Go Dev/Test** or **EA Dev/Test**
2. Confirm with finance/admin that the legal terms (no production workloads) are acceptable
3. After conversion, all VMs in the subscription automatically get the discount — **no per-resource flag needed**
4. Run provisioning with the flag for tagging/reporting:
   ```bash
   bash scripts/azure/provision-azure.sh demo eastus true
   #                                                    └── isDevTestSubscription
   ```
   This adds the `devTestEligible=true` tag to all resources for cost reporting.

### Is it implemented?

**Yes — partially.** The Bicep template accepts an `isDevTestSubscription` parameter that tags resources. The actual ~40% discount is applied automatically by Azure billing once the subscription itself is on a Dev/Test offer; there is no infrastructure-side switch to flip. **You must convert the subscription manually** in the Portal.

> **Warning:** Microsoft's Dev/Test terms prohibit production workloads. Use Dev/Test pricing only for the **Demo** environment, never Production.

---

## Sharing Infrastructure Between Environments (K8s Namespaces)

Yes — implemented and recommended for cost-conscious teams.

The Demo AKS cluster (`sbtm-aks-demo`) is a single Kubernetes cluster that can host multiple isolated workloads via namespaces. Today it hosts:

| Namespace    | Purpose                              | Overlay                        |
| ------------ | ------------------------------------ | ------------------------------ |
| `sbtm-demo`  | Live demo + integration testing      | `infra/k8s/overlays/demo`      |
| `sbtm-pilot` | (optional) Early-customer pilot      | clone `demo` overlay → `pilot` |
| `sbtm-test`  | (optional) Per-PR or QA environments | clone `demo` overlay → `test`  |

To add a Pilot namespace on the demo cluster (no new Azure resources, no extra base cost):

```bash
cp -r infra/k8s/overlays/demo infra/k8s/overlays/pilot
sed -i 's/sbtm-demo/sbtm-pilot/g' infra/k8s/overlays/pilot/kustomization.yaml
sed -i 's/api.demo.sbtm.example.com/api.pilot.sbtm.example.com/g' infra/k8s/overlays/pilot/kustomization.yaml
kubectl create ns sbtm-pilot
kubectl apply -k infra/k8s/overlays/pilot
```

This shares the **same** AKS nodes, ACR, PostgreSQL (different DB or schema), Redis (different prefix), and Key Vault (different secret prefix). **Zero additional Azure cost** beyond the slightly higher pod density.

> **Production NEVER shares the cluster with non-prod.** That cluster lives in its own resource group (`sbtm-rg`) for blast-radius isolation.

---

## Cost Reduction Strategies — Demo

1. **Stop AKS during off-hours** — `cost-stop.sh` saves ~75% vs running 24×7
2. **Use Dev/Test subscription** — automatic ~40% discount on all VMs (AKS nodes + DB)
3. **Spot instances for app pool** — set `priority: Spot` in agentPoolProfiles for ~60–90% extra savings (eviction-tolerant only)
4. **Single-node mode** — set `aksNodeCount: 1` in `parameters.demo.json` (system+app share one node)
5. **Share cluster with pilot/test** namespaces (above)
6. **Tear down between demos** — `teardown-azure.sh` for zero residual cost

---

## Cost Reduction Strategies — Production

1. **Reserved Instances (1-year)** — ~40% savings on AKS nodes and PostgreSQL vs PAYG (purchase manually in Azure Portal — not in Bicep)
2. **Blob Storage lifecycle rules** — auto-move videos to Cool after 30 days, delete after 90 (already enabled in `storage.bicep`)
3. **Log Analytics sampling** — App Insights set to 50% sampling for production (already in `monitoring.bicep`)
4. **Daily quota cap** — 5GB/day (production) / 1GB/day (demo) hard cap on Log Analytics ingestion (already in `monitoring.bicep`)
5. **CDN offload** — Azure Static Web Apps serves Admin/Parent UIs without hitting AKS

---

## Related Documents

- [AzureArchitecture.md](AzureArchitecture.md) — service configuration details and SKU recommendations
- [InfrastructureAsCode.md](InfrastructureAsCode.md) — how to change SKUs/tiers
- [DeploymentChecklist.md](DeploymentChecklist.md) — full prerequisites before any provisioning
