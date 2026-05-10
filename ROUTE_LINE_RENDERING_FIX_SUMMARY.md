# Route Line Rendering Fix - Implementation Summary

## Problem Statement

**Issue 1**: In all portals (Admin Portal, Parent App, Parent Portal, Driver App), highlighted route lines should **always strictly be rendered between all stops and school only**.

**Issue 2**: AM routes were losing their last leg of route lines between School and last stop. Route updates should also follow the rule to render complete route lines.

## Root Cause Analysis

The issue had two components:

1. **Route Generation**: When creating or updating routes, the school location was being included in the OSRM waypoints for optimization, but there was inconsistency across all the snap-to-road and path adjustment functions.

2. **Route Rendering**: Map components were rendering the stored polyline data directly without verifying that it included the school segment. Legacy routes or routes created without proper school inclusion would display incomplete route lines.

## Solution Implemented

### Part 1: Route Generation Fixes (Admin Dashboard)

**File**: `/apps/admin-dashboard/src/hooks/useRoutePlanner.ts`

Added explicit school inclusion to ALL route generation functions:

1. **`snapRouteToRoad` (lines 160-202)**: Added critical fix to ensure school is always included in waypoints
   - AM routes: `waypoints.push(schoolLocation)` - school at END
   - PM routes: `waypoints.unshift(schoolLocation)` - school at START

2. **`adjustPath` (lines 370-416)**: Added school inclusion when dragging midpoint handles
   - Ensures path adjustments maintain complete route to/from school

3. **`snapToRoad` (lines 419-451)**: Added school inclusion for manual snap-to-road
   - Ensures explicit snap operations include school segment

These changes ensure that OSRM receives complete waypoint lists including the school, so the returned polyline includes ALL segments of the route.

### Part 2: Rendering Fallback Logic (All Portals)

Added defensive rendering logic to all map components to handle legacy routes or edge cases where the polyline might not include the school segment.

#### Admin Portal - LiveMap Component
**File**: `/apps/admin-dashboard/src/components/map/LiveMap.tsx` (lines 122-160)

```typescript
// CRITICAL FIX: Ensure route path includes connection to school
// This handles both new routes (with school in polyline) and legacy routes (without)
if (pathData && pathData.length > 0 && selectedRoute?.schoolLat && selectedRoute?.schoolLng) {
  const schoolPos: [number, number] = [selectedRoute.schoolLat, selectedRoute.schoolLng];
  const lastPoint = pathData[pathData.length - 1] as [number, number];
  const firstPoint = pathData[0] as [number, number];

  // Check if path already connects to school (within 50 meters)
  const distanceToSchoolFromEnd = Math.sqrt(
    Math.pow((lastPoint[0] - schoolPos[0]) * 111000, 2) +
    Math.pow((lastPoint[1] - schoolPos[1]) * 111000, 2)
  );
  const distanceToSchoolFromStart = Math.sqrt(
    Math.pow((firstPoint[0] - schoolPos[0]) * 111000, 2) +
    Math.pow((firstPoint[1] - schoolPos[1]) * 111000, 2)
  );

  // For AM routes: if path doesn't end at school, add the connection
  if (selectedRoute.direction === 'AM' && distanceToSchoolFromEnd > 50) {
    pathData = [...pathData, schoolPos];
  }
  // For PM routes: if path doesn't start at school, add the connection
  else if (selectedRoute.direction === 'PM' && distanceToSchoolFromStart > 50) {
    pathData = [schoolPos, ...pathData];
  }
}
```

#### Parent Portal (Web) - Map Component
**File**: `/apps/parent-dashboard/web/src/pages/Map.tsx` (lines 272-307)

Similar logic applied in the `routePath` useMemo to decode polyline and add school connection if missing.

#### Parent App (Mobile) - MapScreen
**File**: `/apps/parent-app-mobile/src/screens/MapScreen.tsx` (lines 155-197)

Similar logic applied with React Native coordinate format `{ latitude, longitude }`.

#### Driver App - ActiveRouteScreen
**File**: `/apps/driver-app/src/screens/ActiveRouteScreen.tsx` (lines 122-158)

Similar logic applied to ensure driver sees complete route line including school segment.

## Testing Strategy

### Automated E2E Tests Created

**File**: `/apps/admin-dashboard/e2e/route-line-rendering.spec.ts`

Comprehensive test suite covering:

1. **RLR01**: AM route displays complete line from stops to school
2. **RLR02**: PM route displays complete line from school to stops
3. **RLR03**: Newly created AM route includes school in polyline
4. **RLR04**: Dashboard live map shows complete route lines
5. **RLR05**: Verify route path connects all stops and school
6. **RLR06**: Route update preserves school connection

### Manual Testing Instructions

#### Prerequisites
```bash
# Start the development environment
docker compose up -d

# Start admin dashboard in mock mode
cd apps/admin-dashboard
pnpm dev:mock
```

#### Test Scenarios

**Scenario 1: Verify AM Route Rendering**
1. Navigate to `http://localhost:5173/routes/planner?mock=true`
2. Log in with `admin@osta.ca` / `password`
3. Click on "Single Bus AM" route
4. **Expected**: Route line (blue) should go from first stop → last stop → school (purple marker)
5. **Verify**: No missing segment between last stop and school

**Scenario 2: Verify PM Route Rendering**
1. Same navigation as above
2. Click on any "PM" route
3. **Expected**: Route line (amber) should go from school → first stop → last stop
4. **Verify**: No missing segment between school and first stop

**Scenario 3: Create New AM Route**
1. Click "New Route" button
2. Enter route name: "Test Route AM"
3. Select a school
4. Keep direction as "AM"
5. Set number of stops: 4
6. Click "Auto Generate"
7. **Expected**: Route line should connect all 4 stops and end at school
8. **Verify**: Complete path rendered with no gaps

**Scenario 4: Dashboard Live Map**
1. Navigate to `http://localhost:5173/dashboard?mock=true`
2. Click on any route in the table
3. **Expected**: Map shows complete route line including school
4. **Verify**: School marker (purple) is visible and connected

**Scenario 5: Parent Portal**
1. Navigate to parent dashboard (if available in mock mode)
2. View map screen
3. **Expected**: Route line includes connection to school based on AM/PM direction

**Scenario 6: Route Update**
1. Select an existing route
2. Click "Edit"
3. Change route name or adjust a stop position
4. Click "Save"
5. **Expected**: Route line still includes complete path to/from school

### Run Automated Tests

```bash
# Install dependencies (if not already done)
cd apps/admin-dashboard
pnpm install

# Start the dev server in one terminal
pnpm dev:mock

# In another terminal, run E2E tests
pnpm test:e2e

# Or run with UI
pnpm test:e2e:ui

# Or run with browser visible
pnpm test:e2e:headed
```

## Key Files Changed

1. `/apps/admin-dashboard/src/hooks/useRoutePlanner.ts` - Route generation logic
2. `/apps/admin-dashboard/src/components/map/LiveMap.tsx` - Admin portal map rendering
3. `/apps/parent-dashboard/web/src/pages/Map.tsx` - Parent portal map rendering
4. `/apps/parent-app-mobile/src/screens/MapScreen.tsx` - Parent mobile app rendering
5. `/apps/driver-app/src/screens/ActiveRouteScreen.tsx` - Driver app rendering
6. `/apps/admin-dashboard/e2e/route-line-rendering.spec.ts` - E2E test suite (NEW)

## Verification Checklist

- [x] Route planner includes school in all waypoint generation functions
- [x] Admin portal LiveMap renders complete route lines
- [x] Parent portal Map renders complete route lines
- [x] Parent mobile app MapScreen renders complete route lines
- [x] Driver app ActiveRouteScreen renders complete route lines
- [x] E2E test suite created and committed
- [ ] E2E tests pass (requires running dev server)
- [ ] Manual browser testing completed
- [ ] AM routes verified to include last leg to school
- [ ] PM routes verified to include first leg from school

## Technical Notes

### Distance Threshold
The fallback logic uses a **50-meter threshold** to determine if the polyline already connects to the school. This accounts for:
- GPS coordinate precision limits
- Rounding in polyline encoding/decoding
- Minor variations in school location data

### Coordinate Conversion
- Approximate conversion: 1 degree latitude ≈ 111,000 meters
- Used for quick distance calculation: `Math.sqrt((Δlat * 111000)² + (Δlng * 111000)²)`
- Sufficient accuracy for 50m threshold check

### Polyline Format
- Backend stores polylines in Google Encoded Polyline format
- Frontend decodes to `[lat, lng]` arrays
- React Native Maps uses `{ latitude, longitude }` objects

## Next Steps

1. **Run E2E Tests**: Execute the automated test suite to verify all fixes
2. **Manual Browser Testing**: Follow the manual testing instructions above
3. **Mobile App Testing**: Test on actual devices or simulators
4. **Production Deployment**: Once verified, deploy to production

## Rollback Plan

If issues arise:
1. Revert commit: `git revert 703aef3 677174b 784fc49`
2. Routes created with the fix will continue to work
3. Legacy routes will display as before (with potential missing segments)
