# Data Classification

- Document owner: Engineering and Security
- Last reviewed: 2026-03-24
- Primary use: Data classification tiers and handling rules for SBTM

## Purpose

SBTM processes data ranging from public system metadata to highly sensitive student PII. This document defines classification tiers and the handling rules that apply at each tier.

## Classification Tiers

| Tier | Label | Examples | Handling Rules |
|---|---|---|---|
| **T1** | Public | System health status, API docs, feature descriptions | No restrictions. May appear in logs, error messages, and public documentation |
| **T2** | Internal | Service configuration, route geometry, vehicle metadata, school names | Accessible to authenticated users with appropriate role. Do not expose in public endpoints |
| **T3** | Confidential | Parent email/phone, driver credentials, alert details, compliance records | Encrypted at rest and in transit. Access restricted by tenant and role. Audit all access |
| **T4** | Restricted PII | Student names, student IDs, guardian-student relationships, GPS history linked to students, presence events | Highest protection. Encrypted at rest and in transit. Tenant-scoped. Audit all reads and writes. PIPEDA consent required for collection |

## Data-to-Tier Mapping

| Data Entity | Tier | Tenant Context | Retention |
|---|---|---|---|
| Student name, external_student_id | T4 | school_id | Per MFIPPA schedule |
| Guardian contact (email, phone) | T4 | school_id | Per MFIPPA schedule |
| Student-route-stop assignments | T4 | school_id | Active enrollment + archive |
| Presence events (board/alight) | T4 | school_id | 1 year operational + archive |
| GPS location history | T3 | school_id + route_id | 90 days operational + archive |
| Emergency alerts | T3 | school_id | 1 year operational + archive |
| Driver profile and credentials | T3 | school_id | Employment period + 7 years |
| Vehicle records and inspections | T3 | school_id | Vehicle lifecycle + 7 years |
| Compliance audit logs | T3 | school_id | 7 years minimum |
| Route definitions and stop coordinates | T2 | school_id | Active route lifetime |
| School and board metadata | T2 | board_id / school_id | Organizational lifetime |
| System health metrics | T1 | None | 30 days |
| API documentation | T1 | None | No retention limit |

## Handling Rules by Tier

### T4 — Restricted PII
- Must not appear in log messages (use IDs or hashed references only).
- Must not be returned in API error payloads.
- API responses must be scoped by authenticated tenant.
- Database queries must include `school_id` filter.
- Changes to T4 data must produce audit log events.
- Bulk export requires explicit authorization and audit trail.

### T3 — Confidential
- May appear in structured logs with correlation IDs (but not in plain-text message bodies).
- API access requires authentication and appropriate RBAC role.
- Changes to T3 data should produce audit log events for safety-critical records.

### T2 — Internal
- Accessible to any authenticated user with a valid tenant context.
- No special encryption beyond standard transport (HTTPS) and storage encryption.

### T1 — Public
- No access restrictions required.
- May be cached, logged, and included in error messages without concern.

## Implementation Patterns

### Logging
```typescript
// CORRECT — T4 data referenced by ID only
logger.info('Presence event recorded', { studentId: event.studentId, eventType: event.type });

// INCORRECT — T4 data in plain text
logger.info(`Student ${student.name} boarded bus at ${stop.address}`);
```

### API Responses
```typescript
// CORRECT — tenant-scoped query
const students = await repo.find({ where: { schoolId: user.schoolId } });

// INCORRECT — unscoped query
const students = await repo.find();
```

## Related Documents

- [privacy_compliance.md](privacy_compliance.md) — PIPEDA and MFIPPA mapping
- [supply_chain_security.md](supply_chain_security.md) — Dependency security
- [../00_master_policy.md](../00_master_policy.md) — Universal rules (RULE-PII-*)
