-- ============================================================================
-- SBTM Demo Seed Data
-- ============================================================================
-- This script creates demo data for the School Bus Transport Management System
-- Run after database is initialized with migrations
-- ============================================================================

-- ============================================================================
-- 1. CREATE ENUM TYPES (if not exists)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'DRIVER', 'PARENT', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('BOARD', 'ALIGHT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_source AS ENUM ('SMARTTAG', 'MANUAL', 'RFID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tag_type AS ENUM ('SMARTTAG', 'RFID', 'NFC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE emergency_event_type AS ENUM ('PANIC_BUTTON', 'INCIDENT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE emergency_status AS ENUM ('ACTIVE', 'RESOLVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_event_type AS ENUM ('EMERGENCY', 'INCIDENT', 'MANUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_status AS ENUM ('UPLOADING', 'READY', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. DEMO USERS
-- ============================================================================
-- Password for all users: Use bcrypt hash of their respective passwords
-- Admin123! = $2b$10$demoAdminHashValue1234567890abcdef
-- Driver123! = $2b$10$demoDriverHashValue1234567890abcdef
-- Parent123! = $2b$10$demoParentHashValue1234567890abcdef

-- Clear existing demo data
DELETE FROM users WHERE email LIKE '%@sbtm.demo';

-- Admin Users
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "createdAt", "updatedAt")
VALUES 
    ('00000000-0000-0000-0001-000000000001', 'admin@sbtm.demo', '$2b$10$rB3f8CgJCMN0ZOQ9nRkP8e1J8YXeLa7Qws3x5pMZJZxGMqzq5F6Zy', 'ADMIN', 'Sarah', 'Admin', NOW(), NOW()),
    ('00000000-0000-0000-0001-000000000002', 'supervisor@sbtm.demo', '$2b$10$rB3f8CgJCMN0ZOQ9nRkP8e1J8YXeLa7Qws3x5pMZJZxGMqzq5F6Zy', 'ADMIN', 'Michael', 'Supervisor', NOW(), NOW());

-- Driver Users
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "assignedRouteIds", "createdAt", "updatedAt")
VALUES 
    ('00000000-0000-0000-0002-000000000001', 'driver1@sbtm.demo', '$2b$10$wH7g8DhKDNO1ZPR0oSlQ9f2K9ZYfMb8RxtY5qNAZKayhNrzr6G7Az', 'DRIVER', 'John', 'Driver', 'DRV-001', 'ROUTE-A', NOW(), NOW()),
    ('00000000-0000-0000-0002-000000000002', 'driver2@sbtm.demo', '$2b$10$wH7g8DhKDNO1ZPR0oSlQ9f2K9ZYfMb8RxtY5qNAZKayhNrzr6G7Az', 'DRIVER', 'Emily', 'Smith', 'DRV-002', 'ROUTE-B', NOW(), NOW()),
    ('00000000-0000-0000-0002-000000000003', 'driver3@sbtm.demo', '$2b$10$wH7g8DhKDNO1ZPR0oSlQ9f2K9ZYfMb8RxtY5qNAZKayhNrzr6G7Az', 'DRIVER', 'Robert', 'Johnson', 'DRV-003', 'ROUTE-C', NOW(), NOW());

-- Parent Users
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "childRouteIds", "createdAt", "updatedAt")
VALUES 
    ('00000000-0000-0000-0003-000000000001', 'parent1@sbtm.demo', '$2b$10$xI8h9EiLEOP2aQS1pTmR0g3L0aZgNc9SyuZ6rOBALbziOsas7H8Ba', 'PARENT', 'Jennifer', 'Wilson', 'ROUTE-A', NOW(), NOW()),
    ('00000000-0000-0000-0003-000000000002', 'parent2@sbtm.demo', '$2b$10$xI8h9EiLEOP2aQS1pTmR0g3L0aZgNc9SyuZ6rOBALbziOsas7H8Ba', 'PARENT', 'David', 'Johnson', 'ROUTE-A,ROUTE-B', NOW(), NOW()),
    ('00000000-0000-0000-0003-000000000003', 'parent3@sbtm.demo', '$2b$10$xI8h9EiLEOP2aQS1pTmR0g3L0aZgNc9SyuZ6rOBALbziOsas7H8Ba', 'PARENT', 'Maria', 'Smith', 'ROUTE-B', NOW(), NOW()),
    ('00000000-0000-0000-0003-000000000004', 'parent4@sbtm.demo', '$2b$10$xI8h9EiLEOP2aQS1pTmR0g3L0aZgNc9SyuZ6rOBALbziOsas7H8Ba', 'PARENT', 'James', 'Brown', 'ROUTE-C', NOW(), NOW());

-- ============================================================================
-- 3. DEMO STUDENTS (Reference Data)
-- ============================================================================
-- Note: Students table may not exist, these are reference IDs for presence/tag systems

-- Create students reference table if not exists
CREATE TABLE IF NOT EXISTS students_reference (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    grade VARCHAR(10),
    school VARCHAR(100),
    parent_user_id UUID,
    route_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

DELETE FROM students_reference WHERE id LIKE 'STUDENT-%';

INSERT INTO students_reference (id, first_name, last_name, grade, school, parent_user_id, route_id)
VALUES
    ('STUDENT-001', 'Emma', 'Wilson', '5th', 'Lincoln Elementary', '00000000-0000-0000-0003-000000000001', 'ROUTE-A'),
    ('STUDENT-002', 'Liam', 'Johnson', '3rd', 'Lincoln Elementary', '00000000-0000-0000-0003-000000000002', 'ROUTE-A'),
    ('STUDENT-003', 'Olivia', 'Johnson', '6th', 'Lincoln Elementary', '00000000-0000-0000-0003-000000000002', 'ROUTE-B'),
    ('STUDENT-004', 'Noah', 'Smith', '4th', 'Lincoln Elementary', '00000000-0000-0000-0003-000000000003', 'ROUTE-B'),
    ('STUDENT-005', 'Ava', 'Brown', '2nd', 'Washington Elementary', '00000000-0000-0000-0003-000000000004', 'ROUTE-C');

-- ============================================================================
-- 4. DEMO VEHICLES (Reference Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles_reference (
    id VARCHAR(50) PRIMARY KEY,
    license_plate VARCHAR(20),
    capacity INT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW()
);

DELETE FROM vehicles_reference WHERE id LIKE 'BUS-%';

INSERT INTO vehicles_reference (id, license_plate, capacity, status)
VALUES
    ('BUS-001', 'ABC-1234', 45, 'ACTIVE'),
    ('BUS-002', 'DEF-5678', 45, 'ACTIVE'),
    ('BUS-003', 'GHI-9012', 40, 'ACTIVE');

-- ============================================================================
-- 5. DEMO ROUTES (Reference Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS routes_reference (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    school VARCHAR(100),
    direction VARCHAR(10),
    start_time TIME,
    end_time TIME,
    vehicle_id VARCHAR(50),
    driver_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

DELETE FROM routes_reference WHERE id LIKE 'ROUTE-%';

INSERT INTO routes_reference (id, name, school, direction, start_time, end_time, vehicle_id, driver_id)
VALUES
    ('ROUTE-A', 'Route A - Lincoln AM', 'Lincoln Elementary', 'AM', '07:30:00', '08:30:00', 'BUS-001', 'DRV-001'),
    ('ROUTE-B', 'Route B - Lincoln AM', 'Lincoln Elementary', 'AM', '07:30:00', '08:30:00', 'BUS-002', 'DRV-002'),
    ('ROUTE-C', 'Route C - Washington AM', 'Washington Elementary', 'AM', '07:45:00', '08:45:00', 'BUS-003', 'DRV-003');

-- ============================================================================
-- 6. DEMO ROUTE STOPS (Reference Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS route_stops_reference (
    id VARCHAR(50) PRIMARY KEY,
    route_id VARCHAR(50),
    sequence INT,
    name VARCHAR(100),
    lat FLOAT,
    lng FLOAT,
    planned_arrival_time TIME,
    created_at TIMESTAMP DEFAULT NOW()
);

DELETE FROM route_stops_reference WHERE id LIKE 'STOP-%';

-- Route A Stops (Ottawa area coordinates)
INSERT INTO route_stops_reference (id, route_id, sequence, name, lat, lng, planned_arrival_time)
VALUES
    ('STOP-A1', 'ROUTE-A', 1, 'Maple Street & Oak Ave', 45.4215, -75.6972, '07:35:00'),
    ('STOP-A2', 'ROUTE-A', 2, 'Pine Road & Elm Drive', 45.4225, -75.6950, '07:42:00'),
    ('STOP-A3', 'ROUTE-A', 3, 'Cedar Lane & Birch Way', 45.4240, -75.6930, '07:50:00'),
    ('STOP-A4', 'ROUTE-A', 4, 'Lincoln Elementary School', 45.4260, -75.6900, '08:00:00');

-- Route B Stops
INSERT INTO route_stops_reference (id, route_id, sequence, name, lat, lng, planned_arrival_time)
VALUES
    ('STOP-B1', 'ROUTE-B', 1, 'River Road & Lake Street', 45.4180, -75.7000, '07:35:00'),
    ('STOP-B2', 'ROUTE-B', 2, 'Mountain View & Valley Drive', 45.4190, -75.6985, '07:45:00'),
    ('STOP-B3', 'ROUTE-B', 3, 'Sunset Blvd & Dawn Ave', 45.4210, -75.6960, '07:52:00'),
    ('STOP-B4', 'ROUTE-B', 4, 'Lincoln Elementary School', 45.4260, -75.6900, '08:00:00');

-- Route C Stops
INSERT INTO route_stops_reference (id, route_id, sequence, name, lat, lng, planned_arrival_time)
VALUES
    ('STOP-C1', 'ROUTE-C', 1, 'First Avenue & Second Street', 45.4100, -75.7100, '07:50:00'),
    ('STOP-C2', 'ROUTE-C', 2, 'Third Avenue & Fourth Street', 45.4120, -75.7080, '08:00:00'),
    ('STOP-C3', 'ROUTE-C', 3, 'Washington Elementary School', 45.4150, -75.7050, '08:15:00');

-- ============================================================================
-- 7. STUDENT TAGS (for Student Presence Service)
-- ============================================================================

-- Clear existing demo tags
DELETE FROM student_tag WHERE "studentId" LIKE 'STUDENT-%';

-- Insert demo tags (if table exists)
INSERT INTO student_tag (id, "studentId", "tagId", "tagType", "createdAt")
VALUES
    (gen_random_uuid(), 'STUDENT-001', 'TAG-EMMA-001', 'SMARTTAG', NOW()),
    (gen_random_uuid(), 'STUDENT-002', 'TAG-LIAM-002', 'SMARTTAG', NOW()),
    (gen_random_uuid(), 'STUDENT-003', 'TAG-OLIVIA-003', 'SMARTTAG', NOW()),
    (gen_random_uuid(), 'STUDENT-004', 'TAG-NOAH-004', 'SMARTTAG', NOW()),
    (gen_random_uuid(), 'STUDENT-005', 'TAG-AVA-005', 'SMARTTAG', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SAMPLE GPS LOCATION DATA (for GPS Tracking Service)
-- ============================================================================

-- Insert sample location points for demo (Prisma table name)
INSERT INTO location_points (id, vehicle_id, route_id, timestamp, lat, lng, speed_kph, heading_deg, accuracy_meters)
VALUES
    -- Bus 1 - Route A sample positions
    (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '30 minutes', 45.4215, -75.6972, 35.5, 45, 5),
    (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '25 minutes', 45.4220, -75.6960, 40.0, 50, 5),
    (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '20 minutes', 45.4230, -75.6945, 38.0, 55, 5),
    (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '15 minutes', 45.4240, -75.6930, 35.0, 60, 5),
    (gen_random_uuid()::text, 'BUS-001', 'ROUTE-A', NOW() - INTERVAL '10 minutes', 45.4250, -75.6915, 30.0, 65, 5),
    
    -- Bus 2 - Route B sample positions
    (gen_random_uuid()::text, 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '28 minutes', 45.4180, -75.7000, 32.0, 30, 5),
    (gen_random_uuid()::text, 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '22 minutes', 45.4190, -75.6985, 35.0, 35, 5),
    (gen_random_uuid()::text, 'BUS-002', 'ROUTE-B', NOW() - INTERVAL '16 minutes', 45.4200, -75.6970, 38.0, 40, 5),
    
    -- Bus 3 - Route C sample positions
    (gen_random_uuid()::text, 'BUS-003', 'ROUTE-C', NOW() - INTERVAL '20 minutes', 45.4100, -75.7100, 30.0, 20, 5),
    (gen_random_uuid()::text, 'BUS-003', 'ROUTE-C', NOW() - INTERVAL '10 minutes', 45.4120, -75.7080, 35.0, 25, 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. SAMPLE PRESENCE EVENTS
-- ============================================================================

-- Insert sample presence events (if table exists)
INSERT INTO presence_event (id, "studentId", "vehicleId", "routeId", "eventType", timestamp, source, "signalStrength", "createdAt", "updatedAt")
VALUES
    -- Emma boarding on Route A
    (gen_random_uuid(), 'STUDENT-001', 'BUS-001', 'ROUTE-A', 'BOARD', NOW() - INTERVAL '25 minutes', 'SMARTTAG', -55.5, NOW(), NOW()),
    -- Liam boarding on Route A
    (gen_random_uuid(), 'STUDENT-002', 'BUS-001', 'ROUTE-A', 'BOARD', NOW() - INTERVAL '20 minutes', 'SMARTTAG', -60.2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify data:
-- SELECT 'Users' as table_name, COUNT(*) as count FROM users WHERE email LIKE '%@sbtm.demo';
-- SELECT 'Students' as table_name, COUNT(*) as count FROM students_reference;
-- SELECT 'Vehicles' as table_name, COUNT(*) as count FROM vehicles_reference;
-- SELECT 'Routes' as table_name, COUNT(*) as count FROM routes_reference;
-- SELECT 'Stops' as table_name, COUNT(*) as count FROM route_stops_reference;

SELECT 'Demo seed data loaded successfully!' as status;
