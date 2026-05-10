# Fix Summary: Route Stops Display and Alert Timer Issues

## Issues Fixed

### Issue 1: Routes Losing Stops After Update

**Problem**: After route updates, stops were not being displayed on Dashboard UI (Admin portal), Map UI (Parent App), and Parent Portal. Only the highlighted route line was visible without stop markers.

**Root Cause**: The `RouteStop` entity only had a `location` field (PostGIS geography type), but the frontend code had a fallback to access `stop.lat` and `stop.lng` fields. When TypeORM returned stops from the database, these fields were not included because they weren't mapped in the entity, even though they existed in the database schema.

**Solution**:
1. Added `lat` and `lng` fields to the `RouteStop` entity (marked as optional)
2. Updated route creation logic to extract lat/lng from WKT location string and populate both fields
3. Updated route update logic to do the same
4. Created migration script to populate lat/lng for existing route stops

**Files Changed**:
- `/services/api-gateway/src/modules/auth/entities/route-stop.entity.ts`
  - Added optional `lat` and `lng` columns
- `/services/api-gateway/src/modules/route/route.service.ts`
  - Added `parseWktToLatLng` helper function
  - Updated `create` method to populate lat/lng
  - Updated `update` method to populate lat/lng
- `/scripts/migrations/001-populate-route-stop-lat-lng.sql` (NEW)
  - Migration to populate existing records

**How It Works**:
- When a route is created/updated, the WKT location string (e.g., "POINT(-75.89104 45.29063)") is parsed
- Lat and lng values are extracted and stored in separate columns
- Frontend receives stops with lat, lng, and location fields
- Frontend can now reliably access `stop.lat` and `stop.lng` without WKT parsing issues

### Issue 2: Alert Auto-Escalation Timer Direction

**Problem**: Alert detail panel timer was counting UP from 0:00 (elapsed time) with progress bar filling from empty to full. User requested it count DOWN from configured time to 0:00 with progress bar moving from full to empty, matching DemoV0.0.2 behavior.

**Root Cause**: Timer logic was calculating and displaying `secondsElapsed` instead of `secondsRemaining`. Progress bar percentage was based on elapsed time (0% → 100%) instead of remaining time (100% → 0%).

**Solution**:
1. Calculate `secondsRemaining = confirmationWindowSec - secondsElapsed`
2. Display remaining time countdown (e.g., 5:00 → 4:59 → ... → 0:00)
3. Progress bar percentage based on remaining time (starts at 100%, decreases to 0%)
4. Updated color thresholds to work with remaining time
5. Changed label from "Elapsed since alert" to "Time remaining"

**Files Changed**:
- `/apps/admin-dashboard/src/components/alerts/AlertDetail.tsx`
  - Lines 104-106: Updated comment
  - Lines 236-258: New timer logic with countdown
  - Line 308: Updated label to "Time remaining"

**How It Works**:
- Timer still tracks `secondsElapsed` (time since alert created)
- Displays `secondsRemaining = max(0, configWindow - elapsed)`
- Progress bar width = `(remaining / configWindow) × 100%`
- Color changes: green → amber (< 25% remaining) → red (overdue)
- When overdue, shows "Auto-escalation overdue" message

## Testing Instructions

### Test Issue 1: Route Stops Display

#### Prerequisites
```bash
# Run migration to populate lat/lng for existing stops
psql -d sbtm -f scripts/migrations/001-populate-route-stop-lat-lng.sql

# Start the services
docker compose up -d
```

#### Test Scenarios

**Scenario 1: Admin Dashboard - View Existing Route**
1. Navigate to `http://localhost:3001/dashboard`
2. Login as admin
3. Click on any route in the routes table
4. **Expected**: Route polyline AND stop markers should be visible on the map
5. **Expected**: Each stop marker shows sequence number and renders at correct location
6. **Expected**: School marker (purple square) is visible

**Scenario 2: Admin Dashboard - Update Route**
1. Navigate to `http://localhost:3001/routes/planner`
2. Select an existing route
3. Click "Edit" button
4. Modify a stop location by dragging it
5. Click "Save Route"
6. Go back to Dashboard and select the updated route
7. **Expected**: Route polyline and ALL stops (including modified stop) are visible

**Scenario 3: Parent Portal - View Route**
1. Navigate to parent portal (web)
2. Login as parent
3. View the map screen
4. **Expected**: Route line AND stop markers are displayed
5. **Expected**: Child's assigned stop is highlighted differently
6. **Expected**: School marker is visible

**Scenario 4: Parent App - View Route**
1. Open parent mobile app
2. Login as parent
3. View map screen
4. **Expected**: Route line AND stop markers are displayed
5. **Expected**: All stops render with correct sequence numbers

### Test Issue 2: Alert Timer

#### Test Scenarios

**Scenario 1: New Alert Timer Countdown**
1. Navigate to `http://localhost:3001/dashboard`
2. Create or trigger a new alert (PENDING_CONFIRMATION status)
3. Click on the alert to open detail panel
4. **Expected**: Timer shows remaining time (e.g., 5:00 for 5-minute window)
5. **Expected**: Progress bar is FULL (100%) when alert is created
6. **Expected**: Timer counts DOWN: 5:00 → 4:59 → 4:58 → ...
7. **Expected**: Progress bar EMPTIES from 100% → 0%
8. **Expected**: Label shows "Time remaining" (not "Elapsed since alert")

**Scenario 2: Timer Color Changes**
1. Watch the timer countdown
2. **Expected**: Green color when > 25% time remaining
3. **Expected**: Amber color when < 25% time remaining
4. **Expected**: Red color when time expired (overdue)

**Scenario 3: Reopening Alert Panel**
1. Open alert detail panel
2. Note the remaining time (e.g., 3:45)
3. Close the panel
4. Wait 30 seconds
5. Reopen the same alert
6. **Expected**: Timer shows updated remaining time (e.g., 3:15)
7. **Expected**: Progress bar reflects correct percentage

## Database Migration

For existing installations, run the migration script:

```bash
# If using Docker
docker exec -i sbtm-postgres psql -U postgres -d sbtm < scripts/migrations/001-populate-route-stop-lat-lng.sql

# If using local Postgres
psql -U postgres -d sbtm -f scripts/migrations/001-populate-route-stop-lat-lng.sql
```

This will populate lat/lng fields for all existing route stops from their location (geography) field.

## Technical Details

### RouteStop Entity Changes

**Before**:
```typescript
@Entity('route_stops')
export class RouteStop {
    // ... other fields
    @Column({ type: 'geography' })
    location: string; // WKT POINT(lng lat)
}
```

**After**:
```typescript
@Entity('route_stops')
export class RouteStop {
    // ... other fields
    @Column({ type: 'geography' })
    location: string; // WKT POINT(lng lat)

    @Column({ type: 'double precision', nullable: true })
    lat?: number;

    @Column({ type: 'double precision', nullable: true })
    lng?: number;
}
```

### WKT Parsing Helper

```typescript
function parseWktToLatLng(wkt: string): { lat: number; lng: number } | null {
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}
```

### Alert Timer Logic

**Before** (counting up):
```typescript
const timerMinutes = Math.floor(secondsElapsed / 60);
const timerPct = (secondsElapsed / confirmationWindowSec) * 100;
```

**After** (counting down):
```typescript
const secondsRemaining = Math.max(0, confirmationWindowSec - secondsElapsed);
const timerMinutes = Math.floor(secondsRemaining / 60);
const timerPct = (secondsRemaining / confirmationWindowSec) * 100;
```

## Verification Checklist

- [ ] Admin Dashboard shows route stops after viewing existing route
- [ ] Admin Dashboard shows route stops after updating route
- [ ] Parent Portal (web) displays route stops on map
- [ ] Parent App (mobile) displays route stops on map
- [ ] Driver App displays routes correctly (confirmed working)
- [ ] Route Planner displays routes correctly (confirmed working)
- [ ] Alert timer counts down from configured time to zero
- [ ] Alert progress bar empties from full to empty
- [ ] Alert timer color changes appropriately
- [ ] Existing seeded routes display stops correctly after migration

## Rollback Plan

If issues arise:

1. **Revert backend entity changes**:
   ```bash
   git revert 976206a
   ```

2. **Revert alert timer changes**:
   ```bash
   git revert 9f0c058
   ```

3. **Revert migration** (if needed):
   ```sql
   UPDATE route_stops SET lat = NULL, lng = NULL;
   ```

## Notes

- The lat/lng fields are redundant with the location geography field but improve frontend compatibility
- The location field remains the source of truth for geospatial queries
- Frontend code has fallback logic to use either lat/lng or parse location WKT
- Migration is backward compatible - routes without lat/lng will fall back to WKT parsing
