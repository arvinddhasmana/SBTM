# Phase 4: Complete Tenant Administration and User Provisioning

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Status: Active
- Depends on: [GapAnalysis.md](GapAnalysis.md), [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)

## Goal

Move from seeded-demo tenant setup to operational multi-tenant onboarding.

## Related Documents

- [GapAnalysis.md](GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)
- [Phase3-GPSEventingGeofencingRouteIntelligence.md](Phase3-GPSEventingGeofencingRouteIntelligence.md)
- [../../../Business/Requirements.md](../../../Business/Requirements.md)
- [../../../Business/UseCases.md](../../../Business/UseCases.md)
- [../../../Design/v1/Architecture.md](../../../Design/v1/Architecture.md)
- [../../../Design/v1/SystemArchitecture.md](../../../Design/v1/SystemArchitecture.md)
- [../../../Design/v1/SecurityPrivacyArchitecture.md](../../../Design/v1/SecurityPrivacyArchitecture.md)
- [../../../Test/TestingGuide.md](../../../Test/TestingGuide.md)
- [../../../Demo/DEMO_SETUP_GUIDE.md](../../../Demo/DEMO_SETUP_GUIDE.md)

## Context

The admin dashboard already includes basic board and school listing views. Multi-tenant foundations are in place in the API gateway and downstream services via `school_id` filtering. However, creating a new board or school requires database seeding — there is no UI for board or school creation, editing, or lifecycle management. There are no invitation flows for any role, no account activation or deactivation workflows, and no role provisioning surfaces. Phase 4 delivers the operational onboarding experience needed to run SBTM as a real multi-tenant platform.

## Scope

### 1. Organization Management Workflows

- Extend boards and schools pages from read/list views to full create, edit, and lifecycle management.
- Add role-aware board and school administration experiences.

### 2. User Provisioning

- Introduce invitation flows for board admins, school admins, drivers, and parents.
- Support account activation, reset, deactivation, and role assignment workflows.

### 3. Operational Visibility by Tenant Level

- Add OSTA-wide, board-level, and school-level dashboards and filters.
- Ensure reporting and counts are aligned with tenant scope expectations.

### 4. Parent Absence Workflow

- Add guardian absence reporting.
- Surface absence effects to driver and admin operational views where relevant.

## Dependencies

- Stable auth and tenant data model.
- Clarified business rules for role ownership and onboarding authority.
- Stable operational workflows from Phases 1, 2, and 3.

## Acceptance Criteria

- A new board and school can be onboarded without database seeding.
- A user can be invited, activated, and scoped to the correct tenant.
- Tenant-specific dashboards reflect correct data boundaries.

## Verification

- Role-based end-to-end tests across OSTA, board, school, driver, and parent personas.
- Authorization regression tests for cross-tenant access attempts.

## Demo Impact

After this phase, the demo can onboard tenants and users live.

## Estimated Complexity

Medium–High. Requires UI work for create/edit/lifecycle pages, invitation and activation backend flows, email delivery for invitations, tenant-scoped dashboard filtering, and a new absence reporting workflow.

## Previous Phase

[Phase 3: Add GPS Eventing, Geofencing, and Real Route Intelligence](Phase3-GPSEventingGeofencingRouteIntelligence.md)

## Next Phase

[Phase 5: Security, Compliance, and Production Hardening](Phase5-SecurityComplianceProductionHardening.md)
