# Driver Guide

- Document owner: Product and Operations
- Last reviewed: 2026-04-14
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
| Report an incident                                          | Available    |
| View and respond to admin messages                          | Available    |
| Use roster for manual boarding/alighting                    | Available    |
| Board All / Alight All bulk actions                         | Available    |
| Offline GPS buffering                                       | Available    |
| BLE automatic student detection                             | Planned      |
| Pre-trip inspection checklist (required before route start) | Planned (v4) |
| View absent students on roster (parent-reported)            | Planned (v4) |
| Presence notifications to parents (auto on board/alight)    | Planned (v4) |

---

## Alert Types & When to Use Them

The system supports multiple alert types. As a driver, you can trigger two types directly:

### Alerts You Can Trigger

| Alert Type          | Button                          | When to Use                                                  | Example Use Case                                                                                                                      |
| ------------------- | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Panic**           | Red PANIC button                | **Immediate danger** — driver or passenger safety is at risk | A vehicle collision occurs with students on board. You press PANIC immediately to summon emergency responders.                        |
| **Incident Report** | Orange "Report Incident" button | **Non-emergency event** that admin needs to know about       | A student fell while boarding and has a minor scrape. You report the incident so the school nurse is prepared and parent is notified. |

### Other Alert Types (System/Admin Created)

These are created automatically by the system or by school administrators:

| Alert Type          | Created By             | Example Use Case                                                            |
| ------------------- | ---------------------- | --------------------------------------------------------------------------- |
| **Route Deviation** | System (auto-detected) | GPS detects the bus has left its assigned route path — admin is alerted     |
| **Late Arrival**    | System (auto-detected) | Bus is running 10+ minutes behind schedule — parents and admin are notified |
| **Late Departure**  | System (auto-detected) | Bus did not leave origin by scheduled start time                            |
| **Route Diversion** | Admin (manual)         | Road construction ahead — admin creates a planned diversion notice          |
| **Medical**         | Admin (manual)         | Student has a medical episode — admin escalates to medical response         |
| **Compliance**      | System (auto-detected) | Vehicle speed exceeded limit — logged for compliance reporting              |

### Panic vs Incident — Key Differences

| Aspect                  | Panic Alert                                                     | Incident Report                                                   |
| ----------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Urgency**             | Immediate — real-time emergency                                 | Important but not life-threatening                                |
| **Admin notification**  | Instant push notification + sound                               | Standard notification                                             |
| **Escalation**          | Auto-escalates if not confirmed in 10 min                       | No auto-escalation                                                |
| **Parent notification** | After admin confirms                                            | At admin discretion                                               |
| **Example**             | Vehicle accident, threatening person, student medical emergency | Minor injury, property damage, student conflict, mechanical issue |

---

## Messages (Admin Communication)

The **Messages** screen allows two-way communication between you and the school admin during your route.

### How It Works

1. When an alert is active on your route, admin may click **"Request Info"** to ask for more details.
2. A badge appears on your **Messages** button showing the number of pending requests.
3. Tap **Messages** to see all active alerts and any info requests from admin.
4. Type a response and tap **Send** to reply.

### Example Scenarios

| Scenario              | Admin Message                                        | Your Response                                                |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| After a Panic alert   | "Can you describe the situation? Are students safe?" | "Minor fender-bender. No injuries. Police are on scene."     |
| After Route Deviation | "Why did you leave the route?"                       | "Road closed due to water main break. Taking Elm St detour." |
| After Late Arrival    | "What is causing the delay?"                         | "Heavy traffic on Highway 7. ETA 10 minutes."                |

---

## Typical Driver Workflow

### Current Workflow

1. Sign in.
2. Open the assigned route or schedule view.
   - Route card shows school name, direction (AM/PM), and start time.
3. Select and start the route.
   - **AM Route**: All students start as NOT_BOARDED. Use the roster to board students at each stop.
   - **PM Route**: All students start as BOARDED. Use the roster to alight students at their stops.
4. GPS tracking begins — your bus appears as a yellow arrow on the map.
5. Use the roster during stops (Board/Alight individual students, or use Board All / Alight All).
6. If an emergency occurs: press the red **PANIC** button.
7. To report a non-emergency incident: press the orange **Report Incident** button.
8. Check **Messages** for any info requests from admin and respond.
9. End the route — all remaining boarded students are automatically alighted.

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

> **Use PANIC only for real emergencies.** For non-urgent events (minor injury, conflict, mechanical issue), use **Report Incident** instead.

> **Do not rely on BLE automation for attendance until that workflow is fully delivered.**

> **If connectivity is poor, continue using the app — events are buffered offline. Report sync issues through support after the route if needed.**

> **Check the roster for absent students before each stop.** If a parent has reported their child absent, the student will be greyed out. Do not wait at the stop for absent students.

> **Respond to admin Messages promptly.** When you see a badge on the Messages button, admin is waiting for information about an alert.

## Troubleshooting

| Problem                           | Solution                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| GPS not sending                   | Check that location permissions are granted; verify API URL is set correctly |
| Route not appearing               | Verify your driver account is assigned to a route in the database            |
| App cannot connect                | Set `EXPO_PUBLIC_API_URL` to `http://<host-ip>:3001/api/v1`                  |
| Emergency alert not sent          | Check network connectivity; verify API Gateway is running                    |
| Incident report failed            | Check network connectivity; the report is buffered offline for retry         |
| Messages not loading              | Pull to refresh; ensure internet connectivity                                |
| Pre-trip inspection not appearing | Feature available in v4; currently route start does not require inspection   |
| Absent students not shown         | Feature available in v4; currently all roster students shown as expected     |
