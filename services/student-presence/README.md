# Student Presence Service

## 🎒 Overview

The Student Presence Service monitors student boarding and alighting events in the School Bus Transport Management System (SBMS). It integrates with BLE SmartTags to automatically detect when students enter or leave the bus, ensuring child safety.

## ✨ Features

- **BLE SmartTag Integration**: Automatic detection of students
- **Real-time Dashboard**: Live view of bus occupancy
- **Notification Support**: Alerts parents when child boards/alights
- **Historical Logs**: Audit trail of student movements
- **Manual Overrides**: Driver capability to manually board/alight

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
│   ├── attendance/       # Core presence logic
│   ├── scanner/          # SmartTag processing
│   └── notifications/    # Parent alert system
├── common/               # Shared logic
├── app.module.ts
└── main.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Configure environment**:

```bash
cp .env.example .env
```

3. **Start development server**:

```bash
pnpm run start:dev
```

### Running with Docker

```bash
docker compose up --build student-presence
```

## 📡 API Endpoints

### Presence

- `POST /api/v1/student-presence-events` - Record presence event
- `GET /api/v1/routes/:id/students` - Get students on bus

### Websockets

- namespace: `/presence`
- events: `student-boarded`, `student-alighted`

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

| Variable     | Description                  |
| ------------ | ---------------------------- |
| `PORT`       | Service Port (Default: 3004) |
| `DB_HOST`    | PostgreSQL Host              |
| `REDIS_HOST` | Redis Host                   |

## 🔒 Security

- Verification of Scanner ID
- Role-based checking for manual overrides

## 🚦 Roadmap

- [x] Basic Board/Alight Logic
- [x] Manual Driver Override
- [ ] NFC Card Support
- [ ] Absenteeism prediction

## 📝 License

UNLICENSED - Private project
