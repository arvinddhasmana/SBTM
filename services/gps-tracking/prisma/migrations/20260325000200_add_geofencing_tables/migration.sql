-- Phase 3: Add route_geofences and route_deviation_events tables.
-- route_geofences stores per-route configurable thresholds for corridor, stop proximity,
-- and deviation detection.  All spatial logic runs in the application layer using
-- raw PostGIS queries so this table stores only numeric thresholds.
-- route_deviation_events is the immutable audit log written by the geofence service
-- whenever a vehicle is detected outside its configured corridor.

-- CreateTable: route_geofences
CREATE TABLE "route_geofences" (
    "id"                        TEXT NOT NULL,
    "school_id"                 TEXT NOT NULL,
    "route_id"                  TEXT NOT NULL,
    "corridor_radius_meters"    DOUBLE PRECISION NOT NULL DEFAULT 200,
    "stop_proximity_meters"     DOUBLE PRECISION NOT NULL DEFAULT 50,
    "deviation_threshold_meters" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "route_geofences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique per route (one geofence config per route)
CREATE UNIQUE INDEX "route_geofences_route_id_key" ON "route_geofences"("route_id");

-- CreateIndex
CREATE INDEX "route_geofences_school_id_idx" ON "route_geofences"("school_id");

-- CreateTable: route_deviation_events
CREATE TABLE "route_deviation_events" (
    "id"                TEXT NOT NULL,
    "school_id"         TEXT NOT NULL,
    "route_id"          TEXT NOT NULL,
    "vehicle_id"        TEXT NOT NULL,
    "lat"               DOUBLE PRECISION NOT NULL,
    "lng"               DOUBLE PRECISION NOT NULL,
    "deviation_meters"  DOUBLE PRECISION NOT NULL,
    "threshold"         DOUBLE PRECISION NOT NULL,
    "detected_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "route_deviation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_deviation_events_school_id_route_id_idx" ON "route_deviation_events"("school_id", "route_id");

-- CreateIndex
CREATE INDEX "route_deviation_events_detected_at_idx" ON "route_deviation_events"("detected_at");
