# Driver Guide

- Document owner: Product and Operations
- Last reviewed: 2026-04-02
- Primary use: Driver mobile workflow for route execution, GPS, and incident handling

---

## Your Role in SBTM

As a **Driver**, you are the primary field operator. You use the Driver App to execute assigned routes, transmit live GPS position to the platform, record student boarding and alighting, and trigger emergency alerts when needed.

---

## Your Quick-Start Checklist

When you start your shift:

- [ ] Sign in to the Driver App
- [ ] Complete pre-trip vehicle inspection checklist (v4: required before route start)
- [ ] Verify your assigned route appears on the schedule screen
- [ ] Select and start the route
- [ ] Allow GPS transmission (ensure location permissions are granted)
- [ ] Use the roster at each stop to record boardings
- [ ] Note any students marked as absent (reported by parents)
- [ ] End the route when complete

---

## What You Can Do Today

| Capability                                                  | Status       |
| ----------------------------------------------------------- | ------------ |
| Sign in to the driver app                                   | Available    |
| View assigned schedule or route                             | Available    |
| Start route and send GPS updates                            | Available    |
| Trigger emergency / panic alert                             | Available    |
| Use roster for manual boarding/alighting                    | Available    |
| Offline GPS buffering                                       | Available    |
| BLE automatic student detection                             | Planned      |
| Pre-trip inspection checklist (required before route start) | Planned (v4) |
| View absent students on roster (parent-reported)            | Planned (v4) |
| Presence notifications to parents (auto on board/alight)    | Planned (v4) |

## Typical Driver Workflow

### Current Workflow

1. Sign in.
2. Open the assigned route or schedule view.
3. Start the route and allow GPS transmission.
4. Use the roster during stops.
5. Trigger an emergency alert if needed.
6. Continue route execution and end the route.

### v4 Target Workflow

1. Sign in to the Driver App.
2. Select assigned route from schedule.
3. **Complete pre-trip inspection checklist** (brakes, lights, mirrors, tires, first aid kit, emergency exits, seatbelts). Submit result.
   - If all items pass: "Start Route" button becomes available.
   - If any item fails: Route start is blocked. School Admin is notified. Wait for guidance (maintenance or substitute vehicle).
4. Start route. School Admin is automatically notified that your route has begun.
5. At each stop:
   - View expected students for this stop.
   - Students marked as absent (by parent) are greyed out — do not wait for them.
   - Mark each boarding student (manual tap or BLE SmartTag auto-detect).
   - **Parent receives push notification**: "[Child] boarded bus at [Stop]".
6. At school (AM) or home stops (PM):
   - Mark each alighting student.
   - **Parent receives push notification**: "[Child] has arrived".
7. If emergency occurs: trigger PANIC button.
   - Alert goes to School Admin immediately.
   - School Admin confirms and parents are notified.
   - Continue following emergency procedures.
8. End route. System generates route summary (students boarded/alighted, stops visited, duration, any incidents).

## Important Reminders

> **Complete the pre-trip inspection honestly.** Failed items are safety issues that must be resolved before driving with students. (v4: inspection is enforced — you cannot start the route without passing.)

> **Use the panic or emergency action only for real operational incidents.**

> **Do not rely on BLE automation for attendance until that workflow is fully delivered.**

> **If connectivity is poor, continue using the app — events are buffered offline. Report sync issues through support after the route if needed.**

> **Check the roster for absent students before each stop.** If a parent has reported their child absent, the student will be greyed out. Do not wait at the stop for absent students.

## Troubleshooting

| Problem                           | Solution                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| GPS not sending                   | Check that location permissions are granted; verify API URL is set correctly |
| Route not appearing               | Verify your driver account is assigned to a route in the database            |
| App cannot connect                | Set `EXPO_PUBLIC_API_URL` to `http://<host-ip>:3001/api/v1`                  |
| Emergency alert not sent          | Check network connectivity; verify API Gateway is running                    |
| Pre-trip inspection not appearing | Feature available in v4; currently route start does not require inspection   |
| Absent students not shown         | Feature available in v4; currently all roster students shown as expected     |
