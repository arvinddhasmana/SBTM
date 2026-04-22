# Phase 5: Security, Compliance, and Production Hardening

- Document owner: Product and Engineering
- Last reviewed: 2026-03-30
- Phase status: Planned
- Gap level: Medium

## Goal

Close the gap between a functioning prototype and a deployable enterprise-aligned platform. Security controls, audit infrastructure, and data lifecycle management reach production grade.

## Why This Phase Is Last

Hardening should be applied after core workflows are functionally complete. Phases 1–4 establish the operational surface; Phase 5 wraps it with enterprise security, observability, and compliance controls.

## Current State (from Gap Analysis)

| Capability                                              | Status                                            |
| ------------------------------------------------------- | ------------------------------------------------- |
| JWT-based auth at gateway                               | Implemented                                       |
| RBAC guards at gateway                                  | Implemented                                       |
| Application-layer tenant isolation (school_id)          | Implemented                                       |
| PostgreSQL RLS policies                                 | Not implemented                                   |
| Service-to-service authentication                       | Not implemented                                   |
| Centralized audit pipeline                              | Not implemented (compliance service logs locally) |
| Correlation IDs across services                         | Not implemented                                   |
| Data retention schedules                                | Not implemented                                   |
| Archival and purge workflows                            | Not implemented                                   |
| Production observability (centralized tracing, metrics) | Not implemented                                   |

## Scope

### 1. Database Tenant Hardening

- Add PostgreSQL Row-Level Security (RLS) policies for tenant-scoped tables in downstream services.
- Implement `SET app.current_school_id` in service middleware before queries.
- Review schema patterns that require tenant context propagation beyond `school_id` filtering.
- Test that RLS prevents cross-tenant data access even with direct SQL access.

**Implementation modules affected:**

- All service modules (1–6, 8–10) — database-layer changes
- [Module-8-ApiGateway.md](../../../Implementation/Module-8-ApiGateway.md) — Tenant context propagation

**Requirements traced:**

- NFR-SEC-001: Tenant isolation enforceable at database layer
- SR-TENANT-001: Cross-tenant data access prevented even with compromised application logic

### 2. Service-to-Service Trust

- Implement internal JWT signing or mTLS for inter-service communication.
- Define service identity for each backend service.
- Implement key rotation and failure behavior.
- Audit and log service-to-service calls with source attribution.

**Implementation modules affected:**

- All backend service modules — authentication middleware
- [Module-8-ApiGateway.md](../../../Implementation/Module-8-ApiGateway.md) — Token delegation

**Requirements traced:**

- SR-SVC-001: All internal service calls are authenticated and attributable
- SR-SVC-002: Service credentials rotate on a defined schedule

### 3. Centralized Audit and Observability

- Emit structured audit events for critical mutations across all services.
- Centralize logs using a log aggregation pipeline (ELK, Loki, or equivalent).
- Implement distributed tracing with correlation IDs (OpenTelemetry).
- Centralize metrics collection and dashboarding.
- Configure alerting for safety-critical metrics (see monitoring_observability.md).

**Implementation modules affected:**

- All service modules — audit event emission and structured logging
- New: Observability infrastructure setup

**Requirements traced:**

- OPS-AUDIT-001: All critical data mutations are auditable
- OPS-TRACE-001: Requests can be traced across service boundaries
- OPS-MON-001: Safety-critical services are monitored with alerting

### 4. Data Lifecycle and Privacy Controls

- Define and implement retention schedules for each data category:

| Data Category            | Retention                  | Action After            |
| ------------------------ | -------------------------- | ----------------------- |
| GPS location records     | 90 days                    | Archive to cold storage |
| Emergency alert records  | 1 year                     | Archive                 |
| Presence events          | 90 days                    | Archive                 |
| Video metadata and files | 30 days                    | Purge                   |
| Audit logs               | 2 years                    | Archive                 |
| Student records          | Active enrollment + 1 year | Anonymize               |

- Implement purge jobs as scheduled tasks.
- Implement data subject access requests (DSAR) workflow for PIPEDA compliance.
- Document data residency and encryption controls.

**Implementation modules affected:**

- All service modules — data lifecycle integration
- [Module-10-ComplianceManagement.md](../../../Implementation/Module-10-ComplianceManagement.md) — Compliance audit coordination

**Requirements traced:**

- PR-RET-001: Data retained only as long as necessary for stated purpose
- PR-DEL-001: Personal data deleted upon request within 30 days
- PR-ENC-001: PII encrypted at rest and in transit

## Dependencies

| Dependency                                 | Source     | Status             |
| ------------------------------------------ | ---------- | ------------------ |
| Stable event and notification architecture | Phase 1    | Required           |
| Complete operational workflows             | Phases 2–4 | Required           |
| Deployment topology decisions              | DevOps     | Needs decision     |
| Secret management infrastructure           | DevOps     | Needs setup        |
| Log aggregation service                    | DevOps     | Needs provisioning |

## Acceptance Criteria

- [ ] PostgreSQL RLS prevents cross-tenant data access at the database layer.
- [ ] Cross-service calls are authenticated and attributable to a specific service identity.
- [ ] Critical mutations across all services emit audit events that are centrally queryable.
- [ ] Requests can be traced across service boundaries using correlation IDs.
- [ ] Retention schedules are configured and purge jobs run on schedule.
- [ ] Data subject access requests can be fulfilled within 30 days.

## Verification

| Test Type               | Scope                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| Database security test  | Direct SQL query bypasses application but RLS blocks cross-tenant access        |
| Service auth test       | Internal call without valid service token is rejected                           |
| Audit completeness test | Create/update/delete operations across services produce queryable audit trail   |
| Tracing test            | E2E request produces correlated trace across gateway and 2+ downstream services |
| Retention test          | Data older than retention period is archived/purged on schedule                 |
| PIPEDA test             | DSAR workflow returns all personal data for a given subject within SLA          |

## Demo Impact

After Phase 5, the platform can credibly move from demo-grade to **production-readiness planning**. Security controls, audit trails, and compliance infrastructure demonstrate enterprise fitness.

## Related Documents

- [Phase-1-ParentSafetyCommunication.md](Phase-1-ParentSafetyCommunication.md) through [Phase-4-TenantAdminProvisioning.md](Phase-4-TenantAdminProvisioning.md) — Prerequisites
- [../GapAnalysis.md](../GapAnalysis.md) — Gaps: "Multi-tenant isolation" (Medium), "Service-to-service security" (Medium), "Audit and compliance" (Medium), "Data lifecycle" (Medium)
- [../../sdlc_guidelines/01_security_compliance/privacy_compliance.md](../../../sdlc_guidelines/01_security_compliance/privacy_compliance.md) — PIPEDA/MFIPPA compliance rules
- [../../sdlc_guidelines/07_deployment_operations/monitoring_observability.md](../../../sdlc_guidelines/07_deployment_operations/monitoring_observability.md) — Observability standards
- [../../sdlc_guidelines/07_deployment_operations/incident_response.md](../../../sdlc_guidelines/07_deployment_operations/incident_response.md) — Incident management
- [../../Design/SecurityPrivacyArchitecture.md](../../../Design/SecurityPrivacyArchitecture.md) — Security architecture
