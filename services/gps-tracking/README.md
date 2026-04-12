# GPS Tracking Service

## 📍 Overview

The GPS Tracking Service is the core location handler for the School Bus Transport Management System (SBMS). It ingests high-frequency location data from buses, processes it, and stores it efficiently for real-time tracking and historical playback.

## ✨ Features

- **High-Frequency Ingestion**: Handles raw GPS streams from devices
- **Real-time Location**: Provides latest known position for routes
- **Historical Playback**: Efficiently queries past location data
- **Speed & Heading**: Tracks vehicle telemetry
- **Data Validation**: Zod-based schema validation

## 🏗️ Architecture

### Tech Stack

- **Framework**: Express (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod
- **Testing**: Jest + Supertest

### Module Structure

```
src/
├── controllers/      # Route handlers
├── services/         # Business logic
├── prisma/           # Database schema & migrations
├── utils/            # Helper functions
└── index.ts          # Entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Configure environment**:

```bash
cp .env.example .env
```

3. **Run Migrations**:

```bash
pnpm run migrate:dev
```

4. **Start development server**:

```bash
pnpm run dev
```

### Running with Docker

```bash
docker compose up --build gps-tracking
```

## 📡 API Endpoints

### Routes

- `POST /api/v1/location` - Ingest GPS point
- `GET /api/v1/routes/:id/live-location` - Get current location
- `GET /api/v1/routes/:id/history` - Get path history (supports timebox)

## 🧪 Testing

### Unit & Integration Tests

```bash
pnpm run test
```

## 🔧 Configuration

### Environment Variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `PORT`         | Service Port (Default: 3002) |
| `DATABASE_URL` | Prisma Connection String     |

## 🔒 Security

- Input validation ensuring valid lat/lng coordinates
- Rate limiting on ingestion endpoints

## 🚦 Roadmap

- [x] GPS Ingestion
- [x] Live Location Query
- [x] History Query
- [ ] Geofencing Support
- [ ] Speed limit violation detection

## 📝 License

UNLICENSED - Private project
