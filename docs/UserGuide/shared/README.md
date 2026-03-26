# System Overview — What Is SBTM?

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Shared system overview, terminology, access model, and current-state caveats

---

## What Is SBTM?

The **School Bus Transport Management (SBTM)** platform is a multi-tenant transport operations system built for the Ontario School Transportation Authorities (OSTA). It manages school bus routes, tracks buses in real time, monitors student boarding and alighting, handles emergencies, and maintains compliance records — all through role-based web and mobile applications.

In plain terms: **SBTM shows you where every school bus is, whether students are on board, and alerts you immediately if something goes wrong.**

---

## How Does Data Flow Through SBTM?

```
┌─────────────────────────────────────────────────────────┐
│  FIELD DEVICES                                          │
│  Driver App (GPS) · BLE Tags (planned) · Manual Events  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API calls
                        ▼
┌─────────────────────────────────────────────────────────┐
│  API GATEWAY (NestJS)                                   │
│  Authentication, RBAC, tenant isolation, rate limiting,  │
│  and request routing to downstream services              │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│ GPS      │ │ Student  │ │Emergency │ │ Other Services    │
│ Tracking │ │ Presence │ │ Alerts   │ │ (Student Mgmt,    │
│          │ │          │ │          │ │  Video, Compliance)│
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────────────┘
     │            │            │             │
     └────────────┴────────────┴─────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  PostgreSQL +    │
              │  Redis Queues    │
              └──────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  USER INTERFACES                                        │
│  Admin Dashboard (React) · Parent Portal (React)        │
│  Driver App (Expo/React Native)                          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### Tenant Isolation

SBTM is **multi-tenant**. Every piece of data is scoped to a `school_id`. Users can only see data belonging to their school (or the schools they administer). The API Gateway enforces this at the request level.

### Roles

| Role | Access Level | Primary App |
|---|---|---|
| OSTA_ADMIN | Cross-board, system-wide | Admin Dashboard |
| BOARD_ADMIN | Board-level (multiple schools) | Admin Dashboard |
| SCHOOL_ADMIN | Single school | Admin Dashboard |
| DRIVER | Assigned routes only | Driver App (mobile) |
| PARENT | Linked children's routes only | Parent Portal (web) |

### Route

A **route** is a defined sequence of stops, assigned to a vehicle and driver. Routes have GPS waypoints and expected durations.

### Presence Event

A **presence event** records when a student boards or alights a bus. Sources include manual driver input and (planned) BLE automatic detection.

### Emergency Event

An **emergency event** is a safety-critical alert triggered by the driver's panic button or by system-detected anomalies (e.g., route deviation, extended stop).

---

## Getting Started

### Logging In

1. Open your portal (Admin Dashboard, Parent Portal, or Driver App).
2. Enter your email and password.
3. After login, the system scopes your view based on your role and tenant.

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| OSTA Admin | osta.admin@sbtm.demo | Admin123! |
| School Admin | school.admin@sbtm.demo | Admin123! |
| Driver 1 | driver1@sbtm.demo | Admin123! |
| Parent 1 | parent1@sbtm.demo | Admin123! |

---

## Current-State Caveats

- Parent notifications are still incomplete and largely polling-based.
- Driver roster interactions are not yet fully authoritative presence capture.
- Route optimization is currently placeholder quality.
- Board and school onboarding workflows remain incomplete.
- BLE-based automatic student detection is not yet completed.
- Centralized audit logging is service-local rather than fully consolidated.

---

## Safety and Privacy Reminders

- Student-linked operational data should only be accessed for legitimate service, support, or safety reasons.
- Incident review should stay within the user's role and tenant scope.
- All user interactions are logged for audit purposes.
- Incident review should stay within the user’s role and tenant scope.