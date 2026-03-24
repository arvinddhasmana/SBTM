Here’s the complete, GitHub‑ready template for **Module 8 — Cloud Backend / API Gateway**, aligned with everything you’ve already defined. You can paste this directly into a GitHub Issue and assign to Copilot Developer, Reviewer, and Tester agents.

---

# ✅ GITHUB ISSUE TEMPLATE — MODULE 8: Cloud Backend / API Gateway  
### *(Use issue title: “Module 8 — Cloud Backend / API Gateway”)*

---

# ☁️ Module 8 — Cloud Backend / API Gateway  
**Goal:**  
Build a **central backend layer** that exposes a unified, secure API surface to all clients (Parent App, Driver App, Admin Dashboard), routes requests to underlying services (GPS Tracking, Emergency Alerts, Video, Student Presence, Auth), and enforces cross‑cutting concerns (auth, rate limiting, logging, error handling).

This module must be **independent**, **deployable on its own**, and treat all downstream services as external dependencies accessed via HTTP (or later gRPC/message bus).

---

## ✅ SECTION A — Developer Specification (Copilot Developer)

### 1. Tech stack

- **Framework:** NestJS (TypeScript)
- **Pattern:** API Gateway / BFF (Backend‑for‑Frontend)
- **Transport:** REST (JSON), SSE, WebSockets proxy
- **Security:**  
  - JWT Auth (Access + optional Refresh)  
  - Role‑based access (ADMIN / DRIVER / PARENT / SYSTEM)
- **Rate limiting:**  
  - Per IP and per user (basic, Redis‑backed if available)
- **Configuration:**  
  - ENV‑driven URLs for each downstream service  
  - Central logging configuration

---

### 2. Responsibility boundaries

The API Gateway should:

- Expose a **single base URL** to clients (e.g., `https://api.example.com`).
- Handle:
  - Authentication & authorization
  - Input validation
  - Request routing to internal services
  - Response normalization
  - Central error handling
  - Rate limiting and basic throttling
  - CORS configuration
- **Must NOT** contain heavy business logic; that belongs in underlying services (Modules 1–7).

---

### 3. Module folder structure

Place under `/services/api-gateway/`:

```text
/services/api-gateway
  /src
    /modules
      /auth
        auth.controller.ts
        auth.service.ts
        dto/
      /gateway
        gps.gateway.ts           // proxies to GPS Tracking Service
        alerts.gateway.ts        // proxies to Emergency Alerts Service
        presence.gateway.ts      // proxies to Student Presence Service
        video.gateway.ts         // proxies to Video Service
        routes.gateway.ts        // route aggregation if needed
      /common
        guards/
          roles.guard.ts
          auth.guard.ts
        interceptors/
          logging.interceptor.ts
          timeout.interceptor.ts
        filters/
          http-exception.filter.ts
        middleware/
          rate-limit.middleware.ts
        utils/
          httpClient.ts          // wrapper around axios/fetch
    /config
      env.ts
    /tests
      /unit
      /integration
  Dockerfile
  package.json
  tsconfig.json
  README.md
```

---

### 4. Core features (MVP)

1. **Authentication & Identity**
   - `/auth/login` → issues JWT (access + optional refresh)
   - `/auth/me` → returns current user profile + roles
   - Integrate with user store (can be stubbed/backed by Auth service or local users table for MVP).

2. **Service Routing / Aggregation**
   - Proxy and normalize:

     - GPS:
       - `GET /routes/:routeId/live-location`
       - `GET /routes/:routeId/history`
     - Alerts:
       - `GET /alerts/active`
       - `GET /alerts/:id`
       - `POST /emergency-events`
     - Presence:
       - `GET /routes/:routeId/students`
       - `POST /student-presence-events`
     - Video:
       - `GET /video-events`
       - `GET /video-events/:id`
       - `POST /video-events`

3. **Security & Roles**
   - Role‑based access guard:
     - Parents can only access their children’s routes.
     - Drivers can only access their own routes.
     - Admins can access all.

4. **Error Handling & Logging**
   - Central HTTP exception filter to:
     - Log errors
     - Return standardized error payload:
       ```json
       {
         "error": {
           "code": "RESOURCE_NOT_FOUND",
           "message": "Route not found",
           "details": {}
         }
       }
       ```

5. **Rate Limiting**
   - Basic rate limit per IP and per user (configurable).
   - Use in‑memory store for MVP; Redis for later.

6. **CORS & Security Headers**
   - Allow only approved origins (Admin, Parent, Driver apps).
   - Set `X-Content-Type-Options`, `X-Frame-Options`, etc.

---

### 5. Public API surface (examples)

These are the **client‑facing** endpoints; internally they call downstream services.

#### ✅ Auth

- `POST /auth/login`
- `POST /auth/logout` (optional for revocation)
- `GET /auth/me`

#### ✅ GPS (proxies Module 1)

- `GET /routes/:routeId/live-location`
- `GET /routes/:routeId/history?from=&to=`

#### ✅ Alerts (proxies Module 4)

- `GET /alerts/active`
- `GET /alerts/:id`
- `POST /emergency-events`

#### ✅ Student Presence (proxies Module 6)

- `GET /routes/:routeId/students`
- `POST /student-presence-events` (manual overrides from Driver App)

#### ✅ Video (proxies Module 5)

- `GET /video-events`
- `GET /video-events/:id`
- `POST /video-events`

> Downstream URLs should be read from environment variables:
> - `GPS_SERVICE_URL`
> - `ALERTS_SERVICE_URL`
> - `PRESENCE_SERVICE_URL`
> - `VIDEO_SERVICE_URL`
> - `AUTH_SERVICE_URL` (if separate)

---

### 6. Data models (Gateway DTOs)

These should mirror what’s already defined, but you can create **gateway DTOs** to decouple internal representation from downstream services.

Examples:

#### `LiveLocationDto`
```ts
routeId: string
vehicleId: string
lastUpdate: string
position: { lat: number; lng: number }
etaToNextStopMinutes: number
deviationFlag: boolean
```

#### `AlertDto`
```ts
id: string
routeId: string
vehicleId: string
timestamp: string
eventType: string
status: "ACTIVE" | "RESOLVED"
```

#### `StudentPresenceDto`
```ts
studentId: string
name: string
status: "BOARDED" | "ALIGHTED"
lastSeen: string
```

#### `VideoEventDto`
```ts
id: string
routeId: string
vehicleId: string
timestamp: string
eventType: string
videoUrl: string
thumbnailUrl?: string
```

---

### 7. User flows (from Gateway perspective)

#### ✅ Flow 1: Parent viewing live bus

1. Parent App → `GET /routes/:routeId/live-location` (via Gateway).
2. Gateway:
   - Authenticates JWT.
   - Checks that parent is allowed to access this route.
   - Calls GPS Service `/routes/:routeId/live-location`.
   - Returns normalized response to client.

#### ✅ Flow 2: Driver sending emergency event

1. Driver App → `POST /emergency-events`.
2. Gateway:
   - Validates driver token.
   - Forwards body to Alerts Service `/api/v1/emergency-events`.
   - Returns response to client.

#### ✅ Flow 3: Admin viewing alert details

1. Admin → `GET /alerts/:id`.
2. Gateway:
   - Validates admin role.
   - Calls Alerts Service API.
   - Returns normalized alert.

---

### 8. Lifecycle Diagrams (text)

#### ✅ Request lifecycle (generic)

```
Client → API Gateway → Auth Guard → Role Guard → Validation → 
→ Downstream Service HTTP Call → Response Mapping → Client
```

#### ✅ Error lifecycle

```
Downstream Error → API Gateway HTTP Client → Throws → Exception Filter → 
→ Standard Error JSON → Client
```

---

## ✅ SECTION B — Reviewer Checklist (Copilot Reviewer)

### Architecture

- [ ] Controllers are thin; gateway logic in service classes.
- [ ] Downstream service URLs are only read from config/env.
- [ ] No business logic resides in the gateway beyond routing and access control.

### Security

- [ ] All protected routes require JWT.
- [ ] Role guard enforced for ADMIN / DRIVER / PARENT routes.
- [ ] No internal service URLs are leaked to clients.
- [ ] CORS only allows known frontends.

### Reliability

- [ ] HTTP client has sensible timeouts and retries.
- [ ] Downstream failures are handled gracefully with proper error codes.
- [ ] Rate limiting works as expected on high request bursts.

### Code quality

- [ ] TypeScript strict mode enabled.
- [ ] No `any` types; DTOs defined for request/response.
- [ ] Common concerns (logging, error handling) abstracted and reused.

### Testing

- [ ] Unit tests for gateway services (mock downstream calls).
- [ ] Integration tests for major endpoints with mocked downstream services.
- [ ] Tests cover:
  - Auth failures
  - Downstream service unavailability
  - Permission denials

---

## ✅ SECTION C — Tester Acceptance Criteria (Copilot Tester)

### Auth & Roles

- [ ] `POST /auth/login` returns JWT for valid credentials.
- [ ] Unauthorized requests to protected endpoints return `401`.
- [ ] A PARENT cannot access another child’s route data.
- [ ] A DRIVER cannot access another driver’s routes.
- [ ] An ADMIN can access all data.

### Routing correctness

- [ ] `GET /routes/:routeId/live-location` returns same core data as GPS Service (when called directly).
- [ ] `POST /emergency-events` correctly reaches the Alerts Service (verified via logs / mocks).
- [ ] `GET /video-events/:id` correctly proxies to Video Service.

### Error handling

- [ ] If a downstream service returns 500, Gateway returns a 502/503 with proper error JSON.
- [ ] Invalid route IDs return 404 with a clear error message.
- [ ] Invalid payloads return 400 with validation error info.

### Rate limiting

- [ ] Excessive requests from a single IP trigger rate limiting.
- [ ] Rate limit response includes appropriate status code (e.g., 429).

---

## ✅ SECTION D — Future Enterprise‑grade Upgrade Path

1. **Service mesh integration**
   - Migrate from manual HTTP calls to service mesh (Istio/Linkerd) or API management platform.
   - Keep Gateway as BFF or thin API.

2. **GraphQL layer**
   - Optional GraphQL façade on top of REST APIs for rich querying.
   - Keeps underlying microservices unchanged.

3. **Multi‑region and failover**
   - Deploy Gateway in multiple regions.
   - Add global load balancing.

4. **Advanced security**
   - OIDC / SSO integration with school board identity providers.
   - Fine‑grained policy (ABAC/RBAC) for sensitive operations.

5. **Observability**
   - Distributed tracing (OpenTelemetry).
   - Dashboards for latency, error rates per service.
