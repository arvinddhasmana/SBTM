ALTER TABLE "location_points"
ADD COLUMN IF NOT EXISTS "school_id" TEXT;

CREATE INDEX IF NOT EXISTS "location_points_school_id_route_id_idx"
ON "location_points" ("school_id", "route_id");
