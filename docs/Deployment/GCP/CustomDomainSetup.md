# GCP Custom Domain Setup — `gcp.sbtm.ca`

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-29

This document describes how SBTM on GCP uses the **`gcp.sbtm.ca`** subdomain,
delegated from the parent Azure DNS zone `sbtm.ca`.

## Why a Subdomain (not the root)

A DNS name can have only one authoritative provider at a time. Putting both
Azure and Cloud DNS at the apex of `sbtm.ca` would break resolution. Instead:

- Azure DNS remains authoritative for **`sbtm.ca`** (registrar already points
  the four NS records there — never touched).
- An `NS gcp.sbtm.ca` record set in the Azure zone delegates everything below
  `gcp.sbtm.ca` to Cloud DNS.
- Each cloud then issues its own Let's Encrypt certificates with no shared
  rate-limit budget (Let's Encrypt limits 5 dup certs / FQDN / week — per-FQDN,
  so independent FQDNs are fully isolated).

```
                    ┌───────────────────────────┐
   registrar ──NS──>│ Azure DNS: sbtm.ca        │
                    │  api.sbtm.ca       → AKS  │
                    │  admin.sbtm.ca     → SWA  │
                    │  parent.sbtm.ca    → SWA  │
                    │  gcp        ──NS──┐       │
                    └───────────────────│───────┘
                                        │
                                        ▼
                    ┌───────────────────────────┐
                    │ Cloud DNS: gcp.sbtm.ca    │
                    │  api.gcp.sbtm.ca   → GKE  │
                    │  admin.gcp.sbtm.ca → ?    │
                    │  parent.gcp.sbtm.ca→ ?    │
                    └───────────────────────────┘
```

## One-Time Delegation Setup

### Step 1 — Create the Cloud DNS zone (GCP side)

```bash
export GCP_PROJECT_ID=<your-gcp-project-id>
bash scripts/gcp/setup-persistent-resources.sh
```

The script ends with the four nameservers:

```
ns-cloud-XX.googledomains.com.
ns-cloud-XY.googledomains.com.
ns-cloud-XZ.googledomains.com.
ns-cloud-XW.googledomains.com.
```

### Step 2 — Add the NS delegation record (Azure side)

```bash
bash scripts/azure/setup-gcp-delegation.sh \
    ns-cloud-XX.googledomains.com. \
    ns-cloud-XY.googledomains.com. \
    ns-cloud-XZ.googledomains.com. \
    ns-cloud-XW.googledomains.com.
```

This creates an `NS` record set named `gcp` in the `sbtm.ca` zone with TTL
3600s. The script is idempotent — safe to re-run.

> **Preserved by `teardown-azure.sh`.** The teardown script only ever clears
> `api` and `_dnsauth.api` records inside `sbtm.ca`. The `gcp` NS record
> survives every teardown / rebuild cycle on either cloud.

### Step 3 — Verify delegation

```bash
dig +short NS gcp.sbtm.ca @8.8.8.8     # should return all four ns-cloud-*
dig +short A api.gcp.sbtm.ca @8.8.8.8  # should return the persistent static IP
```

Propagation typically completes within 1-5 minutes (TTL 3600s on first add).

## TLS Certificates

GKE ingresses use cert-manager just like AKS:

- **`letsencrypt-staging`** — default for demo (no rate limit, untrusted CA).
- **`letsencrypt-prod`** — set `USE_PROD_CERT=true` or
  `environment=production` to use trusted certs.

Each FQDN under `gcp.sbtm.ca` has its own independent Let's Encrypt budget —
no risk of colliding with the Azure side.

## Adding More Subdomains

To add `admin.gcp.sbtm.ca` or `parent.gcp.sbtm.ca` later:

```bash
gcloud dns record-sets create admin.gcp.sbtm.ca. \
  --zone=sbtm-gcp-zone \
  --type=A --ttl=300 \
  --rrdatas=$(gcloud compute addresses describe sbtm-gcp-ingress-ip --global --format='value(address)')
```

These records will be cleared by `teardown-gcp.sh` (per-env records) but the
parent zone and NS delegation stay.

## Related Documents

- [README.md](README.md) — full GCP deployment guide
- [DeploymentChecklist.md](DeploymentChecklist.md) — pre-deploy gates
- [`../Azure/CustomDomainSetup.md`](../Azure/CustomDomainSetup.md) — parent
  zone (`sbtm.ca`) setup including the registrar NS delegation
