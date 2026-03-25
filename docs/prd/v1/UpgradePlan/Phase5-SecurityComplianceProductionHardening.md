# Phase 5: Security, Compliance, and Production Hardening

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Status: Active
- Depends on: [GapAnalysis.md](GapAnalysis.md), [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)

## Goal

Close the gap between a functioning prototype and a deployable enterprise-aligned platform.

## Related Documents

- [GapAnalysis.md](GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)
- [Phase4-TenantAdministrationUserProvisioning.md](Phase4-TenantAdministrationUserProvisioning.md)
- [../../../Business/Requirements.md](../../../Business/Requirements.md)
- [../../../Design/v1/Architecture.md](../../../Design/v1/Architecture.md)
- [../../../Design/v1/SecurityPrivacyArchitecture.md](../../../Design/v1/SecurityPrivacyArchitecture.md)
- [../../../Design/v1/DataRetention.md](../../../Design/v1/DataRetention.md)
- [../../../Design/v1/DeploymentArchitecture.md](../../../Design/v1/DeploymentArchitecture.md)
- [../../../Operations/Runbooks.md](../../../Operations/Runbooks.md)
- [../../../Test/TestingGuide.md](../../../Test/TestingGuide.md)

## Context

The current system implements JWT-based auth at the gateway and compliance-specific audit logging. There is no service-to-service authentication, no centralized audit pipeline across services, no defined retention or privacy-response workflows, and no PostgreSQL row-level security. The system does not yet satisfy the non-functional requirements implied by PIPEDA/MFIPPA alignment and enterprise multi-tenant deployment. Phase 5 applies the hardening needed to move the platform from demo-grade to production-readiness planning.

## Scope

### 1. Database Tenant Hardening

- Add PostgreSQL RLS where feasible for downstream services.
- Review schema patterns that require tenant context propagation beyond `school_id` filtering.

### 2. Service-to-Service Trust

- Implement internal JWT signing or mTLS for inter-service communication.
- Define service identity, key rotation, and failure behavior.

### 3. Centralized Audit and Observability

- Emit audit events for critical mutations across services.
- Centralize logs, metrics, and traces using the agreed observability stack.
- Add correlation IDs across gateway and downstream services.

### 4. Data Lifecycle and Privacy Controls

- Implement retention schedules, archival, purge jobs, and deletion workflows.
- Document data residency and encryption controls against business requirements.
- Align data lifecycle practices with PIPEDA and MFIPPA guidance relevant to student data.

## Dependencies

- Stable event and notification architecture from Phases 1 through 4.
- Agreement on deployment topology and secret management approach.

## Acceptance Criteria

- Cross-service calls are authenticated and attributable.
- Tenant isolation is enforceable beyond application query discipline.
- Audit and retention controls exist for regulated operational data.

## Verification

- Security tests for inter-service trust boundaries.
- Tenant-isolation tests at the database layer.
- Operational readiness review covering logging, alerting, backup, and purge behavior.

## Demo Impact

After this phase, the platform can credibly move from demo-grade to production-readiness planning.

## Estimated Complexity

High. Requires cross-cutting changes across all services, database policy changes, observability infrastructure, privacy workflow implementation, and compliance review.

## Previous Phase

[Phase 4: Complete Tenant Administration and User Provisioning](Phase4-TenantAdministrationUserProvisioning.md)
