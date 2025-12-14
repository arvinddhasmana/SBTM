-- CreateTable
CREATE TABLE "location_points" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed_kph" DOUBLE PRECISION,
    "heading_deg" DOUBLE PRECISION,
    "accuracy_meters" DOUBLE PRECISION,

    CONSTRAINT "location_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_points_timestamp_idx" ON "location_points"("timestamp");
