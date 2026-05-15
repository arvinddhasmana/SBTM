-- Migration: Create page_visibility table
-- Date: 2026-05-14
-- Description: Stores per-page visibility settings manageable by Super Admin.
--              Pages without a row default to visible. Settings and the
--              page-visibility management page itself are excluded.

CREATE TABLE IF NOT EXISTS page_visibility (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pageKey"   TEXT NOT NULL UNIQUE,
  "pageName"  TEXT NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default rows (all pages visible) so the management UI has something to display
INSERT INTO page_visibility ("pageKey", "pageName", "isVisible")
VALUES
  ('dashboard',           'Dashboard',          TRUE),
  ('alerts',              'Alerts',             TRUE),
  ('alerts/operational',  'Operational Alerts', TRUE),
  ('routes',              'Routes',             TRUE),
  ('routes/planner',      'Route Planner',      TRUE),
  ('vehicles',            'Fleet',              TRUE),
  ('compliance',          'Compliance',         TRUE),
  ('fleet-assignments',   'Fleet Assignments',  TRUE),
  ('students',            'Students',           TRUE),
  ('absences',            'Absences',           TRUE),
  ('boards',              'Boards',             TRUE),
  ('schools',             'Schools',            TRUE),
  ('users',               'Users',              TRUE),
  ('alert-config',        'Alert Config',       TRUE),
  ('settings/gps-source', 'GPS Tracker',        TRUE),
  ('tenant-overview',     'Tenant Overview',    TRUE),
  ('videos',              'Videos',             TRUE)
ON CONFLICT ("pageKey") DO NOTHING;
