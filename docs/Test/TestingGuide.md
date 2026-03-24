# SBTM Testing Guide

- Document owner: QA and Engineering
- Last reviewed: 2026-03-24
- Primary use: Operational verification, smoke checks, and phase-aligned test focus

This guide is the operational verification reference for the current platform. It complements the upgrade roadmap in `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md` and the verified gap inventory in `docs/prd/v1/UpgradePlan/GapAnalysis.md`.

## Related Documents

- [GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
- [Requirements.md](../Business/Requirements.md)
- [DEMO_SETUP_GUIDE.md](../Demo/DEMO_SETUP_GUIDE.md)

## Scope

- Use this guide for smoke checks, integration verification, and demo-environment validation.
- Use `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md` for phase acceptance criteria and delivery order.
- Use `docs/Implementation/*` when you need module-specific current-state context.

## Current Smoke Tests

### API Gateway Health
```bash
curl http://localhost:3001/api/v1/health
```

### Auth Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"osta.admin@sbtm.demo","password":"Admin123!"}'
```

Store the returned `accessToken` and use it for protected calls:
```bash
export TOKEN=<access-token>
```

### GPS Tracking (via Gateway)
```bash
curl -X POST http://localhost:3001/api/v1/routes/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"bus-001","routeId":"route-123","timestamp":"2026-02-10T08:00:00Z","lat":45.4215,"lng":-75.6972}'
```

### Presence (Manual via Gateway)
```bash
curl -X POST http://localhost:3001/api/v1/student-presence-events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"stud-001","vehicleId":"bus-001","routeId":"route-123","eventType":"BOARD","timestamp":"2026-02-10T08:00:00Z","source":"MANUAL"}'
```

### Emergency Alerts
```bash
curl -X POST http://localhost:3003/api/v1/emergency-events \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"bus-001","routeId":"route-123","driverId":"driver-123","timestamp":"2026-02-10T08:00:00Z","lat":45.4215,"lng":-75.6972,"eventType":"PANIC_BUTTON"}'
```

To send through the gateway:
```bash
curl -X POST http://localhost:3001/api/v1/emergency-events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"bus-001","routeId":"route-123","driverId":"driver-123","timestamp":"2026-02-10T08:00:00Z","lat":45.4215,"lng":-75.6972,"eventType":"PANIC_BUTTON"}'
```

## Integration Focus By Upgrade Phase

### Phase 1
- Verify alert and presence jobs are consumed end to end and become parent-visible notifications.
- Verify the parent app can receive live alert changes without relying only on polling.

### Phase 2
- Verify roster actions produce durable backend presence events.
- Verify offline presence actions flush after reconnect.
- Verify BLE detection payloads are accepted and deduplicated correctly.

### Phase 3
- Verify GPS ingest publishes `location.updated` events.
- Verify route deviation and geofencing scenarios produce testable downstream behavior.

## Current Coverage Gaps

- No documented queue-consumer integration checks yet.
- No documented contract tests for event payloads.
- No documented authorization regression suite for cross-tenant access.
- No documented mobile BLE verification flow.

## UI Notes
- Admin dashboard and parent portal require `VITE_API_URL` pointing at the gateway.
- Driver app uses `EXPO_PUBLIC_API_URL` (default `http://10.0.2.2:3001/api/v1` on Android).
