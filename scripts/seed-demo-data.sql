-- ============================================================================
-- SBTM Demo Data Seed Script (SQL)
--
-- Goals:
-- - Deterministic, idempotent demo data (safe to re-run)
-- - Populate the "reference" tables used by demo-compatible gateway endpoints
-- - Populate the api-gateway core tables (users / vehicles / routes) so the Admin UI is not empty
--
-- Notes:
-- - Some microservices use their own schemas; this seed focuses on what the demo UIs and gateway endpoints rely on.
-- - Where tables may not exist (depending on which services have migrated), inserts are guarded with DO blocks.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- --------------------------------------------------------------------------
-- 1) Deterministic IDs (keep stable across reseeds)
-- --------------------------------------------------------------------------

-- Tenant
--   Board  = b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c
--   School = c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c

-- Users
--   osta.admin@sbtm.demo   = 10000000-0000-0000-0000-000000000001
--   school.admin@sbtm.demo = 10000000-0000-0000-0000-000000000002
--   driver1@sbtm.demo      = 10000000-0000-0000-0000-000000000011
--   driver2@sbtm.demo      = 10000000-0000-0000-0000-000000000012
--   driver3@sbtm.demo      = 10000000-0000-0000-0000-000000000013
--   parent1@sbtm.demo      = 10000000-0000-0000-0000-000000000021
--   parent2@sbtm.demo      = 10000000-0000-0000-0000-000000000022
--   parent3@sbtm.demo      = 10000000-0000-0000-0000-000000000023
--   parent4@sbtm.demo      = 10000000-0000-0000-0000-000000000024

-- api-gateway Vehicles (UUIDs; NOT the same IDs as vehicles_reference)
--   VEH-1 = 20000000-0000-0000-0000-000000000001
--   VEH-2 = 20000000-0000-0000-0000-000000000002
--   VEH-3 = 20000000-0000-0000-0000-000000000003

-- api-gateway Routes (UUIDs; separate from routes_reference)
--   RT-1 = 30000000-0000-0000-0000-000000000001
--   RT-2 = 30000000-0000-0000-0000-000000000002
--   RT-3 = 30000000-0000-0000-0000-000000000003

-- --------------------------------------------------------------------------
-- 2) Tenant entities (Boards + Schools)
-- --------------------------------------------------------------------------

-- Keep this simple and idempotent: just upsert the demo board + school.
-- For a truly clean slate, use .\scripts\reset-demo-db.ps1 (drops volumes).

INSERT INTO school_boards (id, name)
VALUES ('b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo School Board')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO schools (id, name, "boardId")
VALUES ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo Elementary School', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "boardId" = EXCLUDED."boardId";

-- --------------------------------------------------------------------------
-- 3) Users (api-gateway)
-- --------------------------------------------------------------------------

DO $$
BEGIN
    DELETE FROM users WHERE email LIKE '%@sbtm.demo';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'users table does not exist';
END $$;

INSERT INTO users (
    id,
    email,
    "passwordHash",
    role,
    "firstName",
    "lastName",
    "driverId",
    "childRouteIds",
    "assignedRouteIds",
    "schoolId",
    "boardId",
    "createdAt",
    "updatedAt"
)
VALUES
    -- Admin Users (only OSTA + School)
    -- NOTE: We set schoolId for OSTA admin so endpoints that filter by req.user.schoolId (e.g., /vehicles) are not empty.
    ('10000000-0000-0000-0000-000000000001', 'osta.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'OSTA_ADMIN', 'OSTA', 'Admin', NULL, NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000002', 'school.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'SCHOOL_ADMIN', 'School', 'Admin', NULL, NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),

    -- Driver Users
    ('10000000-0000-0000-0000-000000000011', 'driver1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'John', 'Driver', 'driver-001', NULL, 'ROUTE-A', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000012', 'driver2@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Mike', 'Schmidt', 'driver-002', NULL, 'ROUTE-B', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000013', 'driver3@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Sarah', 'Lane', 'driver-003', NULL, 'ROUTE-C', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),

    -- Parent Users
    ('10000000-0000-0000-0000-000000000021', 'parent1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Sarah', 'Smith', NULL, 'ROUTE-A', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000022', 'parent2@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'David', 'Johnson', NULL, 'ROUTE-A,ROUTE-B', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000023', 'parent3@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Mary', 'Williams', NULL, 'ROUTE-B', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000024', 'parent4@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Linda', 'Brown', NULL, 'ROUTE-C', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    "passwordHash" = EXCLUDED."passwordHash",
    role = EXCLUDED.role,
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    "driverId" = EXCLUDED."driverId",
    "childRouteIds" = EXCLUDED."childRouteIds",
    "assignedRouteIds" = EXCLUDED."assignedRouteIds",
    "schoolId" = EXCLUDED."schoolId",
    "boardId" = EXCLUDED."boardId",
    "updatedAt" = NOW();

-- --------------------------------------------------------------------------
-- 4) api-gateway vehicles / routes (Admin Dashboard "Vehicles" page)
-- --------------------------------------------------------------------------

DO $$
BEGIN
    DELETE FROM routes WHERE "schoolId" = 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c';
    DELETE FROM vehicles WHERE "schoolId" = 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c';

    INSERT INTO vehicles (id, "schoolId", "licensePlate", status)
    VALUES
        ('20000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'SB-1001', 'ACTIVE'),
        ('20000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'SB-2002', 'ACTIVE'),
        ('20000000-0000-0000-0000-000000000003', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'SB-3003', 'MAINTENANCE')
    ON CONFLICT (id) DO UPDATE SET
        "schoolId" = EXCLUDED."schoolId",
        "licensePlate" = EXCLUDED."licensePlate",
        status = EXCLUDED.status;

    INSERT INTO routes (id, "schoolId", name, direction, "vehicleId", "startTime", "estimatedDuration")
    VALUES
        ('30000000-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Morning Route A', 'AM', '20000000-0000-0000-0000-000000000001', '07:30:00', 60),
        ('30000000-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Morning Route B', 'AM', '20000000-0000-0000-0000-000000000002', '07:45:00', 60),
        ('30000000-0000-0000-0000-000000000003', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Morning Route C', 'AM', '20000000-0000-0000-0000-000000000003', '08:00:00', 60)
    ON CONFLICT (id) DO UPDATE SET
        "schoolId" = EXCLUDED."schoolId",
        name = EXCLUDED.name,
        direction = EXCLUDED.direction,
        "vehicleId" = EXCLUDED."vehicleId",
        "startTime" = EXCLUDED."startTime",
        "estimatedDuration" = EXCLUDED."estimatedDuration";
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'vehicles/routes tables do not exist (api-gateway)';
END $$;

-- --------------------------------------------------------------------------
-- 5) Reference tables (used by demo endpoints: /routes/active, /parent/children, presence/GPS)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicles_reference (
    id VARCHAR(255) PRIMARY KEY,
    "plateNumber" VARCHAR(20),
    capacity INT,
    status VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

TRUNCATE TABLE vehicles_reference;

INSERT INTO vehicles_reference (id, "plateNumber", capacity, status, "createdAt")
VALUES
    ('BUS-001', 'SB-1001', 40, 'ACTIVE', NOW()),
    ('BUS-002', 'SB-2002', 30, 'ACTIVE', NOW()),
    ('BUS-003', 'SB-3003', 40, 'MAINTENANCE', NOW());

CREATE TABLE IF NOT EXISTS routes_reference (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    "vehicleId" VARCHAR(255),
    "driverId" VARCHAR(255),
    schedule JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

TRUNCATE TABLE routes_reference;

INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule, "createdAt")
VALUES
    ('ROUTE-A', 'Morning Route A', 'BUS-001', 'driver-001', '{"startTime": "07:30", "days": ["Mon","Tue","Wed","Thu","Fri"]}', NOW()),
    ('ROUTE-B', 'Morning Route B', 'BUS-002', 'driver-002', '{"startTime": "07:45", "days": ["Mon","Tue","Wed","Thu","Fri"]}', NOW()),
    ('ROUTE-C', 'Morning Route C', 'BUS-003', NULL, '{"startTime": "08:00", "days": ["Mon","Tue","Wed","Thu","Fri"]}', NOW());

CREATE TABLE IF NOT EXISTS route_stops_reference (
    id VARCHAR(255) PRIMARY KEY,
    "routeId" VARCHAR(255),
    "sequenceOrder" INT,
    "stopName" VARCHAR(255),
    lat FLOAT,
    lng FLOAT,
    "arrivalTime" TIME
);

TRUNCATE TABLE route_stops_reference;

INSERT INTO route_stops_reference (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime")
VALUES
    -- Route A Stops
    ('STOP-A1', 'ROUTE-A', 1, 'Central Station', 45.4215, -75.6972, '07:30:00'),
    ('STOP-A2', 'ROUTE-A', 2, 'Maple Avenue & 1st St', 45.4230, -75.6950, '07:40:00'),
    ('STOP-A3', 'ROUTE-A', 3, 'Oak Park', 45.4250, -75.6900, '07:50:00'),
    ('STOP-A4', 'ROUTE-A', 4, 'Lincoln Elementary', 45.4280, -75.6880, '08:00:00'),

    -- Route B Stops
    ('STOP-B1', 'ROUTE-B', 1, 'South End Mall', 45.3800, -75.7000, '07:35:00'),
    ('STOP-B2', 'ROUTE-B', 2, 'River Road', 45.3850, -75.7050, '07:45:00'),
    ('STOP-B3', 'ROUTE-B', 3, 'Pine Street', 45.3900, -75.7100, '07:55:00'),
    ('STOP-B4', 'ROUTE-B', 4, 'Washington Middle School', 45.4000, -75.7200, '08:10:00'),

    -- Route C Stops
    ('STOP-C1', 'ROUTE-C', 1, 'West End Terminal', 45.4100, -75.7100, '07:50:00'),
    ('STOP-C2', 'ROUTE-C', 2, 'Third Avenue & Fourth Street', 45.4120, -75.7080, '08:00:00'),
    ('STOP-C3', 'ROUTE-C', 3, 'Jefferson High', 45.4150, -75.7050, '08:15:00');

CREATE TABLE IF NOT EXISTS students_reference (
    id VARCHAR(255) PRIMARY KEY,
    "firstName" VARCHAR(255),
    "lastName" VARCHAR(255),
    grade INT,
    "parentId" VARCHAR(255),
    "schoolId" VARCHAR(255),
    "assignedRouteId" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE students_reference ADD COLUMN IF NOT EXISTS "schoolId" VARCHAR(255);

TRUNCATE TABLE students_reference;

INSERT INTO students_reference (id, "firstName", "lastName", grade, "parentId", "schoolId", "assignedRouteId", "createdAt")
VALUES
    ('STUDENT-001', 'Emma', 'Smith', 3, '10000000-0000-0000-0000-000000000021', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-A', NOW()),
    ('STUDENT-002', 'Liam', 'Smith', 5, '10000000-0000-0000-0000-000000000021', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-A', NOW()),
    ('STUDENT-003', 'Olivia', 'Johnson', 2, '10000000-0000-0000-0000-000000000022', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-B', NOW()),
    ('STUDENT-004', 'Noah', 'Williams', 4, '10000000-0000-0000-0000-000000000023', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-A', NOW()),
    ('STUDENT-005', 'Ava', 'Brown', 1, '10000000-0000-0000-0000-000000000024', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-B', NOW());

-- Deterministic UUIDs for demo users (lets other demo tables reference users reliably)
-- Admins
--   osta.admin@sbtm.demo   = 10000000-0000-0000-0000-000000000001
--   school.admin@sbtm.demo = 10000000-0000-0000-0000-000000000002
-- Drivers
--   driver1@sbtm.demo      = 10000000-0000-0000-0000-000000000011
--   driver2@sbtm.demo      = 10000000-0000-0000-0000-000000000012
--   driver3@sbtm.demo      = 10000000-0000-0000-0000-000000000013
-- Parents
--   parent1@sbtm.demo      = 10000000-0000-0000-0000-000000000021
--   parent2@sbtm.demo      = 10000000-0000-0000-0000-000000000022
--   parent3@sbtm.demo      = 10000000-0000-0000-0000-000000000023
--   parent4@sbtm.demo      = 10000000-0000-0000-0000-000000000024

-- Clear existing demo users
DELETE FROM users WHERE email LIKE '%@sbtm.demo';

-- Insert demo users
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "schoolId", "boardId", "createdAt", "updatedAt")
VALUES
    -- Admin Users (only OSTA + School)
    ('10000000-0000-0000-0000-000000000001', 'osta.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'OSTA_ADMIN', 'OSTA', 'Admin', NULL, NULL, NULL, NULL, 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000002', 'school.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'SCHOOL_ADMIN', 'School', 'Admin', NULL, NULL, NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    
    -- Driver Users
    ('10000000-0000-0000-0000-000000000011', 'driver1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'John', 'Driver', 'driver-001', NULL, 'ROUTE-A', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000012', 'driver2@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Mike', 'Schmidt', 'driver-002', NULL, 'ROUTE-B', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000013', 'driver3@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'Sarah', 'Lane', 'driver-003', NULL, 'ROUTE-C', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    
    -- Parent Users
    ('10000000-0000-0000-0000-000000000021', 'parent1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Sarah', 'Smith', NULL, 'ROUTE-A', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000022', 'parent2@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'David', 'Johnson', NULL, 'ROUTE-A,ROUTE-B', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000023', 'parent3@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Mary', 'Williams', NULL, 'ROUTE-B', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000024', 'parent4@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Linda', 'Brown', NULL, 'ROUTE-C', NULL, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 6) Student Presence seed (optional; safe if tables exist)
-- --------------------------------------------------------------------------

DO $$
BEGIN
    DELETE FROM student_tag WHERE "studentId" LIKE 'STUDENT-%';

    INSERT INTO student_tag (id, "schoolId", "studentId", "tagId", "tagType", "createdAt")
    VALUES
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-001', 'TAG-EMMA-001', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-002', 'TAG-LIAM-002', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-003', 'TAG-OLIVIA-003', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-004', 'TAG-NOAH-004', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-005', 'TAG-AVA-005', 'SMARTTAG', NOW())
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'student_tag table does not exist';
END $$;

DO $$
BEGIN
    DELETE FROM presence_event WHERE "studentId" LIKE 'STUDENT-%';

    INSERT INTO presence_event (id, "schoolId", "studentId", "vehicleId", "routeId", "eventType", timestamp, source, "signalStrength", "createdAt", "updatedAt")
    VALUES
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-001', 'BUS-001', 'ROUTE-A', 'BOARD', NOW() - INTERVAL '25 minutes', 'SMARTTAG', -55.5, NOW(), NOW()),
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-002', 'BUS-001', 'ROUTE-A', 'BOARD', NOW() - INTERVAL '20 minutes', 'SMARTTAG', -60.2, NOW(), NOW()),
        (gen_random_uuid(), 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'STUDENT-003', 'BUS-002', 'ROUTE-B', 'BOARD', NOW() - INTERVAL '15 minutes', 'SMARTTAG', -58.0, NOW(), NOW())
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'presence_event table does not exist';
END $$;

-- --------------------------------------------------------------------------
-- 7) GPS seed (optional; safe if tables exist)
-- --------------------------------------------------------------------------

DO $$
BEGIN
    DELETE FROM location_points WHERE vehicle_id IN ('BUS-001', 'BUS-002', 'BUS-003');

    INSERT INTO location_points (id, school_id, vehicle_id, route_id, timestamp, lat, lng, speed_kph, heading_deg, accuracy_meters)
    VALUES
        -- BUS-001 on ROUTE-A
        (gen_random_uuid()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '30 minutes', 45.4215, -75.6972, 35.5, 45, 5),
        (gen_random_uuid()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '25 minutes', 45.4220, -75.6960, 40.0, 50, 5),
        (gen_random_uuid()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '20 minutes', 45.4230, -75.6945, 38.0, 55, 5),
        -- BUS-002 on ROUTE-B
        (gen_random_uuid()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '25 minutes', 45.3800, -75.7000, 30.0, 10, 5),
        (gen_random_uuid()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '20 minutes', 45.3810, -75.7010, 32.5, 12, 5),
        (gen_random_uuid()::text, 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '15 minutes', 45.3825, -75.7025, 35.0, 15, 5)
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'location_points table does not exist';
END $$;

COMMIT;
