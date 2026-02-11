# SBTM Testing Guide (Current)

## API Smoke Tests
### API Gateway Health
```bash
curl http://localhost:3001/api/v1/health
```

### Auth Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sbtm.demo","password":"Admin123!"}'
```

### GPS Tracking
```bash
curl -X POST http://localhost:3002/api/v1/locations \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"bus-001","routeId":"route-123","timestamp":"2026-02-10T08:00:00Z","lat":45.4215,"lng":-75.6972}'
```

### Presence (Manual)
```bash
curl -X POST http://localhost:3004/api/v1/student-presence-events/manual \
  -H "Content-Type: application/json" \
  -d '{"studentId":"stud-001","vehicleId":"bus-001","routeId":"route-123","eventType":"BOARD","timestamp":"2026-02-10T08:00:00Z","source":"MANUAL"}'
```

### Emergency Alerts
```bash
curl -X POST http://localhost:3003/api/v1/emergency-events \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"bus-001","routeId":"route-123","driverId":"driver-123","timestamp":"2026-02-10T08:00:00Z","lat":45.4215,"lng":-75.6972,"eventType":"PANIC_BUTTON"}'
```

## UI Notes
- Admin dashboard and parent portal use mock data if APIs are unreachable.
- Driver app uses mock auth and requires API base URL updates for live calls.
