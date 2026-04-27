# SBTM Project Overview - Complete Documentation

This document consolidates all README.md files from across the SBTM (School Bus Transport Management) project into a single reference. It merges the root project README, the documentation index, all application READMEs, and all service READMEs to provide a complete overview of the project and its components.

> **Note:** This is a read-only merged view. The authoritative content lives in each source file listed below. When updating documentation, edit the original source file, not this merged copy.

---

## Table of Contents

### Project Root

1. [README.md (Root)](#1-readmemd-root)
2. [docs/README.md (Documentation Map)](#2-docsreadmemd-documentation-map)

### Applications

3. [apps/admin-dashboard/README.md](#3-appsadmin-dashboardreadmemd)
4. [apps/driver-app/README.md](#4-appsdriver-appreadmemd)
5. [apps/parent-dashboard/README.md](#5-appsparent-appreadmemd)
6. [apps/parent-dashboard/web/README.md](#6-appsparent-appwebreadmemd)
7. [apps/parent-dashboard/mobile/README.md](#7-appsparent-appmobilereadmemd)

### Services

8. [services/api-gateway/README.md](#8-servicesapi-gatewayreadmemd)
9. [services/gps-tracking/README.md](#9-servicesgps-trackingreadmemd)
10. [services/emergency-alerts/README.md](#10-servicesemergency-alertsreadmemd)
11. [services/student-presence/README.md](#11-servicesstudent-presencereadmemd)
12. [services/video-service/README.md](#12-servicesvideo-servicereadmemd)
13. [services/student-management/README.md](#13-servicesstudent-managementreadmemd)
14. [services/compliance-management/README.md](#14-servicescompliance-managementreadmemd)

---

<!-- ======================================================================== -->

## 1. README.md (Root)

<!-- ======================================================================== -->

> **Source:** `README.md`

# School Bus Transport Management System (SBMS)

## Overview

The **School Bus Transport Management System (SBMS)** is a comprehensive, cloud-native solution designed to ensure the safety and efficiency of school transportation. It connects school administrators, drivers, and parents through a suite of integrated web and mobile applications, backed by a robust microservices infrastructure.

## Key Features

- **Real-time Tracking**: Live GPS tracking of all school buses.
- **Student Safety**: Automated presence detection using BLE SmartTags.
- **Emergency Alerts**: Instant notification system for breakdowns, accidents, or panic situations.
- **Video Surveillance**: Secure video event capture and retrieval.
- **Route Management**: Efficient route planning and optimization.
- **Parent Portal**: Peace of mind for parents with live ETAs and notifications.

## System Architecture

The project is built as a monorepo containing multiple microservices and frontend applications.

### Frontend Applications

| Application                                    | Path                     | Description                                  | Tech Stack            |
| ---------------------------------------------- | ------------------------ | -------------------------------------------- | --------------------- |
| **[Admin Dashboard](../apps/admin-dashboard)** | `/apps/admin-dashboard`  | Command center for fleet & route management  | React, Vite, Tailwind |
| **[Driver App](../apps/driver-app)**           | `/apps/driver-app`       | Mobile app for navigation & presence logging | React Native, Expo    |
| **[Parent App](../apps/parent-dashboard)**     | `/apps/parent-dashboard` | Web portal for tracking children             | React, Vite           |

### Cloud Backend & Microservices

| Service                                                        | Path                              | Description                                 | Tech Stack                  |
| -------------------------------------------------------------- | --------------------------------- | ------------------------------------------- | --------------------------- |
| **[API Gateway](../services/api-gateway)**                     | `/services/api-gateway`           | Unified entry point, Auth, Data Aggregation | NestJS, JWT                 |
| **[GPS Tracking](../services/gps-tracking)**                   | `/services/gps-tracking`          | High-frequency location ingestion & query   | Express, Prisma             |
| **[Emergency Alerts](../services/emergency-alerts)**           | `/services/emergency-alerts`      | Real-time critical event handling           | NestJS, BullMQ, Redis       |
| **[Student Presence](../services/student-presence)**           | `/services/student-presence`      | BLE SmartTag processing & attendance        | NestJS, Socket.IO           |
| **[Video Service](../services/video-service)**                 | `/services/video-service`         | Secure video upload & metadata management   | NestJS, MinIO               |
| **[Student Management](../services/student-management)**       | `/services/student-management`    | Enrollment and roster management            | NestJS, TypeORM             |
| **[Compliance Management](../services/compliance-management)** | `/services/compliance-management` | Inspections and audit logs                  | NestJS, TypeORM             |
| **[Notification Service](../services/notification-service)**   | `/services/notification-service`  | Multi-channel parent notification delivery  | NestJS, BullMQ, FCM, Twilio |

## Getting Started

### Prerequisites

- **Node.js**: v20+
- **Docker & Docker Compose**: For running the complete infrastructure stack.
- **PostgreSQL**: v15+ (if running locally without Docker)
- **Redis**: v7+ (if running locally without Docker)

### Quick Start (Docker)

To start the entire backend infrastructure:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/arvinddhasmana/SBTM.git
   cd SBTM
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

## Documentation

Detailed documentation is available in the `docs/` folder. Start with the documentation index, then follow the domain-specific guides:

- **[Documentation Map](./README.md)**: Canonical index and source-of-truth map for business, design, implementation, demo, and test documentation.
- **[Documentation Policy](./Governance/DocumentationPolicy.md)**: Documentation ownership, metadata, traceability, and update rules.
- **[Business Requirements](./Business/Requirements.md)**: Scope, expected outcomes, and non-functional targets.
- **[Business Use Cases](./Business/UseCases.md)**: Stable operational use cases linked to requirements and features.
- **[Features](./Business/Features.md)**: Business-facing feature matrix with current implementation status.
- **[User Journey](./Business/UserJourney.md)**: Role-based journeys for Admin, Driver, and Parent experiences.
- **[v1 Architecture](./Design/Architecture.md)**: Target system architecture and service decomposition.
- **[System Architecture](./Design/SystemArchitecture.md)**: Actor, application, and service boundaries.
- **[Data Architecture](./Design/DataArchitecture.md)**: Domain data ownership and tenant boundaries.
- **[Database Schema](./Design/DatabaseSchema.md)**: Current persisted tables, entities, and tenant-sensitive fields.
- **[Data Retention](./Design/DataRetention.md)**: Retention and lifecycle guidance for operational and privacy-sensitive data.
- **[Integration Architecture](./Design/IntegrationArchitecture.md)**: Request, event, and external integration patterns.
- **[Deployment Architecture](./Design/DeploymentArchitecture.md)**: Local and target deployment topologies.
- **[Security and Privacy Architecture](./Design/SecurityPrivacyArchitecture.md)**: Identity, tenant isolation, privacy, and trust boundaries.
- **[Event Catalog](./Design/EventCatalog.md)**: Cross-service event definitions and intended integration model.
- **[Technical Specifications](./Design/TechnicalSpecifications.md)**: Technology baseline and architectural constraints.
- **[API Reference](./Reference/APIReference.md)**: Formal gateway-facing endpoint reference.
- **[Service Contracts](./Reference/ServiceContracts.md)**: Gateway-to-service contract and payload reference.
- **[User Guides](./UserGuide/README.md)**: Role-based guidance for Parent, Driver, Admin, School Operator, and Compliance/Support workflows.
- **[Implementation Modules](./Implementation/)**: Code-aligned implementation notes for each major module.
- **[Operations Documentation](./Operations/README.md)**: Deployment, observability, troubleshooting, and runbooks.
- **[Gap Analysis](./prd/v4/GapAnalysis.md)**: Verified delivery gaps between the current system and the v1 target state.
- **[Phase Plan](./prd/v1/PhaseWiseImplementationPlan.md)**: Sequenced roadmap and acceptance criteria.
- **[Upgrade Plan](./prd/v4/UpgradePlan.md)**: Self-contained phase plans (Phase 1-5) with scope, acceptance criteria, and module cross-references.
- **[SDLC Guidelines](./sdlc_guidelines/)**: Development process standards -- security, coding, testing, CI/CD, deployment, and governance.

### Demo & Testing Guides

- **[Demo Setup Guide](./Demo/DEMO_SETUP_GUIDE.md)**: Complete guide for setting up the demo environment.
- **[Live Demo Script](./Demo/LiveDemoScript.md)**: Step-by-step script for conducting live demos.
- **[Testing Guide](./Test/TestingGuide.md)**: Operational verification guidance and current smoke-test coverage.

## Testing

Run tests for specific services or apps:

```bash
cd services/api-gateway
pnpm run test
```

## Security

- All services are behind the **API Gateway**.
- Authentication is handled via **JWT**.
- Role-Based Access Control (**RBAC**) enforces permission boundaries (Admin, Driver, Parent).

## License

UNLICENSED - This is a private project.

---

<!-- ======================================================================== -->

## 2. docs/README.md (Documentation Map)

<!-- ======================================================================== -->

> **Source:** `docs/README.md`

# SBTM Documentation Map

- Document owner: Product and Engineering
- Last reviewed: 2026-03-30
- Primary use: Starting point for humans and AI agents to find the right source of truth

Use this index to find the authoritative document for each kind of question.

## Folder Ownership

### Business

- [Business](Business) defines product goals, requirements, use cases, and user journeys.

### Governance

- [DocumentationPolicy.md](Governance/DocumentationPolicy.md) defines documentation structure, metadata, traceability, and maintenance rules.

### Design

- [Design](Design) defines the target v1 architecture, event model, and technical baseline.

### Operations

- [Operations](Operations) defines deployment, observability, troubleshooting, and runbook guidance.

### Reference

- [Reference](Reference) defines formal API and service contract reference material.

### User Guide

- [UserGuide](UserGuide) defines role-based usage guidance for Parent, Driver, Admin, School Operator, and Compliance or Support users.

### Implementation

- [Implementation](Implementation) describes the current code-verified implementation state for each module.

### PRD

- [GapAnalysis.md](prd/v4/GapAnalysis.md) is the authoritative gap inventory.
- [PhaseWiseImplementationPlan.md](prd/v1/PhaseWiseImplementationPlan.md) is the authoritative delivery roadmap.
- [UpgradePlan/](prd/v4/UpgradePlan.md) contains self-contained phase plans (Phase 1-5) with scope, acceptance criteria, and module cross-references.

### SDLC Guidelines

- [sdlc_guidelines](sdlc_guidelines) defines development process standards: security compliance, requirements engineering, architecture, coding standards, testing, CI/CD, deployment, tech-specific conventions, and governance.
- [00_master_policy.md](sdlc_guidelines/00_master_policy.md) is the universal policy loaded first by all agents and humans.

### Demo

- [Demo](Demo) covers demo environment setup, simulator usage, and live demo flow.

### Test

- [TestingGuide.md](Test/TestingGuide.md) covers operational verification and current smoke-test guidance.

## Audience-Based Entry Points

- Product and delivery: [Business requirements](Business/Requirements.md), [feature matrix](Business/Features.md), [phase plan](prd/v1/PhaseWiseImplementationPlan.md), and [detailed phase plans](prd/v4/UpgradePlan.md)
- Architects and senior engineers: [v1 architecture](Design/Architecture.md), [system architecture](Design/SystemArchitecture.md), [integration architecture](Design/IntegrationArchitecture.md), and [technical specifications](Design/TechnicalSpecifications.md)
- Developers: [Implementation](Implementation), [reference docs](Reference/README.md), service `README.md` files, [gap analysis](prd/v4/GapAnalysis.md), and [SDLC guidelines](sdlc_guidelines/)
- Demo owners and QA: [demo setup guide](Demo/DEMO_SETUP_GUIDE.md), [live demo script](Demo/LiveDemoScript.md), [testing guide](Test/TestingGuide.md), and [operations docs](Operations/README.md)
- Documentation maintainers: [documentation policy](Governance/DocumentationPolicy.md)
- End users and operators: [user guide index](UserGuide/README.md)

## Recommended Reading Order

1. [Business requirements](Business/Requirements.md)
2. [business use cases](Business/UseCases.md)
3. [v1 architecture](Design/Architecture.md)
4. [gap analysis](prd/v4/GapAnalysis.md)
5. [phase plan](prd/v1/PhaseWiseImplementationPlan.md)
6. [implementation module docs](Implementation)
7. [operations docs](Operations/README.md) or [testing guide](Test/TestingGuide.md), depending on the task

## Source-of-Truth Rules

- Do not use demo or test docs to infer product completeness.
- Do not use implementation docs as target-state design.

## Current Coverage Notes

- The root repository README should always point back to this map for authoritative document discovery.
- Each backend service should have its own `README.md` covering purpose, runtime, endpoints, dependencies, and current gaps.
- When product scope changes, update `docs/Business` first, then adjust design and implementation references.

## Core References

- [Business requirements](Business/Requirements.md)
- [Business use cases](Business/UseCases.md)
- [Business feature matrix](Business/Features.md)
- [Business user journey](Business/UserJourney.md)
- [documentation policy](Governance/DocumentationPolicy.md)
- [v1 architecture](Design/Architecture.md)
- [system architecture](Design/SystemArchitecture.md)
- [data architecture](Design/DataArchitecture.md)
- [database schema](Design/DatabaseSchema.md)
- [data retention](Design/DataRetention.md)
- [integration architecture](Design/IntegrationArchitecture.md)
- [deployment architecture](Design/DeploymentArchitecture.md)
- [security and privacy architecture](Design/SecurityPrivacyArchitecture.md)
- [v1 technical specifications](Design/TechnicalSpecifications.md)
- [reference index](Reference/README.md)
- [user guide index](UserGuide/README.md)
- [operations index](Operations/README.md)
- [gap analysis](prd/v4/GapAnalysis.md)
- [phase plan](prd/v1/PhaseWiseImplementationPlan.md)
- [testing guide](Test/TestingGuide.md)
- [demo setup guide](Demo/DEMO_SETUP_GUIDE.md)

---

<!-- ======================================================================== -->

## 3. apps/admin-dashboard/README.md

<!-- ======================================================================== -->

> **Source:** `apps/admin-dashboard/README.md`

# Admin Dashboard

## Overview

The Admin Dashboard is the command center for the School Bus Transport Management System (SBMS). It allows school administrators to manage routes, track vehicles in real-time, view alerts, and handle student and driver data.

## Features

- **Real-time Map**: Live tracking of all buses using Leaflet
- **Fleet Management**: CRUD operations for buses and drivers
- **Route Optimization**: Creation and modification of bus routes
- **Alert Monitoring**: Dashboard for active emergency alerts
- **Analytics**: Charts and graphs for system usage and performance via Recharts

## Architecture

### Tech Stack

- **Framework**: React 19 (Vite)
- **Styling**: TailwindCSS
- **Maps**: React Leaflet
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP**: Axios
- **Testing**: Vitest + React Testing Library

### Module Structure

```
src/
├── components/       # Reusable UI components
├── pages/            # Page layouts
├── hooks/            # Custom React hooks
├── services/         # API integration
└── utils/            # Helper functions
```

## Getting Started

### Prerequisites

- Node.js 20+

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Start development server**:

```bash
pnpm run dev
```

3. **Build for production**:

```bash
pnpm run build
```

## Testing

### Unit Tests

```bash
pnpm run test
```

## Configuration

### Environment Variables

| Variable       | Description                                             |
| -------------- | ------------------------------------------------------- |
| `VITE_API_URL` | API Gateway base URL (default: `http://localhost:3001`) |

## Security

- JWT-based authentication with gateway-backed data
- Protected routes (Admin role only)

## License

UNLICENSED - Private project

---

<!-- ======================================================================== -->

## 4. apps/driver-app/README.md

<!-- ======================================================================== -->

> **Source:** `apps/driver-app/README.md`

# Driver App

Mobile companion for school bus drivers in the SBTM ecosystem.

## Features

- **Route Selection** -- choose AM/PM run at the start of each shift
- **Live GPS Tracking** -- foreground and background location reporting every 5 seconds
- **Student Roster** -- board and alight students with a single tap
- **Emergency Alerts** -- one-tap PANIC button with offline buffering
- **Offline Support** -- GPS and presence events queue locally and flush on reconnect

## Tech Stack

|              |                                              |
| ------------ | -------------------------------------------- |
| Framework    | React Native 0.81 + Expo SDK 54              |
| State        | Zustand                                      |
| Navigation   | React Navigation 7 (native stack)            |
| HTTP         | Axios + JWT interceptor                      |
| Storage      | Expo Secure Store                            |
| Location     | expo-location (foreground + background task) |
| BLE          | react-native-ble-plx                         |
| Connectivity | @react-native-community/netinfo              |

## Module Structure

```
apps/driver-app/
├── index.ts                       # App entry (registerRootComponent)
├── App.tsx                        # Root: auth restore, nav tree, connectivity
├── app.json                       # Expo config, permissions, plugins
├── .env                           # Local config (not committed)
├── .env.example                   # Template -- copy to .env to start
└── src/
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── RouteSelectScreen.tsx
    │   ├── ActiveRouteScreen.tsx
    │   └── RosterScreen.tsx
    ├── services/
    │   ├── api.service.ts          # Axios instance, JWT attach, 401 handler
    │   ├── auth.service.ts         # Login, session restore, logout
    │   ├── gps.service.ts          # Location tracking + background task
    │   ├── connectivity.service.ts # Network monitor, offline flush on reconnect
    │   ├── ble.service.ts          # Bluetooth SmartTag detection
    │   ├── emergency.service.ts    # Panic events + offline queue
    │   ├── presence.service.ts     # Board/alight events
    │   ├── roster.service.ts       # Student roster
    │   ├── route-lifecycle.service.ts
    │   └── offline-queue.service.ts
    ├── store/
    │   └── useDriverStore.ts
    └── types/
        └── index.ts
```

## Setup

This app lives inside a pnpm workspace. **Always install from the repository root**, not from this directory:

```bash
# From the repo root
pnpm install
```

Copy the environment template:

```bash
cp apps/driver-app/.env.example apps/driver-app/.env
```

Then start the backend (required before running the app):

```bash
docker compose up -d
```

Seed the database on first run:

```bash
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql
```

## Running

### With Expo Go on a physical device

```bash
cd apps/driver-app

# Same-network device (update IP first -- see below)
pnpm exec expo start

# WSL2 / cross-network device (uses ngrok tunnel for Metro)
pnpm exec expo start --tunnel
```

Scan the QR code with Expo Go on your phone.

**Update `.env` with your machine's IP** (non-WSL2, same WiFi):

```bash
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):3001/api/v1|" \
  apps/driver-app/.env
```

**WSL2 users must also tunnel the backend:**

```bash
# Terminal 1 -- tunnel backend (note the HTTPS URL)
ngrok http 3001

# Update .env with ngrok URL (must include /api/v1)
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://YOUR-URL.ngrok-free.app/api/v1|" \
  apps/driver-app/.env

# Terminal 2 -- start Metro with tunnel
cd apps/driver-app
pnpm exec expo start --tunnel
```

See [docs/dev/driver-app-development.md](./dev/driver-app-development.md) for the full WSL2 networking explanation.

### Android emulator

```bash
pnpm run android
```

The `.env.example` default (`http://10.0.2.2:3001/api/v1`) works for the Android emulator out of the box.

### Web browser

```bash
pnpm run web
```

BLE and background GPS are not available on web.

## Testing

```bash
# Unit tests
pnpm run test

# TypeScript check
npx tsc --noEmit
```

## Environment Variables

| Variable              | Required | Description                                    |
| --------------------- | -------- | ---------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | Yes      | API Gateway URL **including `/api/v1`** suffix |

Common values:

```bash
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1

# Physical device on same WiFi
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api/v1

# WSL2 / ngrok
EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app/api/v1
```

## Demo Credentials

| Role   | Email               | Password    |
| ------ | ------------------- | ----------- |
| Driver | `driver1@sbtm.demo` | `Admin123!` |

## Further Reading

- [Driver App Development Guide](./dev/driver-app-development.md) -- full setup, WSL2 networking, known issues
- [Real Phone Deployment Guide](./Operations/RealPhoneDeploymentGuide.md) -- building APKs, EAS, driving test setup
- [Architecture](./Design/Architecture.md)

---

<!-- ======================================================================== -->

## 5. apps/parent-dashboard/README.md

<!-- ======================================================================== -->

> **Source:** `apps/parent-dashboard/README.md`

# Parent App

## Overview

The Parent App enables guardians to track their children's school bus journey in real-time. It provides peace of mind through live notifications, ETAs, and viewing attendance history.

## Features

- **Live Tracking**: Real-time map view of the child's bus
- **Notifications**: Push alerts for boarding, alighting, and delays
- **Attendance History**: Log of past trips
- **ETA Updates**: Estimated arrival time at drop-off points

## Architecture

### Tech Stack

- **Framework**: React 19 (Vite)
- **Styling**: TailwindCSS
- **HTTP**: Axios

### Module Structure

```
web/src/
├── components/       # UI Components
├── context/          # Auth context
├── pages/            # Routes
├── services/         # API calls
└── types/            # Shared types
```

## Getting Started

### Prerequisites

- Node.js 20+

### Installation

1. **Install dependencies**:

```bash
cd web
pnpm install
```

2. **Start development server**:

```bash
pnpm run dev
```

3. **Build for production**:

```bash
pnpm run build
```

## Testing

### Unit Tests

```bash
pnpm run test
```

## Configuration

### Environment Variables

| Variable       | Description                                             |
| -------------- | ------------------------------------------------------- |
| `VITE_API_URL` | API Gateway base URL (default: `http://localhost:3001`) |

## Security

- Secure login flow
- Data privacy (child visibility restricted to parent)

## License

UNLICENSED - Private project

---

<!-- ======================================================================== -->

## 6. apps/parent-dashboard/web/README.md

<!-- ======================================================================== -->

> **Source:** `apps/parent-dashboard/web/README.md`

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

---

<!-- ======================================================================== -->

## 7. apps/parent-dashboard/mobile/README.md

<!-- ======================================================================== -->

> **Source:** `apps/parent-dashboard/mobile/README.md`

# Parent App - Mobile

This directory contains the Flutter mobile application for the Parent App.

## structure

- `lib/`: Flutter code
- `pubspec.yaml`: Dependencies

Currently scaffolded.

---

<!-- ======================================================================== -->

## 8. services/api-gateway/README.md

<!-- ======================================================================== -->

> **Source:** `services/api-gateway/README.md`

# API Gateway Service

## Overview

The API Gateway is the central entry point for the School Bus Transport Management System (SBMS). It unifies access to all microservices (GPS, Alerts, Presence, Video), handles authentication/authorization, and manages cross-cutting concerns.

## Features

- **Unified API Surface**: Single entry point for all client applications
- **Authentication & Authorization**: JWT-based auth with RBAC (Admin, Driver, Parent, System)
- **Service Routing**: Intelligent proxying to downstream microservices
- **Rate Limiting**: Protection against abuse using Throttler
- **Standardized Error Handling**: Consistent error responses across all endpoints
- **Request Logging & Monitoring**: Comprehensive logging of ingress/egress traffic

## Architecture

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

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Configure environment**:

```bash
cp .env.example .env
# Edit variable values
```

3. **Start development server**:

```bash
pnpm run start:dev
```

### Running with Docker

```bash
docker compose up --build api-gateway
```

## API Endpoints

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

## Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Test Coverage

```bash
pnpm run test:cov
```

## Configuration

### Environment Variables

| Variable               | Description                      |
| ---------------------- | -------------------------------- |
| `PORT`                 | Service Port (Default: 3001)     |
| `JWT_SECRET`           | Secret key for token signing     |
| `GPS_SERVICE_URL`      | URL for GPS Tracking Service     |
| `ALERTS_SERVICE_URL`   | URL for Emergency Alerts Service |
| `PRESENCE_SERVICE_URL` | URL for Student Presence Service |
| `VIDEO_SERVICE_URL`    | URL for Video Service            |

## Security

- **JWT Validation**: All protected routes require a valid Bearer token
- **RBAC**: Strict role checks (ADMIN, DRIVER, PARENT) for endpoints
- **Input Validation**: DTO validation using `class-validator`
- **Throttling**: Rate limiting to prevent DoS

## Roadmap

- [x] Core Authentication
- [x] Service Proxying
- [x] Rate Limiting
- [ ] API Versioning Strategy
- [ ] Websocket Gateway Aggregation
- [ ] Caching Layer (Redis)

## License

UNLICENSED - Private project

---

<!-- ======================================================================== -->

## 9. services/gps-tracking/README.md

<!-- ======================================================================== -->

> **Source:** `services/gps-tracking/README.md`

# GPS Tracking Service

## Overview

The GPS Tracking Service is the core location handler for the School Bus Transport Management System (SBMS). It ingests high-frequency location data from buses, processes it, and stores it efficiently for real-time tracking and historical playback.

## Features

- **High-Frequency Ingestion**: Handles raw GPS streams from devices
- **Real-time Location**: Provides latest known position for routes
- **Historical Playback**: Efficiently queries past location data
- **Speed & Heading**: Tracks vehicle telemetry
- **Data Validation**: Zod-based schema validation

## Architecture

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

## Getting Started

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

## API Endpoints

### Routes

- `POST /api/v1/location` - Ingest GPS point
- `GET /api/v1/routes/:id/live-location` - Get current location
- `GET /api/v1/routes/:id/history` - Get path history (supports timebox)

## Testing

### Unit & Integration Tests

```bash
pnpm run test
```

## Configuration

### Environment Variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `PORT`         | Service Port (Default: 3002) |
| `DATABASE_URL` | Prisma Connection String     |

## Security

- Input validation ensuring valid lat/lng coordinates
- Rate limiting on ingestion endpoints

## Roadmap

- [x] GPS Ingestion
- [x] Live Location Query
- [x] History Query
- [ ] Geofencing Support
- [ ] Speed limit violation detection

## License

UNLICENSED - Private project

---

<!-- ======================================================================== -->

## 10. services/emergency-alerts/README.md

<!-- ======================================================================== -->

> **Source:** `services/emergency-alerts/README.md`

# Emergency Alerts Service

## Overview

The Emergency Alerts Service is a critical microservice in the School Bus Transport Management System (SBMS). It handles high-priority alerts from buses (e.g., panic buttons, breakdowns) and routes them to the appropriate stakeholders via real-time notifications.

## Features

- **Real-time Alerting**: Instant notification of emergencies using WebSocket and Redis Pub/Sub
- **Alert Queueing**: Robust job processing with BullMQ for reliable delivery
- **Alert Lifecycle**: active, resolved, and dismissed statuses
- **Emergency Events**: Support for various event types (PANIC, ACCIDENT, BREAKDOWN)
- **Stakeholder Notification**: Targeted alerts to Admins and Parents

## Architecture

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

## Getting Started

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

## API Endpoints

### Alerts

- `GET /api/v1/alerts/active` - Get active alerts
- `POST /api/v1/emergency-events` - Trigger new emergency
- `PATCH /api/v1/alerts/:id/resolve` - Resolve an alert

### Websockets

- namespace: `/alerts`
- events: `new-alert`, `alert-resolved`

## Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

## Configuration

### Environment Variables

| Variable     | Description                     |
| ------------ | ------------------------------- |
| `PORT`       | Service Port (Default: 3003)    |
| `DB_HOST`    | PostgreSQL Host                 |
| `REDIS_HOST` | Redis Host (Default: localhost) |
| `REDIS_PORT` | Redis Port (Default: 6379)      |

## Security

- Service-to-service authentication via internal tokens
- WebSocket connection authentication

## Roadmap

- [x] Basic Alert CRUD
- [x] Real-time Notifications
- [ ] Integration with SMS/Email Providers
- [ ] Alert Escalation Policies

## License

UNLICENSED - Private project

---

<!-- ======================================================================== -->

## 11. services/student-presence/README.md

<!-- ======================================================================== -->

> **Source:** `services/student-presence/README.md`

# Student Presence Service

## Overview

The Student Presence Service monitors student boarding and alighting events in the School Bus Transport Management System (SBMS). It integrates with BLE SmartTags to automatically detect when students enter or leave the bus, ensuring child safety.

## Features

- **BLE SmartTag Integration**: Automatic detection of students
- **Real-time Dashboard**: Live view of bus occupancy
- **Notification Support**: Alerts parents when child boards/alights
- **Historical Logs**: Audit trail of student movements
- **Manual Overrides**: Driver capability to manually board/alight

## Architecture

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

## Getting Started

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

## API Endpoints

### Presence

- `POST /api/v1/student-presence-events` - Record presence event
- `GET /api/v1/routes/:id/students` - Get students on bus

### Websockets

- namespace: `/presence`
- events: `student-boarded`, `student-alighted`

## Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

## Configuration

### Environment Variables

| Variable     | Description                  |
| ------------ | ---------------------------- |
| `PORT`       | Service Port (Default: 3004) |
| `DB_HOST`    | PostgreSQL Host              |
| `REDIS_HOST` | Redis Host                   |

## Security

- Verification of Scanner ID
- Role-based checking for manual overrides

## Roadmap

- [x] Basic Board/Alight Logic
- [x] Manual Driver Override
- [ ] NFC Card Support
- [ ] Absenteeism prediction

## License

UNLICENSED - Private project

---

<!-- ======================================================================== -->

## 12. services/video-service/README.md

<!-- ======================================================================== -->

> **Source:** `services/video-service/README.md`

# Video Capture Integration Service

## Overview

The Video Capture Integration Service is a standalone microservice for the School Bus Transport Management System (SBTM). It handles video event creation, secure upload/download, metadata storage, and real-time notifications for emergency and incident recordings.

## Features

- **Video Event Management**: Create, track, and manage video events from drivers
- **Secure Upload/Download**: Presigned URLs for secure video and thumbnail uploads
- **Multiple Storage Backends**: Support for MinIO (S3-compatible) and local storage
- **Real-time Notifications**: WebSocket support for live video event updates
- **Access Logging**: Complete audit trail of video access
- **Flexible Querying**: Filter and paginate video events by multiple criteria
- **RESTful API**: Clean, versioned API design

## Architecture

### Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Object Storage**: MinIO (S3-compatible) or local storage
- **Real-time**: Socket.IO WebSockets
- **Testing**: Jest (Unit, Integration, E2E)

### Module Structure

```
src/
├── modules/
│   ├── video-events/     # Core video event logic
│   ├── upload/           # File upload handling
│   ├── storage/          # Storage abstraction (MinIO/Local)
│   └── realtime/         # WebSocket gateway
├── app.module.ts
└── main.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- MinIO (optional, for S3-compatible storage)
- Docker & Docker Compose (optional)

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Configure environment**:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run database migrations** (auto-sync enabled in development):

```bash
pnpm run start:dev
```

### Running the Service

**Development mode**:

```bash
pnpm run start:dev
```

**Production mode**:

```bash
pnpm run build
pnpm run start:prod
```

**Docker Compose** (recommended):

```bash
docker-compose up -d
```

## API Endpoints

### Video Events

#### Create Video Event

```http
POST /api/v1/video-events
Content-Type: application/json

{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "driverId": "driver-789",
  "timestamp": "2025-01-10T14:25:10Z",
  "eventType": "EMERGENCY",
  "durationSeconds": 20
}
```

**Response**:

```json
{
  "videoEventId": "uuid",
  "uploadUrl": "https://...",
  "thumbnailUploadUrl": "https://..."
}
```

#### Complete Video Upload

```http
POST /api/v1/video-events/{id}/complete
Content-Type: application/json

{
  "videoUrl": "https://storage.example.com/video.mp4",
  "thumbnailUrl": "https://storage.example.com/thumb.jpg"
}
```

#### List Video Events

```http
GET /api/v1/video-events?vehicleId=bus-123&page=1&limit=10
```

#### Get Video Event

```http
GET /api/v1/video-events/{id}
X-User-Id: user-123
```

**Response includes secure playback URL**:

```json
{
  "id": "uuid",
  "vehicleId": "bus-123",
  "status": "READY",
  "playbackUrl": "https://...",
  ...
}
```

#### Delete Video Event

```http
DELETE /api/v1/video-events/{id}
```

### WebSocket Events

Connect to `/ws/video-events`:

```javascript
const socket = io('http://localhost:3005/ws/video-events');

// Subscribe to events
socket.emit('subscribe', { userId: 'user-123', role: 'ADMIN' });

// Listen for new video events
socket.on('new-video-event', (event) => {
  console.log('New video event:', event);
});

// Listen for status changes
socket.on('video-event-status-change', (event) => {
  console.log('Status changed:', event);
});
```

## Testing

### Unit Tests

```bash
pnpm run test
```

### Integration Tests

```bash
pnpm run test:integration
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Test Coverage

```bash
pnpm run test:cov
```

## Docker Deployment

### Build Image

```bash
docker build -t video-service:latest .
```

### Run Container

```bash
docker run -p 3005:3005 \
  -e DB_HOST=postgres \
  -e MINIO_ENDPOINT=minio \
  video-service:latest
```

### Docker Compose

```bash
docker-compose up -d
```

This starts:

- Video Service (port 3005)
- PostgreSQL (port 5432)
- MinIO (port 9000, console: 9001)

## Configuration

### Environment Variables

| Variable               | Description                          | Default         |
| ---------------------- | ------------------------------------ | --------------- |
| `PORT`                 | Service port                         | `3005`          |
| `DB_HOST`              | PostgreSQL host                      | `localhost`     |
| `DB_PORT`              | PostgreSQL port                      | `5432`          |
| `DB_USERNAME`          | Database username                    | `postgres`      |
| `DB_PASSWORD`          | Database password                    | `postgres`      |
| `DB_DATABASE`          | Database name                        | `video_service` |
| `STORAGE_TYPE`         | Storage backend (`minio` or `local`) | `minio`         |
| `MINIO_ENDPOINT`       | MinIO endpoint                       | `localhost`     |
| `MINIO_PORT`           | MinIO port                           | `9000`          |
| `MINIO_ACCESS_KEY`     | MinIO access key                     | `minioadmin`    |
| `MINIO_SECRET_KEY`     | MinIO secret key                     | `minioadmin`    |
| `MINIO_BUCKET_NAME`    | S3 bucket name                       | `videos`        |
| `PRESIGNED_URL_EXPIRY` | URL expiry (seconds)                 | `3600`          |

## Database Schema

### VideoEvent

- `id`: UUID (PK)
- `vehicleId`: string
- `routeId`: string
- `driverId`: string
- `timestamp`: timestamp
- `eventType`: enum (EMERGENCY, INCIDENT, MANUAL)
- `durationSeconds`: integer
- `videoUrl`: string (nullable)
- `thumbnailUrl`: string (nullable)
- `status`: enum (UPLOADING, READY, FAILED)
- `createdAt`: timestamp
- `updatedAt`: timestamp

### VideoAccessLog

- `id`: UUID (PK)
- `videoEventId`: UUID (FK)
- `userId`: string
- `timestamp`: timestamp
- `ipAddress`: string

## Security

- **Presigned URLs**: All uploads/downloads use time-limited presigned URLs
- **Access Logging**: Every video access is logged with user and IP
- **No Public URLs**: Videos are never publicly accessible
- **Input Validation**: All inputs validated using class-validator
- **CORS**: Configurable CORS settings

## Monitoring

### Health Check

```http
GET /api/v1/health
```

Returns service status and timestamp.

### Logging

Structured JSON logging with different levels:

- Application events
- Database queries (configurable)
- Access logs
- Error tracking

## Development

### Code Quality

```bash
pnpm run lint          # Run ESLint
pnpm run format        # Format with Prettier
```

### Database Migrations

In production, disable `DB_SYNCHRONIZE` and use TypeORM migrations:

```bash
pnpm run migration:generate -- -n MigrationName
pnpm run migration:run
```

## Roadmap

### Current (MVP)

- Video event creation and management
- Secure upload/download with presigned URLs
- MinIO and local storage support
- Real-time WebSocket notifications
- Access logging and audit trail

### Future Enhancements

- [ ] Automatic thumbnail generation
- [ ] Video transcoding for multiple formats
- [ ] AI-based video analysis (incident detection)
- [ ] Integration with enterprise DVR systems
- [ ] Video retention policies and auto-deletion
- [ ] Advanced search and filtering
- [ ] Video streaming optimization

## License

UNLICENSED - Private project

## Support

For issues or questions, contact the development team.

---

<!-- ======================================================================== -->

## 13. services/student-management/README.md

<!-- ======================================================================== -->

> **Source:** `services/student-management/README.md`

# Student Management Service

## Overview

The Student Management Service owns student enrollment records, route assignments, and bulk roster import for the School Bus Transport Management System. It provides the backend record of which students belong to a school, which parent account is linked, and which AM or PM route and stop assignments apply.

## Features

- Student record creation, update, retrieval, and deletion
- Tenant-aware filtering by `school_id`
- Route and stop assignment updates for AM and PM runs
- Parent-linked student lookups via `parent_user_id`
- Bulk roster import from CSV content

## Architecture

### Tech Stack

- Framework: NestJS (TypeScript)
- Database: PostgreSQL with TypeORM
- Validation: class-validator and Nest global validation pipe
- Testing: Jest (unit and e2e)

### Module Structure

```text
src/
├── modules/
│   └── student/
│       ├── dto/                 # Request DTOs for create and update flows
│       ├── entities/            # Student entity and enum definitions
│       ├── student.controller.ts
│       ├── student.module.ts
│       └── student.service.ts
├── app.module.ts
└── main.ts
```

### Data Responsibilities

The service persists the `students` table and currently owns these key fields:

- Student identity: `id`, `first_name`, `last_name`, `external_student_id`
- Tenant boundary: `school_id`
- Parent linkage: `parent_user_id`
- Transportation assignment: `am_route_id`, `pm_route_id`, `am_stop_id`, `pm_stop_id`
- Lifecycle state: `status`

The table enforces uniqueness on `school_id + external_student_id`.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Docker and Docker Compose for local full-stack runs

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
```

If `.env.example` is not present, provide the variables listed below directly in your shell or Docker configuration.

3. Start the development server:

```bash
pnpm run start:dev
```

### Running with Docker

```bash
docker compose up --build student-management
```

## API Endpoints

- `POST /students` - Create a student record
- `GET /students` - List students, optionally filtered by `school_id`, `route_id`, or `parent_id`
- `GET /students/:id` - Get a student by identifier
- `PATCH /students/:id` - Update an existing student record
- `DELETE /students/:id` - Remove a student record
- `PATCH /students/:id/assignment` - Update AM or PM route and stop assignments
- `POST /students/bulk-import` - Bulk import student records from CSV content or uploaded file

## Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Coverage

```bash
pnpm run test:cov
```

## Configuration

### Environment Variables

| Variable      | Description                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `PORT`        | Service port. Defaults to `3006`.                                                                                          |
| `DB_HOST`     | PostgreSQL host.                                                                                                           |
| `DB_PORT`     | PostgreSQL port. Defaults to `5433` when running outside Docker in the local code configuration, `5432` in Docker Compose. |
| `DB_USERNAME` | PostgreSQL username.                                                                                                       |
| `DB_PASSWORD` | PostgreSQL password.                                                                                                       |
| `DB_DATABASE` | PostgreSQL database name.                                                                                                  |

## Integration Notes

- The API Gateway is expected to front this service and enforce authentication, authorization, and broader route or stop validation.
- The current service trusts upstream callers for cross-service consistency checks such as whether a route or stop belongs to the same school.
- Bulk import currently parses simple CSV rows and is best suited to controlled imports rather than untrusted files.

## Security and Tenant Boundaries

- Tenant filtering is based on `school_id` and must be preserved by upstream request routing.
- Input validation is enabled globally through Nest validation pipes.
- Additional DB-level tenant hardening and stronger service-to-service trust controls are planned, but not yet implemented here.

## Roadmap

- [x] Student CRUD and basic filtering
- [x] Route and stop assignment updates
- [x] Bulk CSV import
- [ ] Stronger validation against route and stop ownership
- [ ] Invitation and provisioning workflows for linked parent accounts
- [ ] Improved import validation, reporting, and rollback controls

## License

UNLICENSED - Private project

---

<!-- ======================================================================== -->

## 14. services/compliance-management/README.md

<!-- ======================================================================== -->

> **Source:** `services/compliance-management/README.md`

# Compliance Management Service

## Overview

The Compliance Management Service tracks driver compliance records, vehicle inspections, and audit logs for school transportation operations. It supports the operational safety layer of SBTM by recording whether drivers and vehicles meet the required readiness and accountability checks.

## Features

- Driver compliance records with expiry and status tracking
- Vehicle inspection creation and retrieval
- Audit log creation and query endpoints
- Tenant-aware queries by `schoolId`
- Separate compliance, inspection, and audit modules within one service boundary

## Architecture

### Tech Stack

- Framework: NestJS (TypeScript)
- Database: PostgreSQL with TypeORM
- Validation: class-validator and Nest global validation pipe
- Testing: Jest (unit and e2e)

### Module Structure

```text
src/
├── modules/
│   ├── audit/                    # Audit log ingestion and retrieval
│   ├── compliance/               # Driver compliance status and expiry tracking
│   └── inspection/               # Vehicle inspection records
├── app.module.ts
└── main.ts
```

### Data Responsibilities

The service currently owns these primary persistence concerns:

- `driver_compliance` for driver expiry dates and readiness status
- `vehicle_inspections` for pre-trip, post-trip, and maintenance inspection records
- `audit_logs` for user actions and resource-level audit entries

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Docker and Docker Compose for local full-stack runs

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
```

If `.env.example` is not present, provide the variables listed below directly in your shell or Docker configuration.

3. Start the development server:

```bash
pnpm run start:dev
```

### Running with Docker

```bash
docker compose up --build compliance-management
```

## API Endpoints

### Driver Compliance

- `GET /compliance` - List compliance records for a school using `schoolId`
- `GET /compliance/driver/:driverId` - Get a single driver compliance record
- `POST /compliance/driver/:driverId` - Create or update a driver compliance record
- `GET /compliance/expiring` - List compliance records that are expiring soon for a school

### Vehicle Inspections

- `POST /inspections` - Create an inspection record
- `GET /inspections` - List inspections for a school using `schoolId`
- `GET /inspections/vehicle/:id` - Get inspections for a vehicle
- `GET /inspections/latest` - Get the latest inspection for a vehicle using `vehicleId`

### Audit Logs

- `POST /audit` - Record an audit event
- `GET /audit` - List audit records for a school using `schoolId`
- `GET /audit/resource` - Filter audit records by `resource` and `resourceId`

## Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Coverage

```bash
pnpm run test:cov
```

## Configuration

### Environment Variables

| Variable      | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `PORT`        | Service port. Docker Compose targets `3007`.                     |
| `DB_HOST`     | PostgreSQL host.                                                 |
| `DB_PORT`     | PostgreSQL port. Defaults to `5432` in the module configuration. |
| `DB_USERNAME` | PostgreSQL username.                                             |
| `DB_PASSWORD` | PostgreSQL password.                                             |
| `DB_DATABASE` | PostgreSQL database name.                                        |

## Integration Notes

- The API Gateway is expected to front this service for authenticated platform access.
- Audit entries are useful for compliance reporting, but the current implementation is service-local rather than a centralized cross-service audit pipeline.
- Compliance and inspection inputs currently use permissive DTO handling in several endpoints and should be tightened as the service matures.

## Security and Operational Notes

- Tenant scoping depends on `schoolId` query usage and upstream enforcement.
- Audit records include user, resource, and request-context fields that should be treated as operationally sensitive.
- The bootstrap file currently contains an incorrect log message and default port text inherited from another service. The deployed topology should follow Docker Compose and gateway configuration until the runtime code is corrected.

## Roadmap

- [x] Driver compliance status tracking
- [x] Vehicle inspection storage
- [x] Audit log persistence and queries
- [ ] Stronger DTO validation and explicit contracts
- [ ] Centralized audit pipeline across services
- [ ] Automated compliance expiry notifications and escalation workflows

## License

UNLICENSED - Private project
