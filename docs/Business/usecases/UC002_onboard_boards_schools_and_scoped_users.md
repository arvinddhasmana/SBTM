<!-- CLASSIFICATION: INTERNAL -->

# UC002 — Onboard Boards, Schools, and Scoped Users

> **Use Case ID**: UC-ONBOARD-001
> **Feature**: FEAT-TENANCY-001, FEAT-TENANCY-002, FEAT-STUDENT-001
> **Priority**: SHOULD
> **Actors**: OSTA Admin, Board Admin, School Admin
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

An authorized tenant administrator prepares the organizational structure needed for daily transport operations. This includes boards, schools, user accounts, and the operational data dependencies that routes, students, vehicles, and reporting depend on.

## 2. Preconditions

- An authorized OSTA or board-level user is authenticated.
- The target board or school does not already exist, or the workflow is explicitly editing an existing entity.
- The platform environment is operational.

## 3. Triggers

- A new school board is added to the platform.
- A new school is brought into service.
- A new school admin or operator needs access.

## 4. Main Flow

1. The authorized administrator opens board or school management views.
2. The administrator reviews the current tenant structure.
3. The administrator creates or updates the board and school records required for the tenant.
4. The administrator confirms the tenant context that downstream data should inherit.
5. The system persists the organizational data.
6. Downstream workflows such as route creation, vehicle setup, and student enrollment use the new tenant context.

## 5. Alternative Flows

### 5a. Invitation and Provisioning Workflow Not Available

- The organization structure is created, but account lifecycle steps are handled manually or through seeded data.
- User provisioning remains an operational workaround rather than a full product flow.

### 5b. Incomplete Tenant Setup

- The board or school record exists, but supporting route, roster, or user data is missing.
- Daily operations remain blocked or only partially demonstrable.

## 6. Postconditions

- Board and school records exist with the expected scope.
- Downstream operational data can be associated with the correct tenant.

## 7. Business Rules and Constraints

- Tenant boundaries are central to data isolation and reporting.
- Board-level and school-level workflows must not expose unrelated tenant data.
- Downstream services should inherit tenant context, even if that enforcement is still stronger at the gateway than in every service.

## 8. Current-State Notes

- Board and school listing support exists.
- Full invitation-based provisioning is not yet delivered.
- Tenant setup still depends on partial or manual workflows in practice.

## 9. v4 Enhancements (Planned)

- **Super Admin role** for initial system bootstrap — creates OSTA Admin, configures system settings (see [v4 Gap Analysis](../../prd/v4/GapAnalysis.md), GAP-ROLE-001).
- **Board Admin school management** — Board Admin can create, modify, and deactivate schools within their board scope (GAP-ROLE-003).
- **Guided tenant provisioning wizard** — Step-by-step workflow for adding new boards and schools post-initial-setup (GAP-OPS-002).
- **Parent auto-provisioning from SIS** — When students are imported from SIS, parent accounts are auto-generated with invitation emails (GAP-INT-005).
- **SIS integration** — Batch or API sync of student data from school board SIS, reducing manual data entry (see [UC-DATAMIG-001](UC012_data_migration_and_integration.md)).
- See [v4 Roles and Workflows](../../prd/v4/RolesAndWorkflows.md) for the complete RACI matrix across all admin roles.

## 10. Requirements Traced

| Requirement    | Description                               |
| -------------- | ----------------------------------------- |
| FR-TENANT-001  | Tenant-scoped operational data            |
| FR-ONBOARD-001 | Tenant onboarding workflows               |
| PR-TENANT-001  | Tenant boundaries preserved in operations |
| OPS-DEPLOY-001 | Documented, runnable platform baseline    |
