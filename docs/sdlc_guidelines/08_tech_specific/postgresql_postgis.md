# PostgreSQL and PostGIS Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Database conventions, spatial data handling, and migration practices for SBTM

## Purpose

Define PostgreSQL and PostGIS standards for SBTM. All 7 backend services use PostgreSQL as the primary datastore. The GPS Tracking service relies on PostGIS for spatial queries.

## PostgreSQL Version and Configuration

| Setting | Value |
|---|---|
| Version | PostgreSQL 15 |
| Extensions | PostGIS, pgcrypto (UUID generation) |
| Connection pooling | Use pgBouncer or TypeORM/Prisma built-in pooling |
| Pool size | 10–20 connections per service (tune per environment) |

## Schema Conventions

| Rule | Convention |
|---|---|
| Table names | `snake_case`, singular (`student`, `alert`, `location`) |
| Column names | `snake_case` (`school_id`, `created_at`) |
| Primary keys | UUID v4, column name `id` |
| Timestamps | `created_at` and `updated_at` on every table, type `TIMESTAMPTZ` |
| Tenant column | `school_id UUID NOT NULL` on all tenant-scoped tables |
| Soft deletes | `deleted_at TIMESTAMPTZ NULL` where business requires audit trail |
| Indexes | Create indexes for foreign keys, frequently filtered columns, and spatial columns |

## Tenant Isolation

```sql
-- Every query for tenant-scoped data MUST include school_id
SELECT * FROM student WHERE school_id = $1 AND id = $2;

-- NEVER query tenant data without school_id
-- BAD: SELECT * FROM student WHERE id = $1;
```

Long-term: implement Row-Level Security (RLS) policies as a defense-in-depth measure:

```sql
CREATE POLICY tenant_isolation ON student
  USING (school_id = current_setting('app.current_school_id')::uuid);
```

## PostGIS Usage (GPS Tracking)

### Spatial Column

```sql
-- Location column for vehicle positions
ALTER TABLE location ADD COLUMN geom GEOMETRY(Point, 4326);

-- Spatial index
CREATE INDEX idx_location_geom ON location USING GIST(geom);
```

### Common Spatial Queries

```sql
-- Find all buses within a geofence (1km radius)
SELECT vehicle_id, ST_AsGeoJSON(geom) AS position
FROM location
WHERE school_id = $1
  AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint($2, $3), 4326), 1000);

-- Calculate distance between two points
SELECT ST_Distance(
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
  ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
) AS distance_meters;
```

### Coordinate Rules

- Always use SRID 4326 (WGS84) for geographic coordinates.
- Store coordinates as `GEOMETRY(Point, 4326)` not as separate `lat`, `lng` columns (for spatial indexing).
- Validate coordinate ranges on input: latitude [-90, 90], longitude [-180, 180].

## Migration Practices

| Rule | Detail |
|---|---|
| Tool | TypeORM migrations (most services) or Prisma Migrate (GPS Tracking) |
| Naming | `YYYYMMDDHHMMSS-description` (e.g., `20260324120000-add-geofence-table`) |
| Up/Down | Every migration must have both up and down migrations |
| Data migrations | Separate from schema migrations. Run data migrations as scripts, not in the migration runner |
| Review | All migrations reviewed in PR before merge |
| Testing | Run migrations against a clean database in CI |

## Performance Guidelines

- Use `EXPLAIN ANALYZE` to verify query plans for new queries.
- Add indexes for columns used in WHERE, JOIN, and ORDER BY clauses.
- Use pagination for list queries (OFFSET/LIMIT or cursor-based).
- Avoid N+1 queries — use JOINs or batch loading.
- Consider partitioning for high-volume tables (location data by time range).

## Related Documents

- [redis_bullmq.md](redis_bullmq.md) — Redis and queue patterns
- [../03_architecture_design/design_guidelines.md](../03_architecture_design/design_guidelines.md) — Database design conventions
- [../01_security_compliance/data_classification.md](../01_security_compliance/data_classification.md) — Data tier handling rules
