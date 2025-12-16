# School Bus Transport Management System (SBMS)

## 🚍 Overview

The **School Bus Transport Management System (SBMS)** is a comprehensive, cloud-native solution designed to ensure the safety and efficiency of school transportation. It connects school administrators, drivers, and parents through a suite of integrated web and mobile applications, backed by a robust microservices infrastructure.

## 🌟 Key Features

- **Real-time Tracking**: Live GPS tracking of all school buses.
- **Student Safety**: Automated presence detection using BLE SmartTags.
- **Emergency Alerts**: Instant notification system for breakdowns, accidents, or panic situations.
- **Video Surveillance**: Secure video event capture and retrieval.
- **Route Management**: Efficient route planning and optimization.
- **Parent Portal**: Peace of mind for parents with live ETAs and notifications.

## 🏗️ System Architecture

The project is built as a monorepo containing multiple microservices and frontend applications.

### 📱 Frontend Applications

| Application | Path | Description | Tech Stack |
|-------------|------|-------------|------------|
| **[Admin Dashboard](./apps/admin-dashboard)** | `/apps/admin-dashboard` | Command center for fleet & route management | React, Vite, Tailwind |
| **[Driver App](./apps/driver-app)** | `/apps/driver-app` | Mobile app for navigation & presence logging | React Native, Expo |
| **[Parent App](./apps/parent-app)** | `/apps/parent-app` | Web portal for tracking children | Next.js, React |

### ☁️ Cloud Backend & Microservices

| Service | Path | Description | Tech Stack |
|---------|------|-------------|------------|
| **[API Gateway](./services/api-gateway)** | `/services/api-gateway` | Unified entry point, Auth, Data Aggregation | NestJS, JWT |
| **[GPS Tracking](./services/gps-tracking)** | `/services/gps-tracking` | High-frequency location ingestion & query | Express, Prisma |
| **[Emergency Alerts](./services/emergency-alerts)** | `/services/emergency-alerts` | Real-time critical event handling | NestJS, BullMQ, Redis |
| **[Student Presence](./services/student-presence)** | `/services/student-presence` | BLE SmartTag processing & attendance | NestJS, Socket.IO |
| **[Video Service](./services/video-service)** | `/services/video-service` | Secure video upload & metadata management | NestJS, MinIO |

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+
- **Docker & Docker Compose**: For running the complete infrastructure stack.
- **PostgreSQL**: v15+ (if running locally without Docker)
- **Redis**: v7+ (if running locally without Docker)

### Quick Start (Docker)

To start the entire backend infrastructure:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/arvinddhasmana/SBTM_AntiGravity.git
   cd SBTM_AntiGravity
   ```

2. **Configure Environment Variables**:
   Most services have a `.env.example` file. Ensure you configure them or use the defaults provided in `docker-compose.yml`.

3. **Run with Docker Compose**:
   ```bash
   docker compose up --build
   ```
   This will start all backend microservices, databases (PostgreSQL), and message brokers (Redis, MinIO).

### Local Development

For developing individual modules, refer to the specific `README.md` in each service's directory (linked above) for detailed setup instructions.

## 📚 Documentation

Detailed documentation and implementation status reports are available in the `docs/` folder:

- **[Architecture Overview](./docs/Implementation/ARCHITECTURE.md)**: Deep dive into system design patterns.
- **[Module Implementation Status](./docs)**: Status reports for individual modules.

## 🧪 Testing

To run tests across the entire workspace (if configured in root `package.json`):

```bash
npm run test
```

Or run tests for specific services:

```bash
cd services/api-gateway
npm run test
```

## 🔒 Security

- All services are behind the **API Gateway**.
- Authentication is handled via **JWT**.
- Role-Based Access Control (**RBAC**) enforces permission boundaries (Admin, Driver, Parent).

## 📝 License

UNLICENSED - This is a private project.
