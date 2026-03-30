# Update Simulation Script for 2 Laps (Morning/Evening)

Update [scripts/simulate-demo.sh](file:///home/arvind/workspace/SBTM_AntiGravity/scripts/simulate-demo.sh) to run 2 laps by default (Morning AM and Evening PM), with data reset between laps and proper student boarding/alighting status.

## Proposed Changes

### Demo Data
#### [MODIFY] [demo-gps-track.json](file:///home/arvind/workspace/SBTM_AntiGravity/scripts/demo-gps-track.json)
- Update `ROUTE-R01` (and possibly others) to have 10 or more stops and students to satisfy the demo requirement.
- Ensure waypoints have `student` assignments and `label` containing "Stop".

### Scripts
#### [MODIFY] [simulate-demo.sh](file:///home/arvind/workspace/SBTM_AntiGravity/scripts/simulate-demo.sh)
- **Defaults**: Change `LAPS` to 2.
- **Lap 1 (Morning AM)**:
    - Filter for routes with `direction === 'AM'` and 10+ stops/students.
    - Logic: Students `BOARD` at stops, `ALIGHT` at school.
    - Reset feed data before starting.
- **Lap 2 (Evening PM)**:
    - Filter for routes with `direction === 'PM'` or fallback to reversing AM routes.
    - Logic: Students `BOARD` at school, `ALIGHT` at stops.
    - Reset feed data before starting.
- **Helper Functions**:
    - `reset_demo_data()`: Truncates `presence_event`, `location_points`, `emergency_alert`, `route_lifecycle_events`, and `alert_notification_log`.
    - `get_route_direction()`: Determines AM/PM status.

## Verification Plan

### Automated Tests
- Run `./scripts/simulate-demo.sh --interval 1 --laps 2` and verify in the database that:
    - `presence_event` table is cleared before each lap.
    - Lap 1 has `BOARD` events at stops and `ALIGHT` at school.
    - Lap 2 has `BOARD` events at school and `ALIGHT` at stops.
- Run `node -e "..."` (similar to research phase) to verify [demo-gps-track.json](file:///home/arvind/workspace/SBTM_AntiGravity/scripts/demo-gps-track.json) has routes with 10+ stops/students.

### Manual Verification
- Observe the Admin Dashboard during simulation to ensure students change status correctly.
- Verify that "Morning" routes are shown in Lap 1 and "Evening" routes in Lap 2.
