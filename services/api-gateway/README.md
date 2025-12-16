# API Gateway Service

Cloud Backend / API Gateway for the School Bus Transport Management System (SBMS).

## Overview

The API Gateway is the central entry point for all client applications (Parent App, Driver App, Admin Dashboard). It provides:

- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Service Routing** - Unified API that proxies requests to underlying microservices
- **Cross-cutting Concerns** - Rate limiting, logging, timeout handling, CORS
- **Standardized Errors** - Consistent error response format

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **Auth:** JWT + Passport
- **Database:** PostgreSQL with TypeORM
- **Rate Limiting:** @nestjs/throttler

## API Endpoints

### Auth
- `POST /api/v1/auth/login` - Login and receive JWT
- `POST /api/v1/auth/logout` - Logout (client-side token discard)
- `GET /api/v1/auth/me` - Get current user profile

### GPS (proxies GPS Tracking Service)
- `GET /api/v1/routes/:routeId/live-location` - Get live bus location
- `GET /api/v1/routes/:routeId/history` - Get location history

### Alerts (proxies Emergency Alerts Service)
- `GET /api/v1/alerts/active` - Get active alerts
- `GET /api/v1/alerts/:id` - Get alert details
- `POST /api/v1/emergency-events` - Create emergency event

### Presence (proxies Student Presence Service)
- `GET /api/v1/routes/:routeId/students` - Get students for route
- `POST /api/v1/student-presence-events` - Create presence event

### Video (proxies Video Service)
- `GET /api/v1/video-events` - List video events
- `GET /api/v1/video-events/:id` - Get video event details
- `POST /api/v1/video-events` - Create video event

### Health
- `GET /api/v1/health` - Health check

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Local Development

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Start infrastructure:
   ```bash
   docker compose up -d postgres redis
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run start:dev
   ```

### Running with Docker Compose

```bash
docker compose up --build api-gateway
```

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5433 |
| DB_USERNAME | Database username | postgres |
| DB_PASSWORD | Database password | mysecretpassword |
| DB_DATABASE | Database name | sbms |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRATION | Token expiration | 24h |
| GPS_SERVICE_URL | GPS service URL | http://localhost:3002 |
| ALERTS_SERVICE_URL | Alerts service URL | http://localhost:3003 |
| PRESENCE_SERVICE_URL | Presence service URL | http://localhost:3004 |
| VIDEO_SERVICE_URL | Video service URL | http://localhost:3005 |

## Roles

- **ADMIN** - Full access to all endpoints and routes
- **DRIVER** - Access to assigned routes, can create events
- **PARENT** - Access to children's routes only
- **SYSTEM** - Service-to-service authentication

## Error Response Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Route not found",
    "details": {}
  }
}
```
