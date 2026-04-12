-- ============================================================================
-- SBTM Consolidated Init DB Script
-- Date: April 5, 2026
--
-- Actions:
-- 1. Setup Database (Extensions, Clean Slate)
-- 2. Create Schema (Gateway, Microservices, Legacy References)
-- 3. Seed Data — Single-Bus Demo (1 school, 1 bus, 7 students, 4 parents)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Setup Database
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing tables and types to ensure a clean slate (CASCADE to handle FKs)
DROP TABLE IF EXISTS alert_audit_log CASCADE;
DROP TABLE IF EXISTS emergency_alert CASCADE;
DROP TABLE IF EXISTS alert_notification_log CASCADE;
DROP TABLE IF EXISTS notification_delivery_log CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TYPE IF EXISTS emergency_event_type_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_status_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_tier_enum CASCADE;
DROP TYPE IF EXISTS emergency_alert_escalation_level_enum CASCADE;
DROP TYPE IF EXISTS alert_audit_event_type_enum CASCADE;
DROP TYPE IF EXISTS notification_channel_enum CASCADE;
DROP TYPE IF EXISTS notification_status_enum CASCADE;
DROP TYPE IF EXISTS delivery_channel_enum CASCADE;
DROP TYPE IF EXISTS delivery_status_enum CASCADE;
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
DROP TABLE IF EXISTS fleet_assignments CASCADE;
DROP TABLE IF EXISTS student_absences CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS video_access_logs CASCADE;
DROP TABLE IF EXISTS video_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS vehicle_inspections CASCADE;
DROP TABLE IF EXISTS driver_compliance CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS school_boards CASCADE;

DROP TYPE IF EXISTS presence_event_eventtype_enum CASCADE;
DROP TYPE IF EXISTS presence_event_source_enum CASCADE;
DROP TYPE IF EXISTS compliance_status_enum CASCADE;
DROP TYPE IF EXISTS inspection_type_enum CASCADE;
DROP TYPE IF EXISTS video_event_type_enum CASCADE;
DROP TYPE IF EXISTS video_event_status_enum CASCADE;

-- --------------------------------------------------------------------------
-- 2. Create Schema (Gateway & Microservices)
-- --------------------------------------------------------------------------

-- Tenants
CREATE TABLE school_boards (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE schools (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  "boardId" UUID NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  lat DOUBLE PRECISION NULL,
  lng DOUBLE PRECISION NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
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
  phone VARCHAR(20) NULL,
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
  id VARCHAR(255) PRIMARY KEY,
  "schoolId" UUID NOT NULL,
  "licensePlate" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "FK_vehicles_school" FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT "UQ_vehicle_school_plate" UNIQUE ("schoolId", "licensePlate")
);

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  "vehicleId" VARCHAR(255) NULL,
  "startTime" TIME NOT NULL,
  "estimatedDuration" INT NOT NULL DEFAULT 60,
  polyline TEXT NULL,
  CONSTRAINT "FK_routes_school" FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT "FK_routes_vehicle" FOREIGN KEY ("vehicleId") REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT "UQ_route_school_name" UNIQUE ("schoolId", name)
);

CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Emergency Alerts (Matching emergency-alerts entity — Phase B governance)
CREATE TYPE emergency_event_type_enum AS ENUM (
    'PANIC_BUTTON', 'ROUTE_DEVIATION', 'INCIDENT', 'LATE_ARRIVAL',
    'ROUTE_DIVERSION', 'PANIC_ALERT', 'MEDICAL', 'LATE_DEPARTURE',
    'COMPLIANCE', 'OTHER'
);
CREATE TYPE emergency_alert_status_enum AS ENUM (
    'ACTIVE', 'RESOLVED', 'PENDING_CONFIRMATION', 'CONFIRMED',
    'AUTO_ESCALATED', 'FALSE_ALARM'
);
CREATE TYPE emergency_alert_tier_enum AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');
CREATE TYPE emergency_alert_escalation_level_enum AS ENUM ('SCHOOL', 'BOARD', 'OSTA');

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
    "description" TEXT,
    "status" emergency_alert_status_enum DEFAULT 'ACTIVE',
    "tier" emergency_alert_tier_enum,
    "confirmedBy" VARCHAR,
    "confirmedAt" TIMESTAMPTZ,
    "escalationLevel" emergency_alert_escalation_level_enum,
    "autoEscalatedAt" TIMESTAMPTZ,
    "parentNotifiedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Alert Audit Log (Phase B — governance audit trail)
CREATE TYPE alert_audit_event_type_enum AS ENUM (
    'CREATED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'AUTO_ESCALATED',
    'FALSE_ALARM', 'PARENT_NOTIFIED', 'BOARD_ESCALATED', 'OSTA_ESCALATED',
    'RESOLVED', 'INFO_REQUESTED', 'STATUS_UPDATE'
);

CREATE TABLE alert_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "alertId" VARCHAR NOT NULL,
    "eventType" alert_audit_event_type_enum NOT NULL,
    "actorUserId" VARCHAR,
    "actorRole" VARCHAR,
    "notes" TEXT,
    "escalationLevel" VARCHAR,
    "eventTimestamp" TIMESTAMP DEFAULT NOW()
);

CREATE TYPE notification_channel_enum AS ENUM ('PUSH', 'EMAIL', 'SMS');
CREATE TYPE notification_status_enum AS ENUM ('SENT', 'FAILED', 'PENDING');

CREATE TABLE alert_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "alertId" VARCHAR NOT NULL,
    "recipientUserId" VARCHAR NOT NULL,
    "channel" notification_channel_enum NOT NULL,
    "status" notification_status_enum NOT NULL,
    "timestamp" TIMESTAMP DEFAULT NOW()
);

-- Notification Service Tables (Phase A)
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    token VARCHAR(512) NOT NULL,
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "UQ_device_token_user_token" UNIQUE ("userId", token)
);
CREATE INDEX "IDX_device_tokens_user_active" ON device_tokens ("userId", "isActive");
CREATE INDEX "IDX_device_tokens_school" ON device_tokens ("schoolId");

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    channel VARCHAR(10) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "UQ_notif_pref_user_event_channel" UNIQUE ("userId", "eventType", channel)
);
CREATE INDEX "IDX_notif_pref_user_school" ON notification_preferences ("userId", "schoolId");

CREATE TYPE delivery_channel_enum AS ENUM ('PUSH', 'EMAIL', 'SMS');
CREATE TYPE delivery_status_enum AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

CREATE TABLE notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "recipientUserId" UUID,
    "eventType" VARCHAR(50) NOT NULL,
    "eventSourceId" UUID,
    channel delivery_channel_enum NOT NULL,
    status delivery_status_enum NOT NULL DEFAULT 'PENDING',
    "providerMessageId" VARCHAR(255),
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "IDX_delivery_log_user_created" ON notification_delivery_log ("recipientUserId", "createdAt" DESC);
CREATE INDEX "IDX_delivery_log_school" ON notification_delivery_log ("schoolId");
CREATE INDEX "IDX_delivery_log_event_source" ON notification_delivery_log ("eventSourceId");

-- Student Absences (with confirmation workflow)
CREATE TABLE IF NOT EXISTS student_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "tripDate" DATE NOT NULL,
    "routeType" TEXT DEFAULT 'BOTH' CHECK ("routeType" IN ('AM', 'PM', 'BOTH')),
    notes TEXT,
    "confirmationStatus" TEXT DEFAULT 'PENDING' CHECK ("confirmationStatus" IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMPTZ,
    "confirmationNotes" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "IDX_absence_school_date" ON student_absences ("schoolId", "tripDate");
CREATE INDEX "IDX_absence_student_date" ON student_absences ("studentId", "tripDate");

-- Fleet Assignments (OSTA proposes -> School confirms)
CREATE TABLE fleet_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    status TEXT DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED')),
    "proposedByUserId" UUID NOT NULL,
    "reviewedByUserId" UUID,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMPTZ,
    "effectiveDate" DATE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "IDX_fleet_assign_school" ON fleet_assignments ("schoolId");
CREATE INDEX "IDX_fleet_assign_status" ON fleet_assignments (status);

-- Compliance — Driver Compliance (Matching compliance-management entity)
CREATE TYPE compliance_status_enum AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING');

CREATE TABLE driver_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL UNIQUE,
    school_id UUID NOT NULL,
    license_expiry DATE,
    background_check_last_date DATE,
    medical_check_due_date DATE,
    status compliance_status_enum DEFAULT 'PENDING',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "IDX_driver_compliance_driver" ON driver_compliance (driver_id);
CREATE INDEX "IDX_driver_compliance_school" ON driver_compliance (school_id);

-- Compliance — Vehicle Inspections (Matching compliance-management entity)
CREATE TYPE inspection_type_enum AS ENUM ('PRE_TRIP', 'POST_TRIP', 'MAINTENANCE');

CREATE TABLE vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    school_id UUID NOT NULL,
    type inspection_type_enum DEFAULT 'PRE_TRIP',
    is_passed BOOLEAN DEFAULT TRUE,
    checklist_json JSONB,
    photo_urls TEXT[],
    comments VARCHAR,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "IDX_vehicle_inspections_vehicle" ON vehicle_inspections (vehicle_id);
CREATE INDEX "IDX_vehicle_inspections_driver" ON vehicle_inspections (driver_id);
CREATE INDEX "IDX_vehicle_inspections_school" ON vehicle_inspections (school_id);

-- Compliance — Audit Logs (Matching compliance-management entity, append-only)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    school_id UUID NOT NULL,
    action VARCHAR NOT NULL,
    resource VARCHAR,
    resource_id VARCHAR,
    details JSONB,
    ip_address VARCHAR,
    user_agent VARCHAR,
    "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "IDX_audit_logs_user" ON audit_logs (user_id);
CREATE INDEX "IDX_audit_logs_school" ON audit_logs (school_id);
CREATE INDEX "IDX_audit_logs_resource" ON audit_logs (resource);
CREATE INDEX "IDX_audit_logs_resource_id" ON audit_logs (resource_id);
CREATE INDEX "IDX_audit_logs_created" ON audit_logs ("createdAt");

-- Video Service Tables (Matching video-service entities)
CREATE TYPE video_event_type_enum AS ENUM ('EMERGENCY', 'INCIDENT', 'MANUAL');
CREATE TYPE video_event_status_enum AS ENUM ('UPLOADING', 'READY', 'FAILED');

CREATE TABLE video_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR NOT NULL,
    vehicle_id VARCHAR NOT NULL,
    route_id VARCHAR NOT NULL,
    driver_id VARCHAR NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    event_type video_event_type_enum NOT NULL,
    duration_seconds INT NOT NULL,
    video_url VARCHAR,
    thumbnail_url VARCHAR,
    status video_event_status_enum DEFAULT 'UPLOADING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "IDX_video_events_school" ON video_events (school_id);
CREATE INDEX "IDX_video_events_vehicle" ON video_events (vehicle_id);
CREATE INDEX "IDX_video_events_route" ON video_events (route_id);
CREATE INDEX "IDX_video_events_driver" ON video_events (driver_id);
CREATE INDEX "IDX_video_events_timestamp" ON video_events ("timestamp");
CREATE INDEX "IDX_video_events_vehicle_ts" ON video_events (vehicle_id, "timestamp");
CREATE INDEX "IDX_video_events_route_ts" ON video_events (route_id, "timestamp");
CREATE INDEX "IDX_video_events_status" ON video_events (status);

CREATE TABLE video_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_event_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    ip_address VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "IDX_video_access_video" ON video_access_logs (video_event_id);
CREATE INDEX "IDX_video_access_user" ON video_access_logs (user_id);
CREATE INDEX "IDX_video_access_timestamp" ON video_access_logs ("timestamp");
CREATE INDEX "IDX_video_access_video_ts" ON video_access_logs (video_event_id, "timestamp");
CREATE INDEX "IDX_video_access_user_ts" ON video_access_logs (user_id, "timestamp");


-- --------------------------------------------------------------------------
-- 3. Create Reference Schema (Demo)
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
    "schoolId" UUID,
    direction TEXT,
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
    "amRouteId" VARCHAR(255),
    "pmRouteId" VARCHAR(255),
    "amStopId" VARCHAR(255),
    "pmStopId" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT NOW()
);


-- --------------------------------------------------------------------------
-- 4. Seed Data — Single-Bus Demo
--
-- Matches scripts/singlebus-config.json exactly:
--   1 school (Greenfield Elementary)
--   1 bus (BUS-01), 1 driver (driver1@sbtm.demo)
--   7 students, 4 parents
--   AM route + PM route (same bus, same 5 stops in reverse)
-- --------------------------------------------------------------------------

BEGIN;

-- ===================== Tenants =====================

INSERT INTO school_boards (id, name) VALUES
    ('b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Ottawa-Carleton District School Board');

INSERT INTO schools (id, name, "boardId", lat, lng) VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Greenfield Elementary', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 45.270534, -75.884905);

-- ===================== Users =====================

-- Super Admin (system bootstrap)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName") VALUES
    ('10000000-0000-0000-0000-000000000000', 'super.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'SUPER_ADMIN', 'Super', 'Admin');

-- Admins
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "schoolId", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000001', 'osta.admin@sbtm.demo',   crypt('Admin123!', gen_salt('bf')), 'OSTA_ADMIN',   'OSTA',   'Admin',  'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000002', 'school.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'SCHOOL_ADMIN', 'School', 'Admin',  'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- Board Admin
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000003', 'board.admin@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'BOARD_ADMIN', 'Board', 'Admin', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- Driver (matches singlebus-config.json: driverId=driver-001, email=driver1@sbtm.demo)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "assignedRouteIds", "schoolId", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000101', 'driver1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'DRIVER', 'James', 'Wilson', 'driver-001', 'a0000001-0000-0000-0000-000000000001,a0000001-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- Parents (matches singlebus-config.json parents array)
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "childRouteIds", "schoolId", "boardId") VALUES
    ('10000000-0000-0000-0000-000000000201', 'parent1@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Sarah',    'Smith',    'ROUTE-SingleBus-AM,ROUTE-SingleBus-PM', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000202', 'parent2@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'David',    'Johnson',  'ROUTE-SingleBus-AM,ROUTE-SingleBus-PM', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000204', 'parent4@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Linda',    'Brown',    'ROUTE-SingleBus-AM,ROUTE-SingleBus-PM', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('10000000-0000-0000-0000-000000000205', 'parent5@sbtm.demo', crypt('Admin123!', gen_salt('bf')), 'PARENT', 'Jennifer', 'Martinez', 'ROUTE-SingleBus-AM,ROUTE-SingleBus-PM', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c');

-- ===================== Vehicle (1 bus) =====================

INSERT INTO vehicles (id, "schoolId", "licensePlate", status) VALUES
    ('BUS-01', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ON-1001', 'ACTIVE');

INSERT INTO vehicles_reference (id, "plateNumber", capacity, status) VALUES
    ('BUS-01', 'ON-1001', 40, 'ACTIVE');

-- ===================== Routes (AM + PM, same bus) =====================

INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule, "schoolId", direction) VALUES
    ('ROUTE-SingleBus-AM', 'Single Bus AM', 'BUS-01', 'driver-001', '{"startTime":"07:15","days":["Mon","Tue","Wed","Thu","Fri"]}', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'AM'),
    ('ROUTE-SingleBus-PM', 'Single Bus PM', 'BUS-01', 'driver-001', '{"startTime":"15:00","days":["Mon","Tue","Wed","Thu","Fri"]}', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'PM');

-- Operational routes with UUID PKs — these are what assignedRouteIds references
INSERT INTO routes (id, "schoolId", name, direction, "vehicleId", "startTime") VALUES
    ('a0000001-0000-0000-0000-000000000001', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Single Bus AM', 'AM', 'BUS-01', '07:15'),
    ('a0000001-0000-0000-0000-000000000002', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Single Bus PM', 'PM', 'BUS-01', '15:00');

-- ===================== Students (7, matching singlebus-config.json) =====================
-- All students assigned to BOTH AM and PM routes

INSERT INTO students (id, first_name, last_name, grade, school_id, parent_user_id, am_route_id, pm_route_id, external_student_id) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Alice',   'Smith',  '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000201', NULL, NULL, '10000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000002', 'Bob',     'Johnson','1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000201', NULL, NULL, '10000000-0000-0000-0000-000000000002'),
    ('10000000-0000-0000-0000-000000000003', 'Charlie', 'Brown',  '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000202', NULL, NULL, '10000000-0000-0000-0000-000000000003'),
    ('10000000-0000-0000-0000-000000000004', 'Diana',   'Garcia', '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000204', NULL, NULL, '10000000-0000-0000-0000-000000000004'),
    ('10000000-0000-0000-0000-000000000005', 'Ethan',   'Wilson', '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000204', NULL, NULL, '10000000-0000-0000-0000-000000000005'),
    ('10000000-0000-0000-0000-000000000006', 'Fiona',   'Miller', '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000205', NULL, NULL, '10000000-0000-0000-0000-000000000006'),
    ('10000000-0000-0000-0000-000000000007', 'George',  'Davis',  '1', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000205', NULL, NULL, '10000000-0000-0000-0000-000000000007');

INSERT INTO students_reference (id, "firstName", "lastName", grade, "parentId", "schoolId", "assignedRouteId", "amRouteId", "pmRouteId") VALUES
    ('10000000-0000-0000-0000-000000000001', 'Alice',   'Smith',   1, '10000000-0000-0000-0000-000000000201', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-PM'),
    ('10000000-0000-0000-0000-000000000002', 'Bob',     'Johnson', 1, '10000000-0000-0000-0000-000000000201', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-PM'),
    ('10000000-0000-0000-0000-000000000003', 'Charlie', 'Brown',   1, '10000000-0000-0000-0000-000000000202', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-PM'),
    ('10000000-0000-0000-0000-000000000004', 'Diana',   'Garcia',  1, '10000000-0000-0000-0000-000000000204', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-PM'),
    ('10000000-0000-0000-0000-000000000005', 'Ethan',   'Wilson',  1, '10000000-0000-0000-0000-000000000204', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-PM'),
    ('10000000-0000-0000-0000-000000000006', 'Fiona',   'Miller',  1, '10000000-0000-0000-0000-000000000205', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-PM'),
    ('10000000-0000-0000-0000-000000000007', 'George',  'Davis',   1, '10000000-0000-0000-0000-000000000205', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-AM', 'ROUTE-SingleBus-PM');

-- ===================== Student Tags (sample for presence demo) =====================

INSERT INTO student_tag ("schoolId", "studentId", "tagId", "tagType") VALUES
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000001', 'TAG-001', 'SMARTTAG'),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000002', 'TAG-002', 'SMARTTAG'),
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', '10000000-0000-0000-0000-000000000003', 'TAG-003', 'SMARTTAG');

-- ===================== Initial Location Points (so live-location API returns 200) =====================
-- Seed one recent location point per route so /routes/:routeId/live-location works before simulation runs.

INSERT INTO location_points (id, school_id, vehicle_id, route_id, timestamp, lat, lng, speed_kph, heading_deg) VALUES
    ('seed-loc-am', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-01', 'ROUTE-SingleBus-AM', NOW(), 45.3876, -75.6960, 0, 0),
    ('seed-loc-pm', 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'BUS-01', 'ROUTE-SingleBus-PM', NOW(), 45.3876, -75.6960, 0, 0);

COMMIT;
