-- ============================================================================
-- SBTM Demo Data Seed Script (SQL)
-- ============================================================================
-- This script explicitly inserts demo data for Users, Students, Routes, etc.
-- It is designed to work with the schema created by TypeORM and Prisma.
-- ============================================================================

-- ============================================================================
-- 1. CLEANUP (Optional)
-- ============================================================================

-- Uncomment identifying specific demo data if you want to clear only demo data
-- DELETE FROM users WHERE email LIKE '%@sbtm.demo';
-- DELETE FROM students_reference WHERE id LIKE 'STUDENT-%';

-- ============================================================================
-- 2. REFERENCE TABLES (Shared Data)
-- ============================================================================

-- Create vehicles_reference table if not exists (usually managed by microservices, shared here)
CREATE TABLE IF NOT EXISTS vehicles_reference (
    id VARCHAR(255) PRIMARY KEY,
    "plateNumber" VARCHAR(20),
    capacity INT,
    status VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Register demo vehicles
INSERT INTO vehicles_reference (id, "plateNumber", capacity, status, "createdAt")
VALUES
    ('BUS-001', 'SB-1001', 40, 'ACTIVE', NOW()),
    ('BUS-002', 'SB-2002', 30, 'ACTIVE', NOW()),
    ('BUS-003', 'SB-3003', 40, 'MAINTENANCE', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create routes_reference table
CREATE TABLE IF NOT EXISTS routes_reference (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    "vehicleId" VARCHAR(255),
    "driverId" VARCHAR(255),
    schedule JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Register demo routes
INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule, "createdAt")
VALUES
    ('ROUTE-A', 'Morning Route A', 'BUS-001', 'driver-001', '{"startTime": "07:30", "days": ["Mon","Tue","Wed","Thu","Fri"]}', NOW()),
    ('ROUTE-B', 'Morning Route B', 'BUS-002', 'driver-002', '{"startTime": "07:45", "days": ["Mon","Tue","Wed","Thu","Fri"]}', NOW()),
    ('ROUTE-C', 'Morning Route C', 'BUS-003', NULL, '{"startTime": "08:00", "days": ["Mon","Tue","Wed","Thu","Fri"]}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create students_reference table
CREATE TABLE IF NOT EXISTS students_reference (
    id VARCHAR(255) PRIMARY KEY,
    "firstName" VARCHAR(255),
    "lastName" VARCHAR(255),
    grade INT,
    "parentId" VARCHAR(255),
    "assignedRouteId" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Register demo students
INSERT INTO students_reference (id, "firstName", "lastName", grade, "parentId", "assignedRouteId", "createdAt")
VALUES
    ('STUDENT-001', 'Emma', 'Smith', 3, 'parent-001', 'ROUTE-A', NOW()),
    ('STUDENT-002', 'Liam', 'Smith', 5, 'parent-001', 'ROUTE-A', NOW()),
    ('STUDENT-003', 'Olivia', 'Johnson', 2, 'parent-002', 'ROUTE-B', NOW()),
    ('STUDENT-004', 'Noah', 'Williams', 4, 'parent-003', 'ROUTE-A', NOW()),
    ('STUDENT-005', 'Ava', 'Brown', 1, 'parent-004', 'ROUTE-B', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. USERS (API Gateway)
-- ============================================================================

-- Clear existing demo users
DELETE FROM users WHERE email LIKE '%@sbtm.demo';

-- Insert demo users
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "childRouteIds", "assignedRouteIds", "createdAt", "updatedAt")
VALUES
    -- Admin Users
    (gen_random_uuid(), 'admin@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'ADMIN', 'System', 'Admin', NULL, NULL, NULL, NOW(), NOW()),
    (gen_random_uuid(), 'supervisor@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'ADMIN', 'Fleet', 'Supervisor', NULL, NULL, NULL, NOW(), NOW()),
    
    -- Driver Users
    (gen_random_uuid(), 'driver1@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'DRIVER', 'John', 'Driver', 'driver-001', NULL, 'ROUTE-A', NOW(), NOW()),
    (gen_random_uuid(), 'driver2@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'DRIVER', 'Mike', 'Schmidt', 'driver-002', NULL, 'ROUTE-B', NOW(), NOW()),
    (gen_random_uuid(), 'driver3@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'DRIVER', 'Sarah', 'Lane', 'driver-003', NULL, 'ROUTE-C', NOW(), NOW()),
    
    -- Parent Users
    (gen_random_uuid(), 'parent1@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'PARENT', 'Sarah', 'Smith', NULL, 'ROUTE-A', NULL, NOW(), NOW()),
    (gen_random_uuid(), 'parent2@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'PARENT', 'David', 'Johnson', NULL, 'ROUTE-A,ROUTE-B', NULL, NOW(), NOW()),
    (gen_random_uuid(), 'parent3@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'PARENT', 'Mary', 'Williams', NULL, 'ROUTE-B', NULL, NOW(), NOW()),
    (gen_random_uuid(), 'parent4@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'PARENT', 'Linda', 'Brown', NULL, 'ROUTE-C', NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. ROUTE STOPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS route_stops_reference (
    id VARCHAR(255) PRIMARY KEY,
    "routeId" VARCHAR(255),
    "sequenceOrder" INT,
    "stopName" VARCHAR(255),
    lat FLOAT,
    lng FLOAT,
    "arrivalTime" TIME
);

-- Clear existing stops
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

-- ============================================================================
-- 5. STUDENT TAGS & EVENTS (Student Presence)
-- ============================================================================

DO $$
BEGIN
    DELETE FROM student_tag WHERE "studentId" LIKE 'STUDENT-%';

    INSERT INTO student_tag (id, "studentId", "tagId", "tagType", "createdAt")
    VALUES
        (gen_random_uuid(), 'STUDENT-001', 'TAG-EMMA-001', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'STUDENT-002', 'TAG-LIAM-002', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'STUDENT-003', 'TAG-OLIVIA-003', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'STUDENT-004', 'TAG-NOAH-004', 'SMARTTAG', NOW()),
        (gen_random_uuid(), 'STUDENT-005', 'TAG-AVA-005', 'SMARTTAG', NOW())
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'student_tag table does not exist';
END $$;

DO $$
BEGIN
    DELETE FROM presence_event WHERE "studentId" LIKE 'STUDENT-%';

    INSERT INTO presence_event (id, "studentId", "vehicleId", "routeId", "eventType", timestamp, source, "signalStrength", "createdAt", "updatedAt")
    VALUES
        (gen_random_uuid(), 'STUDENT-001', 'BUS-001', 'ROUTE-A', 'BOARD', NOW() - INTERVAL '25 minutes', 'SMARTTAG', -55.5, NOW(), NOW()),
        (gen_random_uuid(), 'STUDENT-002', 'BUS-001', 'ROUTE-A', 'BOARD', NOW() - INTERVAL '20 minutes', 'SMARTTAG', -60.2, NOW(), NOW()),
        (gen_random_uuid(), 'STUDENT-003', 'BUS-002', 'ROUTE-B', 'BOARD', NOW() - INTERVAL '15 minutes', 'SMARTTAG', -58.0, NOW(), NOW())
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'presence_event table does not exist';
END $$;

-- ============================================================================
-- 6. GPS LOCATIONS (GPS Tracking)
-- ============================================================================

DO $$
BEGIN
    DELETE FROM location_points WHERE vehicle_id IN ('BUS-001', 'BUS-002', 'BUS-003');

    INSERT INTO location_points (id, vehicle_id, route_id, timestamp, lat, lng, speed_kph, heading_deg, accuracy_meters)
    VALUES
        -- BUS-001 on ROUTE-A
        (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '30 minutes', 45.4215, -75.6972, 35.5, 45, 5),
        (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '25 minutes', 45.4220, -75.6960, 40.0, 50, 5),
        (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '20 minutes', 45.4230, -75.6945, 38.0, 55, 5),
        -- BUS-002 on ROUTE-B
        (gen_random_uuid()::text, 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '25 minutes', 45.3800, -75.7000, 30.0, 10, 5),
        (gen_random_uuid()::text, 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '20 minutes', 45.3810, -75.7010, 32.5, 12, 5),
        (gen_random_uuid()::text, 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '15 minutes', 45.3825, -75.7025, 35.0, 15, 5)
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'location_points table does not exist';
END $$;
