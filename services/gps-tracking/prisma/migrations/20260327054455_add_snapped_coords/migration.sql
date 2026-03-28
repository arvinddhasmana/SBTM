/*
  Warnings:

  - Made the column `school_id` on table `location_points` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "location_points" ADD COLUMN     "snapped_lat" DOUBLE PRECISION,
ADD COLUMN     "snapped_lng" DOUBLE PRECISION,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "route_deviation_events" ALTER COLUMN "detected_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "route_geofences" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);
