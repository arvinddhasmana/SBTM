# Multi-Tenant Upgrade Gap Analysis

## Summary
Multi-tenant concepts exist in the API gateway (boards, schools, roles), but downstream services and UI integrations are not tenant-aware. This section highlights the major deltas between the V2 multi-tenant design and the current implementation.

## Data Model Gaps
- GPS, alerts, presence, and video tables do not store `school_id` or `board_id`.
- No row-level security or tenant filters in service queries.
- Student management and compliance services include `school_id` but are not protected by auth/tenant guards.

## API Gaps
- API gateway does not proxy student-management and compliance services.
- Organization endpoints exist, but no invitation or user provisioning workflow.
- Route optimization uses mocked logic, not map APIs.

## UI Gaps
- Admin dashboard does not expose organization or school management.
- Parent and driver apps are mock-first and not wired to real auth/data.
- No board-level or school-level dashboard views.

## Security Gaps
- Service-to-service authentication is missing.
- No centralized audit logging outside the compliance service.
- No data retention policies or deletion workflows.

## Recommended Next Steps
1. Add `school_id` to all service schemas and enforce tenant filters.
2. Proxy student-management and compliance APIs through the gateway.
3. Wire driver and parent apps to real auth and data.
4. Add organization management UI to the admin dashboard.
5. Replace mock route optimization with map provider integration.
