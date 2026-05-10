-- Migration: Populate lat/lng fields from existing location (geography) field
-- This ensures existing route stops have lat/lng values for frontend rendering

-- Update all route_stops where lat/lng are NULL but location exists
UPDATE route_stops
SET
  lat = ST_Y(location::geometry),
  lng = ST_X(location::geometry)
WHERE
  location IS NOT NULL
  AND (lat IS NULL OR lng IS NULL);

-- Verify the update
SELECT
  COUNT(*) as total_stops,
  COUNT(lat) as stops_with_lat,
  COUNT(lng) as stops_with_lng,
  COUNT(location) as stops_with_location
FROM route_stops;
