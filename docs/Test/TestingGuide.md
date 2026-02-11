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

## UI Notes
- Admin dashboard and parent portal require `VITE_API_URL` pointing at the gateway.
- Driver app uses `EXPO_PUBLIC_API_URL` (default `http://10.0.2.2:3001/api/v1` on Android).
