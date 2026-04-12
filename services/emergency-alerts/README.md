# Emergency Alerts Service

## 🚨 Overview

The Emergency Alerts Service is a critical microservice in the School Bus Transport Management System (SBMS). It handles high-priority alerts from buses (e.g., panic buttons, breakdowns) and routes them to the appropriate stakeholders via real-time notifications.

## ✨ Features

- **Real-time Alerting**: Instant notification of emergencies using WebSocket and Redis Pub/Sub
- **Alert Queueing**: Robust job processing with BullMQ for reliable delivery
- **Alert Lifecycle**: active, resolved, and dismissed statuses
- **Emergency Events**: Support for various event types (PANIC, ACCIDENT, BREAKDOWN)
- **Stakeholder Notification**: Targeted alerts to Admins and Parents

## 🏗️ Architecture

### Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Queue**: BullMQ (Redis-backed)
- **Real-time**: Socket.IO WebSockets
- **Testing**: Jest (Unit & E2E)

### Module Structure

```
src/
├── modules/
│   ├── alerts/           # Alert management logic
│   ├── notifications/    # Notification dispatching
│   └── events/           # WebSocket gateway
├── common/               # Shared logic
├── app.module.ts
└── main.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis (for Queue & Pub/Sub)

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Configure environment**:

```bash
cp .env.example .env
# Set Redis and DB credentials
```

3. **Start development server**:

```bash
pnpm run start:dev
```

### Running with Docker

```bash
docker compose up --build emergency-alerts
```

## 📡 API Endpoints

### Alerts

- `GET /api/v1/alerts/active` - Get active alerts
- `POST /api/v1/emergency-events` - Trigger new emergency
- `PATCH /api/v1/alerts/:id/resolve` - Resolve an alert

### Websockets

- namespace: `/alerts`
- events: `new-alert`, `alert-resolved`

## 🧪 Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

## 🔧 Configuration

### Environment Variables

| Variable     | Description                     |
| ------------ | ------------------------------- |
| `PORT`       | Service Port (Default: 3003)    |
| `DB_HOST`    | PostgreSQL Host                 |
| `REDIS_HOST` | Redis Host (Default: localhost) |
| `REDIS_PORT` | Redis Port (Default: 6379)      |

## 🔒 Security

- Service-to-service authentication via internal tokens
- WebSocket connection authentication

## 🚦 Roadmap

- [x] Basic Alert CRUD
- [x] Real-time Notifications
- [ ] Integration with SMS/Email Providers
- [ ] Alert Escalation Policies

## 📝 License

UNLICENSED - Private project
