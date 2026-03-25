# Code Review Checklists

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Structured review checklists for human and AI-assisted code reviews

## Purpose

Provide focused checklists for reviewing SBTM pull requests. Reviewers should select the relevant checklist(s) based on the type of change.

## General Review Checklist

Every PR:

- [ ] Follows Conventional Commits message format.
- [ ] No commented-out code.
- [ ] No secrets or credentials committed.
- [ ] No new ESLint rule disables without justification.
- [ ] CI pipeline passes (lint, build, test).

## Backend Service Checklist

PR touches NestJS or Express service code:

- [ ] **Tenant isolation**: Queries include `school_id` from JWT, not request body.
- [ ] **RBAC**: New routes have `@Roles()` decorator with appropriate role set.
- [ ] **Input validation**: DTOs use class-validator decorators with `whitelist: true`.
- [ ] **Error handling**: Proper HTTP exceptions thrown, no stack traces in responses.
- [ ] **Logging**: No PII logged. Uses structured JSON format with `requestId` and `tenantId`.
- [ ] **Tests**: Unit tests for service logic, integration tests for new DB queries.

## Database Migration Checklist

PR includes a schema migration:

- [ ] Has both UP and DOWN migration scripts.
- [ ] New tenant-scoped tables include `school_id` column.
- [ ] New tables include `id` (UUID), `created_at`, `updated_at` columns.
- [ ] Names follow `snake_case` convention.
- [ ] Indexes added for foreign keys and frequently queried columns.
- [ ] Migration tested on clean database in CI.

## Frontend Checklist

PR touches React (web) or React Native code:

- [ ] No direct `fetch` calls in components — uses `services/` layer.
- [ ] Handles loading and error states.
- [ ] No sensitive data stored in local storage.
- [ ] Reusable components are under 150 lines.
- [ ] Socket.IO subscriptions clean up on unmount.

## Emergency Alert / Safety-Critical Checklist

PR touches emergency alerts, presence detection, or GPS tracking:

- [ ] Event delivery is durable — persisted before notification attempt.
- [ ] Failure to deliver does not silently swallow the alert.
- [ ] Audit trail includes event origin and all lifecycle transitions.
- [ ] Notification routing uses verified parent-student linkages.
- [ ] GPS data validates coordinate ranges.

## Privacy Checklist

PR touches student data, guardian data, or consent flows:

- [ ] Complies with PIPEDA purpose limitation — data collected only for stated purpose.
- [ ] MFIPPA requirements met for Ontario public institution data.
- [ ] CASL consent rules followed for electronic notifications.
- [ ] T3/T4 data access is logged for audit.
- [ ] API responses return minimal PII (IDs over names where possible).

## Related Documents

- [agent_governance.md](agent_governance.md) — AI agent rules
- [documentation_standards.md](documentation_standards.md) — Documentation standards
- [../01_security_compliance/privacy_compliance.md](../01_security_compliance/privacy_compliance.md) — PIPEDA/MFIPPA requirements
