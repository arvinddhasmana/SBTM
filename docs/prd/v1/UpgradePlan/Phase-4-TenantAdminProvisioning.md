# Phase 4: Tenant Administration and User Provisioning

- Document owner: Product and Engineering
- Last reviewed: 2026-03-30
- Phase status: Planned
- Gap level: Medium

## Goal

Move from seeded-demo tenant setup to operational multi-tenant onboarding. New boards, schools, and users can be created through the application without manual database seeding.

## Why This Phase Is Fourth

Core safety workflows (Phases 1–3) must be stable before adding administrative complexity. Tenant administration builds on those operational workflows to provide complete org management.

## Current State (from Gap Analysis)

| Capability                                          | Status                                          |
| --------------------------------------------------- | ----------------------------------------------- |
| Board and school data model                         | Implemented                                     |
| Basic board/school listing pages in admin dashboard | Implemented                                     |
| Board/school CRUD operations                        | Partial (list/view only; create/edit not wired) |
| User invitation flow                                | Not implemented                                 |
| Account lifecycle management                        | Not implemented (login only)                    |
| Role provisioning beyond initial seed               | Not implemented                                 |
| Cross-tenant operational dashboards                 | Partial (limited filtering)                     |
| Parent absence reporting                            | Not implemented                                 |

## Scope

### 1. Organization Management Workflows

- Extend boards and schools pages from read/list views to full CRUD with lifecycle management.
- Add role-aware administration experiences (OSTA Admin manages boards, Board Admin manages schools).
- Implement form validation and business rules for org creation.

**Implementation modules affected:**

- [Module-7-AdminDashboard.md](../../../Implementation/Module-7-AdminDashboard.md)
- [Module-8-ApiGateway.md](../../../Implementation/Module-8-ApiGateway.md) — Org management API endpoints

**Requirements traced:**

- FR-ADMIN-001: Create and manage boards
- FR-ADMIN-002: Create and manage schools within a board
- FR-ADMIN-003: Role-based administration access

### 2. User Provisioning

- Introduce invitation flows for board admins, school admins, drivers, and parents.
- Support account activation, password set/reset, deactivation.
- Implement role assignment and school/board scoping during provisioning.
- Email-based invitation delivery (leverages Phase 1 notification infrastructure).

**Implementation modules affected:**

- [Module-8-ApiGateway.md](../../../Implementation/Module-8-ApiGateway.md) — Auth and provisioning endpoints
- [Module-9-StudentManagement.md](../../../Implementation/Module-9-StudentManagement.md) — Parent-student linking
- [Module-7-AdminDashboard.md](../../../Implementation/Module-7-AdminDashboard.md) — Provisioning UI

**Requirements traced:**

- FR-PROV-001: Invite users by email with role assignment
- FR-PROV-002: User activates account and sets credentials
- FR-PROV-003: Admin can deactivate/reactivate user accounts
- SR-AUTH-002: Provisioned users inherit tenant scope from invitation

### 3. Operational Visibility by Tenant Level

- Add OSTA-wide dashboard (cross-board aggregation).
- Add board-level dashboard (cross-school within board).
- Ensure school-level views remain correctly scoped.
- Add reporting counts and filters aligned with tenant hierarchy.

**Implementation modules affected:**

- [Module-7-AdminDashboard.md](../../../Implementation/Module-7-AdminDashboard.md)

### 4. Parent Absence Workflow

- Add guardian absence reporting endpoint and UI.
- Surface absence effects to driver roster and admin operational views.
- Integrate absence data with presence tracking to avoid false alerts.

**Implementation modules affected:**

- [Module-2-ParentApp.md](../../../Implementation/Module-2-ParentApp.md)
- [Module-6-StudentPresence.md](../../../Implementation/Module-6-StudentPresence.md) — Absence-aware processing
- [Module-7-AdminDashboard.md](../../../Implementation/Module-7-AdminDashboard.md) — Admin visibility

**Requirements traced:**

- FR-ABS-001: Guardian can report an absence for a scheduled trip
- FR-ABS-002: Absence is visible to the driver and admin before route start

## Dependencies

| Dependency                            | Source   | Status                           |
| ------------------------------------- | -------- | -------------------------------- |
| Stable auth and tenant data model     | Module-8 | Implemented                      |
| Notification infrastructure (Phase 1) | Phase 1  | Required (for invitation emails) |
| Business rules for role ownership     | Product  | Needs clarification              |

## Acceptance Criteria

- [ ] A new board and school can be onboarded through the admin dashboard (no database seeding).
- [ ] A user can be invited, activate their account, and be scoped to the correct tenant.
- [ ] OSTA-wide, board-level, and school-level dashboards show correctly scoped data.
- [ ] A parent can report an absence, and it is visible to the driver and admin.
- [ ] Cross-tenant access is denied for non-OSTA roles.

## Verification

| Test Type                | Scope                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- |
| E2E test                 | Create board → create school → invite admin → admin activates account         |
| RBAC test                | Each role can only manage resources at or below its tenant level              |
| Authorization regression | Cross-tenant access attempts are denied                                       |
| Absence workflow test    | Parent reports absence → driver sees updated roster → no false boarding alert |
| Demo validation          | Onboard a new tenant live during demo                                         |

## Demo Impact

After Phase 4 completion, the demo can **onboard tenants and users live** instead of relying on pre-seeded database data.

## Related Documents

- [Phase-1-ParentSafetyCommunication.md](Phase-1-ParentSafetyCommunication.md) — Notification infrastructure for invitations
- [../GapAnalysis.md](../GapAnalysis.md) — Gaps: "Organization management" (Medium), "Identity and provisioning" (Medium), "Parent absence" (Medium)
- [../../Business/UseCases.md](../../../Business/UseCases.md) — Admin and parent use cases
- [../../Design/Architecture.md](../../../Design/Architecture.md) — Multi-tenancy architecture
