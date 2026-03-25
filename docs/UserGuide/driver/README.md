# Driver Guide

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Driver mobile workflow for route execution, GPS, and incident handling

## What You Can Do Today

- Sign in to the driver app.
- View assigned schedule or route context.
- Start route execution and send GPS updates.
- trigger an emergency or panic workflow
- interact with the roster screen for boarding and alighting tracking
- rely on offline buffering when connectivity drops

## Typical Driver Workflow

1. Sign in.
2. Open the assigned route or schedule view.
3. Start the route and allow GPS transmission.
4. Use the roster during stops.
5. Trigger an emergency alert if needed.
6. Continue route execution and end the route.

## Important Current-State Caveats

- Roster actions are not yet fully authoritative backend presence capture in the main mobile UI.
- BLE-based automatic detection is not yet completed in the app.
- Offline buffering exists, but the UI does not yet clearly show whether every event has synced.
- Some route execution context remains simplified for demo workflows.

## Safety Guidance

- Use the panic or emergency action for real operational incidents.
- Do not rely on BLE automation for attendance until that workflow is fully delivered.
- If connectivity is poor, continue using the app, but report sync issues through support after the route if needed.