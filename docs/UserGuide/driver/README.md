# Driver Guide

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Driver mobile workflow for route execution, GPS, and incident handling

---

## Your Role in SBTM

As a **Driver**, you are the primary field operator. You use the Driver App to execute assigned routes, transmit live GPS position to the platform, record student boarding and alighting, and trigger emergency alerts when needed.

---

## Your Quick-Start Checklist

When you start your shift:

- [ ] Sign in to the Driver App
- [ ] Verify your assigned route appears on the schedule screen
- [ ] Select and start the route
- [ ] Allow GPS transmission (ensure location permissions are granted)
- [ ] Use the roster at each stop to record boardings
- [ ] End the route when complete

---

## What You Can Do Today

| Capability | Status |
|---|---|
| Sign in to the driver app | Available |
| View assigned schedule or route | Available |
| Start route and send GPS updates | Available |
| Trigger emergency / panic alert | Available |
| Use roster for manual boarding/alighting | Available |
| Offline GPS buffering | Available |
| BLE automatic student detection | Planned |
| Clear sync status indicator | Planned |

## Typical Driver Workflow

1. Sign in.
2. Open the assigned route or schedule view.
3. Start the route and allow GPS transmission.
4. Use the roster during stops.
5. Trigger an emergency alert if needed.
6. Continue route execution and end the route.

## Important Reminders

> **Use the panic or emergency action only for real operational incidents.**

> **Do not rely on BLE automation for attendance until that workflow is fully delivered.**

> **If connectivity is poor, continue using the app — events are buffered offline. Report sync issues through support after the route if needed.**

## Troubleshooting

| Problem | Solution |
|---|---|
| GPS not sending | Check that location permissions are granted; verify API URL is set correctly |
| Route not appearing | Verify your driver account is assigned to a route in the database |
| App cannot connect | Set `EXPO_PUBLIC_API_URL` to `http://<host-ip>:3001/api/v1` |
| Emergency alert not sent | Check network connectivity; verify API Gateway is running |