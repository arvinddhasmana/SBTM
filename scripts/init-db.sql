-- ============================================================================
-- SBTM Consolidated Init DB Script
-- Date: February 12, 2026
--
-- Actions:
-- 1. Setup Database (Extensions, Clean Slate)
-- 2. Create Schema (Gateway, Microservices, Legacy References)
-- 3. Seed Data (Tenants, Users, Operations, Students, Tracking)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Setup Database
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing tables and types to ensure a clean slate (CASCADE to handle FKs)
DROP TABLE IF EXISTS emergency_alert CASCADE;
DROP TABLE IF EXISTS alert_notification_log CASCADE;
DROP TYPE IF EXISTS emergency_event_type_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_status_enum CASCADE;
DROP TYPE IF EXISTS notification_channel_enum CASCADE;
DROP TYPE IF EXISTS notification_status_enum CASCADE;
DROP TABLE IF EXISTS route_deviation_events CASCADE;
DROP TABLE IF EXISTS route_geofences CASCADE;
DROP TABLE IF EXISTS route_lifecycle_events CASCADE;
DROP TABLE IF EXISTS location_points CASCADE;
DROP TABLE IF EXISTS presence_event CASCADE;
DROP TABLE IF EXISTS student_tag CASCADE;
DROP TABLE IF EXISTS route_stops_reference CASCADE;
DROP TABLE IF EXISTS routes_reference CASCADE;
DROP TABLE IF EXISTS vehicles_reference CASCADE;
DROP TABLE IF EXISTS students_reference CASCADE;
DROP TABLE IF EXISTS route_stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS school_boards CASCADE;

DROP TYPE IF EXISTS presence_event_eventtype_enum CASCADE;
DROP TYPE IF EXISTS presence_event_source_enum CASCADE;

-- --------------------------------------------------------------------------
-- 2. Create Schema (Gateway & Microservices)
-- --------------------------------------------------------------------------

-- Tenants
CREATE TABLE school_boards (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE schools (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  "boardId" UUID NOT NULL,
  CONSTRAINT "FK_schools_board" FOREIGN KEY ("boardId") REFERENCES school_boards(id) ON DELETE RESTRICT
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  role TEXT NOT NULL,
  "firstName" TEXT NULL,
  "lastName" TEXT NULL,
  "driverId" TEXT NULL,
  "childRouteIds" TEXT NULL,
  "assignedRouteIds" TEXT NULL,
  "schoolId" UUID NULL,
  "boardId" UUID NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "invitationToken" TEXT NULL UNIQUE,
  "invitationExpiresAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "FK_users_school" FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE SET NULL,
  CONSTRAINT "FK_users_board" FOREIGN KEY ("boardId") REFERENCES school_boards(id) ON DELETE SET NULL
);

-- Operational Data (Gateway Core)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  "schoolId" UUID NOT NULL,
  "licensePlate" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "FK_vehicles_school" FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT "UQ_vehicle_school_plate" UNIQUE ("schoolId", "licensePlate")
);

CREATE TABLE routes (
  id UUID PRIMARY KEY,
  "schoolId" UUID NOT NULL,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  "vehicleId" UUID NULL,
  "startTime" TIME NOT NULL,
  "estimatedDuration" INT NOT NULL DEFAULT 60,
  polyline TEXT NULL,
  CONSTRAINT "FK_routes_school" FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT "FK_routes_vehicle" FOREIGN KEY ("vehicleId") REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT "UQ_route_school_name" UNIQUE ("schoolId", name)
);

CREATE TABLE route_stops (
  id UUID PRIMARY KEY,
  "routeId" UUID NOT NULL,
  "sequence" INT NOT NULL,
  "address" TEXT NOT NULL,
  "location" GEOGRAPHY(POINT, 4326) NULL,
  lat DOUBLE PRECISION NULL,
  lng DOUBLE PRECISION NULL,
  "arrivalTime" TIME NULL,
  CONSTRAINT "FK_route_stops_route" FOREIGN KEY ("routeId") REFERENCES routes(id) ON DELETE CASCADE
);

-- Students (Matching student-management entity)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    grade VARCHAR NOT NULL,
    address VARCHAR,
    school_id UUID NOT NULL,
    parent_user_id UUID,
    am_route_id UUID,
    pm_route_id UUID,
    am_stop_id UUID,
    pm_stop_id UUID,
    external_student_id VARCHAR,
    status VARCHAR DEFAULT 'ENROLLED',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "UQ_students_school_external" UNIQUE (school_id, external_student_id)
);

-- Student Tags (Matching student-presence entity)
CREATE TABLE student_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" VARCHAR NOT NULL,
    "studentId" VARCHAR NOT NULL,
    "tagId" VARCHAR NOT NULL,
    "tagType" VARCHAR DEFAULT 'SMARTTAG',
    "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX "IDX_student_tag_school_tag" ON student_tag ("schoolId", "tagId");

-- Presence Events (Matching student-presence entity)
-- Create ENUM types to match TypeORM entity definitions
CREATE TYPE presence_event_eventtype_enum AS ENUM ('BOARD', 'ALIGHT');
CREATE TYPE presence_event_source_enum AS ENUM ('SMARTTAG', 'MANUAL', 'RFID');

CREATE TABLE presence_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" VARCHAR NOT NULL,
    "studentId" VARCHAR NOT NULL,
    "vehicleId" VARCHAR NOT NULL,
    "routeId" VARCHAR NOT NULL,
    "eventType" presence_event_eventtype_enum NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "source" presence_event_source_enum DEFAULT 'SMARTTAG',
    "signalStrength" FLOAT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Location Points (Matching gps-tracking prisma model)
CREATE TABLE location_points (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  timestamp TIMESTAMP(3) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  snapped_lat DOUBLE PRECISION NULL,
  snapped_lng DOUBLE PRECISION NULL,
  speed_kph DOUBLE PRECISION,
  heading_deg DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION
);
CREATE INDEX "IDX_location_points_timestamp" ON location_points(timestamp);
CREATE INDEX "IDX_location_points_school_route" ON location_points(school_id, route_id);

CREATE TABLE route_lifecycle_events (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stop_id TEXT,
  timestamp TIMESTAMP(3) NOT NULL
);
CREATE INDEX "IDX_route_lifecycle_route" ON route_lifecycle_events(route_id);
CREATE INDEX "IDX_route_lifecycle_school_route" ON route_lifecycle_events(school_id, route_id);

CREATE TABLE route_geofences (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  route_id TEXT NOT NULL UNIQUE,
  corridor_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 200,
  stop_proximity_meters DOUBLE PRECISION NOT NULL DEFAULT 50,
  deviation_threshold_meters DOUBLE PRECISION NOT NULL DEFAULT 300,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "IDX_route_geofences_school" ON route_geofences(school_id);

-- Emergency Alerts (Matching emergency-alerts entity)
CREATE TYPE emergency_event_type_enum AS ENUM ('PANIC_BUTTON', 'ROUTE_DEVIATION', 'INCIDENT', 'OTHER');
CREATE TYPE emergency_alert_status_enum AS ENUM ('ACTIVE', 'RESOLVED');

CREATE TABLE emergency_alert (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" VARCHAR NOT NULL,
    "vehicleId" VARCHAR NOT NULL,
    "routeId" VARCHAR NOT NULL,
    "driverId" VARCHAR NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "lat" FLOAT NOT NULL,
    "lng" FLOAT NOT NULL,
    "eventType" emergency_event_type_enum DEFAULT 'PANIC_BUTTON',
    "status" emergency_alert_status_enum DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TYPE notification_channel_enum AS ENUM ('PUSH', 'EMAIL', 'SMS');
CREATE TYPE notification_status_enum AS ENUM ('SENT', 'FAILED');

CREATE TABLE alert_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "alertId" VARCHAR NOT NULL,
    "recipientUserId" VARCHAR NOT NULL,
    "channel" notification_channel_enum NOT NULL,
    "status" notification_status_enum NOT NULL,
    "timestamp" TIMESTAMP DEFAULT NOW()
);




-- --------------------------------------------------------------------------
-- 3. Create Reference Schema (Legacy/Demo)
-- --------------------------------------------------------------------------

CREATE TABLE vehicles_reference (
    id VARCHAR(255) PRIMARY KEY,
    "plateNumber" VARCHAR(20),
    capacity INT,
    status VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE routes_reference (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    "vehicleId" TEXT,
    "driverId" TEXT,
    "schedule" JSONB,
    "polyline" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE route_stops_reference (
    id VARCHAR(255) PRIMARY KEY,
    "routeId" VARCHAR(255),
    "sequenceOrder" INT,
    "stopName" VARCHAR(255),
    lat FLOAT,
    lng FLOAT,
    "arrivalTime" TIME
);

CREATE TABLE students_reference (
    id VARCHAR(255) PRIMARY KEY,
    "firstName" VARCHAR(255),
    "lastName" VARCHAR(255),
    grade INT,
    "parentId" VARCHAR(255),
    "schoolId" VARCHAR(255),
    "assignedRouteId" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT NOW()
);


-- --------------------------------------------------------------------------
-- 4. Seed Data — Realistic Demo
--
-- Demo Configuration:
--   2 schools (Ottawa, Canada), 20 buses, 20 drivers (4 live),
--   500 students, 100 stops, 10 parents tracking 15 kids
--
-- School GPS Locations (configurable — change these and regenerate routes):
--   School 1 "Greenfield Elementary": 45.3876, -75.6960  (Glebe, Ottawa)
--   School 2 "Riverside Academy":     45.3960, -75.7300  (Westboro, Ottawa)
--   All routes within 5 km radius of each school.
--
-- Live Drivers (4 — use phone GPS via Driver App):
--   driver1@sbtm.demo  → ROUTE-R01 (School 1)  ☆ LIVE
--   driver2@sbtm.demo  → ROUTE-R02 (School 1)  ☆ LIVE
--   driver11@sbtm.demo → ROUTE-R11 (School 2)  ☆ LIVE
--   driver12@sbtm.demo → ROUTE-R12 (School 2)  ☆ LIVE
-- --------------------------------------------------------------------------

BEGIN;

-- ===================== Tenants =====================

INSERT INTO school_boards (id, name) VALUES
    ('b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Ottawa-Carleton District School Board');

INSERT INTO schools (id, name, "boardId") VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Greenfield Elementary',  'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Riverside Academy',      'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- ===================== Admin Users =====================

INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "schoolId", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000001', 'osta.admin@sbtm.demo',    crypt('Admin123!', gen_salt('bf')), 'OSTA_ADMIN',   'OSTA',   'Admin',   NULL, NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000002', 'school.admin@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'SCHOOL_ADMIN', 'School', 'Admin',   NULL, NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000003', 'school2.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'SCHOOL_ADMIN', 'School2','Admin',   NULL, NULL, NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- ===================== Driver Users (4 — live drivers only) =====================
-- driver1, driver2 → School 1 ("Greenfield Elementary")
-- driver11, driver12 → School 2 ("Riverside Academy")

INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "schoolId", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000101', 'driver1@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'James',    'Wilson',    'driver-001', NULL, 'ROUTE-R01', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000102', 'driver2@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Robert',   'Taylor',    'driver-002', NULL, 'ROUTE-R02', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000111', 'driver11@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Andrew',   'Clark',     'driver-011', NULL, 'ROUTE-R11', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000112', 'driver12@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Kevin',    'Lewis',     'driver-012', NULL, 'ROUTE-R12', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- ===================== Parent Users (10) tracking students on 4 active routes =====================
-- parent1/parent2 → School 1 (R01, R02); parent3+ → School 2 (R11, R12)

INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "schoolId", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000201', 'parent1@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Sarah',    'Smith',     NULL, 'ROUTE-R01,ROUTE-R02', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000202', 'parent2@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'David',    'Johnson',   NULL, 'ROUTE-R02',            NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000203', 'parent3@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Maria',    'Garcia',    NULL, 'ROUTE-R11,ROUTE-R12', NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000204', 'parent4@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Linda',    'Brown',     NULL, 'ROUTE-R01',            NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000205', 'parent5@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Jennifer', 'Martinez',  NULL, 'ROUTE-R01,ROUTE-R02', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000206', 'parent6@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Patricia', 'Robinson',  NULL, 'ROUTE-R11',            NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000207', 'parent7@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Elizabeth','Clark',     NULL, 'ROUTE-R12',            NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000208', 'parent8@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Barbara',  'Lewis',     NULL, 'ROUTE-R02',            NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000209', 'parent9@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Susan',    'Lee',       NULL, 'ROUTE-R11,ROUTE-R12', NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000210', 'parent10@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Jessica',  'Walker',    NULL, 'ROUTE-R02',            NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- ===================== Vehicles (4) =====================
-- BUS-01/02 → School 1 (Greenfield Elementary), BUS-11/12 → School 2 (Riverside Academy)

INSERT INTO vehicles (id, "schoolId", "licensePlate", status) VALUES
    ('20000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1001', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1002', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000011', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2001', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000012', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2002', 'ACTIVE');

-- ===================== Routes (4) =====================
-- School 1 ("Greenfield Elementary" at 45.3876, -75.6960): R01 Bank Street South, R02 Bronson Avenue
-- School 2 ("Riverside Academy"   at 45.3960, -75.7300): R11 Richmond Road, R12 Scott Street

INSERT INTO routes (id, "schoolId", name, direction, "vehicleId", "startTime", "estimatedDuration") VALUES
    ('30000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Bank Street South', 'AM', '20000000-0000-0000-0000-000000000001', '07:15:00', 35),
    ('30000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Bronson Avenue',    'AM', '20000000-0000-0000-0000-000000000002', '07:20:00', 30),
    ('30000000-0000-0000-0000-000000000011', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Richmond Road',     'AM', '20000000-0000-0000-0000-000000000011', '07:15:00', 35),
    ('30000000-0000-0000-0000-000000000012', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Scott Street',      'AM', '20000000-0000-0000-0000-000000000012', '07:20:00', 30);

-- ===================== Route Stops (48 — 12 per route) =====================
-- Stop UUID pattern: '5{RR}{SS}00-0000-0000-0000-000000000001'
-- RR = route code (01,02,11,12), SS = 2-digit stop sequence (01-12)

INSERT INTO route_stops (id, "routeId", "sequence", "address", lat, lng, "location", "arrivalTime") VALUES
    -- R01 Bank Street South (SE→School, along Bank St, 12 stops)
    ('50010100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  1, 'Bank & Walkley',      45.3680, -75.6693, ST_SetSRID(ST_MakePoint(-75.6693, 45.3680), 4326)::geography, '07:15:00'),
    ('50010200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  2, 'Bank & Kilborn',      45.3699, -75.6700, ST_SetSRID(ST_MakePoint(-75.6700, 45.3699), 4326)::geography, '07:18:00'),
    ('50010300-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  3, 'Billings Bridge',     45.3733, -75.6718, ST_SetSRID(ST_MakePoint(-75.6718, 45.3733), 4326)::geography, '07:21:00'),
    ('50010400-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  4, 'Bank & Johnston Rd',  45.3755, -75.6749, ST_SetSRID(ST_MakePoint(-75.6749, 45.3755), 4326)::geography, '07:24:00'),
    ('50010500-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  5, 'Bank & Connell Ave',  45.3762, -75.6757, ST_SetSRID(ST_MakePoint(-75.6757, 45.3762), 4326)::geography, '07:26:00'),
    ('50010600-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  6, 'Bank & Heron Rd',     45.3780, -75.6790, ST_SetSRID(ST_MakePoint(-75.6790, 45.3780), 4326)::geography, '07:29:00'),
    ('50010700-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  7, 'Bank & Randall Ave',  45.3800, -75.6808, ST_SetSRID(ST_MakePoint(-75.6808, 45.3800), 4326)::geography, '07:31:00'),
    ('50010800-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  8, 'Bank & Seneca St',    45.3815, -75.6827, ST_SetSRID(ST_MakePoint(-75.6827, 45.3815), 4326)::geography, '07:33:00'),
    ('50010900-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',  9, 'Bank & Belmont Ave',  45.3830, -75.6844, ST_SetSRID(ST_MakePoint(-75.6844, 45.3830), 4326)::geography, '07:35:00'),
    ('50011000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 10, 'Bank & Holmwood Ave', 45.3843, -75.6860, ST_SetSRID(ST_MakePoint(-75.6860, 45.3843), 4326)::geography, '07:37:00'),
    ('50011100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 11, 'Bank & Fifth Ave',    45.3855, -75.6878, ST_SetSRID(ST_MakePoint(-75.6878, 45.3855), 4326)::geography, '07:39:00'),
    ('50011200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 12, 'Bank & Sunnyside Ave',45.3867, -75.6902, ST_SetSRID(ST_MakePoint(-75.6902, 45.3867), 4326)::geography, '07:41:00'),

    -- R02 Bronson Avenue (SW→School: Merivale→Carling→Bronson N, 12 stops)
    ('50020100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  1, 'Merivale & Carling',     45.3758, -75.7200, ST_SetSRID(ST_MakePoint(-75.7200, 45.3758), 4326)::geography, '07:20:00'),
    ('50020200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  2, 'Carling & Clyde Ave',    45.3758, -75.7130, ST_SetSRID(ST_MakePoint(-75.7130, 45.3758), 4326)::geography, '07:22:00'),
    ('50020300-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  3, 'Fisher & Carling',       45.3760, -75.7002, ST_SetSRID(ST_MakePoint(-75.7002, 45.3760), 4326)::geography, '07:25:00'),
    ('50020400-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  4, 'Bronson & Carling',      45.3762, -75.6990, ST_SetSRID(ST_MakePoint(-75.6990, 45.3762), 4326)::geography, '07:27:00'),
    ('50020500-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  5, 'Bronson & Commissioner', 45.3790, -75.6985, ST_SetSRID(ST_MakePoint(-75.6985, 45.3790), 4326)::geography, '07:30:00'),
    ('50020600-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  6, 'Carleton Main Gate',     45.3817, -75.6982, ST_SetSRID(ST_MakePoint(-75.6982, 45.3817), 4326)::geography, '07:32:00'),
    ('50020700-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  7, 'Bronson & Aylmer Ave',   45.3828, -75.6976, ST_SetSRID(ST_MakePoint(-75.6976, 45.3828), 4326)::geography, '07:34:00'),
    ('50020800-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  8, 'Bronson & Sunnyside Ave',45.3840, -75.6972, ST_SetSRID(ST_MakePoint(-75.6972, 45.3840), 4326)::geography, '07:36:00'),
    ('50020900-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',  9, 'Bronson & Holmwood Ave', 45.3851, -75.6968, ST_SetSRID(ST_MakePoint(-75.6968, 45.3851), 4326)::geography, '07:38:00'),
    ('50021000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 10, 'Bronson & Third Ave',    45.3861, -75.6964, ST_SetSRID(ST_MakePoint(-75.6964, 45.3861), 4326)::geography, '07:40:00'),
    ('50021100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 11, 'Bronson & Glebe Ave',    45.3868, -75.6961, ST_SetSRID(ST_MakePoint(-75.6961, 45.3868), 4326)::geography, '07:42:00'),
    ('50021200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 12, 'Chamberlain & Percy',    45.3873, -75.6958, ST_SetSRID(ST_MakePoint(-75.6958, 45.3873), 4326)::geography, '07:44:00'),

    -- R11 Richmond Road (W→E toward Riverside Academy, 12 stops)
    ('50110100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  1, 'Richmond & Woodroffe',   45.3900, -75.7600, ST_SetSRID(ST_MakePoint(-75.7600, 45.3900), 4326)::geography, '07:15:00'),
    ('50110200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  2, 'Richmond & Currell Blvd',45.3905, -75.7545, ST_SetSRID(ST_MakePoint(-75.7545, 45.3905), 4326)::geography, '07:18:00'),
    ('50110300-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  3, 'Richmond & Roseberry',   45.3910, -75.7490, ST_SetSRID(ST_MakePoint(-75.7490, 45.3910), 4326)::geography, '07:21:00'),
    ('50110400-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  4, 'Richmond & Cleary Ave',  45.3913, -75.7435, ST_SetSRID(ST_MakePoint(-75.7435, 45.3913), 4326)::geography, '07:24:00'),
    ('50110500-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  5, 'Richmond & Churchill',   45.3916, -75.7388, ST_SetSRID(ST_MakePoint(-75.7388, 45.3916), 4326)::geography, '07:27:00'),
    ('50110600-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  6, 'Richmond & Golden Ave',  45.3920, -75.7345, ST_SetSRID(ST_MakePoint(-75.7345, 45.3920), 4326)::geography, '07:29:00'),
    ('50110700-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  7, 'Richmond & Athlone Ave', 45.3928, -75.7320, ST_SetSRID(ST_MakePoint(-75.7320, 45.3928), 4326)::geography, '07:31:00'),
    ('50110800-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  8, 'Richmond & Island Park', 45.3935, -75.7305, ST_SetSRID(ST_MakePoint(-75.7305, 45.3935), 4326)::geography, '07:33:00'),
    ('50110900-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011',  9, 'Richmond & Grosvenor',   45.3940, -75.7295, ST_SetSRID(ST_MakePoint(-75.7295, 45.3940), 4326)::geography, '07:35:00'),
    ('50111000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011', 10, 'Byron Ave & Island Park',45.3947, -75.7298, ST_SetSRID(ST_MakePoint(-75.7298, 45.3947), 4326)::geography, '07:37:00'),
    ('50111100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011', 11, 'Byron Ave Mid',          45.3953, -75.7300, ST_SetSRID(ST_MakePoint(-75.7300, 45.3953), 4326)::geography, '07:39:00'),
    ('50111200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011', 12, 'Byron at School Ave',    45.3957, -75.7300, ST_SetSRID(ST_MakePoint(-75.7300, 45.3957), 4326)::geography, '07:41:00'),

    -- R12 Scott Street (E→W on Scott, then S on Island Park to school, 12 stops)
    ('50120100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  1, 'Scott & Bayview',        45.4000, -75.7050, ST_SetSRID(ST_MakePoint(-75.7050, 45.4000), 4326)::geography, '07:20:00'),
    ('50120200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  2, 'Scott & Preston',        45.3992, -75.7110, ST_SetSRID(ST_MakePoint(-75.7110, 45.3992), 4326)::geography, '07:22:00'),
    ('50120300-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  3, 'Scott & Booth St',       45.3988, -75.7155, ST_SetSRID(ST_MakePoint(-75.7155, 45.3988), 4326)::geography, '07:24:00'),
    ('50120400-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  4, 'Scott & Empress Ave',    45.3985, -75.7200, ST_SetSRID(ST_MakePoint(-75.7200, 45.3985), 4326)::geography, '07:26:00'),
    ('50120500-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  5, 'Scott & Breezehill',     45.3983, -75.7230, ST_SetSRID(ST_MakePoint(-75.7230, 45.3983), 4326)::geography, '07:28:00'),
    ('50120600-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  6, 'Scott & Holland Ave',    45.3980, -75.7255, ST_SetSRID(ST_MakePoint(-75.7255, 45.3980), 4326)::geography, '07:30:00'),
    ('50120700-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  7, 'Scott & Parkdale Ave',   45.3975, -75.7275, ST_SetSRID(ST_MakePoint(-75.7275, 45.3975), 4326)::geography, '07:32:00'),
    ('50120800-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  8, 'Scott & Winona Ave',     45.3970, -75.7295, ST_SetSRID(ST_MakePoint(-75.7295, 45.3970), 4326)::geography, '07:34:00'),
    ('50120900-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012',  9, 'Scott & Island Park',    45.3965, -75.7309, ST_SetSRID(ST_MakePoint(-75.7309, 45.3965), 4326)::geography, '07:36:00'),
    ('50121000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012', 10, 'Island Park & Byron',    45.3960, -75.7310, ST_SetSRID(ST_MakePoint(-75.7310, 45.3960), 4326)::geography, '07:38:00'),
    ('50121100-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012', 11, 'School Approach',        45.3959, -75.7306, ST_SetSRID(ST_MakePoint(-75.7306, 45.3959), 4326)::geography, '07:40:00'),
    ('50121200-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012', 12, 'Near Riverside Academy', 45.3958, -75.7302, ST_SetSRID(ST_MakePoint(-75.7302, 45.3958), 4326)::geography, '07:42:00');


-- ===================== Reference Tables (4 routes) =====================

INSERT INTO vehicles_reference (id, "plateNumber", capacity, status) VALUES
    ('BUS-01', 'ON-1001', 40, 'ACTIVE'),
    ('BUS-02', 'ON-1002', 40, 'ACTIVE'),
    ('BUS-11', 'ON-2001', 40, 'ACTIVE'),
    ('BUS-12', 'ON-2002', 40, 'ACTIVE');

-- polyline is initially NULL; sync-routes.js fills it via OSRM or fallback encoder
INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule) VALUES
    ('ROUTE-R01', 'Bank Street South', 'BUS-01', 'driver-001', '{"startTime":"07:15","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R02', 'Bronson Avenue',    'BUS-02', 'driver-002', '{"startTime":"07:20","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R11', 'Richmond Road',     'BUS-11', 'driver-011', '{"startTime":"07:15","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R12', 'Scott Street',      'BUS-12', 'driver-012', '{"startTime":"07:20","days":["Mon","Tue","Wed","Thu","Fri"]}');

INSERT INTO route_stops_reference (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime") VALUES
    -- R01 Bank Street South (12 stops)
    ('STOP-R01-S01',  'ROUTE-R01',  1, 'Bank & Walkley',       45.3680, -75.6693, '07:15:00'),
    ('STOP-R01-S02',  'ROUTE-R01',  2, 'Bank & Kilborn',       45.3699, -75.6700, '07:18:00'),
    ('STOP-R01-S03',  'ROUTE-R01',  3, 'Billings Bridge',      45.3733, -75.6718, '07:21:00'),
    ('STOP-R01-S04',  'ROUTE-R01',  4, 'Bank & Johnston Rd',   45.3755, -75.6749, '07:24:00'),
    ('STOP-R01-S05',  'ROUTE-R01',  5, 'Bank & Connell Ave',   45.3762, -75.6757, '07:26:00'),
    ('STOP-R01-S06',  'ROUTE-R01',  6, 'Bank & Heron Rd',      45.3780, -75.6790, '07:29:00'),
    ('STOP-R01-S07',  'ROUTE-R01',  7, 'Bank & Randall Ave',   45.3800, -75.6808, '07:31:00'),
    ('STOP-R01-S08',  'ROUTE-R01',  8, 'Bank & Seneca St',     45.3815, -75.6827, '07:33:00'),
    ('STOP-R01-S09',  'ROUTE-R01',  9, 'Bank & Belmont Ave',   45.3830, -75.6844, '07:35:00'),
    ('STOP-R01-S10',  'ROUTE-R01', 10, 'Bank & Holmwood Ave',  45.3843, -75.6860, '07:37:00'),
    ('STOP-R01-S11',  'ROUTE-R01', 11, 'Bank & Fifth Ave',     45.3855, -75.6878, '07:39:00'),
    ('STOP-R01-S12',  'ROUTE-R01', 12, 'Bank & Sunnyside Ave', 45.3867, -75.6902, '07:41:00'),
    -- R02 Bronson Avenue (12 stops)
    ('STOP-R02-S01',  'ROUTE-R02',  1, 'Merivale & Carling',     45.3758, -75.7200, '07:20:00'),
    ('STOP-R02-S02',  'ROUTE-R02',  2, 'Carling & Clyde Ave',    45.3758, -75.7130, '07:22:00'),
    ('STOP-R02-S03',  'ROUTE-R02',  3, 'Fisher & Carling',       45.3760, -75.7002, '07:25:00'),
    ('STOP-R02-S04',  'ROUTE-R02',  4, 'Bronson & Carling',      45.3762, -75.6990, '07:27:00'),
    ('STOP-R02-S05',  'ROUTE-R02',  5, 'Bronson & Commissioner', 45.3790, -75.6985, '07:30:00'),
    ('STOP-R02-S06',  'ROUTE-R02',  6, 'Carleton Main Gate',     45.3817, -75.6982, '07:32:00'),
    ('STOP-R02-S07',  'ROUTE-R02',  7, 'Bronson & Aylmer Ave',   45.3828, -75.6976, '07:34:00'),
    ('STOP-R02-S08',  'ROUTE-R02',  8, 'Bronson & Sunnyside Ave',45.3840, -75.6972, '07:36:00'),
    ('STOP-R02-S09',  'ROUTE-R02',  9, 'Bronson & Holmwood Ave', 45.3851, -75.6968, '07:38:00'),
    ('STOP-R02-S10',  'ROUTE-R02', 10, 'Bronson & Third Ave',    45.3861, -75.6964, '07:40:00'),
    ('STOP-R02-S11',  'ROUTE-R02', 11, 'Bronson & Glebe Ave',    45.3868, -75.6961, '07:42:00'),
    ('STOP-R02-S12',  'ROUTE-R02', 12, 'Chamberlain & Percy',    45.3873, -75.6958, '07:44:00'),
    -- R11 Richmond Road (12 stops)
    ('STOP-R11-S01',  'ROUTE-R11',  1, 'Richmond & Woodroffe',   45.3900, -75.7600, '07:15:00'),
    ('STOP-R11-S02',  'ROUTE-R11',  2, 'Richmond & Currell Blvd',45.3905, -75.7545, '07:18:00'),
    ('STOP-R11-S03',  'ROUTE-R11',  3, 'Richmond & Roseberry',   45.3910, -75.7490, '07:21:00'),
    ('STOP-R11-S04',  'ROUTE-R11',  4, 'Richmond & Cleary Ave',  45.3913, -75.7435, '07:24:00'),
    ('STOP-R11-S05',  'ROUTE-R11',  5, 'Richmond & Churchill',   45.3916, -75.7388, '07:27:00'),
    ('STOP-R11-S06',  'ROUTE-R11',  6, 'Richmond & Golden Ave',  45.3920, -75.7345, '07:29:00'),
    ('STOP-R11-S07',  'ROUTE-R11',  7, 'Richmond & Athlone Ave', 45.3928, -75.7320, '07:31:00'),
    ('STOP-R11-S08',  'ROUTE-R11',  8, 'Richmond & Island Park', 45.3935, -75.7305, '07:33:00'),
    ('STOP-R11-S09',  'ROUTE-R11',  9, 'Richmond & Grosvenor',   45.3940, -75.7295, '07:35:00'),
    ('STOP-R11-S10',  'ROUTE-R11', 10, 'Byron Ave & Island Park',45.3947, -75.7298, '07:37:00'),
    ('STOP-R11-S11',  'ROUTE-R11', 11, 'Byron Ave Mid',          45.3953, -75.7300, '07:39:00'),
    ('STOP-R11-S12',  'ROUTE-R11', 12, 'Byron at School Ave',    45.3957, -75.7300, '07:41:00'),
    -- R12 Scott Street (12 stops)
    ('STOP-R12-S01',  'ROUTE-R12',  1, 'Scott & Bayview',        45.4000, -75.7050, '07:20:00'),
    ('STOP-R12-S02',  'ROUTE-R12',  2, 'Scott & Preston',        45.3992, -75.7110, '07:22:00'),
    ('STOP-R12-S03',  'ROUTE-R12',  3, 'Scott & Booth St',       45.3988, -75.7155, '07:24:00'),
    ('STOP-R12-S04',  'ROUTE-R12',  4, 'Scott & Empress Ave',    45.3985, -75.7200, '07:26:00'),
    ('STOP-R12-S05',  'ROUTE-R12',  5, 'Scott & Breezehill',     45.3983, -75.7230, '07:28:00'),
    ('STOP-R12-S06',  'ROUTE-R12',  6, 'Scott & Holland Ave',    45.3980, -75.7255, '07:30:00'),
    ('STOP-R12-S07',  'ROUTE-R12',  7, 'Scott & Parkdale Ave',   45.3975, -75.7275, '07:32:00'),
    ('STOP-R12-S08',  'ROUTE-R12',  8, 'Scott & Winona Ave',     45.3970, -75.7295, '07:34:00'),
    ('STOP-R12-S09',  'ROUTE-R12',  9, 'Scott & Island Park',    45.3965, -75.7309, '07:36:00'),
    ('STOP-R12-S10',  'ROUTE-R12', 10, 'Island Park & Byron',    45.3960, -75.7310, '07:38:00'),
    ('STOP-R12-S11',  'ROUTE-R12', 11, 'School Approach',        45.3959, -75.7306, '07:40:00'),
    ('STOP-R12-S12',  'ROUTE-R12', 12, 'Near Riverside Academy', 45.3958, -75.7302, '07:42:00');

-- ===================== 88 Students (22 per route) + students_reference =====================
-- Stop assignment: S01→idx1, S02→idx2, S03→idx3-4, S04→idx5-6, ..., S12→idx21-22
-- Parent tracking: STUDENT-001/002→parent1(R01), STUDENT-023/024→parent2(R02), STUDENT-045/046/067/068→parent3(R11/R12)

DO $$
DECLARE
    first_names TEXT[] := ARRAY[
        'Emma','Liam','Olivia','Noah','Ava','Sophia','Jackson','Lucas','Mia','Ethan',
        'Charlotte','Aiden','Amelia','James','Harper','Benjamin','Abigail','Mason','Ella','William',
        'Emily','Sebastian','Luna','Henry','Camila','Jack','Aria','Owen','Scarlett','Daniel',
        'Lily','Michael','Ellie','Alexander','Nora','Oliver','Grace','Mateo','Chloe','David',
        'Zoey','Samuel','Penelope','Carter','Layla','Jayden','Riley','Luke','Aubrey','Gabriel'
    ];
    last_names TEXT[] := ARRAY[
        'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
        'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Moore','Jackson','Martin','Lee',
        'Perez','Thompson','White','Harris','Sanchez','Clark','Lewis','Robinson','Walker','Young',
        'King','Wright','Hill','Scott','Adams','Green','Baker','Nelson','Carter','Mitchell',
        'Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Morris'
    ];
    school1_id UUID := 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c';
    school2_id UUID := 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c';
    parent1_id UUID := '10000000-0000-0000-0000-000000000201';
    parent2_id UUID := '10000000-0000-0000-0000-000000000202';
    parent3_id UUID := '10000000-0000-0000-0000-000000000203';
    i           INT;
    idx_in_route INT;
    block_start INT;
    stop_num    INT;
    stop_uuid   UUID;
    route_uuid  UUID;
    route_ref   TEXT;
    route_code_str TEXT;
    school_uuid UUID;
    student_uuid UUID;
    student_ext TEXT;
    parent_uuid UUID;
    grades TEXT[] := ARRAY['K','1','2','3','4','5','6','7','8'];
    grade_val   TEXT;
    fname TEXT;
    lname TEXT;
BEGIN
    FOR i IN 1..88 LOOP
        student_ext  := 'STUDENT-' || LPAD(i::TEXT, 3, '0');
        student_uuid := ('40000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::uuid;
        fname        := first_names[((i - 1) % 50) + 1];
        lname        := last_names[((i - 1) / 50 % 50) + 1];
        grade_val    := grades[((i - 1) % 9) + 1];

        -- Route block assignment
        IF i <= 22 THEN
            route_uuid     := '30000000-0000-0000-0000-000000000001';
            route_ref      := 'ROUTE-R01';
            route_code_str := '01';
            school_uuid    := school1_id;
            block_start    := 1;
        ELSIF i <= 44 THEN
            route_uuid     := '30000000-0000-0000-0000-000000000002';
            route_ref      := 'ROUTE-R02';
            route_code_str := '02';
            school_uuid    := school1_id;
            block_start    := 23;
        ELSIF i <= 66 THEN
            route_uuid     := '30000000-0000-0000-0000-000000000011';
            route_ref      := 'ROUTE-R11';
            route_code_str := '11';
            school_uuid    := school2_id;
            block_start    := 45;
        ELSE
            route_uuid     := '30000000-0000-0000-0000-000000000012';
            route_ref      := 'ROUTE-R12';
            route_code_str := '12';
            school_uuid    := school2_id;
            block_start    := 67;
        END IF;

        -- Index 1-22 within the route block
        idx_in_route := i - block_start + 1;

        -- Stop assignment: idx 1→S01, idx 2→S02, idx 3-4→S03, ..., idx 21-22→S12
        IF idx_in_route <= 2 THEN
            stop_num := idx_in_route;
        ELSE
            stop_num := (idx_in_route - 3) / 2 + 3;
        END IF;

        -- Stop UUID: '5{RR}{SS}00-0000-0000-0000-000000000001'
        stop_uuid := ('5' || route_code_str || LPAD(stop_num::TEXT, 2, '0') || '00-0000-0000-0000-000000000001')::uuid;

        -- Tracked students get parent assignments
        IF i IN (1, 2) THEN
            parent_uuid := parent1_id;
        ELSIF i IN (23, 24) THEN
            parent_uuid := parent2_id;
        ELSIF i IN (45, 46, 67, 68) THEN
            parent_uuid := parent3_id;
        ELSE
            parent_uuid := NULL;
        END IF;

        INSERT INTO students (id, first_name, last_name, grade, school_id, parent_user_id,
                              am_route_id, am_stop_id, external_student_id)
        VALUES (student_uuid, fname, lname, grade_val, school_uuid, parent_uuid,
                route_uuid, stop_uuid, student_ext);

        INSERT INTO students_reference (id, "firstName", "lastName", grade, "parentId", "schoolId", "assignedRouteId")
        VALUES (student_ext, fname, lname, ((i - 1) % 9)::INT,
                COALESCE(parent_uuid::TEXT, ''), school_uuid::TEXT, route_ref);
    END LOOP;
END $$;

-- ===================== Student Tags (sample for presence demo) =====================

INSERT INTO student_tag ("schoolId", "studentId", "tagId", "tagType") VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-001', 'TAG-001', 'SMARTTAG'),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-002', 'TAG-002', 'SMARTTAG'),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-023', 'TAG-023', 'SMARTTAG'),
    ('c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-045', 'TAG-045', 'SMARTTAG'),
    ('c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-067', 'TAG-067', 'SMARTTAG');

-- ===================== Initial location (so Dashboard isn't empty) =====================

INSERT INTO location_points (id, school_id, vehicle_id, route_id, timestamp, lat, lng, speed_kph) VALUES
    (uuid_generate_v4()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-01', 'ROUTE-R01', NOW() - INTERVAL '1 minute', 45.3770, -75.6800, 32),
    (uuid_generate_v4()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-02', 'ROUTE-R02', NOW() - INTERVAL '1 minute', 45.3848, -75.6972, 28),
    (uuid_generate_v4()::text, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-11', 'ROUTE-R11', NOW() - INTERVAL '1 minute', 45.3925, -75.7440, 30),
    (uuid_generate_v4()::text, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-12', 'ROUTE-R12', NOW() - INTERVAL '1 minute', 45.3985, -75.7170, 25);


COMMIT;
