-- ============================================================================
-- 20260519_create_service_tables.sql
-- Creates tables used by compliance-management and gps-tracking services
-- that were referenced in the v2 cutover comment but not included in DDL.
-- ============================================================================

BEGIN;

-- Compliance management tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_type_enum') THEN
    CREATE TYPE inspection_type_enum AS ENUM ('PRE_TRIP', 'POST_TRIP', 'MAINTENANCE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_status_enum') THEN
    CREATE TYPE compliance_status_enum AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  school_id uuid NOT NULL,
  type inspection_type_enum NOT NULL DEFAULT 'PRE_TRIP',
  is_passed boolean NOT NULL DEFAULT true,
  checklist_json jsonb,
  photo_urls text[],
  comments text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vi_vehicle ON vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vi_driver ON vehicle_inspections(driver_id);
CREATE INDEX IF NOT EXISTS idx_vi_school ON vehicle_inspections(school_id);

CREATE TABLE IF NOT EXISTS driver_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE,
  school_id uuid NOT NULL,
  license_expiry date,
  background_check_last_date date,
  medical_check_due_date date,
  status compliance_status_enum NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dc_driver ON driver_compliance(driver_id);
CREATE INDEX IF NOT EXISTS idx_dc_school ON driver_compliance(school_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school_id uuid NOT NULL,
  action text NOT NULL,
  resource text,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_al_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_al_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_al_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_al_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_al_created ON audit_logs("createdAt");

-- GPS tracking service tables (Prisma-managed schema)
CREATE TABLE IF NOT EXISTS location_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  vehicle_id text NOT NULL,
  route_id text NOT NULL,
  run_id text,
  timestamp timestamptz NOT NULL,
  lat float8 NOT NULL,
  lng float8 NOT NULL,
  snapped_lat float8,
  snapped_lng float8,
  speed_kph float8,
  heading_deg float8,
  accuracy_meters float8
);
CREATE INDEX IF NOT EXISTS idx_lp_ts ON location_points(timestamp);
CREATE INDEX IF NOT EXISTS idx_lp_school_route ON location_points(school_id, route_id);
CREATE INDEX IF NOT EXISTS idx_lp_run ON location_points(run_id);

CREATE TABLE IF NOT EXISTS route_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  route_id text NOT NULL,
  run_id text,
  vehicle_id text NOT NULL,
  driver_id text NOT NULL,
  event_type text NOT NULL,
  stop_id text,
  timestamp timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rle_route ON route_lifecycle_events(route_id);
CREATE INDEX IF NOT EXISTS idx_rle_school_route ON route_lifecycle_events(school_id, route_id);
CREATE INDEX IF NOT EXISTS idx_rle_run ON route_lifecycle_events(run_id);

CREATE TABLE IF NOT EXISTS route_geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  route_id text NOT NULL UNIQUE,
  corridor_radius_meters float8 NOT NULL DEFAULT 200,
  stop_proximity_meters float8 NOT NULL DEFAULT 50,
  deviation_threshold_meters float8 NOT NULL DEFAULT 300,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rg_school ON route_geofences(school_id);

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
INSERT INTO system_settings (key, value) VALUES ('gps_source', 'SBTM_NATIVE') ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS gps_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  vehicle_id text NOT NULL,
  school_id text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_gdt_school ON gps_device_tokens(school_id);

CREATE TABLE IF NOT EXISTS route_deviation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  route_id text NOT NULL,
  run_id text,
  vehicle_id text NOT NULL,
  lat float8 NOT NULL,
  lng float8 NOT NULL,
  deviation_meters float8 NOT NULL,
  threshold float8 NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rde_school_route ON route_deviation_events(school_id, route_id);
CREATE INDEX IF NOT EXISTS idx_rde_run ON route_deviation_events(run_id);
CREATE INDEX IF NOT EXISTS idx_rde_detected ON route_deviation_events(detected_at);

COMMIT;
