# API Gateway Service

## 🌐 Overview

The API Gateway is the central entry point for the School Bus Transport Management System (SBMS). It unifies access to all microservices (GPS, Alerts, Presence, Video), handles authentication/authorization, and manages cross-cutting concerns.

## ✨ Features

- **Unified API Surface**: Single entry point for all client applications
- **Authentication & Authorization**: JWT-based auth with RBAC (Admin, Driver, Parent, System)
- **Service Routing**: Intelligent proxying to downstream microservices
- **Rate Limiting**: Protection against abuse using Throttler
- **Standardized Error Handling**: Consistent error responses across all endpoints
- **Request Logging & Monitoring**: Comprehensive logging of ingress/egress traffic

## 🏗️ Architecture

### Tech Stack
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (for User management) with TypeORM
- **Auth**: Passport + JWT
- **Proxy**: Custom HTTP Client wrappers
- **Testing**: Jest (Unit & E2E)

### Module Structure
```
src/
├── modules/
│   ├── auth/             # Authentication & User Management
│   └── gateway/          # Service Proxies & Controllers
├── common/               # Shared Guards, Interceptors, Filters
├── config/               # Environment Configuration
├── app.module.ts
└── main.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit variable values
```

3. **Start development server**:
```bash
npm run start:dev
```

### Running with Docker

```bash
docker compose up --build api-gateway
```

## 📡 API Endpoints

### Auth
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get Profile

### GPS
- `GET /api/v1/routes/:id/live-location` - Live Bus Location
- `GET /api/v1/routes/:id/history` - Route History

### Alerts
- `GET /api/v1/alerts/active` - Active Alerts
- `GET /api/v1/alerts/:id` - Alert Details
- `POST /api/v1/emergency-events` - Create Emergency

### Presence
- `GET /api/v1/routes/:id/students` - Route Students
- `POST /api/v1/student-presence-events` - Report Presence

### Video
- `GET /api/v1/video-events` - List Events
- `GET /api/v1/video-events/:id` - Get Event
- `POST /api/v1/video-events` - Create Event

## 🧪 Testing

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

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Service Port (Default: 3001) |
| `JWT_SECRET` | Secret key for token signing |
| `GPS_SERVICE_URL` | URL for GPS Tracking Service |
| `ALERTS_SERVICE_URL` | URL for Emergency Alerts Service |
| `PRESENCE_SERVICE_URL` | URL for Student Presence Service |
| `VIDEO_SERVICE_URL` | URL for Video Service |

## 🔒 Security

- **JWT Validation**: All protected routes require a valid Bearer token
- **RBAC**: Strict role checks (ADMIN, DRIVER, PARENT) for endpoints
- **Input Validation**: DTO validation using `class-validator`
- **Throttling**: Rate limiting to prevent DoS

## 🚦 Roadmap

- [x] Core Authentication
- [x] Service Proxying
- [x] Rate Limiting
- [ ] API Versioning Strategy
- [ ] Websocket Gateway Aggregation
- [ ] Caching Layer (Redis)

## 📝 License

UNLICENSED - Private project
