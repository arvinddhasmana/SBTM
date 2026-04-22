# SBTM Azure Cost Analysis

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-21
- Audience: Project managers, architects, client stakeholders

## Summary

| Deployment Tier | Use Case                                            | Est. Monthly Cost (USD) | Notes                                      |
| --------------- | --------------------------------------------------- | ----------------------- | ------------------------------------------ |
| **Demo**        | Client demo, proof-of-concept, ~10 concurrent users | ~$215–235               | East US region; 1-2 AKS nodes              |
| **Pilot**       | 2–3 schools, ~50 concurrent users, live routes      | ~$450–550               | Canada Central; 2 AKS nodes                |
| **Production**  | Full board (6+ schools, 100+ users)                 | ~$900–1,500             | Canada Central; 3–5 AKS nodes, HA database |

---

## Demo Tier Breakdown

Suitable for: client presentations, proof-of-concept validation, developer testing.

| Azure Service                    | SKU                                  | Est. Cost/month |
| -------------------------------- | ------------------------------------ | --------------- |
| AKS cluster (control plane)      | Standard tier — free in East US      | $0              |
| AKS system node pool             | 1× Standard_D2s_v3 (2 vCPU, 8GB RAM) | ~$70            |
| AKS app node pool                | 1× Standard_D2s_v3                   | ~$70            |
| Azure DB for PostgreSQL Flexible | B2ms, 32GB storage                   | ~$50            |
| Azure Cache for Redis            | Basic C0 (250MB)                     | ~$16            |
| Azure Blob Storage               | LRS, Hot tier, ~50GB                 | ~$2             |
| Azure Container Registry         | Basic                                | ~$5             |
| Azure Key Vault                  | Standard (10K operations)            | ~$3             |
| Azure Static Web Apps            | Free tier                            | $0              |
| Azure Monitor + App Insights     | ~5GB logs/month                      | ~$8             |
| cert-manager (Let's Encrypt)     | Free                                 | $0              |
| Public IP (ingress)              | Standard                             | ~$4             |
| **Total**                        |                                      | **~$228/month** |

**Cost optimization tips for demo:**

- Run in East US (cheapest US region, free AKS control plane)
- Stop/start the AKS node pools when not actively demoing (~16 hours/day off = ~40% savings on compute)
- Use spot instances for the app node pool (not recommended for sustained load but fine for demos)
- Static Web Apps free tier covers Admin Dashboard and Parent Portal at no cost

---

## Pilot Tier Breakdown

Suitable for: 2–3 schools, live drivers, actual parent users, real routes.

| Azure Service                    | SKU                                              | Est. Cost/month |
| -------------------------------- | ------------------------------------------------ | --------------- |
| AKS cluster (control plane)      | Standard tier                                    | ~$73            |
| AKS system node pool             | 1× Standard_D2s_v3                               | ~$70            |
| AKS app node pool                | 2× Standard_D4s_v3 (4 vCPU, 16GB)                | ~$280           |
| Azure DB for PostgreSQL Flexible | GP_Standard_D2s_v3, 128GB, zone-redundant backup | ~$130           |
| Azure Cache for Redis            | Standard C1 (1GB, replica)                       | ~$55            |
| Azure Blob Storage               | LRS, Hot tier, ~200GB                            | ~$8             |
| Azure Container Registry         | Standard                                         | ~$20            |
| Azure Key Vault                  | Standard                                         | ~$5             |
| Azure Static Web Apps            | Free tier                                        | $0              |
| Azure Monitor + App Insights     | ~20GB logs/month                                 | ~$25            |
| Public IP + DNS                  | Standard                                         | ~$8             |
| **Total**                        |                                                  | **~$674/month** |

---

## Production Tier Breakdown

Suitable for: full board deployment (6+ schools, 50+ drivers, 500+ parents, real-time operations).

| Azure Service                    | SKU                                          | Est. Cost/month         |
| -------------------------------- | -------------------------------------------- | ----------------------- |
| AKS cluster (control plane)      | Standard tier                                | ~$73                    |
| AKS system node pool             | 2× Standard_D2s_v3                           | ~$140                   |
| AKS app node pool                | 3× Standard_D4s_v3 (autoscale to 5)          | ~$420–700               |
| Azure DB for PostgreSQL Flexible | GP_Standard_D4s_v3, 256GB, Zone Redundant HA | ~$380                   |
| Azure Cache for Redis            | Standard C2 (6GB, replica + geo-replica)     | ~$150                   |
| Azure Blob Storage               | ZRS, Hot + Cool tiers, ~1TB                  | ~$25                    |
| Azure Container Registry         | Standard                                     | ~$20                    |
| Azure Key Vault                  | Standard (HSM for high-security)             | ~$10                    |
| Azure Static Web Apps            | Standard ($9 × 2 apps)                       | ~$18                    |
| Azure Monitor + App Insights     | ~50GB logs/month                             | ~$50                    |
| Azure Front Door Standard (WAF)  | 1 profile + WAF                              | ~$35                    |
| Public IP + DNS                  | Standard × 2                                 | ~$16                    |
| **Total**                        |                                              | **~$1,337–1,617/month** |

---

## Scaling Path

```
Demo (1-2 nodes)
    │
    │  Add node to app pool
    │  Upgrade PostgreSQL SKU
    ▼
Pilot (2-3 nodes)
    │
    │  Enable HPA + node autoscaler
    │  Enable PostgreSQL Zone Redundant HA
    │  Upgrade Redis to Standard
    │  Add Azure Front Door
    ▼
Production (3-5 nodes, autoscale)
```

**What scales automatically (no manual intervention):**

- AKS node autoscaler: adds/removes nodes based on pending pods
- HPA (Horizontal Pod Autoscaler): scales individual pods based on CPU/memory
- Azure Blob Storage: unlimited growth; pay only for what you use
- Azure Monitor: ingestion scales automatically

**What requires manual upgrade:**

- PostgreSQL SKU (brief downtime for non-HA; zero-downtime with HA)
- Redis SKU (requires cache rebuild — schedule during low-traffic window)
- AKS node pool VM size (rolling node replacement, no downtime with ≥2 nodes)

---

## Cost Reduction Strategies

### Demo/Development Environment

1. **Stop AKS node pools during off-hours:**

   ```bash
   az aks nodepool scale --resource-group sbtm-rg --cluster-name sbtm-aks \
     --name appnodepool --node-count 0
   # Re-enable:
   az aks nodepool scale ... --node-count 1
   ```

2. **Use Azure Dev/Test pricing** (if applicable): ~40% discount on VMs for eligible subscriptions

3. **Use Azure Spot instances** for app node pool in demo: ~60–90% cost reduction (suitable if demo can tolerate occasional evictions)

4. **Share infrastructure between staging and demo** using K8s namespaces — same AKS cluster, different namespaces

### Production Optimizations

1. **Reserved Instances (1-year):** ~40% savings on AKS nodes and PostgreSQL vs pay-as-you-go
2. **Blob Storage lifecycle rules:** Auto-move videos to Cool tier after 30 days, delete after 90 days
3. **Log Analytics sampling:** Reduce App Insights telemetry to 50% for non-critical services
4. **CDN offload:** Azure Static Web Apps CDN serves most parent/admin traffic without hitting AKS

---

## Related Documents

- [AzureArchitecture.md](AzureArchitecture.md) — Service configuration details and SKU recommendations
- [InfrastructureAsCode.md](InfrastructureAsCode.md) — Bicep templates with parameterized SKUs for each tier
