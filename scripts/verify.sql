SELECT COUNT(*) as location_count FROM location_points;
SELECT route_id, COUNT(*) as points FROM location_points GROUP BY route_id ORDER BY route_id;
