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
-- 4. Seed Data
-- --------------------------------------------------------------------------

BEGIN;

-- Tenants
INSERT INTO school_boards (id, name) VALUES 
    ('b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo School Board');

INSERT INTO schools (id, name, "boardId") VALUES 
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo Elementary School', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo High School', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- Users
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "schoolId", "boardId") VALUES
    -- Admins
    ('10000000-0000-0000-0000-000000000001', 'osta.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'OSTA_ADMIN', 'OSTA', 'Admin', NULL, NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000002', 'school.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'SCHOOL_ADMIN', 'School', 'Admin', NULL, NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    -- Drivers
    ('10000000-0000-0000-0000-000000000011', 'driver1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'John', 'Driver', 'driver-001', NULL, 'ROUTE-A', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000012', 'driver2@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Mike', 'Schmidt', 'driver-002', NULL, 'ROUTE-B', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000013', 'driver3@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Sarah', 'Lane', 'driver-003', NULL, 'ROUTE-C', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000014', 'driver4@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Tom', 'Cruise', 'driver-004', NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000015', 'driver5@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Jerry', 'Seinfeld', 'driver-005', NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    -- Parents (childRouteIds populated based on students_reference table)
    ('10000000-0000-0000-0000-000000000021', 'parent1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Sarah', 'Smith', NULL, 'ROUTE-A', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000022', 'parent2@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'David', 'Johnson', NULL, 'ROUTE-B', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000023', 'parent3@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Mary', 'Williams', NULL, 'ROUTE-A', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000024', 'parent4@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Linda', 'Brown', NULL, 'ROUTE-B', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000025', 'parent5@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'New', 'Parent', NULL, 'ROUTE-C', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000026', 'parent6@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Another', 'Parent', NULL, 'ROUTE-B', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- Operational Data
INSERT INTO vehicles (id, "schoolId", "licensePlate", status) VALUES
    ('20000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'SB-1001', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'SB-2002', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000003', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'SB-3003', 'ACTIVE'),
    ('20000000-0000-0000-0000-000000000004', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'SB-9999', 'MAINTENANCE');

INSERT INTO routes (id, "schoolId", name, direction, "vehicleId", "startTime") VALUES
    ('30000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Morning Route A', 'AM', '20000000-0000-0000-0000-000000000001', '07:30:00'),
    ('30000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Morning Route B', 'AM', '20000000-0000-0000-0000-000000000002', '07:45:00'),
    ('30000000-0000-0000-0000-000000000003', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Morning Route C', 'AM', '20000000-0000-0000-0000-000000000003', '08:00:00');

INSERT INTO route_stops (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime") VALUES
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 1, 'Central Station', 45.4215, -75.6972, '07:30:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', 2, 'Maple Avenue', 45.4230, -75.6950, '07:40:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', 1, 'South End Mall', 45.3800, -75.7000, '07:35:00'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000003', 1, 'West End Terminal', 45.4100, -75.7100, '07:50:00');

INSERT INTO vehicles_reference (id, "plateNumber", capacity, status) VALUES
    ('BUS-001', 'SB-1001', 40, 'ACTIVE'),
    ('BUS-002', 'SB-2002', 30, 'ACTIVE'),
    ('BUS-003', 'SB-3003', 40, 'ACTIVE'),
    ('BUS-999', 'SB-9999', 40, 'MAINTENANCE');

INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule) VALUES
    ('ROUTE-A', 'Morning Route A', 'BUS-001', 'driver-001', '{"startTime": "07:30", "days": ["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-B', 'Morning Route B', 'BUS-002', 'driver-002', '{"startTime": "07:45", "days": ["Mon","Tue","Wed","Thu","Fri"]}'),
    ('ROUTE-C', 'Morning Route C', 'BUS-003', 'driver-003', '{"startTime": "08:00", "days": ["Mon","Tue","Wed","Thu","Fri"]}');

INSERT INTO route_stops_reference (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime") VALUES
    ('STOP-A1', 'ROUTE-A', 1, 'Central Station', 45.4215, -75.6972, '07:30:00'),
    ('STOP-A2', 'ROUTE-A', 2, 'Maple Avenue', 45.4230, -75.6950, '07:40:00'),
    ('STOP-B1', 'ROUTE-B', 1, 'South End Mall', 45.3800, -75.7000, '07:35:00'),
    ('STOP-C1', 'ROUTE-C', 1, 'West End Terminal', 45.4100, -75.7100, '07:50:00');

-- --------------------------------------------------------------------------
-- 5. Seeding Students (The CRITICAL part)
-- --------------------------------------------------------------------------
-- 10 Students
-- Parents: 21, 22, 23, 24, 25, 26
-- Routes: A (30..01), B (30..02), C (30..03)

-- Insert into LEGACY table
INSERT INTO students_reference (id, "firstName", "lastName", grade, "parentId", "schoolId", "assignedRouteId") VALUES
    ('STUDENT-001', 'Emma', 'Smith', 3, '10000000-0000-0000-0000-000000000021', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-A'),
    ('STUDENT-002', 'Liam', 'Smith', 5, '10000000-0000-0000-0000-000000000021', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-A'),
    ('STUDENT-003', 'Olivia', 'Johnson', 2, '10000000-0000-0000-0000-000000000022', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-B'),
    ('STUDENT-004', 'Noah', 'Williams', 4, '10000000-0000-0000-0000-000000000023', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-A'),
    ('STUDENT-005', 'Ava', 'Brown', 1, '10000000-0000-0000-0000-000000000024', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-B'),
    ('STUDENT-006', 'Sophia', 'New', 3, '10000000-0000-0000-0000-000000000025', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-C'),
    ('STUDENT-007', 'Jackson', 'New', 2, '10000000-0000-0000-0000-000000000025', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-C'),
    ('STUDENT-008', 'Lucas', 'Another', 5, '10000000-0000-0000-0000-000000000026', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-B'),
    ('STUDENT-009', 'Mia', 'Johnson', 1, '10000000-0000-0000-0000-000000000022', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-B'),
    ('STUDENT-010', 'Ethan', 'Smith', 1, '10000000-0000-0000-0000-000000000021', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-A');

-- Insert into NEW table
-- Note: am_route_id maps to UUIDs from `routes` table
INSERT INTO students (id, first_name, last_name, grade, school_id, parent_user_id, am_route_id, external_student_id) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'Emma', 'Smith', '3', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000001', 'STUDENT-001'),
    ('d0000000-0000-0000-0000-000000000002', 'Liam', 'Smith', '5', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000001', 'STUDENT-002'),
    ('d0000000-0000-0000-0000-000000000003', 'Olivia', 'Johnson', '2', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000022', '30000000-0000-0000-0000-000000000002', 'STUDENT-003'),
    ('d0000000-0000-0000-0000-000000000004', 'Noah', 'Williams', '4', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000023', '30000000-0000-0000-0000-000000000001', 'STUDENT-004'),
    ('d0000000-0000-0000-0000-000000000005', 'Ava', 'Brown', '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000024', '30000000-0000-0000-0000-000000000002', 'STUDENT-005'),
    ('d0000000-0000-0000-0000-000000000006', 'Sophia', 'New', '3', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000025', '30000000-0000-0000-0000-000000000003', 'STUDENT-006'),
    ('d0000000-0000-0000-0000-000000000007', 'Jackson', 'New', '2', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000025', '30000000-0000-0000-0000-000000000003', 'STUDENT-007'),
    ('d0000000-0000-0000-0000-000000000008', 'Lucas', 'Another', '5', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000026', '30000000-0000-0000-0000-000000000002', 'STUDENT-008'),
    ('d0000000-0000-0000-0000-000000000009', 'Mia', 'Johnson', '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000022', '30000000-0000-0000-0000-000000000002', 'STUDENT-009'),
    ('d0000000-0000-0000-0000-000000000010', 'Ethan', 'Smith', '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000001', 'STUDENT-010');

-- Other optional seeds
INSERT INTO student_tag ("schoolId", "studentId", "tagId", "tagType") VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-001', 'TAG-EMMA', 'SMARTTAG'),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-003', 'TAG-OLIVIA', 'SMARTTAG');

INSERT INTO presence_event ("schoolId", "studentId", "vehicleId", "routeId", "eventType", "timestamp", "signalStrength") VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-001', 'BUS-001', 'ROUTE-A', 'BOARD', NOW() - INTERVAL '15 minutes', -50.0);

INSERT INTO location_points (id, school_id, vehicle_id, route_id, timestamp, lat, lng) VALUES
    (uuid_generate_v4()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '1 minute', 45.4215, -75.6972);

COMMIT;
