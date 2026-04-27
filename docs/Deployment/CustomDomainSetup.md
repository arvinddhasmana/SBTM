# Custom Domain Setup — sbtm.ca

This guide explains how the SBTM bootstrap maps the purchased public domain
**sbtm.ca** to the deployed admin portal, parent portal, and API gateway, and
what manual steps are required at the domain registrar.

## End-state URLs

| Component     | Public URL               | Backend                                      |
| ------------- | ------------------------ | -------------------------------------------- |
| Admin portal  | `https://admin.sbtm.ca`  | Azure Static Web App `sbtm-admin-<env>`      |
| Parent portal | `https://parent.sbtm.ca` | Azure Static Web App `sbtm-parent-<env>`     |
| API gateway   | `https://api.sbtm.ca`    | NGINX Ingress on AKS → `api-gateway` Service |

TLS certificates are issued automatically:

- Admin & Parent portals → Azure Static Web Apps managed certificates (free).
- API gateway → cert-manager + Let's Encrypt (free, ACME HTTP-01 via the same NGINX Ingress).

## Cost summary

| Item                                       | Monthly cost                |
| ------------------------------------------ | --------------------------- |
| Azure DNS public zone (`sbtm.ca`)          | ~$0.50 + $0.40 / 1M queries |
| Static Web Apps × 2 (Free, demo)           | $0                          |
| Static Web Apps × 2 (Standard, production) | $18                         |
| Let's Encrypt cert for `api.sbtm.ca`       | $0                          |
| Domain registrar fee for `sbtm.ca`         | varies (already paid)       |

## What `bootstrap.sh` does automatically

| Step | Action                                                                                                                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5    | Provisions the application resource group (`sbtm-demo-rg` / `sbtm-rg`) and Static Web Apps via Bicep. (DNS zone is provisioned out-of-band — see below.)                                                                                                                                                    |
| 10   | **Ensures the persistent DNS RG `sbtm-dns-rg` and zone `sbtm.ca` exist** (creates them once, idempotent on every re-run). Then creates `admin` and `parent` CNAME records in the zone, registers each subdomain with its SWA using `dns-txt-token` validation, and writes the `_dnsauth.<sub>` TXT records. |
| 11   | Builds both SPAs with `VITE_API_URL=https://api.sbtm.ca` and uploads them via the Azure SWA CLI.                                                                                                                                                                                                            |
| 12   | Applies the demo overlay (NGINX Ingress + cert-manager `letsencrypt-prod` ClusterIssuer for `api.sbtm.ca`), waits for the LoadBalancer IP, and creates the `api` A record in the persistent DNS zone.                                                                                                       |

After step 12, `verify-portals.sh` confirms HTTPS is reachable on all three URLs.

### Why the DNS zone lives in a separate resource group

The public DNS zone `sbtm.ca` is created in **`sbtm-dns-rg`** (override with `DNS_RESOURCE_GROUP=...`). This RG is **never** deleted by `teardown-azure.sh`, so:

- The four Azure name servers stay the same forever.
- You paste the NS records at your registrar **once** (see below) and never need to re-paste them, even if you fully tear down and rebuild the application RG.
- Teardown only clears the `admin` / `parent` / `api` / `_dnsauth.*` records inside the zone (the SWA bindings); the zone object itself is preserved.

## One-time manual step — delegate `sbtm.ca` to Azure DNS

Azure DNS hosts the zone but the registrar must point `sbtm.ca` at Azure's name
servers before any of these URLs resolve publicly.

1. Run `bootstrap.sh` (or `az network dns zone show -g sbtm-dns-rg -n sbtm.ca --query nameServers -o tsv`) to obtain the four name-server records:
   ```
   ns1-XX.azure-dns.com.
   ns2-XX.azure-dns.net.
   ns3-XX.azure-dns.org.
   ns4-XX.azure-dns.info.
   ```
2. Sign in to your domain registrar's control panel.
3. Replace the existing name servers for `sbtm.ca` with the four Azure DNS NS records.
4. Save. Propagation typically takes 15 minutes – 24 hours.

You can verify propagation with:

```bash
dig +short NS sbtm.ca
# Should list the Azure DNS name servers.
```

## TLS provisioning timeline

Once delegation is complete:

- Static Web Apps validate the `_dnsauth.<sub>` TXT record and issue a managed
  certificate. This typically completes within 5–15 minutes after the DNS records
  become public. The portal status will move from `Validating` → `Ready`.
- cert-manager performs an ACME HTTP-01 challenge through the NGINX Ingress and
  issues a Let's Encrypt certificate for `api.sbtm.ca`. This usually completes
  within 1–2 minutes after the A record becomes public.

## Re-running

`bootstrap.sh` is idempotent: re-running it is safe and will:

- Re-upload the latest portal builds.
- Re-create any DNS records that drifted.
- Skip SWA hostname binding if already bound.

## Troubleshooting

### `Validating` stuck on a custom domain

Azure occasionally caches a failed lookup against an older/missing TXT token.
`bootstrap.sh` step 10 now auto-detects this state and recreates the binding to
force a fresh token, then refreshes the `_dnsauth.<sub>` TXT record. To trigger
the same fix manually:

```bash
SUB=admin   # or parent
SWA="sbtm-${SUB}-demo"
az staticwebapp hostname delete -g sbtm-demo-rg -n "$SWA" --hostname "${SUB}.sbtm.ca" --yes
sleep 5
az staticwebapp hostname set    -g sbtm-demo-rg -n "$SWA" --hostname "${SUB}.sbtm.ca" \
  --validation-method dns-txt-token --no-wait
sleep 20
TOK=$(az staticwebapp hostname show -g sbtm-demo-rg -n "$SWA" --hostname "${SUB}.sbtm.ca" --query validationToken -o tsv)
az network dns record-set txt delete -g sbtm-dns-rg -z sbtm.ca -n "_dnsauth.${SUB}" --yes
az network dns record-set txt create -g sbtm-dns-rg -z sbtm.ca -n "_dnsauth.${SUB}" --ttl 60
az network dns record-set txt add-record -g sbtm-dns-rg -z sbtm.ca -n "_dnsauth.${SUB}" --value "$TOK"
```

Then verify public DNS sees the new token (DoH bypasses local resolver caches):

```bash
curl -s "https://dns.google/resolve?name=_dnsauth.${SUB}.sbtm.ca&type=TXT" | jq .Answer
```

Validation typically completes within 5–15 min after the new TXT is public.

### `api.sbtm.ca` returns 404 / connection refused

- Verify the LB IP: `kubectl get svc -A -o wide | grep LoadBalancer`.
- Verify the A record: `dig +short api.sbtm.ca`.
- Inspect cert-manager: `kubectl describe certificate sbtm-tls -n sbtm-demo`.
- Inspect NGINX Ingress logs: `kubectl logs -n ingress-nginx deploy/ingress-nginx-controller`.

### Certificate not issued

- `kubectl describe challenge -n sbtm-demo`
- `kubectl describe order -n sbtm-demo`
- Common cause: A record not yet propagated when ACME challenge runs. Re-trigger:
  `kubectl delete certificate sbtm-tls -n sbtm-demo` (cert-manager re-issues).

### CORS errors from a portal

The `CORS_ORIGINS` env var on the api-gateway Deployment must include both
`https://admin.sbtm.ca` and `https://parent.sbtm.ca`. The demo overlay sets
this automatically; for production check
`infra/k8s/overlays/production/kustomization.yaml`.

## Apex `sbtm.ca`

Plain `https://sbtm.ca` is intentionally unbound (Static Web Apps do not
support apex ALIAS records cheaply). To redirect the apex to the parent portal,
add a `staticwebapp.config.json` rewrite under `apps/parent-app/web/public/` and
bind `sbtm.ca` as a custom domain on the parent SWA in a follow-up change.

## Future: GitHub Actions auto-deploy

Bootstrap performs the _initial_ CLI upload. Pushes to `main` do not auto-redeploy.
A `.github/workflows/deploy-frontends.yml` workflow using the SWA deployment tokens
(stored as GitHub Secrets) is tracked as a follow-up enhancement.
