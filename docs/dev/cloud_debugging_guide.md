# SBTM Cloud Debugging Guide

- Document owner: Engineering / DevOps
- Last reviewed: 2026-04-24
- Audience: Backend, frontend, DevOps engineers debugging issues that only reproduce in the Azure-deployed environment (`demo` or `production`).

This guide describes the **standard practice** for diagnosing problems in the SBTM
system once it is running on Azure (AKS + Static Web Apps + PostgreSQL Flexible
Server + Redis + Blob Storage + Application Insights). It complements
[`local_dev_testing_guide.md`](local_dev_testing_guide.md), which covers
laptop-only workflows.

> **Rule of thumb**: do **not** rebuild the entire Azure stack on your laptop to
> debug a cloud issue. Instead, observe → narrow down → reproduce locally only
> when needed. The tools below let you do that without the cost or maintenance
> burden of running an in-house mini-Azure.

---

## 1. Decision matrix — which environment do I debug in?

| Symptom seen in…                   | Debug here                                                              | Why                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Local Docker / Vite dev server     | [Local guide](local_dev_testing_guide.md)                               | Fastest iteration, no Azure cost                     |
| Demo cluster only (passes locally) | Azure `demo` (`sbtm-demo-rg`)                                           | Issue is config / network / DNS / TLS / IAM specific |
| Production only                    | Production (`sbtm-rg`) — read-only first                                | Avoid destructive actions on tenant data             |
| CI pipeline only                   | GitHub Actions logs + reproduce locally with `act` or matching env vars | Usually env / secret mismatch                        |

When unsure, start in `demo`: it has the same shape as production but is safe
to mutate.

---

## 2. The seven-layer debugging stack

When a request fails end-to-end, walk the stack in order. Each layer has one
canonical command — copy/paste them rather than guessing.

### Layer 1 — Browser (client side)

Open Chrome / Edge DevTools (F12):

| Tab             | What to check                                                               |
| --------------- | --------------------------------------------------------------------------- |
| **Network**     | Failing request URL, status code, `Access-Control-*` headers, response body |
| **Console**     | JavaScript exceptions, `ERR_CERT_*`, mixed-content warnings                 |
| **Security**    | Certificate chain, "Connection is secure" panel — confirms TLS root + SAN   |
| **Application** | LocalStorage (`auth_user`), cookies (`access_token`), service-worker state  |

> Common cloud-only error: `ERR_CERT_COMMON_NAME_INVALID` on `https://api.sbtm.ca`
> means DNS is pointing somewhere other than the AKS ingress (often the registrar's
> parking page because NS delegation isn't done yet — see
> [CustomDomainSetup.md](../Deployment/Azure/CustomDomainSetup.md)).

### Layer 2 — DNS

```bash
# Public resolver, ignores any local hosts file
nslookup api.sbtm.ca 1.1.1.1
nslookup admin.sbtm.ca 1.1.1.1
nslookup -type=NS sbtm.ca 1.1.1.1   # must list the four ns*-04.azure-dns.* names

# What Azure DNS itself thinks the records are
az network dns record-set list -g sbtm-demo-rg -z sbtm.ca -o table
```

Expected: `api.sbtm.ca` → the AKS ingress LB IP (`kubectl get ingress -n sbtm-demo`),
`admin.sbtm.ca` / `parent.sbtm.ca` → the SWA `*.azurestaticapps.net` hostname.

### Layer 3 — TLS

```bash
# Inspect the cert that is actually served (subject, issuer, SAN, dates)
openssl s_client -connect api.sbtm.ca:443 -servername api.sbtm.ca </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

# cert-manager state (issuer + certificate must both be Ready=True)
kubectl get clusterissuer
kubectl get certificate -n sbtm-demo
kubectl describe certificate sbtm-tls -n sbtm-demo | tail -20
kubectl get challenges -A           # only present while ACME is in progress
```

If `Ready=False`, the most common causes are: NS delegation not done, A record
missing, ingress not reachable on port 80 (HTTP-01 needs `:80`).

### Layer 4 — Edge / Ingress

```bash
# What the cluster exposes
kubectl get ingress -A
kubectl get svc -n ingress-nginx          # external IP for the LB
kubectl describe ingress sbtm-ingress -n sbtm-demo

# Live tail of the ingress controller — grep for the failing host or IP
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller -f --tail=200
```

`HTTP 404` from this layer = host header doesn't match any Ingress rule.
`HTTP 502 / 504` = upstream Service has no Ready pods or readinessProbe failing.

### Layer 5 — Service / pod

```bash
# Pods + restarts
kubectl get pods -n sbtm-demo -o wide
kubectl describe pod <pod> -n sbtm-demo            # last 10 events, image pulls

# Live logs of all pods of a service
kubectl logs -n sbtm-demo -l app=api-gateway -f --tail=200
kubectl logs -n sbtm-demo deploy/api-gateway --previous   # last crashed container

# Exec a shell for ad-hoc inspection
kubectl exec -it -n sbtm-demo deploy/api-gateway -- sh
```

Useful one-liners inside a pod:

```sh
env | grep -E 'DB_|REDIS_|JWT_'         # confirm ConfigMap/Secret injection
nslookup sbtm-pg-demo-centralus.postgres.database.azure.com
wget -qO- http://student-management/health
```

### Layer 6 — Application Insights (already provisioned: `sbtm-appinsights-demo`)

App Insights is the most powerful tool for **distributed** failures because it
ties browser, gateway, and downstream service traces together via the
`operation_Id` correlation header.

In the Azure portal → `sbtm-appinsights-demo`:

| Workflow                                            | Where                                     |
| --------------------------------------------------- | ----------------------------------------- |
| Failed requests, timeouts                           | **Failures** blade                        |
| Top exceptions per service                          | **Failures → Exceptions**                 |
| End-to-end transaction (browser → API → DB → Redis) | **Transaction search**, click any request |
| Slow dependencies (Postgres, Redis, HTTP)           | **Performance → Dependencies**            |
| Custom KQL across all logs                          | **Logs** blade                            |

Quick KQL examples:

```kusto
// All 5xx responses to /api/v1/auth/login in the last hour
requests
| where timestamp > ago(1h)
| where url contains "/auth/login" and resultCode startswith "5"
| project timestamp, resultCode, url, cloud_RoleName, operation_Id
| order by timestamp desc

// Exceptions correlated to a specific request
exceptions
| where operation_Id == "<paste from requests>"
```

If you don't see the request at all in App Insights, the failure is happening
**before** the gateway (DNS, TLS, ingress) — go back to layers 2–4.

### Layer 7 — Data plane (Postgres / Redis / Blob)

```bash
# Postgres password (rotated by bootstrap, stored in Key Vault)
DB_PWD=$(az keyvault secret show --vault-name sbtm-kv-demo \
           --name sbtm-db-password --query value -o tsv)

# Connect from your laptop (your IP must be in PG firewall, or use az postgres flexible-server execute)
PGPASSWORD="$DB_PWD" psql -h sbtm-pg-demo-centralus.postgres.database.azure.com \
  -U sbtmadmin -d sbms -c "SELECT count(*) FROM users;"

# Redis ping from inside the cluster (avoids Redis firewall hassles)
kubectl run redis-cli --rm -it --image=redis:7-alpine -n sbtm-demo -- \
  redis-cli -h sbtm-redis-demo.redis.cache.windows.net -p 6380 --tls -a "$REDIS_KEY" PING
```

---

## 3. Standard playbooks for common cloud-only failures

| Symptom                                             | Likely cause                                                                         | Diagnosis                                       | Fix                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ERR_CERT_COMMON_NAME_INVALID` on `api.sbtm.ca`     | NS delegation not done; api.sbtm.ca resolves to registrar parking page               | Layer 2 + Layer 3                               | Paste Azure NS records at registrar (no trailing dot); wait propagation; cert-manager auto-issues |
| `HTTP 404 Not Found` from `api.sbtm.ca`             | Ingress host mismatch or ingress not yet reconciled                                  | Layer 4 (`kubectl describe ingress`)            | Confirm `host: api.sbtm.ca` rule + `kubectl rollout status`                                       |
| `HTTP 502 Bad Gateway`                              | Upstream pod CrashLoopBackOff or readiness failing                                   | Layer 4 logs + Layer 5 `kubectl get pods`       | Fix the failing pod; check Key Vault binding                                                      |
| Login returns 401 from portal but works from `curl` | CORS preflight failing — `Access-Control-Allow-Origin` not set for the portal origin | Layer 1 Network tab (look for failed `OPTIONS`) | Add the portal origin to the gateway's allowed origins env / config                               |
| Portal loads but XHR `net::ERR_FAILED`              | Mixed content (HTTPS portal calling HTTP API) or CORS                                | Layer 1 Console                                 | Make sure `VITE_API_URL` is `https://…`; rebuild SWA                                              |
| Login passes but immediately logged out             | JWT secret mismatch between gateway and downstream services                          | Layer 5 `env \| grep JWT_` in two pods          | Re-seed secret in Key Vault; restart pods                                                         |
| Postgres `password authentication failed`           | KV secret rotated but pods cached old value                                          | Layer 7 + Layer 5                               | `kubectl rollout restart deploy -n sbtm-demo`                                                     |

---

## 4. Bridging cloud → laptop without rebuilding the cluster

When you've narrowed a bug down to a single service but need real cloud traffic
to reproduce it, use one of these techniques **instead of** spinning up a full
local Kubernetes:

### 4a. `kubectl port-forward` — talk to a single service privately

```bash
# Bypass ingress + LB; talk directly to api-gateway
kubectl port-forward -n sbtm-demo svc/api-gateway 8080:80
curl http://localhost:8080/api/v1/health
```

Use this to confirm "is the bug in the service or in ingress/TLS?".

### 4b. Run the service locally against cloud Postgres / Redis (Hybrid+)

```bash
# Pull the live env into .env.local (mirrors what the pod sees)
kubectl exec -n sbtm-demo deploy/api-gateway -- env \
  | grep -E '^(DB_|REDIS_|JWT_|BLOB_)' > services/api-gateway/.env.cloud

# Run the service on your laptop, hitting the real cloud backends
cd services/api-gateway
pnpm install --frozen-lockfile
env $(cat .env.cloud | xargs) pnpm run start:dev
```

Then attach your IDE debugger (VS Code "Attach to Node" on `ws://localhost:9229`).

### 4c. `mirrord` / `telepresence` — true "remote-local" hybrid

For tricky bugs that depend on intra-cluster DNS, sidecars, or pod identity, use
[mirrord](https://mirrord.dev/) (or telepresence). It runs your local process
**as if** it were a pod inside the cluster, so it sees the same env vars,
secrets, and service discovery.

```bash
# One-time install
curl -fsSL https://raw.githubusercontent.com/metalbear-co/mirrord/main/scripts/install.sh | bash

# Run locally, but networked into the demo namespace
mirrord exec -t deployment/api-gateway -n sbtm-demo -- pnpm run start:dev
```

This is the closest thing to "local AKS" without actually running AKS locally.

---

## 5. Why we do **not** mirror the full Azure cluster on every laptop

Engineers occasionally ask "should we run a local AKS-equivalent (kind / k3d /
minikube) so dev = prod?". The answer for SBTM is **no, except in narrow cases**,
because:

1. **Cost of fidelity is high.** A real local mirror needs Azure-DNS-style
   private DNS, Workload Identity, Key Vault CSI, ingress + cert-manager, plus
   PostgreSQL Flexible Server + Redis Premium + Blob Storage + App Insights.
   Maintaining parity with the Bicep templates is a full-time job.
2. **Slows iteration.** Compose / `dev-hybrid.sh` rebuilds in seconds; a local
   K8s rebuild takes minutes per change.
3. **Doesn't catch the bugs that actually need cloud.** The bugs that _only_
   reproduce on Azure are almost always **identity, networking, or quota**
   problems — exactly the things kind/k3d cannot simulate.
4. **App Insights + `mirrord` already cover the gap.** Distributed tracing tells
   you _what_ failed; `mirrord` lets you re-run the failing path with a debugger
   attached.

When a local Kubernetes mirror **is** worth it:

- Debugging Kustomize overlays, NetworkPolicies, ServiceMesh routing, or RBAC
- Verifying init-containers / sidecars / readiness probes in isolation
- Testing Helm chart upgrades or operator behaviour

Recommended tooling for those cases (in order of preference):

| Tool                              | Use case                           | Notes                          |
| --------------------------------- | ---------------------------------- | ------------------------------ |
| [kind](https://kind.sigs.k8s.io/) | Fast, ephemeral cluster on Docker  | Default choice; matches CI     |
| [Tilt](https://tilt.dev/)         | Hot-reload many services into kind | Best DX for multi-service work |
| [Skaffold](https://skaffold.dev/) | Build/push/deploy on file change   | Lighter than Tilt, less UI     |

These are **opt-in** — keep your everyday loop on Compose / Hybrid mode.

---

## 6. Why the web portals are hosted on Static Web Apps, not as containers on AKS

Both portals are client-side React SPAs (`apps/admin-dashboard` and
`apps/parent-dashboard/web`). For SPAs, **Azure Static Web Apps** is a strictly better
fit than running an `nginx` container on AKS:

| Concern                   | Static Web Apps (current)               | nginx pod on AKS                                           |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Cost (demo)               | $0/month (Free SKU, 2 apps)             | ~$20–40/month per portal                                   |
| Global CDN + edge caching | Built-in worldwide                      | Requires Azure Front Door (~$35/mo)                        |
| TLS for custom domain     | Free, auto-renewing                     | cert-manager + Let's Encrypt — works but more moving parts |
| Ops burden                | Zero (no pods, no patching, no scaling) | Pod liveness, HPA, OOMs, rolling restarts                  |
| Scale-to-zero             | Yes (pure storage)                      | No (pods always consume node capacity)                     |
| Build pipeline            | `swa deploy` from `dist/`               | `docker build` + push to ACR + `kubectl rollout`           |
| Suitable for              | SPAs (HTML / JS / CSS)                  | SSR (Next.js server, Nuxt SSR, etc.)                       |

> The repo still ships `apps/admin-dashboard/Dockerfile` so the portals **can**
> run as containers if a future requirement (SSR, intranet-only deployment,
> private VNet, sidecar) makes that necessary. Today it is dormant.

---

## 7. Quick reference — minimum tooling for cloud debugging

```bash
# Required
az --version            # Azure CLI 2.60+
kubectl version --client
jq --version

# Strongly recommended
brew install dnsutils    # for `dig` / `nslookup` (Linux: `apt install bind9-dnsutils`)
brew install openssl     # for `openssl s_client`
curl --version           # already installed everywhere

# Optional but powerful
mirrord --version       # remote-local debugging
swa --version           # Static Web Apps CLI (already used by bootstrap step 11)
```

---

## See also

- [Local Development & Testing Guide](local_dev_testing_guide.md) — laptop-first workflow
- [Deployment / Custom Domain Setup](../Deployment/Azure/CustomDomainSetup.md) — DNS + TLS for `sbtm.ca`
- [Deployment / Azure Architecture](../Deployment/Azure/Architecture.md) — what is deployed where
- [Deployment / Deployment Checklist](../Deployment/Azure/DeploymentChecklist.md) — pre-deploy gates
- `scripts/azure/verify-portals.sh` — automated end-to-end probe used by `bootstrap.sh` step 12

---

## 8. Common production issues (post-login)

### 8.1 Alerts / Presence endpoints return HTTP 503

**Symptom**: After successful login, the admin dashboard shows
`GET /api/v1/alerts` → 503 and `GET /api/v1/presence/stats` → 503 in the
Network tab. The api-gateway pod is `Running` and `/api/v1/health` returns 200.

**Root cause**: The `api-gateway` is a thin proxy that forwards alert/presence/
GPS/student/video/compliance/notification calls to the corresponding
microservice. Each downstream URL is read from an environment variable
(`ALERTS_SERVICE_URL`, `PRESENCE_SERVICE_URL`, `GPS_SERVICE_URL`,
`STUDENT_SERVICE_URL`, `VIDEO_SERVICE_URL`, `COMPLIANCE_SERVICE_URL`,
`NOTIFICATION_SERVICE_URL`, `OSRM_BASE_URL`) and **defaults to
`http://localhost:300x`** when unset — which is correct only inside docker-
compose. In Kubernetes those calls fail with `ECONNREFUSED`, which the gateway
maps to HTTP 503.

**Fix**: Inject in-cluster Service DNS names via the demo overlay
(`infra/k8s/overlays/demo/kustomization.yaml`):

```yaml
- patch: |-
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: ALERTS_SERVICE_URL,        value: "http://emergency-alerts" }
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: GPS_SERVICE_URL,           value: "http://gps-tracking" }
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: PRESENCE_SERVICE_URL,      value: "http://student-presence" }
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: STUDENT_SERVICE_URL,       value: "http://student-management" }
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: VIDEO_SERVICE_URL,         value: "http://video-service" }
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: COMPLIANCE_SERVICE_URL,    value: "http://compliance-management" }
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: NOTIFICATION_SERVICE_URL,  value: "http://notification-service" }
    - op: add
      path: /spec/template/spec/containers/0/env/-
      value: { name: OSRM_BASE_URL,             value: "http://osrm" }
  target: { kind: Deployment, name: api-gateway }
```

Then `kubectl apply -k infra/k8s/overlays/demo && kubectl rollout restart deploy/api-gateway -n sbtm-demo`.

**Verify**:

```bash
T=$(curl -s -X POST https://api.sbtm.ca/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super.admin@sbtm.demo","password":"Admin123!"}' | jq -r .accessToken)
for p in /api/v1/alerts /api/v1/alerts/active /api/v1/presence/stats /api/v1/presence/events; do
  printf "%-30s " "$p"; curl -s -o /dev/null -w "HTTP %{http_code}\n" \
    "https://api.sbtm.ca$p" -H "Authorization: Bearer $T"
done
# All four should return HTTP 200.
```

### 8.2 Map tiles blocked — "Access blocked. Referer is required by tile usage policy"

**Symptom**: Live map and route planner load with grey tiles. DevTools shows
`GET https://*.tile.openstreetmap.org/...` → HTTP 403 with body
`Access blocked. See https://osm.wiki/Blocked`.

**Root cause**: `tile.openstreetmap.org` is a volunteer-funded service whose
[usage policy](https://operations.osmfoundation.org/policies/tiles/) prohibits
bulk/heavy/commercial use, requires a meaningful `Referer` header, and may
block any production-domain origin without notice. SPAs served from a CDN
typically don't send a useful Referer, so the tile servers return 403.

**Industry-standard fix**: Use a commercial tile provider with a per-tenant
API key. We use **MapTiler** because:

| Provider     | Free tier             | Data           | Commercial OK | Notes                                |
| ------------ | --------------------- | -------------- | ------------- | ------------------------------------ |
| **MapTiler** | 100k req/mo           | OSM-based      | Yes           | Drop-in URL, restrict by referrer    |
| Mapbox       | 50k req/mo            | OSM + own data | Yes           | Most features, slightly more complex |
| Stadia Maps  | Free for non-prod dev | OSM-based      | Paid only     | Good fallback                        |
| Self-hosted  | Free                  | OSM            | Yes           | Heavy ops; we already have OSRM      |

**Implementation** (`apps/{admin-dashboard,parent-app/web}/src/lib/mapTiles.ts`):

```ts
const key = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
return key
  ? {
      url: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${key}`,
      attribution: '© MapTiler © OpenStreetMap contributors',
      maxZoom: 20,
    }
  : {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // dev fallback only
      attribution: '© OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
    };
```

Wired through `scripts/azure/bootstrap.sh` step 11 as
`VITE_MAPTILER_KEY` — set `MAPTILER_KEY` in the deploy environment before
running bootstrap, or rebuild and redeploy the SPAs:

```bash
MAPTILER_KEY=<key> bash scripts/azure/bootstrap.sh demo canadacentral 11
```

**Security note**: The MapTiler key is a public client-side key — anyone with a
browser can read it. Restrict it in the MapTiler dashboard by HTTP referrer
(`https://admin.sbtm.ca/*`, `https://parent.sbtm.ca/*`, the SWA default
hostnames, and `http://localhost:5173-5176/*` for local dev) so it cannot be
abused if leaked.

### 8.3 WebSockets through the cluster ingress (alerts & presence)

Each NestJS service that exposes a Socket.IO gateway (currently
emergency-alerts and student-presence) shares a single hostname with the
api-gateway. Socket.IO's default HTTP path is `/socket.io`, so without
intervention every WS connection would land on the api-gateway pod.

**Convention**: each gateway pins its own HTTP path and the ingress routes
that path directly to the matching service.

| Service                                   | Socket.IO `path` | Namespace   | Container port → Service |
| ----------------------------------------- | ---------------- | ----------- | ------------------------ |
| emergency-alerts                          | `/ws/alerts`     | `/alerts`   | 3002 → 80                |
| student-presence                          | `/ws/presence`   | `/presence` | 3003 → 80                |
| api-gateway (REST + default `/socket.io`) | n/a              | n/a         | 3001 → 80                |

Files involved:

- Server: [services/emergency-alerts/src/modules/realtime/websocket.gateway.ts](services/emergency-alerts/src/modules/realtime/websocket.gateway.ts), [services/student-presence/src/modules/realtime/websocket.gateway.ts](services/student-presence/src/modules/realtime/websocket.gateway.ts) — `@WebSocketGateway({ path, namespace, cors })`.
- Ingress: [infra/k8s/base/ingress/ingress-rules.yaml](infra/k8s/base/ingress/ingress-rules.yaml) — two `Prefix` rules (`/ws/alerts`, `/ws/presence`) ordered **before** the catch-all `/`. NGINX ingress already has `proxy-read-timeout: 3600` and `proxy-send-timeout: 3600` to keep WS upgrades alive.
- SPA clients: [apps/admin-dashboard/src/services/websocket/alerts.ws.ts](apps/admin-dashboard/src/services/websocket/alerts.ws.ts), [apps/admin-dashboard/src/services/websocket/presence.ws.ts](apps/admin-dashboard/src/services/websocket/presence.ws.ts) — connect to `${VITE_API_URL}/alerts` and `${VITE_API_URL}/presence`, passing `path: '/ws/alerts'` / `path: '/ws/presence'`.

**Verification** (cluster):

```bash
# Engine.IO handshake should return JSON `{"sid":"...","upgrades":["websocket"],...}`
curl -sS "https://api.sbtm.ca/ws/alerts/?EIO=4&transport=polling"
curl -sS "https://api.sbtm.ca/ws/presence/?EIO=4&transport=polling"
```

**Local dev**: when running services on localhost, set:

```bash
export VITE_API_URL=http://localhost:3001          # api-gateway
export VITE_ALERTS_WS_URL=http://localhost:3002    # emergency-alerts
export VITE_PRESENCE_WS_URL=http://localhost:3003  # student-presence
```

The clients fall back to those overrides only when set; otherwise they use
`VITE_API_URL` and rely on the ingress path-prefix routing. If neither service
is reachable the clients log a single `console.warn` and the rest of the SPA
keeps working with REST polling.
