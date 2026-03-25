-- CreateTable: route_lifecycle_events
-- Records route execution lifecycle events (start, stop progression, completion)
-- from the driver app for operational visibility and downstream notification triggers.

CREATE TABLE "route_lifecycle_events" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "stop_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_lifecycle_events_route_id_idx" ON "route_lifecycle_events"("route_id");

-- CreateIndex
CREATE INDEX "route_lifecycle_events_school_id_route_id_idx" ON "route_lifecycle_events"("school_id", "route_id");
