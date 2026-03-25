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

Detailed documentation is available in the `docs/` folder. Start with the documentation index, then follow the domain-specific guides:

- **[Documentation Map](./docs/README.md)**: Canonical index and source-of-truth map for business, design, implementation, demo, and test documentation.
- **[Documentation Policy](./docs/Governance/DocumentationPolicy.md)**: Documentation ownership, metadata, traceability, and update rules.
- **[SDLC Guidelines](./docs/Governance/SDLCGuidelines.md)**: Development workflow, coding standards, testing requirements, CI/CD pipeline, and release process.
- **[Business Requirements](./docs/Business/Requirements.md)**: Scope, expected outcomes, and non-functional targets.
- **[Business Use Cases](./docs/Business/UseCases.md)**: Stable operational use cases linked to requirements and features.
- **[Features](./docs/Business/Features.md)**: Business-facing feature matrix with current implementation status.
- **[User Journey](./docs/Business/UserJourney.md)**: Role-based journeys for Admin, Driver, and Parent experiences.
- **[v1 Architecture](./docs/Design/v1/Architecture.md)**: Target system architecture and service decomposition.
- **[System Architecture](./docs/Design/v1/SystemArchitecture.md)**: Actor, application, and service boundaries.
- **[Data Architecture](./docs/Design/v1/DataArchitecture.md)**: Domain data ownership and tenant boundaries.
- **[Database Schema](./docs/Design/v1/DatabaseSchema.md)**: Current persisted tables, entities, and tenant-sensitive fields.
- **[Data Retention](./docs/Design/v1/DataRetention.md)**: Retention and lifecycle guidance for operational and privacy-sensitive data.
- **[Integration Architecture](./docs/Design/v1/IntegrationArchitecture.md)**: Request, event, and external integration patterns.
- **[Deployment Architecture](./docs/Design/v1/DeploymentArchitecture.md)**: Local and target deployment topologies.
- **[Security and Privacy Architecture](./docs/Design/v1/SecurityPrivacyArchitecture.md)**: Identity, tenant isolation, privacy, and trust boundaries.
- **[Event Catalog](./docs/Design/v1/EventCatalog.md)**: Cross-service event definitions and intended integration model.
- **[Technical Specifications](./docs/Design/v1/TechnicalSpecifications.md)**: Technology baseline and architectural constraints.
- **[API Reference](./docs/Reference/APIReference.md)**: Formal gateway-facing endpoint reference.
- **[Service Contracts](./docs/Reference/ServiceContracts.md)**: Gateway-to-service contract and payload reference.
- **[User Guides](./docs/UserGuide/README.md)**: Role-based guidance for Parent, Driver, Admin, School Operator, and Compliance/Support workflows.
- **[Implementation Modules](./docs/Implementation)**: Code-aligned implementation notes for each major module.
- **[Operations Documentation](./docs/Operations/README.md)**: Deployment, observability, troubleshooting, and runbooks.
- **[Gap Analysis](./docs/prd/v1/UpgradePlan/GapAnalysis.md)**: Verified delivery gaps between the current system and the v1 target state.
- **[Phase Plan](./docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)**: Sequenced roadmap and acceptance criteria.
  - [Phase 1: Parent Safety Communication Loop](./docs/prd/v1/UpgradePlan/Phase1-ParentSafetyCommunicationLoop.md)
  - [Phase 2: Driver Presence Workflow](./docs/prd/v1/UpgradePlan/Phase2-DriverPresenceWorkflow.md)
  - [Phase 3: GPS Eventing, Geofencing, and Route Intelligence](./docs/prd/v1/UpgradePlan/Phase3-GPSEventingGeofencingRouteIntelligence.md)
  - [Phase 4: Tenant Administration and User Provisioning](./docs/prd/v1/UpgradePlan/Phase4-TenantAdministrationUserProvisioning.md)
  - [Phase 5: Security, Compliance, and Production Hardening](./docs/prd/v1/UpgradePlan/Phase5-SecurityComplianceProductionHardening.md)

### 📋 Product Requirements (Historical Baseline)

Original specifications as defined in the Phase 1 PRD:

- **[Baseline Architecture](./docs/prd/ARCHITECTURE.md)**
- **[Phase 1 Requirements](./docs/prd/Requirements%20Phase1.md)**
- **[Module 1 - GPS Tracking](./docs/prd/Module%201%20GPS%20Tracking%20Service.md)**
- **[Module 2 - Parent App](./docs/prd/Module%202%20Parent%20App.md)**
- **[Module 3 - Driver App](./docs/prd/Module%203%20-%20Driver%20App%20Mobile.md)**
- **[Module 4 - Emergency Alerts](./docs/prd/Module%204%20-%20Emergency%20Alerts%20Service.md)**
- **[Module 5 - Video Service](./docs/prd/Module%205%20-%20Video%20Capture%20Integration.md)**
- **[Module 6 - Student Presence](./docs/prd/Module%206%20-%20Student%20Presence%20Detection.md)**
- **[Module 7 - Admin Dashboard](./docs/prd/Module%207%20-%20Admin%20Dashboard.md)**
- **[Module 8 - API Gateway](./docs/prd/Module%208%20-%20Cloud%20Backend%20and%20API%20Gateway.md)**

### 🎯 Demo & Testing Guides

- **[Demo Setup Guide](./docs/Demo/DEMO_SETUP_GUIDE.md)**: Complete guide for setting up the demo environment.
- **[Live Demo Script](./docs/Demo/LiveDemoScript.md)**: Step-by-step script for conducting live demos.
- **[Testing Guide](./docs/Test/TestingGuide.md)**: Operational verification guidance and current smoke-test coverage.


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
