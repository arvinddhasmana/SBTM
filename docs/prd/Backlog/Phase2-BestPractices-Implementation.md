# Phase 2: Best Practices Implementation Plan

> **Created**: 2026-03-31  
> **Status**: In Progress  
> **Priority**: Security → Standardization → Performance → Observability

This document covers 5 medium-effort improvements identified during the codebase best-practices gap analysis. Items are ordered by priority.

---

## Item 1: httpOnly Cookies + Secure Token Storage

**Priority**: Highest (Security)  
**Risk**: Medium  
**Current State**: JWTs stored in `localStorage` — vulnerable to XSS attacks.  
**Target State**: JWT delivered via httpOnly, Secure, SameSite=Strict cookie.

### Steps

| Step | Change                                                                                                    | Files                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A    | Add `cookie-parser` to api-gateway dependencies                                                           | `services/api-gateway/package.json`                                                                       |
| B    | Register cookie-parser middleware in bootstrap                                                            | `services/api-gateway/src/main.ts`                                                                        |
| C    | Modify login endpoint to set accessToken as httpOnly cookie instead of JSON body                          | `services/api-gateway/src/modules/auth/auth.controller.ts`                                                |
| D    | Add `/auth/logout` endpoint that clears the cookie                                                        | `services/api-gateway/src/modules/auth/auth.controller.ts`                                                |
| E    | Update JwtStrategy to extract token from cookie (fallback to Authorization header for service-to-service) | `services/api-gateway/src/modules/auth/strategies/jwt.strategy.ts`                                        |
| F    | Admin dashboard: add `withCredentials: true` to axios, remove `localStorage.setItem('auth_token')`        | `apps/admin-dashboard/src/services/api/api-client.ts`, `apps/admin-dashboard/src/context/AuthContext.tsx` |
| G    | Parent app: same as F                                                                                     | `apps/parent-app/web/src/services/api.ts`, `apps/parent-app/web/src/context/AuthContext.tsx`              |

### Cookie Configuration

```typescript
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
});
```

### Backward Compatibility

- JwtStrategy must check cookie first, then fall back to Authorization header
- Service-to-service calls (InternalServiceAuthGuard) continue using Authorization header
- Driver app (React Native) continues using Authorization header (no cookies in mobile)

---

## Item 2: NestJS v10 → v11 Upgrade (api-gateway)

**Priority**: High (Standardization)  
**Risk**: Low-Medium  
**Current State**: api-gateway on NestJS v10.4.15, all other 5 NestJS services on v11.0.1.  
**Target State**: All services on NestJS v11.

### Dependencies to Bump

| Package                    | From     | To      |
| -------------------------- | -------- | ------- |
| `@nestjs/common`           | ^10.4.15 | ^11.0.1 |
| `@nestjs/core`             | ^10.4.15 | ^11.0.1 |
| `@nestjs/platform-express` | ^10.4.15 | ^11.0.1 |
| `@nestjs/jwt`              | ^10.2.0  | ^11.0.0 |
| `@nestjs/passport`         | ^10.0.3  | ^11.0.0 |
| `@nestjs/typeorm`          | ^10.0.2  | ^11.0.0 |
| `@nestjs/config`           | ^3.3.0   | ^4.0.2  |
| `@nestjs/throttler`        | ^5.2.0   | ^6.4.0  |

### Steps

| Step | Change                                                                    |
| ---- | ------------------------------------------------------------------------- |
| A    | Update all `@nestjs/*` versions in `services/api-gateway/package.json`    |
| B    | Run `pnpm install` to resolve                                             |
| C    | Fix any breaking import/API changes (decorator signatures, module config) |
| D    | Verify build: `pnpm --filter api-gateway build`                           |
| E    | Run unit tests: `pnpm --filter api-gateway test`                          |
| F    | Run e2e tests: `pnpm --filter api-gateway test:e2e`                       |

### Known Breaking Changes (v10→v11)

- `@nestjs/config`: ConfigModule API unchanged, but package major bumped
- `@nestjs/throttler`: v5→v6 changes guard registration pattern
- `@nestjs/passport`: Strategy registration syntax unchanged
- Decorator compatibility: @Req(), @Res(), @Body() unchanged

---

## Item 3: TanStack Query (Frontend Data Fetching)

**Priority**: Medium (Performance/DX)  
**Risk**: Medium  
**Current State**: Direct axios calls with manual `useEffect` + `useState` polling.  
**Target State**: TanStack Query for caching, deduplication, automatic refetch, retry.

### Steps

| Step | Change                                                         | Files                                                                   |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A    | Add `@tanstack/react-query` + `@tanstack/react-query-devtools` | `apps/admin-dashboard/package.json`, `apps/parent-app/web/package.json` |
| B    | Create `QueryClientProvider` wrapper                           | Each app's entry point (`main.tsx` or `App.tsx`)                        |
| C    | Create query key factory                                       | `src/services/query-keys.ts` in each app                                |
| D    | Convert API service files to return fetcher functions          | `src/services/api/*.ts`                                                 |
| E    | Replace `useEffect` + `useState` patterns with `useQuery`      | Dashboard.tsx, presence pages, etc.                                     |
| F    | Replace manual POST/PATCH calls with `useMutation`             | Form submission components                                              |
| G    | Replace `setInterval` polling with `refetchInterval` option    | Dashboard.tsx (currently 10s polling)                                   |

### Target Architecture

```
// Before (current)
const [data, setData] = useState([]);
useEffect(() => { api.getStudents().then(setData); }, []);

// After (TanStack Query)
const { data } = useQuery({
  queryKey: ['students', schoolId],
  queryFn: () => api.getStudents(schoolId),
  refetchInterval: 10_000,
});
```

### Scope

- **Admin Dashboard**: ~15 components with data fetching
- **Parent App Web**: ~8 components with data fetching
- **Driver App (React Native)**: Deferred (uses different data flow with GPS streaming)

---

## Item 4: Structured Logging (pino)

**Priority**: Medium (Observability)  
**Risk**: Low  
**Current State**: Mix of NestJS `Logger` (backend) + `console.log` (frontend). Manual `JSON.stringify` in LoggingInterceptor.  
**Target State**: Structured JSON logging via pino across all NestJS services.

### Steps

| Step | Change                                                                      | Files                                                 |
| ---- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| A    | Add `nestjs-pino`, `pino-http`, `pino-pretty` to all NestJS services        | All 6 `services/*/package.json`                       |
| B    | Register `LoggerModule` in each service's `AppModule`                       | All `app.module.ts` files                             |
| C    | Update `LoggingInterceptor` in `@sbtm/common` to use pino-compatible output | `libs/common/src/interceptors/logging.interceptor.ts` |
| D    | Replace `console.log` in service `main.ts` files with NestJS Logger         | All `main.ts` files                                   |
| E    | Frontend: wrap `console.log` in utility that no-ops in production           | `apps/*/src/utils/logger.ts`                          |

### Pino Configuration

```typescript
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
});
```

### Benefits

- Automatic request/response logging with correlation IDs
- Redaction of sensitive headers (authorization, cookies)
- JSON output in production, pretty-print in development
- 30% faster than winston for high-throughput logging

---

## Item 5: OpenTelemetry Distributed Tracing

**Priority**: Lower (Observability)  
**Risk**: Medium  
**Current State**: No distributed tracing. Correlation IDs exist via `x-request-id` middleware but are not wired into trace context.  
**Target State**: OpenTelemetry auto-instrumentation with trace propagation across services.

### Steps

| Step | Change                                                     | Files                                                     |
| ---- | ---------------------------------------------------------- | --------------------------------------------------------- |
| A    | Add OpenTelemetry packages to `@sbtm/common`               | `libs/common/package.json`                                |
| B    | Create tracing bootstrap in shared lib                     | `libs/common/src/config/tracing.ts`                       |
| C    | Initialize tracing before NestJS bootstrap in each service | All `main.ts` files                                       |
| D    | Add Jaeger service to docker-compose                       | `docker-compose.yml`, `docker-compose.infra.yml`          |
| E    | Wire `x-request-id` into OpenTelemetry baggage             | `libs/common/src/middleware/correlation-id.middleware.ts` |

### Packages

```json
{
  "@opentelemetry/sdk-node": "^0.52.0",
  "@opentelemetry/auto-instrumentations-node": "^0.49.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.52.0",
  "@opentelemetry/resources": "^1.25.0",
  "@opentelemetry/semantic-conventions": "^1.25.0"
}
```

### Jaeger Docker Addition

```yaml
jaeger:
  image: jaegertracing/all-in-one:1.58
  ports:
    - '16686:16686' # UI
    - '4318:4318' # OTLP HTTP
  environment:
    COLLECTOR_OTLP_ENABLED: 'true'
```

### Tracing Bootstrap

```typescript
// libs/common/src/config/tracing.ts
export function initTracing(serviceName: string) {
  const sdk = new NodeSDK({
    resource: new Resource({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
}
```

---

## Implementation Order

```
Item 1 (httpOnly Cookies) → commit & push
    ↓
Item 2 (NestJS v11) → commit & push
    ↓
Item 3 (TanStack Query) → commit & push
    ↓
Item 4 (Structured Logging) → commit & push
    ↓
Item 5 (OpenTelemetry) → commit & push
```

Each item is independently deployable and does not depend on subsequent items.
