# Route Update Student-Stop Association Fix

## Problem Statement

When routes are updated in the SBTM system, two critical issues occurred:

1. **Driver App Issue**: For updated routes, the Roster UI does not show students with correct stops. Students appear unassigned or grouped under "Other Students" instead of their proper bus stops.

2. **Parent Portal Issue**: For updated routes, in the Map view, one or more bus stops are not highlighted and marked with the selected student name.

## Root Cause

The issue stems from how route updates handle the `route_stops` table and student-stop associations:

### Before the Fix

When a route is updated in `/services/api-gateway/src/modules/route/route.service.ts`:

1. The `update()` method would **DELETE all existing `route_stops`** for the route
2. Then **INSERT new `route_stops`** (potentially with new UUIDs)
3. However, **students in the `students` table still referenced the old, deleted stop IDs** via their `am_stop_id` and `pm_stop_id` columns
4. This created "orphaned" references where students pointed to non-existent stops

### Impact on Frontend

**Driver App (`/apps/driver-app/src/screens/RosterScreen.tsx`):**
- The `buildSections()` function groups students by their `stopId`
- Students with orphaned `stopId` references would fail to match any existing stop
- These students end up in the "Other Students" section instead of their proper stops

**Parent Portal (`/apps/parent-dashboard/web/src/pages/Map.tsx`):**
- Uses `child.amStopId` or `child.pmStopId` to highlight the student's stop on the map
- When this ID points to a deleted stop, the map cannot highlight anything
- Parents cannot see which stop their child is assigned to

**Backend API (`/services/api-gateway/src/modules/gateway/services/driver.gateway.service.ts`):**
- The `getRouteStudents()` method retrieves students and their stop associations (lines 241-254)
- It looks up each student's `stopId` in a `stopMap` built from current route stops
- Orphaned stop IDs fail this lookup, resulting in `undefined` stop information

## Solution

The fix implements a two-part strategy:

### 1. Migration Script for Existing Data

**File:** `/scripts/migrations/002-fix-orphaned-student-stops.sql`

This SQL migration:
- Identifies students with orphaned `am_stop_id` or `pm_stop_id` (pointing to non-existent stops)
- For each orphaned association, attempts to reassign the student to the first stop on their current route
- Sets stop assignments to `NULL` if the route has no stops
- Logs a summary of fixes applied

**To run:**
```bash
psql -U <username> -d <database> -f /scripts/migrations/002-fix-orphaned-student-stops.sql
```

### 2. Code Changes to Prevent Future Orphaning

**File:** `/services/api-gateway/src/modules/route/route.service.ts`

The `update()` method now implements intelligent stop management:

#### Before Deleting Stops:
1. **Collect existing stop IDs** from the database
2. **Identify which stops will be deleted** (exist in DB but not in the new stops list)
3. **Collect IDs of stops being preserved** (stops with valid UUIDs that will be re-inserted)

#### Reassign Affected Students:
4. For each stop being deleted:
   - Find all students assigned to that stop (both AM and PM)
   - Reassign them to the first stop in the updated route
   - If no valid first stop exists, set their stop assignment to `NULL`

#### Then Proceed with Normal Update:
5. Delete old stops
6. Insert new/updated stops (preserving IDs where possible)

### Key Code Changes

**Lines 179-252 in route.service.ts:**

```typescript
// Before deleting stops, collect IDs of stops that will be removed
const existingStops = await queryRunner.query(
  `SELECT id FROM route_stops WHERE "routeId" = $1`,
  [id],
);
const existingStopIds = new Set(existingStops.map((s: any) => s.id));
const newStopIds = new Set(
  stops
    .filter(s => s.id && !s.id.startsWith('draft-') && isValidUuid(s.id))
    .map(s => s.id),
);

// Identify stops that will be deleted
const deletedStopIds = [...existingStopIds].filter(id => !newStopIds.has(id));

// Reassign affected students to the first stop
if (deletedStopIds.length > 0 && stops.length > 0) {
  const firstStopId = /* get first valid stop ID */;

  if (firstStopId) {
    for (const deletedStopId of deletedStopIds) {
      // Update AM stop assignments
      await queryRunner.query(
        `UPDATE students SET am_stop_id = $1
         WHERE am_route_id = $2 AND am_stop_id = $3`,
        [firstStopId, id, deletedStopId],
      );

      // Update PM stop assignments
      await queryRunner.query(
        `UPDATE students SET pm_stop_id = $1
         WHERE pm_route_id = $2 AND pm_stop_id = $3`,
        [firstStopId, id, deletedStopId],
      );
    }
  }
}
```

## Behavior After Fix

### Stop ID Preservation
- When a route is updated, stops that exist in both the old and new versions preserve their UUIDs
- The frontend sends stop IDs in the update payload, and these IDs are used in the INSERT statements
- This means students assigned to unchanged stops maintain their associations

### Automatic Reassignment
- When a stop is removed from a route, students assigned to that stop are automatically moved to the first stop
- This ensures students are never left with orphaned stop references
- The first stop is chosen as a sensible default; administrators can manually adjust if needed

### Frontend Behavior
- **Driver App**: The Roster UI now correctly displays students grouped by their assigned stops
- **Parent Portal**: The Map view properly highlights the stop associated with the selected student
- Both apps receive correct `stopId`, `stopName`, and `stopSequence` data from the backend API

## Testing Recommendations

1. **Test Route Update with Stop Removal:**
   - Create a route with 3 stops
   - Assign students to different stops
   - Update the route to remove the middle stop
   - Verify students from the removed stop are reassigned to the first stop
   - Check both Driver App roster and Parent Portal map

2. **Test Route Update with Stop Reordering:**
   - Create a route with stops A, B, C
   - Assign students to each stop
   - Update the route to reorder stops as C, A, B
   - Verify students remain with their originally assigned stops (IDs preserved)

3. **Test Complete Route Replacement:**
   - Create a route with stops X, Y, Z
   - Assign students to these stops
   - Update the route with entirely new stops (all new addresses)
   - Verify students are reassigned to the first new stop

4. **Run Migration Script:**
   - Identify routes that were recently updated (check route `updatedAt` timestamp)
   - Note students showing as "Other Students" in the Driver App
   - Run the migration script
   - Verify these students now appear under proper stops

## Files Modified

1. `/scripts/migrations/002-fix-orphaned-student-stops.sql` - NEW
2. `/services/api-gateway/src/modules/route/route.service.ts` - MODIFIED (lines 172-309)
3. `/docs/route-update-student-stop-fix.md` - NEW (this file)

## Related Issues

- Driver App: Roster UI does not show students with correct stops for updated routes
- Parent Portal: Map view does not highlight stops for students on updated routes

## Future Improvements

Consider these enhancements:

1. **Smart Reassignment**: Instead of always using the first stop, could use geographic proximity or address matching to find the most appropriate replacement stop
2. **Admin Notification**: Alert administrators when students are automatically reassigned so they can review and adjust if needed
3. **Student Stop History**: Track historical stop assignments for auditing purposes
4. **Batch Update Optimization**: If many students are affected, batch the UPDATE queries for better performance
