# Student Presence Detection Service

## Overview

The Student Presence Detection Service is a standalone microservice for tracking when students board and exit school buses using Bluetooth Low Energy (BLE) SmartTags (prototype) or RFID/NFC systems (enterprise).

## Features

- **Student Tag Registration**: Parents/admins can register BLE tags to students
- **BLE Detection**: Automatically detect student boarding/alighting via driver app BLE scans
- **Signal Filtering**: Filter weak signals below -80 dBm threshold
- **Timeout Logic**: Automatically mark students as alighted after 30s of no detection
- **Manual Override**: Drivers can manually mark students as boarded/alighted
- **Real-time Updates**: WebSocket broadcasts for admin dashboard
- **Redis Caching**: Fast presence state lookups
- **Queue Processing**: Async event processing with BullMQ

## Architecture

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL + TypeORM
- **Cache**: Redis
- **Queue**: BullMQ
- **Real-time**: Socket.IO
- **Testing**: Jest (unit + E2E)

## API Endpoints

### Tag Registration

```
POST /api/v1/student-tags
Content-Type: application/json

{
  "studentId": "stud-123",
  "tagId": "ble-xyz-789",
  "tagType": "SMARTTAG"
}
```

### Process BLE Detections

```
POST /api/v1/presence-events
Content-Type: application/json

{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "timestamp": "2025-01-10T14:10:00Z",
  "detections": [
    { "tagId": "ble-xyz-789", "signalStrength": -60 }
  ]
}
```

### Manual Override

```
POST /api/v1/student-presence-events/manual
Content-Type: application/json

{
  "studentId": "stud-123",
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "eventType": "BOARD",
  "timestamp": "2025-01-10T14:10:00Z"
}
```

### Query Presence State

```
GET /api/v1/routes/{routeId}/students
```

### WebSocket Events

Connect to `ws://localhost:3003/ws/presence`

Events:
- `student:boarded` - Student detected on bus
- `student:alighted` - Student exited bus
- `presence:updated` - Any presence state change

## BLE Detection Algorithm

1. Driver app scans for BLE tags every 2-5 seconds
2. Sends detected tag IDs + signal strength to backend
3. Backend filters signals below -80 dBm threshold
4. If tag appears and student not on bus → **BOARD** event
5. If tag not detected for >30s → **ALIGHT** event
6. Manual override always takes precedence

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL (via docker-compose)
- Redis (via docker-compose)

### Setup

```bash
cd services/student-presence
npm install
```

### Run

```bash
# Start dependencies
docker-compose up postgres redis

# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Testing

```bash
# Unit tests
npm test

# E2E tests (requires postgres + redis running)
npm run test:e2e

# Test coverage
npm run test:cov
```

## Docker

```bash
# Build image
docker build -t student-presence .

# Run container
docker run -p 3003:3003 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  student-presence
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5433` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `mysecretpassword` |
| `DB_DATABASE` | Database name | `sbms` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `PORT` | Service port | `3003` |

## Future Enhancements

- [ ] Replace SmartTags with enterprise RFID/NFC readers
- [ ] Multi-zone detection (front door, rear door, seat-level)
- [ ] AI-based student counting with camera
- [ ] School SIS integration for attendance
- [ ] Safety alerts (student left on bus, missing at stop)

## License

UNLICENSED
