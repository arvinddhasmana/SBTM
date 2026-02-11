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
| **[Parent App](./apps/parent-app)** | `/apps/parent-app` | Web portal for tracking children | React, Vite |

### ☁️ Cloud Backend & Microservices

| Service | Path | Description | Tech Stack |
|---------|------|-------------|------------|
| **[API Gateway](./services/api-gateway)** | `/services/api-gateway` | Unified entry point, Auth, Data Aggregation | NestJS, JWT |
| **[GPS Tracking](./services/gps-tracking)** | `/services/gps-tracking` | High-frequency location ingestion & query | Express, Prisma |
| **[Emergency Alerts](./services/emergency-alerts)** | `/services/emergency-alerts` | Real-time critical event handling | NestJS, BullMQ, Redis |
| **[Student Presence](./services/student-presence)** | `/services/student-presence` | BLE SmartTag processing & attendance | NestJS, Socket.IO |
| **[Video Service](./services/video-service)** | `/services/video-service` | Secure video upload & metadata management | NestJS, MinIO |
| **[Student Management](./services/student-management)** | `/services/student-management` | Enrollment and roster management | NestJS, TypeORM |
| **[Compliance Management](./services/compliance-management)** | `/services/compliance-management` | Inspections and audit logs | NestJS, TypeORM |

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

Detailed documentation is available in the `docs/` folder:

- **[Architecture](./docs/Design/Architecture.md)**: Current system architecture and multi-tenant readiness.
- **[System Design](./docs/Design/SystemDesign.md)**: Consolidated API, data model, and UI notes.
- **[Technical Specifications](./docs/Design/TechnicalSpecifications.md)**: Current stack and prototype assumptions.
- **[Repository Structure](./docs/Design/RepositoryStructure.md)**: Monorepo layout.
- **[Business Requirements](./docs/Business/Requirements.md)**: Scope and target requirements.
- **[Features](./docs/Business/Features.md)**: Feature matrix with status.
- **[Use Cases](./docs/Business/UseCases.md)**: Current vs target use cases.
- **[User Journey](./docs/Business/UserJourney.md)**: Current user flows.

### 🎯 Demo & Testing Guides

- **[Demo Setup Guide](./docs/Demo/DEMO_SETUP_GUIDE.md)**: Complete guide for setting up the demo environment.
- **[Live Demo Script](./docs/Demo/LiveDemoScript.md)**: Step-by-step script for conducting live demos.
- **[Testing Guide](./docs/Implementation/TestingGuide.md)**: API smoke tests and UI notes.


## 🧪 Testing

Run tests for specific services or apps:

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
