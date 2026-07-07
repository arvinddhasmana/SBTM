-- Migration: Active-run projection for live dashboard
-- Date: 2026-05-29
-- Branch: feat/sbtm-refocus-data-model
-- Description:
--   Adds a partial index on stx_runs(service_date) WHERE status = 'in_progress'
--   so the live dashboard's "active routes" query is an index-only scan over
--   the (small) set of currently-rolling buses, not an aggregation across the
--   full route_lifecycle_events history.
--
--   See docs/Design/ADR-0001-active-run-projection.md for rationale.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_stx_runs_in_progress
  ON stx_runs (service_date)
  WHERE status = 'in_progress';

COMMIT;
