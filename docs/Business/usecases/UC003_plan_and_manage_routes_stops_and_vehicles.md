<!-- CLASSIFICATION: INTERNAL -->

# UC003 — Plan and Manage Routes, Stops, and Vehicles

> **Use Case ID**: UC-ROUTE-001
> **Feature**: FEAT-ROUTE-001, FEAT-ROUTE-002
> **Priority**: MUST
> **Actors**: School Admin, Dispatcher, School Operator
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

An operator or school administrator defines a route, associates stops and a vehicle, and makes that route available for daily execution, monitoring, and parent visibility.

## 2. Preconditions

- The tenant and school context exist.
- The acting user has route-management permissions.
- At least one vehicle is available or planned for assignment.

## 3. Triggers

- A new route is required.
- An existing route must be updated because of operational change.
- A vehicle assignment or stop sequence must be adjusted.

## 4. Main Flow

1. The operator opens route management in the admin interface.
2. The operator creates or edits route metadata, including name, direction, start time, and estimated duration.
3. The operator adds, reorders, or removes route stops.
4. The operator associates a vehicle with the route if one is available.
5. The platform validates the request and persists the updated route.
6. The route becomes available for driver schedule, parent tracking, and admin monitoring workflows.

## 5. Alternative Flows

### 5a. Provider-Backed Optimization Not Available

- The operator uses current route structure without relying on provider-grade optimization.
- The system may return placeholder or mocked route geometry.

### 5b. Invalid Vehicle or Stop Configuration

- The platform rejects the requested change.
- The operator corrects the route or vehicle assignment and resubmits.

## 6. Postconditions

- The route definition is stored.
- Associated downstream workflows can reference the route.
- Vehicle and stop context is ready for daily operations.

## 7. Business Rules and Constraints

- Routes are tenant-scoped.
- Vehicles should not conflict across active route assignments.
- Route quality is important operationally, but the current optimization layer is not yet production-grade.

## 8. Current-State Notes

- Route CRUD exists.
- Vehicle CRUD exists.
- Optimization remains partial and should be treated as prototype-grade.

## 9. v4 Enhancements (Planned)

- **Bulk route import** from Excel/CSV with geocoding and OSRM polyline generation. Admin uploads file -> system validates, geocodes, and previews on map -> admin confirms (see [UC-DATAMIG-001](UC012_data_migration_and_integration.md), [v4 Gap Analysis](../../prd/v4/GapAnalysis.md) GAP-INT-003).
- **Address geocoding** for stop creation — admin types address, system geocodes via Nominatim or Google, admin confirms pin on map (GAP-INT-006).
- **Fleet assignment workflow** — OSTA proposes vehicle-to-route assignment, School Admin reviews and confirms (see [UC-FLEET-ASSIGN-001](UC010_fleet_assignment_workflow.md), GAP-WF-001).
- **Route change notification** — When a route is modified, parents of affected students are notified before the change takes effect (GAP-WF-002, FR-WORKFLOW-002).
- **Seasonal route planning** — Clone previous year routes and adjust for new school year (GAP-WF-004).
- **Academic calendar awareness** — Routes marked inactive on holidays and non-operational days (GAP-OPS-003).
- See [v4 Integration and Migration](../../prd/v4/IntegrationAndMigration.md) for complete route import wizard design.

## 10. Requirements Traced

| Requirement  | Description                             |
| ------------ | --------------------------------------- |
| FR-ROUTE-001 | Route, stop, and vehicle management     |
| FR-ROUTE-002 | Route planning and optimization support |
