-- Migration: Fix orphaned student-stop associations
--
-- Problem: When routes are updated, route_stops are deleted and recreated with new IDs.
-- Students' am_stop_id and pm_stop_id may point to deleted stops, causing:
-- 1. Driver app roster showing students without stops
-- 2. Parent portal map not highlighting the correct stop
--
-- Solution: For each student with an orphaned stop reference:
-- 1. Try to find a stop on their current route (prefer first stop as fallback)
-- 2. Update the student record with the new stop ID
-- 3. Set to NULL if the route has no stops

BEGIN;

-- Fix orphaned AM stop associations
WITH orphaned_am AS (
    SELECT
        s.id as student_id,
        s.am_route_id,
        s.am_stop_id as old_stop_id,
        (
            -- Try to find the first stop on the student's AM route
            SELECT rs.id
            FROM route_stops rs
            WHERE rs."routeId" = s.am_route_id
            ORDER BY rs.sequence ASC
            LIMIT 1
        ) as new_stop_id
    FROM students s
    WHERE
        s.am_route_id IS NOT NULL
        AND s.am_stop_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM route_stops rs
            WHERE rs.id = s.am_stop_id
        )
)
UPDATE students s
SET am_stop_id = o.new_stop_id
FROM orphaned_am o
WHERE s.id = o.student_id;

-- Fix orphaned PM stop associations
WITH orphaned_pm AS (
    SELECT
        s.id as student_id,
        s.pm_route_id,
        s.pm_stop_id as old_stop_id,
        (
            -- Try to find the first stop on the student's PM route
            SELECT rs.id
            FROM route_stops rs
            WHERE rs."routeId" = s.pm_route_id
            ORDER BY rs.sequence ASC
            LIMIT 1
        ) as new_stop_id
    FROM students s
    WHERE
        s.pm_route_id IS NOT NULL
        AND s.pm_stop_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM route_stops rs
            WHERE rs.id = s.pm_stop_id
        )
)
UPDATE students s
SET pm_stop_id = o.new_stop_id
FROM orphaned_pm o
WHERE s.id = o.student_id;

-- Log summary of fixes
DO $$
DECLARE
    orphaned_am_count INTEGER;
    orphaned_pm_count INTEGER;
BEGIN
    -- Count remaining orphaned AM stops (should be 0)
    SELECT COUNT(*) INTO orphaned_am_count
    FROM students s
    WHERE
        s.am_route_id IS NOT NULL
        AND s.am_stop_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM route_stops rs
            WHERE rs.id = s.am_stop_id
        );

    -- Count remaining orphaned PM stops (should be 0)
    SELECT COUNT(*) INTO orphaned_pm_count
    FROM students s
    WHERE
        s.pm_route_id IS NOT NULL
        AND s.pm_stop_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM route_stops rs
            WHERE rs.id = s.pm_stop_id
        );

    RAISE NOTICE 'Migration complete. Remaining orphaned AM stops: %, PM stops: %',
        orphaned_am_count, orphaned_pm_count;
END $$;

COMMIT;
