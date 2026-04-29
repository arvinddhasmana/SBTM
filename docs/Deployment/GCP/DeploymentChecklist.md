# GCP Deployment Checklist

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-29

This is the pre-deployment checklist for SBTM on Google Cloud. Mirrors the
Azure version at [`../Azure/DeploymentChecklist.md`](../Azure/DeploymentChecklist.md).

## 1. GCP Project Prerequisites

- [ ] You have a GCP project with billing enabled (Project ID will be referred
      to as `${GCP_PROJECT_ID}` throughout).
- [ ] You have `Owner` or `Editor` + `Project IAM Admin` on the project.
- [ ] `gcloud` CLI installed and authenticated: `gcloud auth login`.
- [ ] Application Default Credentials set: `gcloud auth application-default login`.
- [ ] You own a public domain (`sbtm.ca`) whose Azure DNS zone exists and you
      have permissions on `sbtm-dns-rg` to add an `NS gcp` delegation record.

## 2. Local Tools

- [ ] `gcloud` >= 470
- [ ] `terraform` >= 1.6
- [ ] `kubectl` >= 1.28
- [ ] `kustomize` (or `kubectl kustomize`)
- [ ] `jq`

## 3. One-Time Persistent Setup

These run **once per GCP project** and survive every teardown afterwards.

```bash
export GCP_PROJECT_ID=<your-gcp-project-id>

# Creates: Cloud DNS zone (gcp.sbtm.ca), global static IP, Artifact Registry, OSRM bucket
bash scripts/gcp/setup-persistent-resources.sh
```

The script prints four `ns-cloud-*.googledomains.com.` nameservers at the end.
Insert them into Azure DNS:

```bash
bash scripts/azure/setup-gcp-delegation.sh \
    ns-cloud-X1.googledomains.com. \
    ns-cloud-X2.googledomains.com. \
    ns-cloud-X3.googledomains.com. \
    ns-cloud-X4.googledomains.com.
```

Verify (allow 1-5 min for propagation):

```bash
dig +short NS gcp.sbtm.ca @8.8.8.8
```

## 4. Bootstrap

```bash
export GCP_PROJECT_ID=<your-gcp-project-id>
bash scripts/gcp/bootstrap.sh demo
```

The bootstrap is **fully idempotent** — re-running picks up where the previous
run left off.

## 5. Post-deploy Verification

- [ ] `kubectl get pods -n sbtm-demo-gcp` — all pods `Running`
- [ ] `kubectl get ingress -n sbtm-demo-gcp` — ingress shows the persistent
      static IP as `ADDRESS`
- [ ] `dig +short A api.gcp.sbtm.ca @8.8.8.8` — returns the persistent IP
- [ ] `curl -k https://api.gcp.sbtm.ca/health` — returns 200
- [ ] cert-manager has issued a Let's Encrypt cert for `api.gcp.sbtm.ca`:
      `kubectl get certificate -A`

## 6. Pause / Tear-Down

| Goal                                | Command                                              | Cost after        |
| ----------------------------------- | ---------------------------------------------------- | ----------------- |
| Pause (keep data)                   | `bash scripts/gcp/cost-stop.sh demo`                 | ~$0.50/mo storage |
| Resume                              | `bash scripts/gcp/cost-start.sh demo`                | resumes billing   |
| Tear down (preserve persistent set) | `bash scripts/gcp/teardown-gcp.sh demo`              | <$2/mo            |
| Decommission GCP entirely           | see [README.md](README.md) "What teardown preserves" | $0                |

## Related Documents

- [README.md](README.md) — full GCP deployment quick start
- [`../Azure/DeploymentChecklist.md`](../Azure/DeploymentChecklist.md) — Azure equivalent
- [`../README.md`](../README.md) — multi-cloud overview
