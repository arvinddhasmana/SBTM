# ADR-001: UUID-Only Route Identity Migration

- **Status**: Implemented
- **Date**: 2026-05-07
- **Decision Makers**: System Architecture Team
- **Related Documents**:
  - `docs/prd/v6/UUID-Only Route Identity Migration.md`
  - `docs/Design/DatabaseSchema.md`
  - `docs/Implementation/Module-8-ApiGateway.md`

## Context

The SBTM system initially employed a dual-ID architecture for route identity:
1. **String-based route codes** (e.g., `ROUTE-STBERN-R01-AM`) stored in reference tables
2. **UUIDs** as primary keys in operational tables

This dual-ID system introduced significant complexity:
- Two separate table hierarchies: `routes` vs `routes_reference`, `route_stops` vs `route_stops_reference`, `students` vs `students_reference`
- Synchronization logic required to maintain consistency between operational and reference tables
- Driver and parent applications needed to understand both ID systems
- JWT tokens contained string-based route codes in `assignedRouteIds` field
- API endpoints exposed both `/routes/:uuid` and `/routes/reference/:stringCode` patterns

The dual-ID system created maintenance overhead, increased cognitive load, and risked data inconsistency.

## Decision

We have decided to **eliminate the dual-ID system entirely** and adopt **UUID-only route identity** across the entire platform. This means:

1. **Drop all reference tables**: `routes_reference`, `route_stops_reference`, `students_reference`, `vehicles_reference`
2. **Make operational tables the single source of truth**: `routes`, `route_stops`, `students`
3. **Migrate JWT payload**: `assignedRouteIds` now contains UUIDs (not string codes)
4. **Update API endpoints**: Consolidate to `/routes/:routeId` (UUID-based), deprecate `/routes/reference/:routeId`
5. **Remove sync logic**: Eliminate all reference table synchronization code from services
6. **Update client applications**: Driver app and parent portal now use UUIDs exclusively

## Consequences

### Positive

- **Simplified data model**: Single table hierarchy eliminates synchronization complexity
- **Reduced cognitive load**: Developers work with one consistent ID system
- **Improved performance**: No dual-table queries or sync operations
- **Better data integrity**: No risk of reference/operational table drift
- **Cleaner codebase**: ~400+ lines of reference table maintenance code removed
- **Consistent API surface**: Single endpoint pattern for route access
- **Future-proof**: UUIDs are globally unique and don't require coordinated generation

### Negative

- **Migration required**: Existing JWT tokens, seed data, and test fixtures must be updated
- **Breaking change**: Client applications must update to use UUID-based endpoints
- **Loss of human-readable IDs**: UUIDs are less readable than `ROUTE-STBERN-R01-AM`

### Neutral

- **Backward compatibility maintained**: Deprecated `/routes/reference/:routeId` endpoint preserved temporarily
- **Database migration**: Clean migration path with CASCADE drops for safe removal

## Implementation

### Phase 1: Schema Migration
- Created migration `20260507_drop_reference_tables.sql`
- Added `am_stop_id` and `pm_stop_id` columns to `students` table
- Dropped reference tables with CASCADE

### Phase 2-7: Backend Services
Updated all services to query operational tables:
- `api-gateway`: Removed `syncRouteToReference()`, updated all reference table queries
- `driver.gateway.service.ts`: Updated schedule and roster queries
- `parent.gateway.service.ts`: Removed students_reference fallback
- `presence.processor.ts`: Removed students_reference fallback
- `alerts.processor.ts`: Removed students_reference fallback
- `gps.controller.ts`: Added `/routes/:routeId` endpoint, deprecated `/routes/reference/:routeId`

### Phase 8-9: Frontend Updates
- Parent portal: Changed `/routes/reference/:id` to `/routes/:id`
- Deleted 17 legacy simulation and seed scripts

### Phase 10-12: Data Updates
- Mock data and test fixtures updated to use UUIDs
- Seed data rewritten with UUID-based route identifiers
- Simulation scripts updated to work with UUID structure

### Phase 13: Documentation
- Updated Module-2-ParentApp.md, Module-3-DriverApp.md, Module-8-ApiGateway.md
- Created this ADR document
- Updated README.md with migration notes

### Phase 14: Validation
- Full linting and build validation
- Test suite execution
- Migration testing on seeded database

## Alternatives Considered

### Alternative 1: Keep Dual-ID System
**Rejected** because:
- Ongoing maintenance burden of synchronization logic
- Risk of data drift between operational and reference tables
- Increased complexity for new developers
- Performance overhead of dual-table queries

### Alternative 2: Use String Codes as Primary Keys
**Rejected** because:
- Requires coordinated ID generation across distributed services
- String codes encode business logic (school name, direction) which may change
- Less flexible for future multi-tenant or white-label scenarios
- UUIDs are the PostgreSQL standard for distributed systems

### Alternative 3: Hybrid Approach (UUID primary key + string code as indexed column)
**Rejected** because:
- Still requires maintaining string codes
- Adds complexity without clear benefit
- If string codes are optional, they add no value over UUID-only
- If string codes are required, we're back to dual-ID complexity

## Notes

- The deprecated `/routes/reference/:routeId` endpoint will be removed in a future major release
- All JWT tokens issued after this migration contain UUID-based `assignedRouteIds`
- Existing mobile apps must update to the new endpoint structure
- This migration aligns with industry best practices for distributed microservices architectures

## References

- [UUID-Only Route Identity Migration Plan](../prd/v6/UUID-Only%20Route%20Identity%20Migration.md)
- [Database Schema Documentation](DatabaseSchema.md)
- [API Gateway Module Documentation](../Implementation/Module-8-ApiGateway.md)
