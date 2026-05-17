-- Phase C — Slice 1: staging tables for the STA CSV import pipeline.
--
-- These tables hold the raw, per-file rows of a single import attempt keyed by
-- import_session_id. Slice 2 (diff + commit) will read from stage_* and upsert
-- into the canonical v2 tables; slice 1 only writes them so the validate/dry-run
-- flow has a place to persist a parsed bundle.
--
-- Apply manually for now: psql $DATABASE_URL -f migrations/20260601_create_stage_tables.sql
-- Slice 2 will wire this into TypeORM migrations alongside api-gateway.

BEGIN;

CREATE TABLE IF NOT EXISTS import_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source              text NOT NULL,                  -- e.g. 'sta-csv'
  sta_short_code      text NOT NULL,
  export_id           text NOT NULL,
  export_at           timestamptz NOT NULL,
  manifest_json       jsonb NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','validating','validated','committing','committed','failed','aborted')),
  error_count         int NOT NULL DEFAULT 0,
  warning_count       int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_sessions_export_unique UNIQUE (sta_short_code, export_id)
);

-- Generic helper: each stage table carries (import_session_id, row_number, raw jsonb)
-- plus a natural key column or columns so the diff phase can join cheaply.
-- All FKs back to import_sessions cascade-delete so aborts clean up trivially.

CREATE TABLE IF NOT EXISTS stage_board_school (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  sta_short_code      text NOT NULL,
  board_code          text NOT NULL,
  school_code         text NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, board_code, school_code)
);

CREATE TABLE IF NOT EXISTS stage_operators (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  operator_code       text NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, operator_code)
);

CREATE TABLE IF NOT EXISTS stage_vehicles (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  vehicle_code        text NOT NULL,
  operator_code       text NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, vehicle_code)
);

CREATE TABLE IF NOT EXISTS stage_routes (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  sta_route_number    text NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, sta_route_number)
);

CREATE TABLE IF NOT EXISTS stage_stops (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  sta_stop_id         text NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, sta_stop_id)
);

CREATE TABLE IF NOT EXISTS stage_shapes (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  shape_id            text NOT NULL,
  shape_pt_sequence   int NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, shape_id, shape_pt_sequence)
);

CREATE TABLE IF NOT EXISTS stage_trips (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  sta_trip_id         text NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, sta_trip_id)
);

CREATE TABLE IF NOT EXISTS stage_stop_times (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  sta_trip_id         text NOT NULL,
  sequence            int NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, sta_trip_id, sequence)
);

CREATE TABLE IF NOT EXISTS stage_students (
  import_session_id      uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number             int NOT NULL,
  board_student_number   text NOT NULL,
  payload                jsonb NOT NULL,
  PRIMARY KEY (import_session_id, board_student_number)
);

CREATE TABLE IF NOT EXISTS stage_guardians (
  import_session_id   uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number          int NOT NULL,
  guardian_code       text NOT NULL,
  payload             jsonb NOT NULL,
  PRIMARY KEY (import_session_id, guardian_code)
);

CREATE TABLE IF NOT EXISTS stage_student_guardians (
  import_session_id      uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number             int NOT NULL,
  board_student_number   text NOT NULL,
  guardian_code          text NOT NULL,
  payload                jsonb NOT NULL,
  PRIMARY KEY (import_session_id, board_student_number, guardian_code)
);

CREATE TABLE IF NOT EXISTS stage_ridership (
  import_session_id      uuid NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number             int NOT NULL,
  board_student_number   text NOT NULL,
  sta_route_number       text NOT NULL,
  sta_stop_id            text NOT NULL,
  direction_id           smallint NOT NULL,
  payload                jsonb NOT NULL,
  PRIMARY KEY (import_session_id, board_student_number, sta_route_number, sta_stop_id, direction_id)
);

COMMIT;
