# SBTM v1 Post-Phase-5 Gap Analysis

- Document owner: Product and Engineering
- Last reviewed: 2026-03-26
- Primary use: Verified gap inventory between current implementation and v1 design/business targets after all five upgrade phases

## Purpose

This analysis reviews the implementation state **after completion of all five upgrade phases** against the revised v1 design in `docs/Design`, the business requirements in `docs/Business`, and the event catalog in `docs/Design/EventCatalog.md`. It identifies remaining deltas that prevent moving from the current state to a fully production-capable v1 platform.

## Related Documents

- [../GapAnalysis.md](../v4/GapAnalysis.md) — Original pre-phase gap analysis
- [../PhaseWiseImplementationPlan.md](../v1/PhaseWiseImplementationPlan.md) — Original phase plan
- [UpgradePlan.md](UpgradePlan.md) — New upgrade plan derived from this analysis
- [../../Design/Architecture.md](../../Design/Architecture.md)
- [../../Design/SecurityPrivacyArchitecture.md](../../Design/SecurityPrivacyArchitecture.md)
- [../../Design/EventCatalog.md](../../Design/EventCatalog.md)
- [../../Business/Requirements.md](../../Business/Requirements.md)
- [../../Business/Features.md](../../Business/Features.md)

## Executive Summary

The five upgrade phases have materially advanced the platform. RLS policies are defined, service-to-service auth guards exist, rate limiting configuration is in place, and GPS event publishing with geofencing has been implemented. However, several Phase 5 deliverables remain partially implemented or are code-present-but-not-activated, and cross-cutting concerns like centralized audit, correlation IDs, data lifecycle, and production observability have not been delivered.

The remaining gaps cluster into three categories:

1. **Activation gaps** — Code exists but guards/middleware are not wired into request pipelines (rate limiting, service-to-service auth).
2. **Missing infrastructure** — Centralized audit pipeline, correlation ID propagation, OpenTelemetry exporters, and data retention jobs have no implementation.
3. **Documentation-to-implementation drift** — The upgrade plan and design docs describe these features as planned; the UpgradePlan phases still show status "Planned" despite partial completion.

## Gap Matrix (Post-Phase-5)

| Area                               | v1 Target                                                   | Current State                                                                            | Gap Level | Phase Origin |
| ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------- | ------------ |
| Rate limiting activation           | Throttler guards applied to all public endpoints            | Package installed, config in docker-compose, guard not applied to controllers            | Medium    | Phase 5      |
| Service-to-service auth activation | Internal JWT/mTLS validated on all inter-service calls      | Guard file exists in student-management; not applied to endpoints in any service         | High      | Phase 5      |
| Centralized audit pipeline         | Cross-service audit events centrally queryable              | No consumer service, no cross-service event schema, compliance service logs locally only | High      | Phase 5      |
| Correlation ID propagation         | Requests traceable across service boundaries                | No HTTP interceptor or middleware propagating correlation headers                        | High      | Phase 5      |
| OpenTelemetry instrumentation      | Distributed tracing with span generation and export         | `@opentelemetry/api` package present; no exporter configuration or span code             | Medium    | Phase 5      |
| Data retention and purge           | Scheduled purge/archival by data class per retention matrix | No purge job code, no archival workflow                                                  | Medium    | Phase 5      |
| DSAR workflow                      | Data subject access requests fulfilled within 30 days       | Not implemented                                                                          | Medium    | Phase 5      |
| Secret management                  | Centralized secret management, no hardcoded secrets         | Secrets in docker-compose env vars; no vault or managed secret integration               | Medium    | Phase 5      |
| CORS origin validation             | All services validate CORS origins                          | Config present in docker-compose; not all services integrate it                          | Low       | Phase 5      |
| Notification service (end-to-end)  | Dedicated notification consumer for parent push/SMS/email   | Phase 1 scope — verify consumer is wired and delivering                                  | Verify    | Phase 1      |
| BLE scanning in driver app         | Expo BLE scanning producing SmartTag payloads               | Phase 2 scope — verify implementation completeness                                       | Verify    | Phase 2      |
| Route deviation alerting           | Deviation events produce downstream emergency alerts        | Phase 3 scope — verify consumer wiring                                                   | Verify    | Phase 3      |
| Tenant onboarding UI               | Full CRUD for boards/schools with invitation workflows      | Phase 4 scope — verify beyond listing pages                                              | Verify    | Phase 4      |
| Absence reporting                  | Parent reports absence affecting driver roster              | Phase 4 scope — verify endpoint and UI                                                   | Verify    | Phase 4      |

## Detailed Gap Analysis

### 1. Phase 5 Items Not Fully Delivered

#### 1.1 Rate Limiting Guard Not Applied

**Design requirement**: SR-INPUT-001 mandates input validation and rate limiting on public endpoints. `@nestjs/throttler` is installed and configured via environment variables (`RATE_LIMIT_TTL=60000`, `RATE_LIMIT_MAX=100`), but the `ThrottlerGuard` is not applied as a global guard or at controller level in any service.

**Impact**: Public API endpoints have no runtime rate limiting despite configuration existing. This is a security hardening gap.

**Recommendation**: Apply `ThrottlerGuard` globally in the API Gateway module.

#### 1.2 Service-to-Service Authentication Not Activated

**Design requirement**: SR-SVC-001 requires authenticated internal service calls. A guard file `internal-service-auth.guard.ts` exists in the student-management service, but it is not applied to any endpoint or used as middleware in any service.

**Impact**: Inter-service calls remain unauthenticated. Any network-accessible service can call any other without identity.

**Recommendation**:

- Generate a shared internal JWT signing key for service-to-service calls.
- Apply the auth guard to all internal endpoints across services.
- Add service identity headers to outgoing inter-service HTTP calls.

#### 1.3 Centralized Audit Pipeline Missing

**Design requirement**: OPS-AUDIT-001 requires critical mutations across all services to be auditable and centrally queryable. The compliance service logs locally, but there is no cross-service audit event schema, no BullMQ consumer for audit events, and no centralized audit storage.

**Impact**: Audit trail is fragmented. Critical mutations in GPS, presence, alerts, and gateway services are not captured in a unified audit log.

**Recommendation**:

- Define a standard audit event schema (action, resource, resourceId, userId, schoolId, timestamp, details).
- Add audit event emission to critical mutation endpoints across all services.
- Create a centralized audit consumer (or extend compliance service) to persist cross-service audit records.

#### 1.4 Correlation ID Propagation Missing

**Design requirement**: OPS-TRACE-001 requires requests to be traceable across service boundaries. The coding standards define fields `requestId`, `tenantId`, `userId`, `action`, but no HTTP interceptor or middleware propagates these headers between services.

**Impact**: Cross-service debugging requires manual log correlation. Incident investigation is slower and less reliable.

**Recommendation**:

- Add correlation ID middleware to the API Gateway that generates or propagates `X-Request-Id` headers.
- Propagate correlation headers in all outgoing HTTP calls from the gateway to downstream services.
- Include correlation ID in all structured log entries.

#### 1.5 OpenTelemetry Not Configured

**Design requirement**: NFR-OBS-001 requires logs, metrics, and traces sufficient to diagnose cross-service issues. `@opentelemetry/api` is installed but no exporter, tracer provider, or span instrumentation exists.

**Impact**: No distributed tracing capability. Production observability is limited to individual service logs.

**Recommendation**:

- Configure OpenTelemetry SDK with a tracer provider and exporter (Jaeger, Zipkin, or OTLP).
- Add automatic HTTP instrumentation for NestJS and Express services.
- Export traces to a local collector for development; plan for managed collector in production.

#### 1.6 Data Retention and Purge Not Implemented

**Design requirement**: PR-RET-001 requires data retained only as long as necessary. The DataRetention.md design document defines explicit retention periods (GPS 90 days, alerts 1 year, presence 90 days, video 30 days, audit 2 years), but no purge jobs, archival workflows, or deletion scheduling exists.

**Impact**: Data grows unbounded. Privacy compliance is not achievable for production deployment.

**Recommendation**:

- Implement scheduled purge jobs for each data class using cron or BullMQ scheduled jobs.
- Add archival support for audit logs and alert records.
- Implement DSAR workflow for personal data retrieval and deletion.

#### 1.7 Secret Management

**Design requirement**: Security architecture calls for separation of secrets from static configuration. Current implementation uses plaintext environment variables in docker-compose.yml.

**Impact**: Acceptable for local development, but not production-ready.

**Recommendation**: Plan integration with a secret management solution (HashiCorp Vault, AWS Secrets Manager, or similar) before production deployment.

### 2. Document-to-Implementation Drift

The following documents contain status or claims that need updating:

| Document                          | Issue                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `docs/prd/UpgradePlan/README.md`  | All phases show status "Planned" — should reflect implementation status                                         |
| `docs/prd/UpgradePlan/Phase-*.md` | All five phases show status "Planned" — acceptance criteria should be checked                                   |
| `docs/prd/GapAnalysis.md`         | Gap matrix shows pre-implementation state — needs post-implementation update                                    |
| `docs/Business/Features.md`       | Feature status (Partial/Planned) needs update for delivered phases                                              |
| `docs/Design/EventCatalog.md`     | `location.updated` and `route.deviation` show "Implemented — Phase 3" but other events need status verification |
| `docs/UserGuide/*`                | Caveats about incomplete features need updating for delivered phases                                            |
| `docs/Demo/*`                     | ~~Scripts reference PowerShell (.ps1) — need updating for bash/Ubuntu~~ **RESOLVED**                            |
| `docs/Operations/*`               | ~~References to PowerShell scripts need updating~~ **RESOLVED**                                                 |

### 3. Cross-Cutting Concerns

#### 3.1 Development Environment — RESOLVED

Bash equivalents have been created for all scripts:

- `init-db.sh` (replaces `init-db.ps1`)
- `reset-demo-db.sh` (replaces `reset-demo-db.ps1`)
- `simulate-demo.sh` (replaces `simulate-demo.ps1`)
- `verify-demo.sh` (replaces `verify-demo.ps1`)

The `package.json` `db:init` script has been updated to use `bash ./scripts/init-db.sh`.
All documentation references have been updated from PowerShell to bash. The original `.ps1` files are retained for reference.

#### 3.2 Testing Infrastructure — RESOLVED

The testing guide has been expanded to include:

- Structured test pyramid documentation
- Test scenario index with IDs (UT01-UT12, IT01-IT08, SM01-SM08, AZ01-AZ05)
- Coverage requirements by component
- CI pipeline stage mapping
- Test data policy and mocking standards

## Recommendations Summary

| Priority | Gap                                | Effort | Requirement   |
| -------- | ---------------------------------- | ------ | ------------- |
| Critical | Centralized audit pipeline         | High   | OPS-AUDIT-001 |
| Critical | Correlation ID propagation         | Medium | OPS-TRACE-001 |
| High     | Service-to-service auth activation | Low    | SR-SVC-001    |
| High     | Rate limiting guard activation     | Low    | SR-INPUT-001  |
| Medium   | OpenTelemetry configuration        | Medium | NFR-OBS-001   |
| Medium   | Data retention/purge jobs          | High   | PR-RET-001    |
| Medium   | DSAR workflow                      | Medium | PR-DEL-001    |
| Medium   | Secret management planning         | Medium | NFR-DATA-001  |
| Low      | CORS integration across services   | Low    | SR-INPUT-001  |
