# SBTM v1 Security and Privacy Architecture

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: Identity, access, privacy, audit, and trust boundaries

## Purpose

This document captures the security and privacy architecture for SBTM_AntiGravity with emphasis on child-safety data, tenant isolation, and operational accountability.

## Related Documents

- [DataArchitecture.md](DataArchitecture.md)
- [DatabaseSchema.md](DatabaseSchema.md)
- [DataRetention.md](DataRetention.md)
- [../../Operations/Runbooks.md](../../Operations/Runbooks.md)

## Security and Privacy Principles

- Authenticate once at the platform edge and propagate only the context needed downstream.
- Enforce least privilege by role and tenant scope.
- Treat student, location, and presence data as sensitive operational information.
- Design for auditability without over-collecting personal data.
- Prefer privacy-by-design decisions over retrofitted controls.

## Identity and Access Model

| Concern | Current State | Target Direction |
| --- | --- | --- |
| User authentication | JWT via API Gateway | Continue at gateway with stronger session hardening |
| Role enforcement | Gateway RBAC | Expand consistent downstream authorization expectations |
| Tenant enforcement | `school_id` filtering and scoped APIs | Add stronger DB and service-level guarantees |
| Service-to-service trust | Limited or absent | Internal JWT or mTLS before production rollout |

## Trust Boundaries

```mermaid
flowchart LR
    User[User Device] --> Gateway[API Gateway Trust Boundary]
    Gateway --> Services[Internal Service Network]
    Services --> Data[PostgreSQL and Redis]
    Services --> Storage[Object Storage]

    classDef edge fill:#16324f,color:#fff,stroke:#6ec1ff;
    classDef internal fill:#20471c,color:#fff,stroke:#86d17a;
    classDef data fill:#5a3a00,color:#fff,stroke:#f1b44c;

    class Gateway edge;
    class Services internal;
    class Data,Storage data;
```

## Sensitive Data Categories

| Category | Examples | Primary Controls Needed |
| --- | --- | --- |
| Student-linked identity data | student names, parent linkage, route assignment | Tenant scoping, access minimization, audit |
| Live operational telemetry | GPS positions, boarding and alighting events | Access control, retention policy, observability safeguards |
| Incident records | alerts, inspections, audit history, video metadata | Restricted access, integrity, traceability |
| Credentials and secrets | JWT secrets, provider keys, storage credentials | Externalized secret management, rotation, least exposure |

## Privacy Controls

- Keep data collection limited to transport safety and operational service delivery.
- Avoid exposing full student operational histories to roles that do not require them.
- Prefer role-specific summaries over broad raw-data access in UI surfaces.
- Define retention and deletion workflows before production rollout, especially for location, presence, audit, and video data.
- Align deployment choices to Canadian data residency expectations where contractually or regulatorily required.

## Security Gaps to Close

- Database-level tenant hardening, including RLS where feasible.
- Service-to-service trust for internal calls.
- Centralized audit coverage across all critical service mutations.
- Stronger browser session hardening for parent-facing workflows.
- Formalized key rotation, backup protection, and incident response procedures.

## Traceability

- Primary requirements: SR-AUTH-001, SR-RBAC-001, SR-SVC-001, SR-AUDIT-001, PR-RESIDENCY-001, PR-MINIMIZE-001, PR-TENANT-001, PR-RETENTION-001, NFR-DATA-001
- Primary use cases: UC-LOGIN-001, UC-PARENT-001, UC-INCIDENT-001, UC-COMPLIANCE-001