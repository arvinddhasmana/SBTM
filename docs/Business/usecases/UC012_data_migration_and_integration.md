# UC-DATAMIG-001: Migrate Legacy Data and Integrate with External Systems

- Document owner: Product and Delivery
- Last reviewed: 2026-04-02
- Status: Planned (v4 Phase D)
- Priority: Should

## Actors

- **School Admin** (primary): Imports student and route data, reviews sync results
- **OSTA Admin** (primary): Imports fleet data, configures fleet sync
- **Board IT** (supporting): Provides SIS data exports, configures SIS integration
- **System** (automated): Performs batch sync, geocoding, validation

## Features Traced

- FEAT-SIS-INT-001 (SIS Integration)
- FEAT-FLEET-INT-001 (Fleet Integration)
- FEAT-ROUTE-IMPORT-001 (Bulk Route Import)

## Requirements Traced

- FR-INT-001, FR-INT-002, FR-INT-003

## Preconditions

- Target school, board, and admin accounts exist in SBTM
- Source data is available in supported format (CSV, XML, Excel)
- Geocoding service is operational (for route import)
- OSRM service is operational (for polyline generation)

## Sub-Use-Cases

### A. Student Data Import from SIS

1. Board IT exports student data from the school board's Student Information System as CSV or XML.
2. School Admin opens Admin Dashboard -> Students -> Import from SIS.
3. School Admin uploads the export file.
4. System applies board-specific field mapping to translate SIS fields to SBTM fields.
5. System compares imported data with existing SBTM records:
   - New students (by external_student_id): marked for creation
   - Changed students (name, grade, address differ): marked for update
   - Missing students (in SBTM but not in SIS export): flagged for review
   - Duplicate external_student_id: rejected with error
6. System presents a preview report: "X students to create, Y to update, Z flagged for review, W errors."
7. School Admin reviews the preview and resolves any flags (keep or withdraw missing students).
8. School Admin confirms the import.
9. System creates/updates student records in a single transaction.
10. System logs the import in audit trail: source file, counts, School Admin who approved.
11. For students with parent contact data: system generates parent invitation emails (see UC-ONBOARD-001 for parent onboarding flow).

### B. OSTA Fleet Data Import

1. OSTA exports fleet data from the existing fleet management system (CSV or database export).
2. OSTA Admin opens Admin Dashboard -> Fleet -> Import from OSTA.
3. OSTA Admin uploads the fleet data file.
4. System applies field mapping (OSTA vehicle ID -> external_vehicle_id, license plate, capacity, type, status, certifications).
5. System compares with existing SBTM vehicles:
   - New vehicles: created as unassigned (not linked to any school or route)
   - Changed vehicles: updated (status, plates, capacity)
   - Decommissioned vehicles (in SBTM but not in fleet export): flagged
6. OSTA Admin reviews the preview and confirms.
7. System creates/updates vehicle records.
8. OSTA Admin proceeds to assign new vehicles to schools and routes (see UC-FLEET-ASSIGN-001).

### C. Bulk Route Import from Excel/CSV

1. School Admin collects existing route definitions from Excel spreadsheets or legacy systems.
2. School Admin reformats data into the SBTM route import template (or uses the template provided by the system).
3. School Admin opens Admin Dashboard -> Routes -> Import Routes.
4. School Admin uploads the Excel/CSV file.
5. System parses file and groups rows by route_name + direction.
6. For each route, system validates:
   - Required fields present (name, direction, at least 2 stops)
   - Stop sequence is contiguous
   - Route name is unique within the school
7. For stops without latitude/longitude, system geocodes the address via geocoding service.
8. System presents a validation report: "X routes ready, Y routes with warnings, Z routes with errors, W addresses could not be geocoded."
9. School Admin reviews each route on a map preview:
   - Stop markers shown at geocoded locations
   - Admin can drag-and-drop stops to adjust placement
   - Admin can edit route details inline
   - Routes with errors must be fixed or excluded
10. School Admin clicks "Generate Polylines."
11. System calls OSRM for each route to generate road-following polylines and calculate estimated durations.
12. System shows final preview with polylines on map.
13. School Admin confirms import.
14. System creates all routes and stops in a single transaction.
15. System logs the import in audit trail.
16. School Admin proceeds to assign students to imported routes and assign vehicles.

## Post-Conditions

- Imported data is stored in SBTM with traceability to source (SIS, OSTA fleet, Excel)
- Audit trail records all import operations
- Existing data is not silently deleted (flagged for human review)
- Routes have OSRM-generated polylines rendered on map

## Error Handling

| Error                               | System Response                                                  |
| ----------------------------------- | ---------------------------------------------------------------- |
| File format not recognized          | Reject upload with format guidance                               |
| Required field missing              | Reject affected records, allow rest to proceed                   |
| Address cannot be geocoded          | Flag address for manual coordinate entry                         |
| Duplicate route name in same school | Reject affected route, suggest rename                            |
| OSRM unavailable                    | Allow import without polylines; polylines can be generated later |
| Database transaction fails          | Roll back entire import, report error                            |

## Current-State Notes

- CSV bulk student import exists but without SIS field mapping or conflict resolution
- No fleet data import capability
- No Excel/CSV route import — routes are created one-at-a-time via route planner
- No geocoding integration for stop creation
- OSRM polyline generation exists in scripts but not in UI workflow

## v4 References

- [Integration and Migration](../../prd/v4/IntegrationAndMigration.md) - Complete integration design
- [Gap Analysis](../../prd/v4/GapAnalysis.md) - GAP-INT-001, GAP-INT-002, GAP-INT-003, GAP-INT-006
