# Multi-Tenant Upgrade Gap Analysis

## Summary
Multi-tenant concepts exist in the API gateway (boards, schools, roles), and downstream services now enforce `school_id` filtering. This section highlights the remaining deltas between the V2 multi-tenant design and the current implementation.

## Data Model Gaps
- `board_id` is not stored in downstream services (gateway enforces board scope).
- No row-level security or database-level tenant enforcement.

## API Gaps
- API gateway proxies exist, but audit and inspection policies are not enforced beyond role checks.
- Organization endpoints exist, but no invitation or user provisioning workflow.
- Route optimization uses mocked logic, not map APIs.

## UI Gaps
- Admin dashboard does not expose organization or school management.
- No board-level or school-level dashboard views.
- Driver app presence events and BLE integration are not wired to the presence service.
- Parent notifications are not implemented.

## Security Gaps
- Service-to-service authentication is missing.
- No centralized audit logging outside the compliance service.
- No data retention policies or deletion workflows.

## Recommended Next Steps
1. Add organization management UI to the admin dashboard.
2. Replace mock route optimization with map provider integration.
3. Implement driver presence event wiring and BLE integrations.
4. Add parent notifications (push/SMS/email) and absence workflows.
5. Introduce service-to-service auth and centralized audit pipelines.
