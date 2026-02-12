-- =============================================================================
-- Bootstrap minimal api-gateway schema (idempotent)
--
-- Why: On a fresh Postgres volume, some environments start the api-gateway before
-- TypeORM has created tables (or never creates them). The demo seed scripts and
-- JWT validation assume core tables exist (users/schools/etc).
--
-- This script creates only the minimum tables/constraints needed by the demo.
-- Types are kept simple (TEXT for enums) to maximize compatibility.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS school_boards (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  "boardId" UUID NOT NULL,
  CONSTRAINT "FK_schools_board" FOREIGN KEY ("boardId") REFERENCES school_boards(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY,
  "schoolId" UUID NOT NULL,
  "licensePlate" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "FK_vehicles_school" FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT "UQ_vehicle_school_plate" UNIQUE ("schoolId", "licensePlate")
);

CREATE TABLE IF NOT EXISTS routes (
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

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY,
  "routeId" UUID NOT NULL,
  "sequenceOrder" INT NOT NULL,
  "stopName" TEXT NOT NULL,
  lat DOUBLE PRECISION NULL,
  lng DOUBLE PRECISION NULL,
  "arrivalTime" TIME NULL,
  CONSTRAINT "FK_route_stops_route" FOREIGN KEY ("routeId") REFERENCES routes(id) ON DELETE CASCADE
);

COMMIT;
