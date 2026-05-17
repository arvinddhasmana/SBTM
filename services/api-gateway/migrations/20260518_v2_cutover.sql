-- Migration: SBTM v2 aggressive cutover (Phase A)
-- Date: 2026-05-18
-- Branch: feat/sbtm-refocus-data-model
-- Description:
--   Drops all v1 transport-domain tables and the OSTA-shaped enums, then
--   creates the v2 GTFS-aligned core + STX (school transport extension)
--   schema per docs/Design/DataModel-v2.md. Pre-production cutover: no
--   data is preserved. Driver/Parent isolation is enforced in the app
--   layer (see DataModel-v2.md §3.3); only admin-role RLS policies are
--   created here.
--
-- Tables kept (mutated where noted):
--   users (drop childRouteIds; add identity_provider, preferred_language)
--   page_visibility, audit_logs, driver_compliance, vehicle_inspections
--   video_events, video_access_log, device_tokens, gps_device_tokens

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. DROP v1 transport tables (FK-leaf to FK-root order, CASCADE for safety)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS fleet_assignments CASCADE;
DROP TABLE IF EXISTS student_absences CASCADE;

DROP TABLE IF EXISTS notification_delivery_log CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;

DROP TABLE IF EXISTS alert_notification_log CASCADE;
DROP TABLE IF EXISTS alert_audit_log CASCADE;
DROP TABLE IF EXISTS emergency_alerts CASCADE;
DROP TABLE IF EXISTS emergency_alert CASCADE;
DROP TABLE IF EXISTS notification_routing_config CASCADE;
DROP TABLE IF EXISTS alert_escalation_chain CASCADE;
DROP TABLE IF EXISTS alert_config_change_request CASCADE;
DROP TABLE IF EXISTS alert_config_audit CASCADE;
DROP TABLE IF EXISTS alert_escalation_config CASCADE;
DROP TABLE IF EXISTS alert_workflow_config CASCADE;
DROP TABLE IF EXISTS alert_event_type_config CASCADE;

DROP TABLE IF EXISTS presence_notification_log CASCADE;
DROP TABLE IF EXISTS presence_events CASCADE;
DROP TABLE IF EXISTS student_tags CASCADE;

DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS student_parents CASCADE;

DROP TABLE IF EXISTS route_stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS school_boards CASCADE;

-- Defensive (legacy reference shells, may have been dropped already)
DROP TABLE IF EXISTS route_stops_reference CASCADE;
DROP TABLE IF EXISTS routes_reference CASCADE;
DROP TABLE IF EXISTS students_reference CASCADE;
DROP TABLE IF EXISTS vehicles_reference CASCADE;

-- ---------------------------------------------------------------------------
-- 2. DROP orphaned v1 enums (they belong to dropped tables)
-- ---------------------------------------------------------------------------
DROP TYPE IF EXISTS emergency_alert_severity_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_status_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_type_enum CASCADE;
DROP TYPE IF EXISTS notification_channel_enum CASCADE;
DROP TYPE IF EXISTS notification_delivery_status_enum CASCADE;
DROP TYPE IF EXISTS presence_event_kind_enum CASCADE;
DROP TYPE IF EXISTS student_absence_route_type_enum CASCADE;
DROP TYPE IF EXISTS student_absence_status_enum CASCADE;
DROP TYPE IF EXISTS fleet_assignment_status_enum CASCADE;
DROP TYPE IF EXISTS vehicle_status_enum CASCADE;
DROP TYPE IF EXISTS route_direction_enum CASCADE;

-- Role enum: drop entirely; recreated below without OSTA_ADMIN.
-- If a pre-existing users table is present (v1 dev DB), detach the enum first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    EXECUTE 'ALTER TABLE users ALTER COLUMN role DROP DEFAULT';
    EXECUTE 'ALTER TABLE users ALTER COLUMN role TYPE TEXT USING role::text';
  END IF;
END $$;
DROP TYPE IF EXISTS users_role_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Mutate (or create) users table
-- ---------------------------------------------------------------------------
CREATE TYPE users_role_enum AS ENUM (
  'SUPER_ADMIN',
  'STA_ADMIN',
  'BOARD_ADMIN',
  'SCHOOL_ADMIN',
  'OPERATOR_ADMIN',
  'DRIVER',
  'PARENT'
);

CREATE TYPE identity_provider_enum AS ENUM ('local', 'oidc:ocsb', 'oidc:ocdsb');

-- Fresh-DB path: create v2-shaped users directly.
-- v1-DB path: mutate existing table (column drops/adds + role enum coerce).
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  role TEXT NOT NULL DEFAULT 'PARENT',
  "firstName" TEXT,
  "lastName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "invitationToken" TEXT UNIQUE,
  "invitationExpiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users
  ALTER COLUMN role TYPE users_role_enum
    USING (
      CASE role
        WHEN 'OSTA_ADMIN' THEN 'STA_ADMIN'
        WHEN 'CONSORTIUM_ADMIN' THEN 'STA_ADMIN'
        ELSE role
      END
    )::users_role_enum;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'PARENT'::users_role_enum;

ALTER TABLE users
  DROP COLUMN IF EXISTS "childRouteIds",
  DROP COLUMN IF EXISTS "assignedRouteIds",
  DROP COLUMN IF EXISTS "schoolId",
  DROP COLUMN IF EXISTS "boardId",
  DROP COLUMN IF EXISTS "driverId";

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS identity_provider identity_provider_enum NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS anchor_kind TEXT,
  ADD COLUMN IF NOT EXISTS anchor_id UUID;

-- ---------------------------------------------------------------------------
-- 4. v2 enums
-- ---------------------------------------------------------------------------
CREATE TYPE stx_agency_kind_enum AS ENUM ('sta', 'board', 'operator');
CREATE TYPE stx_direction_kind_enum AS ENUM ('am', 'pm', 'midday', 'kindergarten', 'activity');
CREATE TYPE stx_shape_source_enum AS ENUM ('sta_import', 'sbtm_generated', 'sta_admin_edited');
CREATE TYPE stx_stop_kind_enum AS ENUM ('pickup', 'school', 'transfer', 'daycare', 'hazard_relocation');
CREATE TYPE stx_vehicle_status_enum AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE stx_run_status_enum AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'delayed');
CREATE TYPE stx_student_status_enum AS ENUM ('enrolled', 'inactive', 'graduated', 'withdrawn');
CREATE TYPE stx_eligibility_kind_enum AS ENUM ('mandatory', 'courtesy', 'hazard_exemption', 'medical', 'none');
CREATE TYPE stx_eligibility_direction_enum AS ENUM ('am', 'pm', 'midday');
CREATE TYPE stx_ridership_status_enum AS ENUM ('active', 'pending', 'revoked');
CREATE TYPE stx_boarding_event_kind_enum AS ENUM ('boarded', 'alighted', 'no_show', 'boarded_at_alt_stop', 'refused');
CREATE TYPE stx_boarding_event_source_enum AS ENUM ('driver_app', 'rfid', 'smarttag');
CREATE TYPE stx_alert_category_enum AS ENUM ('route_cancelled', 'route_delayed', 'route_deviation', 'safety', 'weather', 'general');
CREATE TYPE stx_alert_severity_enum AS ENUM ('info', 'warning', 'critical');
CREATE TYPE stx_alert_scope_kind_enum AS ENUM ('sta', 'board', 'school', 'route', 'trip', 'run', 'stop', 'student');
CREATE TYPE stx_alert_status_enum AS ENUM ('draft', 'active', 'resolved', 'cancelled', 'expired');
CREATE TYPE stx_alert_channel_enum AS ENUM ('push', 'sms', 'email', 'in_app');
CREATE TYPE stx_alert_delivery_status_enum AS ENUM ('queued', 'sent', 'delivered', 'failed', 'suppressed');
CREATE TYPE stx_absence_route_type_enum AS ENUM ('AM', 'PM', 'BOTH');
CREATE TYPE stx_absence_status_enum AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');

-- ---------------------------------------------------------------------------
-- 5. STX tenant tables (top of tree first)
-- ---------------------------------------------------------------------------
CREATE TABLE stx_sta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  region TEXT,
  time_zone TEXT NOT NULL DEFAULT 'America/Toronto',
  languages TEXT[] NOT NULL DEFAULT ARRAY['en'],
  boarding_event_retention_days INT NOT NULL DEFAULT 395,
  alert_retention_days INT NOT NULL DEFAULT 730,
  import_cadence TEXT NOT NULL DEFAULT 'quarterly',
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE stx_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sta_id UUID NOT NULL REFERENCES stx_sta(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  region TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (sta_id, short_code)
);

CREATE TABLE stx_bell_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES stx_boards(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  am_bell TIME,
  midday_bell TIME,
  pm_bell TIME,
  kindergarten_am_bell TIME,
  kindergarten_pm_bell TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (board_id, code)
);

CREATE TABLE stx_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES stx_boards(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address TEXT,
  location geography(Point, 4326),
  time_zone TEXT NOT NULL DEFAULT 'America/Toronto',
  bell_schedule_id UUID REFERENCES stx_bell_schedules(id) ON DELETE SET NULL,
  alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE stx_bell_schedule_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bell_schedule_id UUID NOT NULL REFERENCES stx_bell_schedules(id) ON DELETE CASCADE,
  school_id UUID REFERENCES stx_schools(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  am_bell TIME,
  midday_bell TIME,
  pm_bell TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bell_schedule_id, school_id, service_date)
);

-- ---------------------------------------------------------------------------
-- 6. Operators, vehicles, drivers, runs
-- ---------------------------------------------------------------------------
CREATE TABLE stx_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uniq_operators_legal_entity_id
  ON stx_operators ((external_ids->>'legal_entity_id'))
  WHERE external_ids ? 'legal_entity_id';

CREATE TABLE stx_operator_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES stx_operators(id) ON DELETE CASCADE,
  sta_id UUID NOT NULL REFERENCES stx_sta(id) ON DELETE RESTRICT,
  board_id UUID REFERENCES stx_boards(id) ON DELETE SET NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  route_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE stx_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES stx_operators(id) ON DELETE RESTRICT,
  license_plate TEXT NOT NULL,
  capacity_seated INT,
  capacity_wheelchair INT,
  equipment JSONB NOT NULL DEFAULT '{}'::jsonb,
  status stx_vehicle_status_enum NOT NULL DEFAULT 'active',
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (operator_id, license_plate)
);

CREATE TABLE stx_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES stx_operators(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  license_number BYTEA,
  license_class TEXT,
  license_expiry DATE,
  medical_expiry DATE,
  background_check_date DATE,
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_drivers_user ON stx_drivers (user_id);

CREATE TABLE stx_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_date DATE NOT NULL,
  trip_ids TEXT[] NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES stx_vehicles(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES stx_drivers(id) ON DELETE RESTRICT,
  backup_driver_id UUID REFERENCES stx_drivers(id) ON DELETE SET NULL,
  status stx_run_status_enum NOT NULL DEFAULT 'scheduled',
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_runs_service_date ON stx_runs (service_date);
CREATE INDEX idx_runs_driver ON stx_runs (driver_id, service_date);
CREATE INDEX idx_runs_vehicle ON stx_runs (vehicle_id, service_date);

-- ---------------------------------------------------------------------------
-- 7. GTFS core tables
-- ---------------------------------------------------------------------------
CREATE TABLE agency (
  agency_id TEXT PRIMARY KEY,
  agency_name TEXT NOT NULL,
  agency_url TEXT NOT NULL,
  agency_timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  agency_lang TEXT,
  agency_phone TEXT,
  agency_email TEXT,
  stx_agency_kind stx_agency_kind_enum NOT NULL,
  stx_parent_agency_id TEXT REFERENCES agency(agency_id) ON DELETE SET NULL,
  stx_sta_id UUID REFERENCES stx_sta(id) ON DELETE CASCADE,
  stx_board_id UUID REFERENCES stx_boards(id) ON DELETE CASCADE,
  stx_operator_id UUID REFERENCES stx_operators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agency_sta ON agency (stx_sta_id);

CREATE TABLE calendar (
  service_id TEXT PRIMARY KEY,
  monday BOOLEAN NOT NULL DEFAULT FALSE,
  tuesday BOOLEAN NOT NULL DEFAULT FALSE,
  wednesday BOOLEAN NOT NULL DEFAULT FALSE,
  thursday BOOLEAN NOT NULL DEFAULT FALSE,
  friday BOOLEAN NOT NULL DEFAULT FALSE,
  saturday BOOLEAN NOT NULL DEFAULT FALSE,
  sunday BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL
);

CREATE TABLE calendar_dates (
  service_id TEXT NOT NULL REFERENCES calendar(service_id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type INT NOT NULL CHECK (exception_type IN (1, 2)),
  PRIMARY KEY (service_id, exception_date)
);

CREATE TABLE shapes (
  shape_id TEXT NOT NULL,
  shape_pt_lat DOUBLE PRECISION NOT NULL,
  shape_pt_lon DOUBLE PRECISION NOT NULL,
  shape_pt_sequence INT NOT NULL,
  shape_dist_traveled DOUBLE PRECISION,
  PRIMARY KEY (shape_id, shape_pt_sequence)
);
CREATE INDEX idx_shapes_shape ON shapes (shape_id);

CREATE TABLE routes (
  route_id TEXT PRIMARY KEY,
  agency_id TEXT REFERENCES agency(agency_id) ON DELETE SET NULL,
  route_short_name TEXT,
  route_long_name TEXT,
  route_type INT NOT NULL DEFAULT 712,
  route_color TEXT,
  route_text_color TEXT,
  stx_sta_id UUID NOT NULL REFERENCES stx_sta(id) ON DELETE RESTRICT,
  stx_school_id UUID NOT NULL REFERENCES stx_schools(id) ON DELETE RESTRICT,
  stx_direction_kind stx_direction_kind_enum NOT NULL,
  stx_shape_source stx_shape_source_enum NOT NULL DEFAULT 'sta_import',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_routes_sta ON routes (stx_sta_id);
CREATE INDEX idx_routes_school ON routes (stx_school_id);

CREATE TABLE stops (
  stop_id TEXT PRIMARY KEY,
  stop_name TEXT NOT NULL,
  stop_lat DOUBLE PRECISION NOT NULL,
  stop_lon DOUBLE PRECISION NOT NULL,
  location_type INT NOT NULL DEFAULT 0,
  parent_station TEXT REFERENCES stops(stop_id) ON DELETE SET NULL,
  stx_stop_kind stx_stop_kind_enum NOT NULL DEFAULT 'pickup',
  stx_hazard_zone BOOLEAN NOT NULL DEFAULT FALSE,
  stx_school_id UUID REFERENCES stx_schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stops_school ON stops (stx_school_id);

CREATE TABLE trips (
  trip_id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES calendar(service_id) ON DELETE RESTRICT,
  shape_id TEXT,
  trip_headsign TEXT,
  direction_id INT NOT NULL DEFAULT 0,
  block_id TEXT,
  stx_run_id UUID REFERENCES stx_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trips_route ON trips (route_id);
CREATE INDEX idx_trips_run ON trips (stx_run_id);

CREATE TABLE stop_times (
  trip_id TEXT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  stop_sequence INT NOT NULL,
  arrival_time TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  stop_id TEXT NOT NULL REFERENCES stops(stop_id) ON DELETE RESTRICT,
  pickup_type INT NOT NULL DEFAULT 0,
  drop_off_type INT NOT NULL DEFAULT 0,
  stx_dwell_seconds INT,
  PRIMARY KEY (trip_id, stop_sequence)
);
CREATE INDEX idx_stop_times_stop ON stop_times (stop_id);

CREATE TABLE feed_info (
  feed_publisher_name TEXT PRIMARY KEY,
  feed_publisher_url TEXT NOT NULL,
  feed_lang TEXT NOT NULL DEFAULT 'en',
  feed_start_date DATE,
  feed_end_date DATE,
  feed_version TEXT,
  feed_contact_email TEXT
);

CREATE TABLE attributions (
  attribution_id TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL,
  is_producer BOOLEAN NOT NULL DEFAULT FALSE,
  is_operator BOOLEAN NOT NULL DEFAULT FALSE,
  is_authority BOOLEAN NOT NULL DEFAULT FALSE,
  attribution_url TEXT,
  attribution_email TEXT,
  attribution_phone TEXT
);

CREATE TABLE translations (
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  language TEXT NOT NULL,
  translation TEXT NOT NULL,
  record_id TEXT NOT NULL DEFAULT '',
  record_sub_id TEXT NOT NULL DEFAULT '',
  field_value TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (table_name, field_name, language, record_id, record_sub_id, field_value)
);

-- ---------------------------------------------------------------------------
-- 8. STX calendar link, students, guardians, ridership, events
-- ---------------------------------------------------------------------------
CREATE TABLE stx_calendar_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL REFERENCES calendar(service_id) ON DELETE CASCADE,
  board_id UUID REFERENCES stx_boards(id) ON DELETE CASCADE,
  school_id UUID REFERENCES stx_schools(id) ON DELETE CASCADE,
  CHECK (board_id IS NOT NULL OR school_id IS NOT NULL)
);
CREATE INDEX idx_calendar_link_board ON stx_calendar_link (board_id);
CREATE INDEX idx_calendar_link_school ON stx_calendar_link (school_id);

CREATE TABLE stx_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES stx_schools(id) ON DELETE RESTRICT,
  board_student_number BYTEA,
  legal_name BYTEA NOT NULL,
  preferred_name BYTEA,
  grade TEXT,
  date_of_birth BYTEA,
  home_address BYTEA,
  home_location geography(Point, 4326),
  status stx_student_status_enum NOT NULL DEFAULT 'enrolled',
  medical_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  transport_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_students_school ON stx_students (school_id);

CREATE TABLE stx_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  legal_name BYTEA NOT NULL,
  email BYTEA,
  phone BYTEA,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_guardians_user ON stx_guardians (user_id);

CREATE TABLE stx_student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES stx_students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES stx_guardians(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  is_primary_pickup BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, guardian_id)
);
CREATE INDEX idx_sg_guardian ON stx_student_guardians (guardian_id);
CREATE INDEX idx_sg_student ON stx_student_guardians (student_id);

CREATE TABLE stx_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES stx_students(id) ON DELETE CASCADE,
  direction stx_eligibility_direction_enum NOT NULL,
  eligibility_kind stx_eligibility_kind_enum NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eligibility_student ON stx_eligibility (student_id);

CREATE TABLE stx_ridership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES stx_students(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL REFERENCES stops(stop_id) ON DELETE RESTRICT,
  direction_id INT NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  status stx_ridership_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ridership_trip_stop ON stx_ridership (trip_id, stop_id);
CREATE INDEX idx_ridership_student ON stx_ridership (student_id);

CREATE TABLE stx_student_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES stx_students(id) ON DELETE CASCADE,
  trip_date DATE NOT NULL,
  route_type stx_absence_route_type_enum NOT NULL,
  confirmation_status stx_absence_status_enum NOT NULL DEFAULT 'pending',
  reported_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_absences_student_date ON stx_student_absences (student_id, trip_date);

CREATE TABLE stx_boarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES stx_runs(id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL REFERENCES stops(stop_id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES stx_students(id) ON DELETE CASCADE,
  event_kind stx_boarding_event_kind_enum NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by_driver_id UUID REFERENCES stx_drivers(id) ON DELETE SET NULL,
  source stx_boarding_event_source_enum NOT NULL DEFAULT 'driver_app',
  location geography(Point, 4326),
  notes TEXT
);
CREATE INDEX idx_boarding_run ON stx_boarding_events (run_id, recorded_at);
CREATE INDEX idx_boarding_student ON stx_boarding_events (student_id, recorded_at);

-- ---------------------------------------------------------------------------
-- 9. Alerts
-- ---------------------------------------------------------------------------
CREATE TABLE stx_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sta_id UUID NOT NULL REFERENCES stx_sta(id) ON DELETE CASCADE,
  category stx_alert_category_enum NOT NULL,
  severity stx_alert_severity_enum NOT NULL DEFAULT 'info',
  scope_kind stx_alert_scope_kind_enum NOT NULL,
  scope_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status stx_alert_status_enum NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  service_date DATE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_sta_active ON stx_alerts (sta_id, status, starts_at DESC);
CREATE INDEX idx_alerts_scope ON stx_alerts (scope_kind, scope_ref);

CREATE TABLE stx_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope_kind stx_alert_scope_kind_enum NOT NULL,
  scope_ref TEXT NOT NULL,
  channels stx_alert_channel_enum[] NOT NULL DEFAULT ARRAY['push']::stx_alert_channel_enum[],
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope_kind, scope_ref)
);
CREATE INDEX idx_alert_subs_user ON stx_alert_subscriptions (user_id);

CREATE TABLE stx_alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES stx_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel stx_alert_channel_enum NOT NULL,
  status stx_alert_delivery_status_enum NOT NULL DEFAULT 'queued',
  attempted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alert_id, user_id, channel)
);
CREATE INDEX idx_alert_deliv_user ON stx_alert_deliveries (user_id, created_at DESC);

CREATE TABLE stx_alert_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES stx_alerts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alert_audit_alert ON stx_alert_audit (alert_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. RLS (admin roles only — Driver/Parent enforced in app layer)
--     See DataModel-v2.md §3.3 for rationale.
-- ---------------------------------------------------------------------------
-- Helper expression: current_setting('sbtm.user_anchor_kind') / _id
-- The Phase B middleware sets these via `SET LOCAL` per request.
--
-- Policy convention:
--   anchor_kind='super'     → bypass (USING true)
--   anchor_kind='sta'       → row.sta_id  = anchor_id
--   anchor_kind='board'     → row.board_id = anchor_id
--   anchor_kind='school'    → row.school_id = anchor_id (or row.sta/board match by join)
--   anchor_kind='operator'  → row.operator_id = anchor_id (operator-scoped tables only)
-- Driver/Parent are not granted policy clauses; their queries pass through
-- the app-layer IN(...) filter on accessible run/student IDs.

ALTER TABLE stx_sta ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_sta_admin ON stx_sta
  USING (
    current_setting('sbtm.user_anchor_kind', true) = 'super'
    OR (current_setting('sbtm.user_anchor_kind', true) = 'sta'
        AND id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_boards_admin ON stx_boards
  USING (
    current_setting('sbtm.user_anchor_kind', true) = 'super'
    OR (current_setting('sbtm.user_anchor_kind', true) = 'sta'
        AND sta_id::text = current_setting('sbtm.user_anchor_id', true))
    OR (current_setting('sbtm.user_anchor_kind', true) = 'board'
        AND id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_schools_admin ON stx_schools
  USING (
    current_setting('sbtm.user_anchor_kind', true) = 'super'
    OR current_setting('sbtm.user_anchor_kind', true) IN ('sta','board')
    OR (current_setting('sbtm.user_anchor_kind', true) = 'school'
        AND id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_bell_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_bell_schedules_admin ON stx_bell_schedules
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_bell_schedule_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_bell_schedule_dates_admin ON stx_bell_schedule_dates
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_operators_admin ON stx_operators
  USING (
    current_setting('sbtm.user_anchor_kind', true) IN ('super','sta')
    OR (current_setting('sbtm.user_anchor_kind', true) = 'operator'
        AND id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_operator_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_op_contracts_admin ON stx_operator_contracts
  USING (
    current_setting('sbtm.user_anchor_kind', true) = 'super'
    OR (current_setting('sbtm.user_anchor_kind', true) = 'sta'
        AND sta_id::text = current_setting('sbtm.user_anchor_id', true))
    OR (current_setting('sbtm.user_anchor_kind', true) = 'operator'
        AND operator_id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_vehicles_admin ON stx_vehicles
  USING (
    current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school')
    OR (current_setting('sbtm.user_anchor_kind', true) = 'operator'
        AND operator_id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_drivers_admin ON stx_drivers
  USING (
    current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school')
    OR (current_setting('sbtm.user_anchor_kind', true) = 'operator'
        AND operator_id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_runs_admin ON stx_runs
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY routes_admin ON routes
  USING (
    current_setting('sbtm.user_anchor_kind', true) = 'super'
    OR (current_setting('sbtm.user_anchor_kind', true) = 'sta'
        AND stx_sta_id::text = current_setting('sbtm.user_anchor_id', true))
    OR (current_setting('sbtm.user_anchor_kind', true) = 'school'
        AND stx_school_id::text = current_setting('sbtm.user_anchor_id', true))
    OR current_setting('sbtm.user_anchor_kind', true) IN ('board','operator')
  );

ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY stops_admin ON stops
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY trips_admin ON trips
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE stop_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY stop_times_admin ON stop_times
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE shapes ENABLE ROW LEVEL SECURITY;
CREATE POLICY shapes_admin ON shapes
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE agency ENABLE ROW LEVEL SECURITY;
CREATE POLICY agency_admin ON agency
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE stx_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_students_admin ON stx_students
  USING (
    current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board')
    OR (current_setting('sbtm.user_anchor_kind', true) = 'school'
        AND school_id::text = current_setting('sbtm.user_anchor_id', true))
  );

ALTER TABLE stx_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_guardians_admin ON stx_guardians
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_student_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_sg_admin ON stx_student_guardians
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_eligibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_eligibility_admin ON stx_eligibility
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_ridership ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_ridership_admin ON stx_ridership
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE stx_student_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_absences_admin ON stx_student_absences
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_boarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_boarding_admin ON stx_boarding_events
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school','operator'));

ALTER TABLE stx_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_alerts_admin ON stx_alerts
  USING (
    current_setting('sbtm.user_anchor_kind', true) = 'super'
    OR (current_setting('sbtm.user_anchor_kind', true) = 'sta'
        AND sta_id::text = current_setting('sbtm.user_anchor_id', true))
    OR current_setting('sbtm.user_anchor_kind', true) IN ('board','school','operator')
  );

ALTER TABLE stx_alert_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_alert_subs_admin ON stx_alert_subscriptions
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_alert_deliv_admin ON stx_alert_deliveries
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_alert_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_alert_audit_admin ON stx_alert_audit
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

ALTER TABLE stx_calendar_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY stx_calendar_link_admin ON stx_calendar_link
  USING (current_setting('sbtm.user_anchor_kind', true) IN ('super','sta','board','school'));

COMMIT;
