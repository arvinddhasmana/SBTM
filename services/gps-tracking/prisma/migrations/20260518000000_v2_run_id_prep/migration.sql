-- Phase A prep: add nullable run_id to telemetry tables so Phase B can
-- begin populating stx_runs.id references without a second migration.
-- Backfill + NOT NULL flip happen in Phase B once stx_runs is wired up.

ALTER TABLE "location_points" ADD COLUMN IF NOT EXISTS "run_id" TEXT;
CREATE INDEX IF NOT EXISTS "location_points_run_id_idx" ON "location_points" ("run_id");

ALTER TABLE "route_lifecycle_events" ADD COLUMN IF NOT EXISTS "run_id" TEXT;
CREATE INDEX IF NOT EXISTS "route_lifecycle_events_run_id_idx" ON "route_lifecycle_events" ("run_id");

ALTER TABLE "route_deviation_events" ADD COLUMN IF NOT EXISTS "run_id" TEXT;
CREATE INDEX IF NOT EXISTS "route_deviation_events_run_id_idx" ON "route_deviation_events" ("run_id");
