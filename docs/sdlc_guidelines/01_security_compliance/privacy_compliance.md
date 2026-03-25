# Privacy Compliance

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: PIPEDA, MFIPPA, and CASL compliance mapping for SBTM

## Purpose

SBTM handles personally identifiable information about minors (students) and their guardians. This document maps applicable Canadian privacy frameworks to SBTM's data processing activities and defines compliance requirements that must be followed throughout the SDLC.

## Applicable Frameworks

| Framework | Scope | SBTM Relevance |
|---|---|---|
| **PIPEDA** | Federal private-sector privacy law | Governs collection, use, and disclosure of personal information by SBTM as a SaaS provider |
| **MFIPPA** | Ontario municipal freedom of information and privacy | Applies when school boards (public institutions) share student data with SBTM |
| **CASL** | Canada's Anti-Spam Legislation | Governs electronic notifications sent to parents (SMS, email, push) |
| **Ontario Highway Traffic Act** | School bus safety regulations | Governs vehicle compliance, driver licensing, and route safety requirements |
| **AODA** | Accessibility for Ontarians with Disabilities Act | Web and mobile accessibility requirements for public-facing applications |

## PIPEDA Principles Mapping

| PIPEDA Principle | SBTM Implementation Requirement |
|---|---|
| **Accountability** | Designate a data steward per tenant. Document data processing agreements with school boards |
| **Identifying Purposes** | Collect student data only for transportation safety. Document purposes in the privacy notice |
| **Consent** | Obtain informed guardian consent before collecting student PII. Consent must be revocable |
| **Limiting Collection** | Collect only data necessary for safe transportation: name, school, route, stop, guardian contact |
| **Limiting Use** | Do not use student data for marketing, analytics beyond safety, or any secondary purpose |
| **Accuracy** | Provide mechanisms for guardians to update student and contact information |
| **Safeguards** | Encrypt data at rest and in transit. Enforce tenant isolation. Audit access to student records |
| **Openness** | Publish a privacy policy describing data practices. Make it accessible from the parent portal |
| **Individual Access** | Support data access requests within 30 days. Provide export in machine-readable format |
| **Challenging Compliance** | Provide a channel for privacy complaints. Escalate to the Privacy Commissioner if unresolved |

## MFIPPA Requirements

When school boards (municipal institutions) provide student roster data to SBTM:

- A data sharing agreement must exist between the school board and SBTM before data transfer.
- SBTM acts as a data processor; the school board remains the data controller.
- SBTM must not disclose student data to third parties without explicit board authorization.
- Records must be retained according to MFIPPA retention schedules (typically 7 years for student records).
- Freedom of Information requests about student transport records are the school board's responsibility; SBTM must support data extraction to fulfill them.

## CASL Notification Requirements

| Notification Type | CASL Requirement | SBTM Implementation |
|---|---|---|
| Emergency alerts (PANIC, ACCIDENT) | Implied consent for safety-critical communications | Deliver immediately without separate opt-in |
| Boarding/alighting notifications | Express consent required | Guardian opts in during onboarding; opt-out available |
| Delay and route status updates | Express consent required | Guardian opts in during onboarding; opt-out available |
| Marketing or promotional messages | Express consent with unsubscribe | Not applicable — SBTM does not send marketing content |

## Compliance Checkpoints in SDLC

| Phase | Privacy Activity |
|---|---|
| Requirements | Identify new PII collection. Assess PIPEDA consent needs. Tag requirements with `PR-*` IDs |
| Architecture | Privacy impact assessment for new data flows. Document tenant isolation and access controls |
| Coding | Implement data minimization. Audit log student data access. No PII in plain-text logs |
| Testing | Verify tenant isolation. Test consent flows. Validate data access request export |
| Deployment | Confirm encryption at rest and in transit. Verify audit logging is active |
| Operations | Monitor for unauthorized cross-tenant access. Respond to access and deletion requests |

## Related Documents

- [data_classification.md](data_classification.md) — Student PII classification tiers
- [supply_chain_security.md](supply_chain_security.md) — Dependency security
- [../00_master_policy.md](../00_master_policy.md) — Universal rules
- [../../Business/Requirements.md](../../Business/Requirements.md) — Privacy requirements (PR-*)
