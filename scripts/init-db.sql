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

-- Drop existing tables to ensure a clean slate (CASCADE to handle FKs)
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

-- Drop ENUM types used by presence_event
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
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL,
  "firstName" TEXT NULL,
  "lastName" TEXT NULL,
  "driverId" TEXT NULL,
  "childRouteIds" TEXT NULL,
  "assignedRouteIds" TEXT NULL,
  "schoolId" UUID NULL,
  "boardId" UUID NULL,
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
  CONSTRAINT "FK_routes_school" FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT "FK_routes_vehicle" FOREIGN KEY ("vehicleId") REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT "UQ_route_school_name" UNIQUE ("schoolId", name)
);

CREATE TABLE route_stops (
  id UUID PRIMARY KEY,
  "routeId" UUID NOT NULL,
  "sequenceOrder" INT NOT NULL,
  "stopName" TEXT NOT NULL,
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
  speed_kph DOUBLE PRECISION,
  heading_deg DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION
);
CREATE INDEX "IDX_location_points_timestamp" ON location_points(timestamp);
CREATE INDEX "IDX_location_points_school_route" ON location_points(school_id, route_id);


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
    "vehicleId" VARCHAR(255),
    "driverId" VARCHAR(255),
    schedule JSONB,
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

-- ===================== Driver Users (20) =====================
-- Drivers 1-10 → School 1 ("Greenfield Elementary")
-- Drivers 11-20 → School 2 ("Riverside Academy")
-- ☆ LIVE: driver1, driver2, driver11, driver12

INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "schoolId", "boardId") VALUES
    -- School 1 Drivers
    ('10000000-0000-0000-0000-000000000101', 'driver1@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'James',    'Wilson',    'driver-001', NULL, 'ROUTE-R01', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000102', 'driver2@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Robert',   'Taylor',    'driver-002', NULL, 'ROUTE-R02', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000103', 'driver3@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Michael',  'Anderson',  'driver-003', NULL, 'ROUTE-R03', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000104', 'driver4@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'William',  'Thomas',    'driver-004', NULL, 'ROUTE-R04', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000105', 'driver5@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'David',    'Martinez',  'driver-005', NULL, 'ROUTE-R05', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000106', 'driver6@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Richard',  'Garcia',    'driver-006', NULL, 'ROUTE-R06', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000107', 'driver7@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Joseph',   'Brown',     'driver-007', NULL, 'ROUTE-R07', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000108', 'driver8@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Charles',  'Davis',     'driver-008', NULL, 'ROUTE-R08', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000109', 'driver9@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Daniel',   'Miller',    'driver-009', NULL, 'ROUTE-R09', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000110', 'driver10@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Matthew',  'Lopez',     'driver-010', NULL, 'ROUTE-R10', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    -- School 2 Drivers
    ('10000000-0000-0000-0000-000000000111', 'driver11@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Andrew',   'Clark',     'driver-011', NULL, 'ROUTE-R11', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000112', 'driver12@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Kevin',    'Lewis',     'driver-012', NULL, 'ROUTE-R12', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000113', 'driver13@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Steven',   'Walker',    'driver-013', NULL, 'ROUTE-R13', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000114', 'driver14@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Timothy',  'Hall',      'driver-014', NULL, 'ROUTE-R14', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000115', 'driver15@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Jason',    'Allen',     'driver-015', NULL, 'ROUTE-R15', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000116', 'driver16@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Jeffrey',  'Young',     'driver-016', NULL, 'ROUTE-R16', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000117', 'driver17@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Ryan',     'King',      'driver-017', NULL, 'ROUTE-R17', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000118', 'driver18@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Jacob',    'Wright',    'driver-018', NULL, 'ROUTE-R18', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000119', 'driver19@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Gary',     'Scott',     'driver-019', NULL, 'ROUTE-R19', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000120', 'driver20@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Nicholas', 'Adams',     'driver-020', NULL, 'ROUTE-R20', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- ===================== Parent Users (10) tracking 15 kids =====================

INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "schoolId", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000201', 'parent1@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Sarah',    'Smith',     NULL, 'ROUTE-R01,ROUTE-R02', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000202', 'parent2@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'David',    'Johnson',   NULL, 'ROUTE-R01,ROUTE-R03', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000203', 'parent3@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Maria',    'Garcia',    NULL, 'ROUTE-R11,ROUTE-R12', NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000204', 'parent4@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Linda',    'Brown',     NULL, 'ROUTE-R04',            NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000205', 'parent5@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Jennifer', 'Martinez',  NULL, 'ROUTE-R05,ROUTE-R06', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000206', 'parent6@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Patricia', 'Robinson',  NULL, 'ROUTE-R11',            NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000207', 'parent7@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Elizabeth','Clark',     NULL, 'ROUTE-R13',            NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000208', 'parent8@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Barbara',  'Lewis',     NULL, 'ROUTE-R07',            NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000209', 'parent9@sbtm.demo',  crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Susan',    'Lee',       NULL, 'ROUTE-R14,ROUTE-R15', NULL, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000210', 'parent10@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Jessica',  'Walker',    NULL, 'ROUTE-R08',            NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- ===================== Vehicles (20) =====================
-- BUS-01 to BUS-10 → School 1,  BUS-11 to BUS-20 → School 2

INSERT INTO vehicles (id, "schoolId", "licensePlate", status) VALUES
    ('20000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1001', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1002', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000003', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1003', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000004', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1004', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000005', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1005', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000006', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1006', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000007', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1007', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000008', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1008', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000009', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1009', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000010', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1010', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000011', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2001', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000012', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2002', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000013', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2003', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000014', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2004', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000015', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2005', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000016', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2006', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000017', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2007', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000018', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2008', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000019', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2009', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000020', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-2010', 'ACTIVE');

-- ===================== Routes (20) =====================
-- School 1: Routes R01-R10 along Ottawa Glebe-area streets
-- School 2: Routes R11-R20 along Ottawa Westboro-area streets

INSERT INTO routes (id, "schoolId", name, direction, "vehicleId", "startTime", "estimatedDuration") VALUES
    -- School 1 ("Greenfield Elementary" at 45.3876, -75.6960)
    ('30000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Bank Street South',   'AM', '20000000-0000-0000-0000-000000000001', '07:15:00', 35),
    ('30000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Bronson Avenue',      'AM', '20000000-0000-0000-0000-000000000002', '07:20:00', 30),
    ('30000000-0000-0000-0000-000000000003', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Rideau Canal East',   'AM', '20000000-0000-0000-0000-000000000003', '07:25:00', 30),
    ('30000000-0000-0000-0000-000000000004', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Main Street',         'AM', '20000000-0000-0000-0000-000000000004', '07:30:00', 28),
    ('30000000-0000-0000-0000-000000000005', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Colonel By Drive',    'AM', '20000000-0000-0000-0000-000000000005', '07:15:00', 32),
    ('30000000-0000-0000-0000-000000000006', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Elgin Street',        'AM', '20000000-0000-0000-0000-000000000006', '07:20:00', 30),
    ('30000000-0000-0000-0000-000000000007', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'O''Connor Street',    'AM', '20000000-0000-0000-0000-000000000007', '07:25:00', 28),
    ('30000000-0000-0000-0000-000000000008', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Lyon Street',         'AM', '20000000-0000-0000-0000-000000000008', '07:30:00', 30),
    ('30000000-0000-0000-0000-000000000009', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Pretoria Bridge',     'AM', '20000000-0000-0000-0000-000000000009', '07:35:00', 25),
    ('30000000-0000-0000-0000-000000000010', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Sunnyside Avenue',    'AM', '20000000-0000-0000-0000-000000000010', '07:40:00', 22),
    -- School 2 ("Riverside Academy" at 45.3960, -75.7300)
    ('30000000-0000-0000-0000-000000000011', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Richmond Road',       'AM', '20000000-0000-0000-0000-000000000011', '07:15:00', 35),
    ('30000000-0000-0000-0000-000000000012', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Scott Street',        'AM', '20000000-0000-0000-0000-000000000012', '07:20:00', 30),
    ('30000000-0000-0000-0000-000000000013', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Carling Avenue',      'AM', '20000000-0000-0000-0000-000000000013', '07:25:00', 32),
    ('30000000-0000-0000-0000-000000000014', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Churchill Avenue',    'AM', '20000000-0000-0000-0000-000000000014', '07:30:00', 25),
    ('30000000-0000-0000-0000-000000000015', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Island Park Drive',   'AM', '20000000-0000-0000-0000-000000000015', '07:20:00', 28),
    ('30000000-0000-0000-0000-000000000016', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Kirkwood Avenue',     'AM', '20000000-0000-0000-0000-000000000016', '07:25:00', 25),
    ('30000000-0000-0000-0000-000000000017', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Byron Avenue',        'AM', '20000000-0000-0000-0000-000000000017', '07:30:00', 30),
    ('30000000-0000-0000-0000-000000000018', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Wellington Street',   'AM', '20000000-0000-0000-0000-000000000018', '07:15:00', 32),
    ('30000000-0000-0000-0000-000000000019', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Parkdale Avenue',     'AM', '20000000-0000-0000-0000-000000000019', '07:35:00', 22),
    ('30000000-0000-0000-0000-000000000020', 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Holland Avenue',      'AM', '20000000-0000-0000-0000-000000000020', '07:40:00', 20);

-- ===================== Route Stops (100 — 5 per route) =====================
-- GPS coordinates follow actual Ottawa road corridors within 5 km of each school.

INSERT INTO route_stops (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime") VALUES
    -- R01 Bank Street South (SE → school, along Bank St)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 1, 'Bank & Walkley',         45.3680, -75.6690, '07:15:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 2, 'Billings Bridge Plaza',  45.3735, -75.6740, '07:22:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 3, 'Bank & Heron',           45.3770, -75.6800, '07:28:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 4, 'Bank & Alta Vista',      45.3810, -75.6850, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 5, 'Lansdowne & Bank',       45.3850, -75.6910, '07:42:00'),
    -- R02 Bronson Avenue (SW → school, along Bronson Ave)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', 1, 'Carleton University',    45.3820, -75.6980, '07:20:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', 2, 'Bronson & Sunnyside',    45.3835, -75.6975, '07:25:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', 3, 'Bronson & Holmwood',     45.3848, -75.6972, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', 4, 'Bronson & Fifth Ave',    45.3860, -75.6968, '07:36:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', 5, 'Bronson & Glebe Ave',    45.3870, -75.6963, '07:42:00'),
    -- R03 Rideau Canal East (E → school, along canal path)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000003', 1, 'Echo & Colonel By Dr',   45.3890, -75.6720, '07:25:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000003', 2, 'Queen Elizabeth Dr',     45.3888, -75.6780, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000003', 3, 'Canal & Pretoria',       45.3885, -75.6830, '07:36:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000003', 4, 'Fifth Ave & Canal',      45.3882, -75.6880, '07:42:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000003', 5, 'Patterson Creek',        45.3880, -75.6920, '07:48:00'),
    -- R04 Main Street (NE → school, along Main St)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000004', 1, 'Main & Greenfield',      45.3950, -75.6720, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000004', 2, 'Main & Concord',         45.3935, -75.6780, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000004', 3, 'Main & Riverdale',       45.3920, -75.6830, '07:40:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000004', 4, 'Main & Clegg',           45.3900, -75.6880, '07:46:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000004', 5, 'Main & Pretoria',        45.3885, -75.6930, '07:52:00'),
    -- R05 Colonel By Drive (NE → school, along Colonel By)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000005', 1, 'uOttawa Campus',         45.4050, -75.6800, '07:15:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000005', 2, 'Colonel By & Somerset',  45.4010, -75.6830, '07:22:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000005', 3, 'Lansdowne Stadium',      45.3970, -75.6870, '07:28:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000005', 4, 'Canal & Holmwood',       45.3935, -75.6910, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000005', 5, 'Canal & Fifth Ave',      45.3900, -75.6940, '07:42:00'),
    -- R06 Elgin Street (N → school, along Elgin St)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000006', 1, 'Elgin & Lisgar',         45.4180, -75.6880, '07:20:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000006', 2, 'Elgin & Somerset',       45.4130, -75.6890, '07:26:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000006', 3, 'Elgin & MacLaren',       45.4070, -75.6900, '07:32:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000006', 4, 'Elgin & Argyle',         45.4010, -75.6920, '07:38:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000006', 5, 'Elgin & Isabella',       45.3940, -75.6945, '07:44:00'),
    -- R07 O'Connor Street (N → school, along O'Connor)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000007', 1, 'O''Connor & Slater',     45.4150, -75.6920, '07:25:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000007', 2, 'O''Connor & Nepean',     45.4110, -75.6928, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000007', 3, 'O''Connor & Gladstone',  45.4060, -75.6935, '07:36:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000007', 4, 'O''Connor & Clemow',     45.4000, -75.6945, '07:42:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000007', 5, 'O''Connor & Second Ave', 45.3930, -75.6952, '07:48:00'),
    -- R08 Lyon Street (NW → school, along Lyon)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000008', 1, 'Lyon & Gloucester',      45.4130, -75.7020, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000008', 2, 'Lyon & Somerset',        45.4090, -75.7005, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000008', 3, 'Lyon & Gladstone',       45.4040, -75.6990, '07:41:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000008', 4, 'Lyon & Arlington',       45.3990, -75.6980, '07:47:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000008', 5, 'Lyon & Powell',          45.3930, -75.6968, '07:53:00'),
    -- R09 Pretoria Bridge (NE → school via bridge)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000009', 1, 'Main & Nicholas',        45.4000, -75.6730, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000009', 2, 'Hawthorne & Colonel By', 45.3980, -75.6770, '07:39:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000009', 3, 'Pretoria Bridge North',  45.3960, -75.6810, '07:44:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000009', 4, 'Pretoria & Echo',        45.3935, -75.6860, '07:49:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000009', 5, 'Sunnyside & Seneca',     45.3900, -75.6920, '07:54:00'),
    -- R10 Sunnyside Avenue (W → school, along Sunnyside)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000010', 1, 'Sunnyside & Woodfield',  45.3890, -75.7180, '07:40:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000010', 2, 'Sunnyside & Aylmer',     45.3888, -75.7130, '07:44:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000010', 3, 'Sunnyside & Ralph',      45.3886, -75.7080, '07:48:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000010', 4, 'Sunnyside & Bellwood',   45.3883, -75.7030, '07:52:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000010', 5, 'Sunnyside & Bronson',    45.3880, -75.6985, '07:56:00'),

    -- R11 Richmond Road (W → school, along Richmond Rd)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000011', 1, 'Richmond & Woodroffe',   45.3900, -75.7600, '07:15:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000011', 2, 'Richmond & Cleary',      45.3912, -75.7520, '07:22:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000011', 3, 'Richmond & Golden',      45.3925, -75.7440, '07:28:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000011', 4, 'Richmond & Churchill',   45.3938, -75.7370, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000011', 5, 'Richmond & Roosevelt',   45.3950, -75.7330, '07:42:00'),
    -- R12 Scott Street (E → school, along Scott St)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000012', 1, 'Scott & Bayview',        45.4000, -75.7050, '07:20:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000012', 2, 'Scott & Preston',        45.3992, -75.7110, '07:25:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000012', 3, 'Scott & Empress',        45.3985, -75.7170, '07:31:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000012', 4, 'Scott & Holland',        45.3978, -75.7220, '07:37:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000012', 5, 'Scott & Parkdale',       45.3970, -75.7265, '07:43:00'),
    -- R13 Carling Avenue (SW → school, along Carling)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000013', 1, 'Carling & Merivale',     45.3800, -75.7520, '07:25:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000013', 2, 'Carling & Fisher',       45.3830, -75.7460, '07:31:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000013', 3, 'Carling & Kirkwood',     45.3860, -75.7400, '07:37:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000013', 4, 'Carling & Broadview',    45.3895, -75.7355, '07:44:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000013', 5, 'Carling & Island Park',  45.3930, -75.7320, '07:50:00'),
    -- R14 Churchill Avenue (N → school, along Churchill)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000014', 1, 'Churchill & Byron',      45.4120, -75.7280, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000014', 2, 'Churchill & Scott',      45.4085, -75.7285, '07:34:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000014', 3, 'Churchill & Wellington',  45.4050, -75.7290, '07:39:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000014', 4, 'Churchill & Somerset',   45.4010, -75.7294, '07:44:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000014', 5, 'Churchill & Carling',    45.3980, -75.7298, '07:49:00'),
    -- R15 Island Park Drive (S → school, along Island Park Dr)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000015', 1, 'Island Park & Carling',  45.3750, -75.7230, '07:20:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000015', 2, 'Island Park & Woodlawn', 45.3800, -75.7245, '07:26:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000015', 3, 'Island Park & Cowley',   45.3845, -75.7258, '07:32:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000015', 4, 'Island Park & Byron',    45.3890, -75.7272, '07:38:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000015', 5, 'Island Park & Scott',    45.3930, -75.7288, '07:44:00'),
    -- R16 Kirkwood Avenue (NW → school, along Kirkwood)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000016', 1, 'Kirkwood & Carling',     45.4080, -75.7420, '07:25:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000016', 2, 'Kirkwood & Byron',       45.4055, -75.7395, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000016', 3, 'Kirkwood & Wellington',  45.4030, -75.7370, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000016', 4, 'Kirkwood & Somerset',    45.4000, -75.7345, '07:40:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000016', 5, 'Kirkwood & Clare',       45.3975, -75.7318, '07:45:00'),
    -- R17 Byron Avenue (W → school, along Byron Ave)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000017', 1, 'Byron & Fisher',         45.3980, -75.7560, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000017', 2, 'Byron & Woodroffe',      45.3978, -75.7490, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000017', 3, 'Byron & Athlone',        45.3975, -75.7420, '07:41:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000017', 4, 'Byron & Island Park',    45.3970, -75.7365, '07:47:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000017', 5, 'Byron & Clarendon',      45.3965, -75.7330, '07:53:00'),
    -- R18 Wellington Street (E → school, along Wellington)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000018', 1, 'Wellington & Bank',      45.4010, -75.7020, '07:15:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000018', 2, 'Wellington & Lyon',      45.4003, -75.7080, '07:21:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000018', 3, 'Wellington & Preston',   45.3995, -75.7140, '07:27:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000018', 4, 'Wellington & Empress',   45.3988, -75.7200, '07:34:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000018', 5, 'Wellington & Holland',   45.3978, -75.7255, '07:40:00'),
    -- R19 Parkdale Avenue (S → school, along Parkdale)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000019', 1, 'Parkdale & Carling',     45.3770, -75.7310, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000019', 2, 'Parkdale & Sherwood',    45.3810, -75.7308, '07:39:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000019', 3, 'Parkdale & Tyndall',     45.3850, -75.7305, '07:44:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000019', 4, 'Parkdale & Eccles',      45.3890, -75.7303, '07:49:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000019', 5, 'Parkdale & Scott',       45.3930, -75.7300, '07:53:00'),
    -- R20 Holland Avenue (N → school, along Holland Ave)
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000020', 1, 'Holland & Gladstone',    45.4100, -75.7250, '07:40:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000020', 2, 'Holland & Wellington',   45.4070, -75.7260, '07:44:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000020', 3, 'Holland & Byron',        45.4040, -75.7270, '07:48:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000020', 4, 'Holland & Ruskin',       45.4010, -75.7280, '07:52:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000020', 5, 'Holland & Carling',      45.3980, -75.7292, '07:56:00');

-- ===================== Reference Tables =====================

INSERT INTO vehicles_reference (id, "plateNumber", capacity, status) VALUES
    ('BUS-01', 'ON-1001', 40, 'ACTIVE'), ('BUS-02', 'ON-1002', 40, 'ACTIVE'),
    ('BUS-03', 'ON-1003', 35, 'ACTIVE'), ('BUS-04', 'ON-1004', 40, 'ACTIVE'),
    ('BUS-05', 'ON-1005', 35, 'ACTIVE'), ('BUS-06', 'ON-1006', 40, 'ACTIVE'),
    ('BUS-07', 'ON-1007', 35, 'ACTIVE'), ('BUS-08', 'ON-1008', 40, 'ACTIVE'),
    ('BUS-09', 'ON-1009', 35, 'ACTIVE'), ('BUS-10', 'ON-1010', 40, 'ACTIVE'),
    ('BUS-11', 'ON-2001', 40, 'ACTIVE'), ('BUS-12', 'ON-2002', 40, 'ACTIVE'),
    ('BUS-13', 'ON-2003', 35, 'ACTIVE'), ('BUS-14', 'ON-2004', 40, 'ACTIVE'),
    ('BUS-15', 'ON-2005', 35, 'ACTIVE'), ('BUS-16', 'ON-2006', 40, 'ACTIVE'),
    ('BUS-17', 'ON-2007', 35, 'ACTIVE'), ('BUS-18', 'ON-2008', 40, 'ACTIVE'),
    ('BUS-19', 'ON-2009', 35, 'ACTIVE'), ('BUS-20', 'ON-2010', 40, 'ACTIVE');

INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule) VALUES
    ('ROUTE-R01', 'Bank Street South',   'BUS-01', 'driver-001', '{"startTime":"07:15","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R02', 'Bronson Avenue',      'BUS-02', 'driver-002', '{"startTime":"07:20","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R03', 'Rideau Canal East',   'BUS-03', 'driver-003', '{"startTime":"07:25","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R04', 'Main Street',         'BUS-04', 'driver-004', '{"startTime":"07:30","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R05', 'Colonel By Drive',    'BUS-05', 'driver-005', '{"startTime":"07:15","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R06', 'Elgin Street',        'BUS-06', 'driver-006', '{"startTime":"07:20","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R07', 'O''Connor Street',    'BUS-07', 'driver-007', '{"startTime":"07:25","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R08', 'Lyon Street',         'BUS-08', 'driver-008', '{"startTime":"07:30","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R09', 'Pretoria Bridge',     'BUS-09', 'driver-009', '{"startTime":"07:35","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R10', 'Sunnyside Avenue',    'BUS-10', 'driver-010', '{"startTime":"07:40","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R11', 'Richmond Road',       'BUS-11', 'driver-011', '{"startTime":"07:15","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R12', 'Scott Street',        'BUS-12', 'driver-012', '{"startTime":"07:20","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R13', 'Carling Avenue',      'BUS-13', 'driver-013', '{"startTime":"07:25","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R14', 'Churchill Avenue',    'BUS-14', 'driver-014', '{"startTime":"07:30","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R15', 'Island Park Drive',   'BUS-15', 'driver-015', '{"startTime":"07:20","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R16', 'Kirkwood Avenue',     'BUS-16', 'driver-016', '{"startTime":"07:25","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R17', 'Byron Avenue',        'BUS-17', 'driver-017', '{"startTime":"07:30","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R18', 'Wellington Street',   'BUS-18', 'driver-018', '{"startTime":"07:15","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R19', 'Parkdale Avenue',     'BUS-19', 'driver-019', '{"startTime":"07:35","days":["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-R20', 'Holland Avenue',      'BUS-20', 'driver-020', '{"startTime":"07:40","days":["Mon","Tue","Wed","Thu","Fri"]}');

INSERT INTO route_stops_reference (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime") VALUES
    -- R01
    ('STOP-R01-S1', 'ROUTE-R01', 1, 'Bank & Walkley',        45.3680, -75.6690, '07:15:00'),
    ('STOP-R01-S2', 'ROUTE-R01', 2, 'Billings Bridge Plaza', 45.3735, -75.6740, '07:22:00'),
    ('STOP-R01-S3', 'ROUTE-R01', 3, 'Bank & Heron',          45.3770, -75.6800, '07:28:00'),
    ('STOP-R01-S4', 'ROUTE-R01', 4, 'Bank & Alta Vista',     45.3810, -75.6850, '07:35:00'),
    ('STOP-R01-S5', 'ROUTE-R01', 5, 'Lansdowne & Bank',      45.3850, -75.6910, '07:42:00'),
    -- R02
    ('STOP-R02-S1', 'ROUTE-R02', 1, 'Carleton University',   45.3820, -75.6980, '07:20:00'),
    ('STOP-R02-S2', 'ROUTE-R02', 2, 'Bronson & Sunnyside',   45.3835, -75.6975, '07:25:00'),
    ('STOP-R02-S3', 'ROUTE-R02', 3, 'Bronson & Holmwood',    45.3848, -75.6972, '07:30:00'),
    ('STOP-R02-S4', 'ROUTE-R02', 4, 'Bronson & Fifth Ave',   45.3860, -75.6968, '07:36:00'),
    ('STOP-R02-S5', 'ROUTE-R02', 5, 'Bronson & Glebe Ave',   45.3870, -75.6963, '07:42:00'),
    -- R03
    ('STOP-R03-S1', 'ROUTE-R03', 1, 'Echo & Colonel By Dr',  45.3890, -75.6720, '07:25:00'),
    ('STOP-R03-S2', 'ROUTE-R03', 2, 'Queen Elizabeth Dr',    45.3888, -75.6780, '07:30:00'),
    ('STOP-R03-S3', 'ROUTE-R03', 3, 'Canal & Pretoria',      45.3885, -75.6830, '07:36:00'),
    ('STOP-R03-S4', 'ROUTE-R03', 4, 'Fifth Ave & Canal',     45.3882, -75.6880, '07:42:00'),
    ('STOP-R03-S5', 'ROUTE-R03', 5, 'Patterson Creek',       45.3880, -75.6920, '07:48:00'),
    -- R04
    ('STOP-R04-S1', 'ROUTE-R04', 1, 'Main & Greenfield',     45.3950, -75.6720, '07:30:00'),
    ('STOP-R04-S2', 'ROUTE-R04', 2, 'Main & Concord',        45.3935, -75.6780, '07:35:00'),
    ('STOP-R04-S3', 'ROUTE-R04', 3, 'Main & Riverdale',      45.3920, -75.6830, '07:40:00'),
    ('STOP-R04-S4', 'ROUTE-R04', 4, 'Main & Clegg',          45.3900, -75.6880, '07:46:00'),
    ('STOP-R04-S5', 'ROUTE-R04', 5, 'Main & Pretoria',       45.3885, -75.6930, '07:52:00'),
    -- R05
    ('STOP-R05-S1', 'ROUTE-R05', 1, 'uOttawa Campus',        45.4050, -75.6800, '07:15:00'),
    ('STOP-R05-S2', 'ROUTE-R05', 2, 'Colonel By & Somerset', 45.4010, -75.6830, '07:22:00'),
    ('STOP-R05-S3', 'ROUTE-R05', 3, 'Lansdowne Stadium',     45.3970, -75.6870, '07:28:00'),
    ('STOP-R05-S4', 'ROUTE-R05', 4, 'Canal & Holmwood',      45.3935, -75.6910, '07:35:00'),
    ('STOP-R05-S5', 'ROUTE-R05', 5, 'Canal & Fifth Ave',     45.3900, -75.6940, '07:42:00'),
    -- R06
    ('STOP-R06-S1', 'ROUTE-R06', 1, 'Elgin & Lisgar',        45.4180, -75.6880, '07:20:00'),
    ('STOP-R06-S2', 'ROUTE-R06', 2, 'Elgin & Somerset',      45.4130, -75.6890, '07:26:00'),
    ('STOP-R06-S3', 'ROUTE-R06', 3, 'Elgin & MacLaren',      45.4070, -75.6900, '07:32:00'),
    ('STOP-R06-S4', 'ROUTE-R06', 4, 'Elgin & Argyle',        45.4010, -75.6920, '07:38:00'),
    ('STOP-R06-S5', 'ROUTE-R06', 5, 'Elgin & Isabella',      45.3940, -75.6945, '07:44:00'),
    -- R07
    ('STOP-R07-S1', 'ROUTE-R07', 1, 'O''Connor & Slater',    45.4150, -75.6920, '07:25:00'),
    ('STOP-R07-S2', 'ROUTE-R07', 2, 'O''Connor & Nepean',    45.4110, -75.6928, '07:30:00'),
    ('STOP-R07-S3', 'ROUTE-R07', 3, 'O''Connor & Gladstone', 45.4060, -75.6935, '07:36:00'),
    ('STOP-R07-S4', 'ROUTE-R07', 4, 'O''Connor & Clemow',    45.4000, -75.6945, '07:42:00'),
    ('STOP-R07-S5', 'ROUTE-R07', 5, 'O''Connor & Second Ave',45.3930, -75.6952, '07:48:00'),
    -- R08
    ('STOP-R08-S1', 'ROUTE-R08', 1, 'Lyon & Gloucester',     45.4130, -75.7020, '07:30:00'),
    ('STOP-R08-S2', 'ROUTE-R08', 2, 'Lyon & Somerset',       45.4090, -75.7005, '07:35:00'),
    ('STOP-R08-S3', 'ROUTE-R08', 3, 'Lyon & Gladstone',      45.4040, -75.6990, '07:41:00'),
    ('STOP-R08-S4', 'ROUTE-R08', 4, 'Lyon & Arlington',      45.3990, -75.6980, '07:47:00'),
    ('STOP-R08-S5', 'ROUTE-R08', 5, 'Lyon & Powell',         45.3930, -75.6968, '07:53:00'),
    -- R09
    ('STOP-R09-S1', 'ROUTE-R09', 1, 'Main & Nicholas',       45.4000, -75.6730, '07:35:00'),
    ('STOP-R09-S2', 'ROUTE-R09', 2, 'Hawthorne & Colonel By',45.3980, -75.6770, '07:39:00'),
    ('STOP-R09-S3', 'ROUTE-R09', 3, 'Pretoria Bridge North', 45.3960, -75.6810, '07:44:00'),
    ('STOP-R09-S4', 'ROUTE-R09', 4, 'Pretoria & Echo',       45.3935, -75.6860, '07:49:00'),
    ('STOP-R09-S5', 'ROUTE-R09', 5, 'Sunnyside & Seneca',    45.3900, -75.6920, '07:54:00'),
    -- R10
    ('STOP-R10-S1', 'ROUTE-R10', 1, 'Sunnyside & Woodfield', 45.3890, -75.7180, '07:40:00'),
    ('STOP-R10-S2', 'ROUTE-R10', 2, 'Sunnyside & Aylmer',    45.3888, -75.7130, '07:44:00'),
    ('STOP-R10-S3', 'ROUTE-R10', 3, 'Sunnyside & Ralph',     45.3886, -75.7080, '07:48:00'),
    ('STOP-R10-S4', 'ROUTE-R10', 4, 'Sunnyside & Bellwood',  45.3883, -75.7030, '07:52:00'),
    ('STOP-R10-S5', 'ROUTE-R10', 5, 'Sunnyside & Bronson',   45.3880, -75.6985, '07:56:00'),
    -- R11
    ('STOP-R11-S1', 'ROUTE-R11', 1, 'Richmond & Woodroffe',  45.3900, -75.7600, '07:15:00'),
    ('STOP-R11-S2', 'ROUTE-R11', 2, 'Richmond & Cleary',     45.3912, -75.7520, '07:22:00'),
    ('STOP-R11-S3', 'ROUTE-R11', 3, 'Richmond & Golden',     45.3925, -75.7440, '07:28:00'),
    ('STOP-R11-S4', 'ROUTE-R11', 4, 'Richmond & Churchill',  45.3938, -75.7370, '07:35:00'),
    ('STOP-R11-S5', 'ROUTE-R11', 5, 'Richmond & Roosevelt',  45.3950, -75.7330, '07:42:00'),
    -- R12
    ('STOP-R12-S1', 'ROUTE-R12', 1, 'Scott & Bayview',       45.4000, -75.7050, '07:20:00'),
    ('STOP-R12-S2', 'ROUTE-R12', 2, 'Scott & Preston',       45.3992, -75.7110, '07:25:00'),
    ('STOP-R12-S3', 'ROUTE-R12', 3, 'Scott & Empress',       45.3985, -75.7170, '07:31:00'),
    ('STOP-R12-S4', 'ROUTE-R12', 4, 'Scott & Holland',       45.3978, -75.7220, '07:37:00'),
    ('STOP-R12-S5', 'ROUTE-R12', 5, 'Scott & Parkdale',      45.3970, -75.7265, '07:43:00'),
    -- R13
    ('STOP-R13-S1', 'ROUTE-R13', 1, 'Carling & Merivale',    45.3800, -75.7520, '07:25:00'),
    ('STOP-R13-S2', 'ROUTE-R13', 2, 'Carling & Fisher',      45.3830, -75.7460, '07:31:00'),
    ('STOP-R13-S3', 'ROUTE-R13', 3, 'Carling & Kirkwood',    45.3860, -75.7400, '07:37:00'),
    ('STOP-R13-S4', 'ROUTE-R13', 4, 'Carling & Broadview',   45.3895, -75.7355, '07:44:00'),
    ('STOP-R13-S5', 'ROUTE-R13', 5, 'Carling & Island Park', 45.3930, -75.7320, '07:50:00'),
    -- R14
    ('STOP-R14-S1', 'ROUTE-R14', 1, 'Churchill & Byron',     45.4120, -75.7280, '07:30:00'),
    ('STOP-R14-S2', 'ROUTE-R14', 2, 'Churchill & Scott',     45.4085, -75.7285, '07:34:00'),
    ('STOP-R14-S3', 'ROUTE-R14', 3, 'Churchill & Wellington', 45.4050, -75.7290, '07:39:00'),
    ('STOP-R14-S4', 'ROUTE-R14', 4, 'Churchill & Somerset',  45.4010, -75.7294, '07:44:00'),
    ('STOP-R14-S5', 'ROUTE-R14', 5, 'Churchill & Carling',   45.3980, -75.7298, '07:49:00'),
    -- R15
    ('STOP-R15-S1', 'ROUTE-R15', 1, 'Island Park & Carling', 45.3750, -75.7230, '07:20:00'),
    ('STOP-R15-S2', 'ROUTE-R15', 2, 'Island Park & Woodlawn',45.3800, -75.7245, '07:26:00'),
    ('STOP-R15-S3', 'ROUTE-R15', 3, 'Island Park & Cowley',  45.3845, -75.7258, '07:32:00'),
    ('STOP-R15-S4', 'ROUTE-R15', 4, 'Island Park & Byron',   45.3890, -75.7272, '07:38:00'),
    ('STOP-R15-S5', 'ROUTE-R15', 5, 'Island Park & Scott',   45.3930, -75.7288, '07:44:00'),
    -- R16
    ('STOP-R16-S1', 'ROUTE-R16', 1, 'Kirkwood & Carling',    45.4080, -75.7420, '07:25:00'),
    ('STOP-R16-S2', 'ROUTE-R16', 2, 'Kirkwood & Byron',      45.4055, -75.7395, '07:30:00'),
    ('STOP-R16-S3', 'ROUTE-R16', 3, 'Kirkwood & Wellington', 45.4030, -75.7370, '07:35:00'),
    ('STOP-R16-S4', 'ROUTE-R16', 4, 'Kirkwood & Somerset',   45.4000, -75.7345, '07:40:00'),
    ('STOP-R16-S5', 'ROUTE-R16', 5, 'Kirkwood & Clare',      45.3975, -75.7318, '07:45:00'),
    -- R17
    ('STOP-R17-S1', 'ROUTE-R17', 1, 'Byron & Fisher',        45.3980, -75.7560, '07:30:00'),
    ('STOP-R17-S2', 'ROUTE-R17', 2, 'Byron & Woodroffe',     45.3978, -75.7490, '07:35:00'),
    ('STOP-R17-S3', 'ROUTE-R17', 3, 'Byron & Athlone',       45.3975, -75.7420, '07:41:00'),
    ('STOP-R17-S4', 'ROUTE-R17', 4, 'Byron & Island Park',   45.3970, -75.7365, '07:47:00'),
    ('STOP-R17-S5', 'ROUTE-R17', 5, 'Byron & Clarendon',     45.3965, -75.7330, '07:53:00'),
    -- R18
    ('STOP-R18-S1', 'ROUTE-R18', 1, 'Wellington & Bank',     45.4010, -75.7020, '07:15:00'),
    ('STOP-R18-S2', 'ROUTE-R18', 2, 'Wellington & Lyon',     45.4003, -75.7080, '07:21:00'),
    ('STOP-R18-S3', 'ROUTE-R18', 3, 'Wellington & Preston',  45.3995, -75.7140, '07:27:00'),
    ('STOP-R18-S4', 'ROUTE-R18', 4, 'Wellington & Empress',  45.3988, -75.7200, '07:34:00'),
    ('STOP-R18-S5', 'ROUTE-R18', 5, 'Wellington & Holland',  45.3978, -75.7255, '07:40:00'),
    -- R19
    ('STOP-R19-S1', 'ROUTE-R19', 1, 'Parkdale & Carling',    45.3770, -75.7310, '07:35:00'),
    ('STOP-R19-S2', 'ROUTE-R19', 2, 'Parkdale & Sherwood',   45.3810, -75.7308, '07:39:00'),
    ('STOP-R19-S3', 'ROUTE-R19', 3, 'Parkdale & Tyndall',    45.3850, -75.7305, '07:44:00'),
    ('STOP-R19-S4', 'ROUTE-R19', 4, 'Parkdale & Eccles',     45.3890, -75.7303, '07:49:00'),
    ('STOP-R19-S5', 'ROUTE-R19', 5, 'Parkdale & Scott',      45.3930, -75.7300, '07:53:00'),
    -- R20
    ('STOP-R20-S1', 'ROUTE-R20', 1, 'Holland & Gladstone',   45.4100, -75.7250, '07:40:00'),
    ('STOP-R20-S2', 'ROUTE-R20', 2, 'Holland & Wellington',  45.4070, -75.7260, '07:44:00'),
    ('STOP-R20-S3', 'ROUTE-R20', 3, 'Holland & Byron',       45.4040, -75.7270, '07:48:00'),
    ('STOP-R20-S4', 'ROUTE-R20', 4, 'Holland & Ruskin',      45.4010, -75.7280, '07:52:00'),
    ('STOP-R20-S5', 'ROUTE-R20', 5, 'Holland & Carling',     45.3980, -75.7292, '07:56:00');

-- ===================== 500 Students + student_reference =====================
-- Generated: 25 students per route, distributed across grades K-8.
-- First 15 students (STUDENT-001 to STUDENT-015) are the tracked children assigned to parent logins.

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
    -- Route UUIDs for school1 (R01-R10) and school2 (R11-R20)
    route_uuids UUID[] := ARRAY[
        '30000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000002'::uuid,
        '30000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000004'::uuid,
        '30000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000006'::uuid,
        '30000000-0000-0000-0000-000000000007'::uuid, '30000000-0000-0000-0000-000000000008'::uuid,
        '30000000-0000-0000-0000-000000000009'::uuid, '30000000-0000-0000-0000-000000000010'::uuid,
        '30000000-0000-0000-0000-000000000011'::uuid, '30000000-0000-0000-0000-000000000012'::uuid,
        '30000000-0000-0000-0000-000000000013'::uuid, '30000000-0000-0000-0000-000000000014'::uuid,
        '30000000-0000-0000-0000-000000000015'::uuid, '30000000-0000-0000-0000-000000000016'::uuid,
        '30000000-0000-0000-0000-000000000017'::uuid, '30000000-0000-0000-0000-000000000018'::uuid,
        '30000000-0000-0000-0000-000000000019'::uuid, '30000000-0000-0000-0000-000000000020'::uuid
    ];
    route_refs TEXT[] := ARRAY[
        'ROUTE-R01','ROUTE-R02','ROUTE-R03','ROUTE-R04','ROUTE-R05',
        'ROUTE-R06','ROUTE-R07','ROUTE-R08','ROUTE-R09','ROUTE-R10',
        'ROUTE-R11','ROUTE-R12','ROUTE-R13','ROUTE-R14','ROUTE-R15',
        'ROUTE-R16','ROUTE-R17','ROUTE-R18','ROUTE-R19','ROUTE-R20'
    ];
    school1_id UUID := 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c';
    school2_id UUID := 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c';
    -- Parent UUIDs for tracked children (first 15 students)
    tracked_parent_ids UUID[] := ARRAY[
        '10000000-0000-0000-0000-000000000201'::uuid,  -- parent1: student 1 (R01)
        '10000000-0000-0000-0000-000000000201'::uuid,  -- parent1: student 2 (R02)
        '10000000-0000-0000-0000-000000000202'::uuid,  -- parent2: student 3 (R01)
        '10000000-0000-0000-0000-000000000202'::uuid,  -- parent2: student 4 (R03)
        '10000000-0000-0000-0000-000000000204'::uuid,  -- parent4: student 5 (R04)
        '10000000-0000-0000-0000-000000000205'::uuid,  -- parent5: student 6 (R05)
        '10000000-0000-0000-0000-000000000205'::uuid,  -- parent5: student 7 (R06)
        '10000000-0000-0000-0000-000000000208'::uuid,  -- parent8: student 8 (R07)
        '10000000-0000-0000-0000-000000000210'::uuid,  -- parent10: student 9 (R08)
        '10000000-0000-0000-0000-000000000203'::uuid,  -- parent3: student 10 (R11)
        '10000000-0000-0000-0000-000000000203'::uuid,  -- parent3: student 11 (R12)
        '10000000-0000-0000-0000-000000000206'::uuid,  -- parent6: student 12 (R11)
        '10000000-0000-0000-0000-000000000207'::uuid,  -- parent7: student 13 (R13)
        '10000000-0000-0000-0000-000000000209'::uuid,  -- parent9: student 14 (R14)
        '10000000-0000-0000-0000-000000000209'::uuid   -- parent9: student 15 (R15)
    ];
    tracked_route_idx INT[] := ARRAY[1,2,1,3,4,5,6,7,8,11,12,11,13,14,15];
    i INT;
    route_idx INT;
    fname TEXT;
    lname TEXT;
    grade_val TEXT;
    school_uuid UUID;
    route_uuid UUID;
    route_ref TEXT;
    student_uuid UUID;
    student_ext TEXT;
    parent_uuid UUID;
    grades TEXT[] := ARRAY['K','1','2','3','4','5','6','7','8'];
BEGIN
    FOR i IN 1..500 LOOP
        -- Student external ID
        student_ext := 'STUDENT-' || LPAD(i::TEXT, 3, '0');
        -- Deterministic UUID
        student_uuid := ('40000000-0000-0000-0000-' || LPAD(i::TEXT, 12, '0'))::uuid;
        -- Route assignment: student i goes to route ((i-1) % 20) + 1 (1-indexed)
        route_idx := ((i - 1) % 20) + 1;
        route_uuid := route_uuids[route_idx];
        route_ref := route_refs[route_idx];
        -- School assignment
        IF route_idx <= 10 THEN
            school_uuid := school1_id;
        ELSE
            school_uuid := school2_id;
        END IF;
        -- Name from arrays (cycle through)
        fname := first_names[((i - 1) % 50) + 1];
        lname := last_names[((i - 1) / 50 % 50) + 1];
        -- Grade cycles K-8
        grade_val := grades[((i - 1) % 9) + 1];
        -- Parent for tracked children (first 15)
        IF i <= 15 THEN
            parent_uuid := tracked_parent_ids[i];
        ELSE
            parent_uuid := NULL;
        END IF;

        -- Insert into NEW students table
        INSERT INTO students (id, first_name, last_name, grade, school_id, parent_user_id, am_route_id, external_student_id)
        VALUES (student_uuid, fname, lname, grade_val, school_uuid, parent_uuid, route_uuid, student_ext);

        -- Insert into LEGACY reference table
        INSERT INTO students_reference (id, "firstName", "lastName", grade, "parentId", "schoolId", "assignedRouteId")
        VALUES (student_ext, fname, lname, ((i - 1) % 9)::INT, COALESCE(parent_uuid::TEXT, ''), school_uuid::TEXT, route_ref);
    END LOOP;
END $$;

-- ===================== Student Tags (sample for presence demo) =====================

INSERT INTO student_tag ("schoolId", "studentId", "tagId", "tagType") VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-001', 'TAG-001', 'SMARTTAG'),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-002', 'TAG-002', 'SMARTTAG'),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-003', 'TAG-003', 'SMARTTAG'),
    ('c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-010', 'TAG-010', 'SMARTTAG'),
    ('c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-011', 'TAG-011', 'SMARTTAG');

-- ===================== Initial location + presence (so Dashboard isn't empty) =====================

INSERT INTO presence_event ("schoolId", "studentId", "vehicleId", "routeId", "eventType", "timestamp", "signalStrength") VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-001', 'BUS-01', 'ROUTE-R01', 'BOARD', NOW() - INTERVAL '15 minutes', -50.0),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-003', 'BUS-01', 'ROUTE-R01', 'BOARD', NOW() - INTERVAL '14 minutes', -52.0);

INSERT INTO location_points (id, school_id, vehicle_id, route_id, timestamp, lat, lng, speed_kph) VALUES
    (uuid_generate_v4()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-01', 'ROUTE-R01', NOW() - INTERVAL '1 minute', 45.3770, -75.6800, 32),
    (uuid_generate_v4()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-02', 'ROUTE-R02', NOW() - INTERVAL '1 minute', 45.3848, -75.6972, 28),
    (uuid_generate_v4()::text, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-11', 'ROUTE-R11', NOW() - INTERVAL '1 minute', 45.3925, -75.7440, 30),
    (uuid_generate_v4()::text, 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-12', 'ROUTE-R12', NOW() - INTERVAL '1 minute', 45.3985, -75.7170, 25);

COMMIT;
