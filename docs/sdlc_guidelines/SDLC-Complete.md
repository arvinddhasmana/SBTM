# SDLC Guidelines - Complete Reference

## Table of Contents

### Foundation

- [README](#readme)
- [00_master_policy](#00_master_policy)

### 01 - Security and Compliance

- [data_classification](#data_classification)
- [privacy_compliance](#privacy_compliance)
- [supply_chain_security](#supply_chain_security)

### 02 - Requirements

- [requirements_engineering](#requirements_engineering)
- [traceability](#traceability)

### 03 - Architecture and Design

- [architecture_guidelines](#architecture_guidelines)
- [design_guidelines](#design_guidelines)
- [threat_modeling](#threat_modeling)

### 04 - Coding Standards

- [general_coding](#general_coding)
- [typescript_standards](#typescript_standards)
- [nestjs_standards](#nestjs_standards)
- [secure_coding](#secure_coding)

### 05 - Testing

- [testing_strategy](#testing_strategy)
- [security_testing](#security_testing)
- [performance_testing](#performance_testing)

### 06 - Integration and CI/CD

- [branching_strategy](#branching_strategy)
- [ci_cd_pipeline](#ci_cd_pipeline)
- [artifact_management](#artifact_management)

### 07 - Deployment and Operations

- [deployment_guidelines](#deployment_guidelines)
- [monitoring_observability](#monitoring_observability)
- [incident_response](#incident_response)

### 08 - Technology-Specific

- [postgresql_postgis](#postgresql_postgis)
- [redis_bullmq](#redis_bullmq)
- [docker_guidelines](#docker_guidelines)
- [react_vite](#react_vite)
- [react_native_expo](#react_native_expo)
- [socketio_sse](#socketio_sse)

### 09 - Governance

- [agent_governance](#agent_governance)
- [review_checklists](#review_checklists)
- [documentation_standards](#documentation_standards)

### Development

- [docker_development](#docker_development)

---

## README

_Source: `sdlc_guidelines/README.md`_

# SDLC Guidelines Framework — Index

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Navigation index for SDLC guidelines with dependency hierarchy and loading order

## Purpose

This directory contains the SDLC Guidelines Framework for SBTM — a hierarchical set of policy files that AI agents and developers follow to enforce privacy, quality, and compliance standards across all development activities.

Guidelines are organized in a 5-tier dependency hierarchy. Agents must load from the top tier down, ensuring foundational policies are always in effect before technology-specific guidance.

## Guideline Dependency Hierarchy

```mermaid
graph TD
    subgraph "Tier 1 — Foundation"
        MP[00_master_policy.md<br/>Project identity, privacy rules,<br/>universal standards]
    end

    subgraph "Tier 2 — Security & Compliance"
        SC[01_security_compliance/<br/>PIPEDA, MFIPPA, CASL<br/>Data classification, Supply chain]
    end

    subgraph "Tier 3 — SDLC Phase Guidelines"
        RE[02_requirements/<br/>Engineering & Traceability]
        AD[03_architecture_design/<br/>C4, ADR, Threat modeling]
        CS[04_coding_standards/<br/>TypeScript, NestJS, Security]
        TS[05_testing/<br/>Strategy, Security, Performance]
        CI[06_integration_cicd/<br/>Pipeline, Branching, Artifacts]
        DO[07_deployment_operations/<br/>Deploy, Monitoring, Incidents]
    end

    subgraph "Tier 4 — Technology-Specific"
        TECH["08_tech_specific/<br/>PostgreSQL, Redis/BullMQ<br/>Docker, React/Vite<br/>React Native/Expo<br/>Socket.IO/SSE"]
    end

    subgraph "Tier 5 — Governance & Validation"
        GOV[09_governance/<br/>Agent rules, Review checklists<br/>Documentation standards]
    end

    MP --> SC
    SC --> RE
    SC --> AD
    SC --> CS
    SC --> TS
    SC --> CI
    SC --> DO
    RE --> AD
    AD --> CS
    CS --> TS
    TS --> CI
    CI --> DO
    AD --> TECH
    CS --> TECH
    TECH --> GOV
    DO --> GOV

    style MP fill:#d32f2f,color:#fff
    style SC fill:#f57c00,color:#fff
    style RE fill:#1976d2,color:#fff
    style AD fill:#1976d2,color:#fff
    style CS fill:#1976d2,color:#fff
    style TS fill:#1976d2,color:#fff
    style CI fill:#1976d2,color:#fff
    style DO fill:#1976d2,color:#fff
    style TECH fill:#388e3c,color:#fff
    style GOV fill:#7b1fa2,color:#fff
```

## Loading Order by Agent Task

| Agent Task            | Required Files (load in order)                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Any task**          | `00_master_policy.md` → `01_security_compliance/data_classification.md`                                        |
| **Requirements**      | + `02_requirements/requirements_engineering.md` → `traceability.md`                                            |
| **Architecture**      | + `03_architecture_design/architecture_guidelines.md` → `design_guidelines.md` → `threat_modeling.md`          |
| **TypeScript coding** | + `04_coding_standards/general_coding.md` → `typescript_standards.md` → `secure_coding.md`                     |
| **NestJS services**   | + `04_coding_standards/general_coding.md` → `nestjs_standards.md` → `secure_coding.md`                         |
| **Testing**           | + `05_testing/testing_strategy.md` → `security_testing.md` → `performance_testing.md`                          |
| **CI/CD**             | + `06_integration_cicd/ci_cd_pipeline.md` → `branching_strategy.md` → `artifact_management.md`                 |
| **Deployment**        | + `07_deployment_operations/deployment_guidelines.md` → `monitoring_observability.md` → `incident_response.md` |
| **PostgreSQL**        | + `08_tech_specific/postgresql_postgis.md`                                                                     |
| **Redis/BullMQ**      | + `08_tech_specific/redis_bullmq.md`                                                                           |
| **React/Vite**        | + `08_tech_specific/react_vite.md`                                                                             |
| **React Native**      | + `08_tech_specific/react_native_expo.md`                                                                      |
| **Socket.IO/SSE**     | + `08_tech_specific/socketio_sse.md`                                                                           |
| **Docker**            | + `development/docker_development.md` → `08_tech_specific/docker_guidelines.md`                                |
| **Review/Governance** | + `09_governance/agent_governance.md` → `review_checklists.md`                                                 |

## Directory Structure

```
docs/sdlc_guidelines/
├── README.md                                ← You are here
├── 00_master_policy.md                      ← ALWAYS LOAD FIRST
├── 01_security_compliance/
│   ├── privacy_compliance.md                ← PIPEDA, MFIPPA, CASL mapping
│   ├── data_classification.md               ← Student PII tiers and handling
│   └── supply_chain_security.md             ← npm, Docker, CI dependency vetting
├── 02_requirements/
│   ├── requirements_engineering.md          ← Requirement capture format (FR/NFR/PR/SR)
│   └── traceability.md                      ← Bidirectional traceability matrix
├── 03_architecture_design/
│   ├── architecture_guidelines.md           ← C4 model, Mermaid conventions, ADR format
│   ├── design_guidelines.md                 ← Microservice and event-driven patterns
│   └── threat_modeling.md                   ← STRIDE for student safety and tenant isolation
├── 04_coding_standards/
│   ├── general_coding.md                    ← Language-agnostic rules
│   ├── typescript_standards.md              ← TypeScript conventions
│   ├── nestjs_standards.md                  ← NestJS service patterns
│   └── secure_coding.md                     ← OWASP, input validation, JWT handling
├── 05_testing/
│   ├── testing_strategy.md                  ← Test pyramid, coverage targets
│   ├── security_testing.md                  ← Auth, RBAC, tenant isolation testing
│   └── performance_testing.md               ← GPS ingest, WebSocket, queue testing
├── 06_integration_cicd/
│   ├── branching_strategy.md                ← Git workflow and branch naming
│   ├── ci_cd_pipeline.md                    ← Quality gates and CI stages
│   └── artifact_management.md               ← Docker images, npm packages
├── 07_deployment_operations/
│   ├── deployment_guidelines.md             ← Docker Compose and production K8s
│   ├── monitoring_observability.md          ← Health checks, metrics, alerts
│   └── incident_response.md                 ← Child safety incidents, data breaches
├── 08_tech_specific/
│   ├── postgresql_postgis.md                ← PostGIS, RLS, migrations
│   ├── redis_bullmq.md                      ← Queuing, caching, pub/sub patterns
│   ├── docker_guidelines.md                 ← Multi-stage builds, security contexts
│   ├── react_vite.md                        ← Admin dashboard, parent portal
│   ├── react_native_expo.md                 ← Driver mobile app
│   └── socketio_sse.md                      ← Real-time communication patterns
├── 09_governance/
│   ├── agent_governance.md                  ← AI coding agent guardrails
│   ├── review_checklists.md                 ← PR review, security, privacy checklists
│   └── documentation_standards.md           ← Documentation conventions
└── development/
    └── docker_development.md                ← Local development with Docker Compose
```

## Related Documents

- [00_master_policy.md](00_master_policy.md) — Foundation policy
- [../Governance/DocumentationPolicy.md](../Governance/DocumentationPolicy.md) — Documentation governance
- [../Business/Requirements.md](../Business/Requirements.md) — Business requirements baseline
- [../Design/Architecture.md](../Design/Architecture.md) — v1 target architecture
- [../Test/TestingGuide.md](../Test/TestingGuide.md) — Operational testing guide

---

## 00_master_policy

_Source: `sdlc_guidelines/00_master_policy.md`_

# SBTM Master Policy — Root Governance Document

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Foundation policy — all AI agents and developers must follow these rules

---

## 1. Project Identity

| Attribute                 | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| **Project Name**          | School Bus Transport Management System (SBTM)                    |
| **Domain**                | School Transportation Safety — Multi-tenant SaaS                 |
| **Privacy Ceiling**       | Student PII (minors), regulated under PIPEDA and MFIPPA          |
| **Compliance Frameworks** | PIPEDA, MFIPPA, Ontario Highway Traffic Act (school buses), AODA |
| **Deployment Targets**    | Docker Compose (local/dev), Kubernetes (production)              |
| **Team Size**             | 3–5 developers                                                   |
| **Development Model**     | Trunk-based development with short-lived feature branches        |
| **Primary AI Agent**      | GitHub Copilot (Workspace/Chat mode)                             |

## 2. Mission Statement

SBTM provides real-time school bus tracking, student presence detection (BLE SmartTags and manual), emergency alerting, compliance management, and parent notification across a multi-tenant platform supporting Ontario School Transportation Authorities (OSTAs), school boards, and individual schools. The system must protect student privacy, enforce tenant isolation, and deliver safety-critical notifications reliably.

## 3. Core Technology Stack

```mermaid
graph LR
    subgraph "Frontend Layer"
        ADMIN[Admin Dashboard<br/>React 19 + Vite + Tailwind]
        PARENT[Parent Portal<br/>React 19 + Vite + Tailwind]
        DRIVER[Driver App<br/>React Native + Expo]
    end

    subgraph "API Layer"
        GW[API Gateway<br/>NestJS + JWT + RBAC]
    end

    subgraph "Service Layer"
        GPS[GPS Tracking<br/>Express + Prisma]
        ALERTS[Emergency Alerts<br/>NestJS + BullMQ + Socket.IO]
        PRESENCE[Student Presence<br/>NestJS + BullMQ + Socket.IO]
        VIDEO[Video Service<br/>NestJS + MinIO]
        STUDENTS[Student Management<br/>NestJS + TypeORM]
        COMPLIANCE[Compliance Mgmt<br/>NestJS + TypeORM]
    end

    subgraph "Infrastructure"
        PG[(PostgreSQL 15<br/>+ PostGIS)]
        REDIS[(Redis 7)]
    end

    ADMIN --> GW
    PARENT --> GW
    DRIVER --> GW
    GW --> GPS
    GW --> ALERTS
    GW --> PRESENCE
    GW --> VIDEO
    GW --> STUDENTS
    GW --> COMPLIANCE
    GPS --> PG
    ALERTS --> REDIS
    PRESENCE --> REDIS
    STUDENTS --> PG
    COMPLIANCE --> PG

    style GW fill:#1565c0,color:#fff
    style PG fill:#2e7d32,color:#fff
    style REDIS fill:#d32f2f,color:#fff
```

| Layer            | Technology                                | Purpose                                                      |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------ |
| API Gateway      | NestJS + JWT + Passport                   | Auth, RBAC, rate limiting, tenant guards, service proxying   |
| Microservices    | NestJS (6 services) + Express (GPS)       | Domain-specific business logic with TypeScript               |
| Database         | PostgreSQL 15 + PostGIS                   | Relational storage with geospatial extensions                |
| Queuing          | Redis 7 + BullMQ                          | Job queues for alerts, presence, and notification processing |
| Real-time        | Socket.IO + SSE                           | WebSocket broadcast and server-sent events                   |
| Web Frontend     | React 19 + Vite + TailwindCSS             | Admin dashboard and parent portal                            |
| Mobile           | React Native + Expo                       | Driver app (iOS/Android/Web)                                 |
| Object Storage   | MinIO (S3-compatible)                     | Video event storage                                          |
| Maps             | Leaflet (web), React Native Maps (mobile) | Route visualization and live tracking                        |
| Containerization | Docker + Docker Compose                   | Development and deployment orchestration                     |

## 4. SDLC Lifecycle with Quality Gates

Every phase of the software development lifecycle includes quality and privacy activities. Features advance through gates before reaching production.

```mermaid
graph TD
    REQ[Requirements<br/>Phase] -->|Gate 1| ARCH[Architecture &<br/>Design Phase]
    ARCH -->|Gate 2| CODE[Coding<br/>Phase]
    CODE -->|Gate 3| TEST[Testing<br/>Phase]
    TEST -->|Gate 4| INT[Integration &<br/>CI/CD Phase]
    INT -->|Gate 5| DEP[Deployment &<br/>Operations Phase]
    DEP -->|Continuous| MON[Monitoring &<br/>Feedback Phase]
    MON -->|Iterate| REQ

    G1{{"G1: Privacy Impact<br/>Data Classification<br/>Compliance Check"}}
    G2{{"G2: Design Review<br/>Tenant Isolation<br/>Threat Model"}}
    G3{{"G3: Lint + SAST<br/>Code Review<br/>Unit Tests Pass"}}
    G4{{"G4: Integration Tests<br/>Auth/RBAC Tests<br/>Privacy Checks"}}
    G5{{"G5: Deploy Approval<br/>Health Checks<br/>Rollback Verified"}}

    REQ -.-> G1
    ARCH -.-> G2
    CODE -.-> G3
    TEST -.-> G4
    INT -.-> G5

    style REQ fill:#1565c0,color:#fff
    style ARCH fill:#1565c0,color:#fff
    style CODE fill:#2e7d32,color:#fff
    style TEST fill:#2e7d32,color:#fff
    style INT fill:#f57c00,color:#fff
    style DEP fill:#d32f2f,color:#fff
    style MON fill:#6a1b9a,color:#fff
```

### Quality Gate Definitions

| Gate   | Phase Transition            | Mandatory Checks                                                                                       |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------ |
| **G1** | Requirements → Architecture | Privacy impact assessed; data classification assigned; compliance requirements mapped (PIPEDA, MFIPPA) |
| **G2** | Architecture → Coding       | Design review completed; tenant isolation documented; threat model for child-safety scenarios          |
| **G3** | Coding → Testing            | ESLint passes (zero errors); code review by peer; no hardcoded secrets; unit tests included            |
| **G4** | Testing → Integration       | Integration tests pass; auth and RBAC scenarios verified; tenant cross-access tests pass               |
| **G5** | Integration → Deployment    | Deployment approval from lead; health checks verified; rollback procedure tested                       |

## 5. Universal Rules — Always Enforce

These rules apply to all code, documentation, and configuration in this project.

### 5.1 Privacy and Data Handling

- **RULE-PII-01**: Student data is personally identifiable information about minors. Handle with the highest care. Never log student names, addresses, or parent contact details in plain text.
- **RULE-PII-02**: Test data must be synthetic. Never use real student names, real addresses, or real parent contact information in tests or seed data.
- **RULE-PII-03**: All API responses containing student data must be scoped to the authenticated user's tenant (`school_id`).
- **RULE-PII-04**: Comply with PIPEDA consent requirements for any new data collection or sharing feature.

### 5.2 Security

- **RULE-SEC-01**: No hardcoded secrets, passwords, API keys, or tokens in source code. Use environment variables or secret management.
- **RULE-SEC-02**: All external-facing endpoints must require JWT authentication via the API Gateway.
- **RULE-SEC-03**: Validate and sanitize all user input at system boundaries using class-validator (NestJS) or Zod (Express).
- **RULE-SEC-04**: Apply RBAC checks for every mutation endpoint. Never trust client-supplied role or tenant context.
- **RULE-SEC-05**: Apply rate limiting on authentication and data-write endpoints.

### 5.3 Code Quality

- **RULE-QA-01**: All new code must have accompanying unit tests. Target 80% line coverage for services.
- **RULE-QA-02**: Use TypeScript strict mode (`"strict": true`) across all packages.
- **RULE-QA-03**: Handle errors explicitly. Never swallow exceptions. Use structured error responses.
- **RULE-QA-04**: Use structured logging with correlation IDs for cross-service request tracing.

### 5.4 Development Process

- **RULE-DEV-01**: All changes go through pull requests with at least one reviewer.
- **RULE-DEV-02**: Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **RULE-DEV-03**: CI must pass (lint, test, build) before PR merge.
- **RULE-DEV-04**: Document architectural decisions in ADRs when they affect service boundaries, data models, or security posture.

### 5.5 Compliance

- **RULE-CMP-01**: PIPEDA and MFIPPA govern student and parent data handling. Document consent flows for new data use.
- **RULE-CMP-02**: Ontario Highway Traffic Act requirements apply to route compliance, vehicle inspections, and driver certifications.
- **RULE-CMP-03**: Maintain audit logs for critical operations: auth events, student data access, emergency alerts, compliance changes.
- **RULE-CMP-04**: Data retention schedules must align with MFIPPA record retention requirements.

## 6. Architectural Principles

- **Multi-tenant first**: Every query, mutation, and API response must respect tenant boundaries via `school_id`.
- **Event-aware**: Business-critical state changes produce domain events consumed by notification and analytics pipelines.
- **Privacy-by-design**: Student data minimization, consent tracking, and audit trails are architectural concerns, not afterthoughts.
- **Graceful degradation**: The driver app must buffer events offline and replay on reconnect. Parent-facing features must degrade gracefully when backend services are unavailable.
- **Separation of concerns**: Business, design, implementation, and operational documentation remain in separate doc domains.

## 7. Related Documents

- [README.md](README.md) — SDLC guidelines index and loading order
- [docs/Governance/DocumentationPolicy.md](../Governance/DocumentationPolicy.md) — Documentation structure and maintenance rules
- [docs/Business/Requirements.md](../Business/Requirements.md) — Business requirements baseline
- [docs/Design/Architecture.md](../Design/Architecture.md) — v1 target architecture

---

## data_classification

_Source: `sdlc_guidelines/01_security_compliance/data_classification.md`_

# Data Classification

- Document owner: Engineering and Security
- Last reviewed: 2026-03-24
- Primary use: Data classification tiers and handling rules for SBTM

## Purpose

SBTM processes data ranging from public system metadata to highly sensitive student PII. This document defines classification tiers and the handling rules that apply at each tier.

## Classification Tiers

| Tier   | Label          | Examples                                                                                                    | Handling Rules                                                                                                                          |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **T1** | Public         | System health status, API docs, feature descriptions                                                        | No restrictions. May appear in logs, error messages, and public documentation                                                           |
| **T2** | Internal       | Service configuration, route geometry, vehicle metadata, school names                                       | Accessible to authenticated users with appropriate role. Do not expose in public endpoints                                              |
| **T3** | Confidential   | Parent email/phone, driver credentials, alert details, compliance records                                   | Encrypted at rest and in transit. Access restricted by tenant and role. Audit all access                                                |
| **T4** | Restricted PII | Student names, student IDs, guardian-student relationships, GPS history linked to students, presence events | Highest protection. Encrypted at rest and in transit. Tenant-scoped. Audit all reads and writes. PIPEDA consent required for collection |

## Data-to-Tier Mapping

| Data Entity                            | Tier | Tenant Context       | Retention                     |
| -------------------------------------- | ---- | -------------------- | ----------------------------- |
| Student name, external_student_id      | T4   | school_id            | Per MFIPPA schedule           |
| Guardian contact (email, phone)        | T4   | school_id            | Per MFIPPA schedule           |
| Student-route-stop assignments         | T4   | school_id            | Active enrollment + archive   |
| Presence events (board/alight)         | T4   | school_id            | 1 year operational + archive  |
| GPS location history                   | T3   | school_id + route_id | 90 days operational + archive |
| Emergency alerts                       | T3   | school_id            | 1 year operational + archive  |
| Driver profile and credentials         | T3   | school_id            | Employment period + 7 years   |
| Vehicle records and inspections        | T3   | school_id            | Vehicle lifecycle + 7 years   |
| Compliance audit logs                  | T3   | school_id            | 7 years minimum               |
| Route definitions and stop coordinates | T2   | school_id            | Active route lifetime         |
| School and board metadata              | T2   | board_id / school_id | Organizational lifetime       |
| System health metrics                  | T1   | None                 | 30 days                       |
| API documentation                      | T1   | None                 | No retention limit            |

## Handling Rules by Tier

### T4 — Restricted PII

- Must not appear in log messages (use IDs or hashed references only).
- Must not be returned in API error payloads.
- API responses must be scoped by authenticated tenant.
- Database queries must include `school_id` filter.
- Changes to T4 data must produce audit log events.
- Bulk export requires explicit authorization and audit trail.

### T3 — Confidential

- May appear in structured logs with correlation IDs (but not in plain-text message bodies).
- API access requires authentication and appropriate RBAC role.
- Changes to T3 data should produce audit log events for safety-critical records.

### T2 — Internal

- Accessible to any authenticated user with a valid tenant context.
- No special encryption beyond standard transport (HTTPS) and storage encryption.

### T1 — Public

- No access restrictions required.
- May be cached, logged, and included in error messages without concern.

## Implementation Patterns

### Logging

```typescript
// CORRECT — T4 data referenced by ID only
logger.info('Presence event recorded', { studentId: event.studentId, eventType: event.type });

// INCORRECT — T4 data in plain text
logger.info(`Student ${student.name} boarded bus at ${stop.address}`);
```

### API Responses

```typescript
// CORRECT — tenant-scoped query
const students = await repo.find({ where: { schoolId: user.schoolId } });

// INCORRECT — unscoped query
const students = await repo.find();
```

## Related Documents

- [privacy_compliance.md](./01_security_compliance/privacy_compliance.md) — PIPEDA and MFIPPA mapping
- [supply_chain_security.md](./01_security_compliance/supply_chain_security.md) — Dependency security
- [../00_master_policy.md](./00_master_policy.md) — Universal rules (RULE-PII-\*)

---

## privacy_compliance

_Source: `sdlc_guidelines/01_security_compliance/privacy_compliance.md`_

# Privacy Compliance

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: PIPEDA, MFIPPA, and CASL compliance mapping for SBTM

## Purpose

SBTM handles personally identifiable information about minors (students) and their guardians. This document maps applicable Canadian privacy frameworks to SBTM's data processing activities and defines compliance requirements that must be followed throughout the SDLC.

## Applicable Frameworks

| Framework                       | Scope                                                | SBTM Relevance                                                                             |
| ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **PIPEDA**                      | Federal private-sector privacy law                   | Governs collection, use, and disclosure of personal information by SBTM as a SaaS provider |
| **MFIPPA**                      | Ontario municipal freedom of information and privacy | Applies when school boards (public institutions) share student data with SBTM              |
| **CASL**                        | Canada's Anti-Spam Legislation                       | Governs electronic notifications sent to parents (SMS, email, push)                        |
| **Ontario Highway Traffic Act** | School bus safety regulations                        | Governs vehicle compliance, driver licensing, and route safety requirements                |
| **AODA**                        | Accessibility for Ontarians with Disabilities Act    | Web and mobile accessibility requirements for public-facing applications                   |

## PIPEDA Principles Mapping

| PIPEDA Principle           | SBTM Implementation Requirement                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| **Accountability**         | Designate a data steward per tenant. Document data processing agreements with school boards      |
| **Identifying Purposes**   | Collect student data only for transportation safety. Document purposes in the privacy notice     |
| **Consent**                | Obtain informed guardian consent before collecting student PII. Consent must be revocable        |
| **Limiting Collection**    | Collect only data necessary for safe transportation: name, school, route, stop, guardian contact |
| **Limiting Use**           | Do not use student data for marketing, analytics beyond safety, or any secondary purpose         |
| **Accuracy**               | Provide mechanisms for guardians to update student and contact information                       |
| **Safeguards**             | Encrypt data at rest and in transit. Enforce tenant isolation. Audit access to student records   |
| **Openness**               | Publish a privacy policy describing data practices. Make it accessible from the parent portal    |
| **Individual Access**      | Support data access requests within 30 days. Provide export in machine-readable format           |
| **Challenging Compliance** | Provide a channel for privacy complaints. Escalate to the Privacy Commissioner if unresolved     |

## MFIPPA Requirements

When school boards (municipal institutions) provide student roster data to SBTM:

- A data sharing agreement must exist between the school board and SBTM before data transfer.
- SBTM acts as a data processor; the school board remains the data controller.
- SBTM must not disclose student data to third parties without explicit board authorization.
- Records must be retained according to MFIPPA retention schedules (typically 7 years for student records).
- Freedom of Information requests about student transport records are the school board's responsibility; SBTM must support data extraction to fulfill them.

## CASL Notification Requirements

| Notification Type                  | CASL Requirement                                   | SBTM Implementation                                   |
| ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Emergency alerts (PANIC, ACCIDENT) | Implied consent for safety-critical communications | Deliver immediately without separate opt-in           |
| Boarding/alighting notifications   | Express consent required                           | Guardian opts in during onboarding; opt-out available |
| Delay and route status updates     | Express consent required                           | Guardian opts in during onboarding; opt-out available |
| Marketing or promotional messages  | Express consent with unsubscribe                   | Not applicable — SBTM does not send marketing content |

## Compliance Checkpoints in SDLC

| Phase        | Privacy Activity                                                                            |
| ------------ | ------------------------------------------------------------------------------------------- |
| Requirements | Identify new PII collection. Assess PIPEDA consent needs. Tag requirements with `PR-*` IDs  |
| Architecture | Privacy impact assessment for new data flows. Document tenant isolation and access controls |
| Coding       | Implement data minimization. Audit log student data access. No PII in plain-text logs       |
| Testing      | Verify tenant isolation. Test consent flows. Validate data access request export            |
| Deployment   | Confirm encryption at rest and in transit. Verify audit logging is active                   |
| Operations   | Monitor for unauthorized cross-tenant access. Respond to access and deletion requests       |

## Related Documents

- [data_classification.md](./01_security_compliance/data_classification.md) — Student PII classification tiers
- [supply_chain_security.md](./01_security_compliance/supply_chain_security.md) — Dependency security
- [../00_master_policy.md](./00_master_policy.md) — Universal rules
- [../../Business/Requirements.md](../../Business/Requirements.md) — Privacy requirements (PR-\*)

---

## supply_chain_security

_Source: `sdlc_guidelines/01_security_compliance/supply_chain_security.md`_

# Supply Chain Security

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Dependency vetting and supply chain security for npm, Docker, and CI dependencies

## Purpose

SBTM depends on open-source packages via npm and Docker images. This document defines rules for vetting, monitoring, and managing third-party dependencies to prevent supply chain attacks.

## npm Dependency Rules

- Run `pnpm audit` in CI for every PR. Block merges on critical or high severity vulnerabilities.
- Pin major versions in `package.json`. Use exact versions in lockfiles (`pnpm-lock.yaml`).
- Review new dependencies before adding. Prefer packages with: active maintenance, known maintainers, >1000 weekly downloads, no known CVEs.
- Do not use packages that are deprecated, unmaintained (>1 year without update), or from unknown publishers.
- Audit `postinstall` scripts. Disable automatic script execution in CI (`--ignore-scripts`) and run scripts explicitly for trusted packages only.

## Docker Image Rules

- Use official or verified publisher images only (e.g., `node:20-alpine`, `postgres:15`, `redis:7-alpine`).
- Pin image tags to specific digests or semantic versions. Never use `:latest` in production Dockerfiles.
- Scan images with a vulnerability scanner (e.g., Trivy, Snyk) in CI. Block images with critical vulnerabilities.
- Use multi-stage builds to minimize the final image surface area. Do not include build tools, dev dependencies, or test fixtures in production images.
- Run containers as non-root users. Set `USER node` in Node.js Dockerfiles.

## CI Pipeline Security

- Protect CI secrets (database credentials, API keys, tokens) using the CI platform's secret management. Never echo secrets in logs.
- Pin CI action versions to specific commits or tags. Do not use `@latest` or `@main` for third-party GitHub Actions.
- Limit CI permissions to the minimum required (read for PRs, write only for deploy steps).
- Review and approve CI workflow changes in PRs like any other code change.

## Monitoring

- Enable GitHub Dependabot or equivalent for automated vulnerability alerts on npm and Docker dependencies.
- Review dependency audit reports weekly. Patch critical and high vulnerabilities within 7 days.
- Track dependency licenses. Avoid copyleft licenses (GPL) in runtime dependencies unless approved by the project lead.

## Related Documents

- [data_classification.md](./01_security_compliance/data_classification.md) — Data handling tiers
- [privacy_compliance.md](./01_security_compliance/privacy_compliance.md) — Compliance frameworks
- [../06_integration_cicd/ci_cd_pipeline.md](./06_integration_cicd/ci_cd_pipeline.md) — CI pipeline definition
- [../08_tech_specific/docker_guidelines.md](./08_tech_specific/docker_guidelines.md) — Docker standards

---

## requirements_engineering

_Source: `sdlc_guidelines/02_requirements/requirements_engineering.md`_

# Requirements Engineering

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Structured requirement capture with taxonomy, stable IDs, and RFC 2119 keywords

## Purpose

Define how requirements are captured, structured, and maintained in SBTM. All requirements use stable identifiers and follow a consistent taxonomy so they can be traced through design, implementation, and testing.

## Requirement Taxonomy

```mermaid
graph TD
    BR[Business Need] --> FR[Functional Requirements<br/>FR-*]
    BR --> NFR[Non-Functional Requirements<br/>NFR-*]
    BR --> PR[Privacy Requirements<br/>PR-*]
    BR --> SR[Security Requirements<br/>SR-*]
    BR --> OPS[Operational Requirements<br/>OPS-*]
    FR --> UC[Use Cases<br/>UC-*]
    FR --> FEAT[Features<br/>FEAT-*]
```

| Category       | ID Prefix | Description                | Example                                                                  |
| -------------- | --------- | -------------------------- | ------------------------------------------------------------------------ |
| Functional     | `FR-*`    | What the system must do    | FR-GPS-001: Record vehicle location at configurable intervals            |
| Non-Functional | `NFR-*`   | Quality attributes         | NFR-PERF-001: GPS ingest supports 100 updates/second                     |
| Privacy        | `PR-*`    | Data handling and consent  | PR-CONSENT-001: Guardian consent required before student data collection |
| Security       | `SR-*`    | Security controls          | SR-AUTH-001: All API endpoints require JWT authentication                |
| Operational    | `OPS-*`   | Deployment and runtime     | OPS-DEPLOY-001: Services start via Docker Compose with health checks     |
| Use Case       | `UC-*`    | End-to-end user workflow   | UC-001: Admin Plans a Route                                              |
| Feature        | `FEAT-*`  | Business-facing capability | FEAT-GPS-001: Real-Time Vehicle Location Tracking                        |

## RFC 2119 Keywords

Use these keywords consistently in requirement statements:

| Keyword    | Meaning                                                              |
| ---------- | -------------------------------------------------------------------- |
| **MUST**   | Absolute requirement. The feature will not ship without this         |
| **SHOULD** | Strongly recommended. Omission requires documented justification     |
| **MAY**    | Optional. Included if time and resources permit in the current phase |

## Requirement Record Template

Each requirement should include:

```markdown
### FR-GPS-001: Record Vehicle Location

- **Priority**: MUST
- **Category**: Functional
- **Description**: The GPS tracking service must accept and persist location updates from driver devices at configurable intervals.
- **Acceptance Criteria**: POST /locations accepts lat, lng, vehicleId, routeId, timestamp. Returns 201 with persisted record.
- **Traces To**: UC-002 (Driver Executes Route), FEAT-GPS-001
- **Implementation**: Module-1-GpsTracking.md
- **Phase**: Delivered
```

## Requirements Management Rules

- New requirements are added to `docs/Business/Requirements.md` with the next available ID.
- Requirements are never deleted; they are marked as `Superseded` with a reference to the replacement.
- Use case files live in `docs/Business/usecases/` with one file per use case.
- Feature entries live in `docs/Business/Features.md` with traceability back to requirements.
- Gap items in `docs/prd/GapAnalysis.md` should trace back to specific requirement IDs.

## Related Documents

- [traceability.md](./02_requirements/traceability.md) — Traceability matrix
- [../../Business/Requirements.md](../../Business/Requirements.md) — Live requirements catalog
- [../../Business/UseCases.md](../../Business/UseCases.md) — Use case index
- [../../Business/Features.md](../../Business/Features.md) — Feature catalog

---

## traceability

_Source: `sdlc_guidelines/02_requirements/traceability.md`_

# Traceability

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Bidirectional traceability rules between requirements, design, implementation, and tests

## Purpose

Ensure every requirement can be traced forward to implementation and tests, and every implementation decision can be traced back to a business need. Traceability prevents undocumented features, orphan code, and untested requirements.

## Traceability Chain

```mermaid
graph LR
    REQ[Requirements<br/>FR/NFR/PR/SR/OPS] --> UC[Use Cases<br/>UC-*]
    REQ --> FEAT[Features<br/>FEAT-*]
    FEAT --> DESIGN[Design Docs<br/>docs/Design/*]
    DESIGN --> IMPL[Implementation<br/>docs/Implementation/*]
    IMPL --> TEST[Tests<br/>Unit + Integration]
    UC --> DESIGN
    REQ --> GAP[Gap Analysis<br/>docs/prd/GapAnalysis.md]
    GAP --> PHASE[Phase Plan<br/>docs/prd/PhaseWiseImplementationPlan.md]
```

## Traceability Rules

| Source                         | Must Link To                                   | How                                        |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------ |
| Requirement (FR-_, PR-_, etc.) | Use cases and features                         | `Traces To` field in requirement record    |
| Use case (UC-\*)               | Requirements, design sections                  | Related Documents section in UC file       |
| Feature (FEAT-\*)              | Requirements, implementation module            | Requirement Coverage column in Features.md |
| Design document                | Business requirements justifying the design    | Related Documents section                  |
| Implementation module          | Gap analysis, delivery phase                   | Source of Truth section in Module-\*.md    |
| Test case                      | Requirement or acceptance criteria it verifies | Test description or comment                |

## Gap Traceability

Items in `docs/prd/GapAnalysis.md` must:

- Reference the v1 design target that created the gap.
- Reference the current implementation state that confirms the gap.
- Be assigned to a phase in `docs/prd/PhaseWiseImplementationPlan.md`.

## Verification

During PR review, check:

- New features trace back to a requirement ID.
- New requirements have corresponding use cases or feature entries.
- Implementation modules reference their delivery phase.
- Gap items are assigned to phases.

## Related Documents

- [requirements_engineering.md](./02_requirements/requirements_engineering.md) — Requirement capture format
- [../../Business/Requirements.md](../../Business/Requirements.md) — Requirements catalog
- [../../prd/GapAnalysis.md](../../prd/GapAnalysis.md) — Gap inventory
- [../../prd/PhaseWiseImplementationPlan.md](../../prd/PhaseWiseImplementationPlan.md) — Phase plan

---

## architecture_guidelines

_Source: `sdlc_guidelines/03_architecture_design/architecture_guidelines.md`_

# Architecture Guidelines

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: C4 modeling conventions, Mermaid diagram standards, and ADR format

## Purpose

Define how architectural decisions and system structure are documented in SBTM using the C4 model, Mermaid diagrams, and Architecture Decision Records (ADRs).

## C4 Model Adoption

SBTM architecture documentation uses the C4 model at three levels:

| Level         | What It Shows                                                     | Where Used                           |
| ------------- | ----------------------------------------------------------------- | ------------------------------------ |
| **Context**   | System boundary, actors, external dependencies                    | Architecture.md, DEMO_SETUP_GUIDE.md |
| **Container** | Applications, services, databases, and their interactions         | SystemArchitecture.md                |
| **Component** | Internal structure of a service (modules, controllers, providers) | Per-service design when needed       |

Code-level diagrams (C4 Level 4) are not maintained as documentation — the source code serves that purpose.

## Mermaid Conventions

All architecture diagrams use Mermaid for in-repo maintainability.

### Color Coding

| Element                   | Fill Color         | Meaning               |
| ------------------------- | ------------------ | --------------------- |
| API Gateway / entry point | `#1565c0` (blue)   | Central orchestration |
| Database                  | `#2e7d32` (green)  | Persistent storage    |
| Message queue / cache     | `#d32f2f` (red)    | Infrastructure        |
| Frontend apps             | `#6a1b9a` (purple) | User-facing           |
| External systems          | `#f57c00` (orange) | Outside SBTM boundary |

### Naming

- Use short, descriptive labels in diagram nodes: `GPS Tracking` not `services/gps-tracking NestJS application`.
- Include technology in parenthetical when helpful: `Container(gw, "API Gateway", "NestJS", "Auth, RBAC, proxies")`.

### Placement

- Embed diagrams inline in the markdown file where they are discussed.
- Do not store diagrams as external image files (SVG, PNG). Use Mermaid fenced code blocks.

## Architecture Decision Records (ADRs)

Record significant architectural decisions using this template:

```markdown
# ADR-NNN: Title

- Status: Proposed | Accepted | Superseded | Deprecated
- Date: YYYY-MM-DD
- Deciders: Names or roles

## Context

What is the issue or question that needs a decision?

## Decision

What was decided, and why?

## Consequences

What are the positive and negative outcomes of this decision?

## Alternatives Considered

What other options were evaluated?
```

### When to Write an ADR

- Adding or removing a service from the architecture.
- Changing the authentication or authorization model.
- Adopting a new database, queue, or infrastructure component.
- Changing tenant isolation strategy.
- Modifying the event-driven architecture pattern.

## Related Documents

- [design_guidelines.md](./03_architecture_design/design_guidelines.md) — Microservice design patterns
- [threat_modeling.md](./03_architecture_design/threat_modeling.md) — Threat modeling methodology
- [../../Design/Architecture.md](../../Design/Architecture.md) — v1 architecture overview
- [../../Design/SystemArchitecture.md](../../Design/SystemArchitecture.md) — System context and containers

---

## design_guidelines

_Source: `sdlc_guidelines/03_architecture_design/design_guidelines.md`_

# Design Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Microservice design patterns, event-driven architecture, and multi-tenancy patterns

## Purpose

Define the design patterns and conventions used in SBTM's microservice architecture. These patterns ensure consistency across the 7 backend services and 3 frontend applications.

## Service Decomposition

Each backend service owns a bounded context:

| Service               | Bounded Context            | Primary Entity     | Storage                     |
| --------------------- | -------------------------- | ------------------ | --------------------------- |
| API Gateway           | Auth, routing, aggregation | User sessions      | PostgreSQL (TypeORM)        |
| GPS Tracking          | Vehicle location           | Location records   | PostgreSQL (Prisma)         |
| Emergency Alerts      | Crisis events              | Alert records      | PostgreSQL + Redis (BullMQ) |
| Student Presence      | Attendance                 | Presence events    | PostgreSQL + Redis (BullMQ) |
| Video Service         | Video events               | Video metadata     | PostgreSQL + MinIO          |
| Student Management    | Enrollment                 | Student records    | PostgreSQL (TypeORM)        |
| Compliance Management | Inspections, audit         | Compliance records | PostgreSQL (TypeORM)        |

## Multi-Tenancy Pattern

SBTM uses application-layer tenant isolation with `school_id` as the tenant discriminator:

```mermaid
graph TD
    REQ[Incoming Request] --> GW[API Gateway]
    GW --> AUTH[JWT Validation]
    AUTH --> ROLE[RBAC Check]
    ROLE --> TENANT[Extract school_id<br/>from JWT claims]
    TENANT --> SVC[Downstream Service]
    SVC --> DB[Query with<br/>WHERE school_id = ?]
```

Rules:

- Every database query for tenant-scoped data must include `school_id` in the WHERE clause.
- The gateway extracts `school_id` from the JWT and propagates it to downstream services.
- Services must not accept `school_id` from client request bodies — use the JWT claim.
- Admin-level roles (OSTA Admin) may access cross-tenant data; all other roles are strictly tenant-scoped.

## Event-Driven Patterns

SBTM uses BullMQ (Redis-backed) for asynchronous event processing:

```mermaid
graph LR
    PRODUCER[Service<br/>e.g., Emergency Alerts] -->|Enqueue Job| QUEUE[BullMQ Queue<br/>Redis]
    QUEUE -->|Process| CONSUMER[Consumer<br/>e.g., Notification Service]
    CONSUMER --> DELIVER[Notification<br/>Push / SMS / Email]
```

### Event Design Rules

- Events should be immutable facts: "alert.created", "presence.boarded", "location.updated".
- Each event must include: `eventType`, `timestamp`, `tenantId` (school_id), and a payload.
- Producers must not depend on consumers — events are fire-and-forget from the producer's perspective.
- Consumers must be idempotent — processing the same event twice produces the same outcome.

## API Design Conventions

- Use RESTful endpoints with consistent resource naming: `/api/v1/{resource}`.
- Return standard HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error).
- Use DTOs with class-validator decorators (NestJS) or Zod schemas (Express) for request validation.
- Return structured error responses: `{ statusCode, message, error }`.
- Support pagination for list endpoints: `?page=1&limit=20`.

## Database Design Conventions

- Use UUID primary keys for all entities.
- Include `created_at` and `updated_at` timestamps on all tables.
- Include `school_id` as a required column on all tenant-scoped tables.
- Use database migrations (Prisma or TypeORM) — never modify schemas directly.
- Use naming conventions: `snake_case` for tables and columns, singular table names (`student`, not `students`).

## Related Documents

- [architecture_guidelines.md](./03_architecture_design/architecture_guidelines.md) — C4 model and ADR format
- [threat_modeling.md](./03_architecture_design/threat_modeling.md) — Threat modeling
- [../../Design/IntegrationArchitecture.md](../../Design/IntegrationArchitecture.md) — Integration patterns
- [../../Design/DataArchitecture.md](../../Design/DataArchitecture.md) — Data domain ownership

---

## threat_modeling

_Source: `sdlc_guidelines/03_architecture_design/threat_modeling.md`_

# Threat Modeling

- Document owner: Engineering and Security
- Last reviewed: 2026-03-24
- Primary use: STRIDE threat modeling methodology adapted for student safety and tenant isolation

## Purpose

Define how threats are identified and mitigated in SBTM. Given the system handles minor student data and safety-critical operations, threat modeling is a mandatory part of architectural design.

## Methodology

SBTM uses STRIDE for threat categorization:

| Category                   | Threat                       | SBTM Example                                                    |
| -------------------------- | ---------------------------- | --------------------------------------------------------------- |
| **Spoofing**               | Identity impersonation       | Attacker uses stolen JWT to submit fake presence events         |
| **Tampering**              | Data modification            | Malicious GPS coordinates injected to misrepresent bus location |
| **Repudiation**            | Denying actions              | Driver denies triggering a panic alert                          |
| **Information Disclosure** | Unauthorized data access     | Cross-tenant query returns students from another school         |
| **Denial of Service**      | System unavailability        | Flood of GPS updates overwhelms the tracking service            |
| **Elevation of Privilege** | Unauthorized role escalation | Parent account gains admin access to compliance data            |

## Trust Boundaries

```mermaid
graph TD
    subgraph "Untrusted Zone"
        BROWSER[Parent/Admin Browser]
        MOBILE[Driver Mobile App]
    end
    subgraph "DMZ"
        GW[API Gateway<br/>JWT + RBAC + Rate Limiting]
    end
    subgraph "Trusted Internal Zone"
        SVC[Backend Services]
        DB[(PostgreSQL)]
        REDIS[(Redis)]
    end
    BROWSER -->|HTTPS| GW
    MOBILE -->|HTTPS| GW
    GW -->|Internal HTTP| SVC
    SVC --> DB
    SVC --> REDIS
```

| Boundary                 | Threats                           | Mitigations                                                                             |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------------- |
| Browser/Mobile → Gateway | Spoofing, Tampering, DoS          | JWT validation, input validation, rate limiting, HTTPS only                             |
| Gateway → Services       | Spoofing, Elevation of Privilege  | Propagate verified JWT claims, enforce RBAC at gateway, planned service-to-service auth |
| Services → Database      | Information Disclosure, Tampering | Tenant-scoped queries (school_id), parameterized queries, planned RLS                   |

## Child Safety Threat Scenarios

| Scenario                         | Impact                                                | Mitigation                                                                                     |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| False boarding event             | Parent believes child is on bus when they are not     | Require verified source (driver action or BLE detection); audit trail for event origin         |
| Spoofed GPS position             | Admin map shows incorrect bus location                | Validate GPS coordinate ranges; detect teleportation anomalies; audit GPS source               |
| Emergency alert suppression      | Safety incident goes unreported                       | Alerts stored durably before delivery; audit all alert lifecycle transitions                   |
| Unauthorized student data access | Student PII exposed to wrong tenant                   | school_id scoping on every query; RBAC role checks; audit access to student records            |
| Notification to wrong parent     | Privacy breach — wrong guardian receives student data | Parent-student linkage verified at data layer; notification routing uses verified associations |

## When to Update the Threat Model

- Adding a new service or external integration.
- Changing the authentication or authorization model.
- Adding a new data flow involving student PII.
- Introducing a new notification channel (push, SMS, email).
- Modifying tenant isolation boundaries.

## Related Documents

- [architecture_guidelines.md](./03_architecture_design/architecture_guidelines.md) — Architecture conventions
- [design_guidelines.md](./03_architecture_design/design_guidelines.md) — Multi-tenancy and event patterns
- [../../Design/SecurityPrivacyArchitecture.md](../../Design/SecurityPrivacyArchitecture.md) — Security architecture
- [../01_security_compliance/data_classification.md](./01_security_compliance/data_classification.md) — Data tiers

---

## general_coding

_Source: `sdlc_guidelines/04_coding_standards/general_coding.md`_

# General Coding Standards

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Universal rules that apply to all SBTM code regardless of language or framework

## Purpose

Establish baseline code quality rules enforced across the entire monorepo. Language-specific and framework-specific rules are in companion files.

## Naming Conventions

| Element                    | Convention       | Example                                 |
| -------------------------- | ---------------- | --------------------------------------- |
| Variables, functions       | camelCase        | `getStudentById`, `routeConfig`         |
| Classes, interfaces, types | PascalCase       | `StudentService`, `LocationDto`         |
| Constants, enums           | UPPER_SNAKE_CASE | `MAX_GPS_INTERVAL`, `Role.SCHOOL_ADMIN` |
| Files (TypeScript)         | kebab-case       | `student-management.service.ts`         |
| Database tables, columns   | snake_case       | `student_presence`, `school_id`         |
| Environment variables      | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET`            |

## Code Organization

- One class or primary export per file.
- Group by feature, not by technical layer (e.g., `students/` contains controller, service, dto, and entity for students).
- Keep files under 300 lines. Split when a file exceeds this threshold.
- Order imports: external packages first, then internal modules, then relative paths.

## Error Handling

- Use framework-provided error classes (`HttpException` in NestJS, standard `Error` in Express).
- Throw errors early; catch errors at the boundary (controller/middleware level).
- Never swallow errors silently — always log or re-throw.
- Use structured error responses: `{ statusCode, message, error }`.
- Do not expose stack traces or internal paths in production error responses.

## Logging

- Use structured JSON logging in backend services.
- Include correlation fields: `requestId`, `tenantId` (school_id), `userId`, `action`.
- Log levels: `error` (failures), `warn` (degraded), `info` (business events), `debug` (development).
- Never log PII (student names, guardian contact info). See data classification guide for tier rules.
- Log template: `{ level, timestamp, service, requestId, tenantId, message, ...context }`.

## Environment and Configuration

- All runtime configuration comes from environment variables.
- Use `.env.example` files as templates — never commit `.env` files.
- Validate environment variables at startup using a schema (e.g., Joi, class-validator, or Zod).
- Fail fast on missing required configuration.

## Comments

- Write comments that explain _why_, not _what_.
- Remove commented-out code before committing.
- Use JSDoc for public API functions and DTOs that are consumed by other services.

## Git Conventions

- Commit messages follow Conventional Commits: `type(scope): description`.
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.
- Scope: service or app name (e.g., `gps-tracking`, `admin-dashboard`).
- Keep commits atomic — one logical change per commit.

## Related Documents

- [typescript_standards.md](./04_coding_standards/typescript_standards.md) — TypeScript-specific rules
- [nestjs_standards.md](./04_coding_standards/nestjs_standards.md) — NestJS conventions
- [secure_coding.md](./04_coding_standards/secure_coding.md) — Security-focused coding rules

---

## typescript_standards

_Source: `sdlc_guidelines/04_coding_standards/typescript_standards.md`_

# TypeScript Standards

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: TypeScript-specific conventions for SBTM monorepo

## Purpose

Define TypeScript coding standards enforced across all SBTM applications and services. These extend the general coding standards with TypeScript-specific rules.

## TypeScript Configuration

All packages share `tsconfig.base.json` at the monorepo root:

| Setting                    | Value  | Reason                             |
| -------------------------- | ------ | ---------------------------------- |
| `strict`                   | `true` | Catch type errors at compile time  |
| `noUncheckedIndexedAccess` | `true` | Undefined-safe array/object access |
| `esModuleInterop`          | `true` | Clean CJS/ESM interop              |
| `skipLibCheck`             | `true` | Faster builds                      |

Each package extends the base config and adds its own paths, includes, and module settings.

## Type Safety Rules

- Use `unknown` over `any`. If `any` is unavoidable, add an inline `// eslint-disable` comment with justification.
- Prefer type inference where the type is obvious from the right-hand side. Add explicit types for function parameters and return types.
- Use discriminated unions for state modeling:

```typescript
type AlertState =
  | { status: 'pending'; createdAt: Date }
  | { status: 'acknowledged'; acknowledgedBy: string; acknowledgedAt: Date }
  | { status: 'resolved'; resolvedBy: string; resolvedAt: Date };
```

- Use `readonly` for objects and arrays that should not be mutated after creation.
- Define DTOs as classes with class-validator decorators (NestJS) or as Zod schemas (Express services).

## Null Handling

- Use `null` for intentional absence (e.g., database nullable fields).
- Use `undefined` for optional values not yet set.
- Never use `!` (non-null assertion) except in test files. Use narrowing or early returns instead.

## Async/Await

- Always use `async/await` over raw Promises.
- Avoid `Promise.all` with side effects — if one fails, others may have already executed.
- Ensure all Promises are awaited or explicitly marked `void` (e.g., fire-and-forget queue pushes).

## Enums and Constants

- Prefer `const` objects with `as const` over `enum` for simple value sets:

```typescript
export const Role = {
  SCHOOL_ADMIN: 'school_admin',
  DRIVER: 'driver',
  PARENT: 'parent',
  OSTA_ADMIN: 'osta_admin',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
```

- Use TypeScript `enum` only when you need reverse mapping or integration with class-validator.

## Module and Import Rules

- Use path aliases defined in `tsconfig.json` for cross-module imports within a package.
- Avoid barrel files (`index.ts` re-exports) except at the package root.
- Import types with `import type` to avoid runtime overhead.

## Related Documents

- [general_coding.md](./04_coding_standards/general_coding.md) — Universal coding rules
- [nestjs_standards.md](./04_coding_standards/nestjs_standards.md) — NestJS-specific conventions
- [secure_coding.md](./04_coding_standards/secure_coding.md) — Security-focused coding rules

---

## nestjs_standards

_Source: `sdlc_guidelines/04_coding_standards/nestjs_standards.md`_

# NestJS Standards

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: NestJS-specific conventions for SBTM backend services

## Purpose

Define NestJS-specific patterns used across the 6 NestJS services in SBTM. The GPS Tracking service uses Express directly and follows only the general and TypeScript standards.

## Module Structure

Each NestJS service follows this structure:

```
services/<service-name>/src/
├── main.ts                  # Bootstrap, CORS, Swagger, validation pipe
├── app.module.ts            # Root module
├── config/                  # Configuration module, env validation
├── <feature>/
│   ├── <feature>.module.ts
│   ├── <feature>.controller.ts
│   ├── <feature>.service.ts
│   ├── dto/
│   │   ├── create-<feature>.dto.ts
│   │   └── update-<feature>.dto.ts
│   ├── entities/
│   │   └── <feature>.entity.ts
│   └── <feature>.controller.spec.ts
├── auth/                    # Guards, decorators, strategies
├── common/                  # Shared pipes, filters, interceptors
└── database/                # TypeORM/Prisma setup, migrations
```

## Dependency Injection

- Register all providers in their feature module, not in the root module.
- Use constructor injection (avoid property injection).
- Use `@Injectable()` with explicit scope only when needed (`Scope.REQUEST` for tenant-scoped services).
- Prefer interfaces for service contracts and inject using `@Inject('TOKEN')` when working with abstractions.

## Controllers

- Controllers handle HTTP concerns only: extract params, call service, return response.
- Use DTOs with `class-validator` decorators for all request bodies.
- Apply `@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` globally or per controller.
- Return consistent response shapes using interceptors or manual wrapping.

```typescript
@Post()
async create(@Body() dto: CreateStudentDto, @Req() req: Request) {
  const schoolId = req.user.schoolId; // from JWT
  return this.studentService.create(dto, schoolId);
}
```

## Guards and Decorators

- JWT authentication is enforced globally via `AuthGuard`.
- RBAC is enforced per route using a `@Roles()` decorator and `RolesGuard`.
- Tenant context (school_id) is extracted from the JWT by a custom decorator or guard.

```typescript
@Roles(Role.SCHOOL_ADMIN)
@Get()
async findAll(@TenantId() schoolId: string) {
  return this.service.findAll(schoolId);
}
```

## Exception Handling

- Use NestJS built-in exceptions: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`.
- Register a global `AllExceptionsFilter` that formats errors consistently and logs them.
- Never expose stack traces in production responses.

## Database Access

- Use repository pattern via TypeORM repositories or Prisma client.
- Services interact with the database through repositories — controllers never access repositories directly.
- Always include `school_id` in queries for tenant-scoped entities.
- Use database transactions for multi-step operations that must be atomic.

## WebSocket / Socket.IO

- Socket.IO gateways follow the same auth pattern — validate JWT on connection handshake.
- Emit events with tenant context: `{ schoolId, eventType, payload }`.
- Define event names as constants in a shared location.

## Related Documents

- [general_coding.md](./04_coding_standards/general_coding.md) — Universal coding rules
- [typescript_standards.md](./04_coding_standards/typescript_standards.md) — TypeScript-specific rules
- [secure_coding.md](./04_coding_standards/secure_coding.md) — Security patterns
- [../03_architecture_design/design_guidelines.md](./03_architecture_design/design_guidelines.md) — Multi-tenancy and event patterns

---

## secure_coding

_Source: `sdlc_guidelines/04_coding_standards/secure_coding.md`_

# Secure Coding Standards

- Document owner: Engineering and Security
- Last reviewed: 2026-03-24
- Primary use: Security-focused coding rules aligned with OWASP Top 10 and SBTM's privacy requirements

## Purpose

Define secure coding practices for SBTM. These rules supplement the general and framework-specific standards with security-focused requirements. Given that SBTM handles minor student data, security is non-negotiable.

## OWASP Top 10 Mitigations

### A01 — Broken Access Control

- Enforce RBAC at the API Gateway using guards and decorators.
- Every tenant-scoped query must include `school_id` from the JWT — never from user input.
- Deny by default — routes require explicit `@Roles()` to be accessible.
- Validate that users can only access their own resources (object-level authorization).

### A02 — Cryptographic Failures

- Never store passwords in plaintext. Use bcrypt with a cost factor of at least 10.
- Use TLS for all external communication (HTTPS enforcement at the gateway).
- Store secrets in environment variables — never hardcode in source code.
- Use UUID v4 for identifiers — never sequential or guessable IDs.

### A03 — Injection

- Use parameterized queries for all database access (TypeORM/Prisma handle this by default).
- Validate all input using class-validator DTOs with `whitelist: true` and `forbidNonWhitelisted: true`.
- Sanitize user-generated content before rendering (React handles JSX escaping by default).
- Never construct SQL queries using string concatenation.

### A04 — Insecure Design

- Follow threat modeling for new features (see threat_modeling.md).
- Implement rate limiting at the API Gateway for all public-facing endpoints.
- Define and enforce security requirements (SR-\*) for every feature.

### A05 — Security Misconfiguration

- Disable debug endpoints and Swagger UI in production.
- Set security headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`.
- Configure CORS to allow only known origins.
- Remove default credentials and example configurations from deployed images.

### A07 — Identification and Authentication Failures

- JWT tokens must include: `sub` (userId), `schoolId`, `role`, `exp`, `iat`.
- Token expiry must be enforced — no permanent tokens.
- Failed login attempts should be rate-limited.
- Implement token refresh for long-lived sessions.

### A08 — Software and Data Integrity Failures

- Pin dependency versions in `package.json` (exact versions, not ranges).
- Run `pnpm audit` in CI pipeline and fail on critical/high vulnerabilities.
- Validate webhook payloads with signatures when integrating external services.

### A09 — Security Logging and Monitoring Failures

- Log authentication events: login success, login failure, token refresh, logout.
- Log authorization failures: forbidden access attempts with userId, attempted resource, and tenant context.
- Log data access events for T3/T4 classified data (see data_classification.md).
- Never log PII: student names, guardian phone numbers, email addresses.

## PII Handling in Code

```typescript
// BAD — PII in logs
logger.info(`Student ${student.name} boarded bus ${busId}`);

// GOOD — IDs only
logger.info(`Student ${student.id} boarded bus ${busId}`, {
  tenantId: schoolId,
  action: 'student.boarded',
});
```

```typescript
// BAD — PII in API response metadata
return { ...student, parent: { name, phone, email } };

// GOOD — minimal fields
return { ...student, parent: { id: parent.id, hasConsent: parent.consentGranted } };
```

## Dependency Security

- Audit dependencies weekly using `pnpm audit`.
- Do not install packages with fewer than 100 weekly downloads unless justified.
- Prefer well-maintained packages with active security response teams.
- Lock file (`pnpm-lock.yaml`) must be committed and used for deterministic installs.

## Related Documents

- [general_coding.md](./04_coding_standards/general_coding.md) — Universal coding rules
- [../01_security_compliance/data_classification.md](./01_security_compliance/data_classification.md) — Data tier rules
- [../01_security_compliance/privacy_compliance.md](./01_security_compliance/privacy_compliance.md) — PIPEDA/MFIPPA compliance
- [../03_architecture_design/threat_modeling.md](./03_architecture_design/threat_modeling.md) — Threat model

---

## testing_strategy

_Source: `sdlc_guidelines/05_testing/testing_strategy.md`_

# Testing Strategy

- Document owner: Engineering and QA
- Last reviewed: 2026-03-24
- Primary use: Test pyramid, coverage requirements, and test organization for SBTM

## Purpose

Define the testing approach for SBTM services and applications. Tests ensure correctness, prevent regressions, and validate that privacy and safety requirements are met.

## Test Pyramid

```mermaid
graph TD
    subgraph "Test Pyramid"
        E2E["E2E / Smoke Tests<br/>Few — critical paths only"]
        INT["Integration Tests<br/>Service boundaries, DB, queues"]
        UNIT["Unit Tests<br/>Business logic, utilities, validators"]
    end
    UNIT --> INT --> E2E
```

| Layer           | Scope                                             | Tools                          | Target                       |
| --------------- | ------------------------------------------------- | ------------------------------ | ---------------------------- |
| **Unit**        | Single function, class, or module in isolation    | Jest                           | All services and apps        |
| **Integration** | Service + database, service + Redis, API endpoint | Jest + Supertest               | Backend services             |
| **E2E / Smoke** | Multi-service workflow through API Gateway        | Jest + Supertest or Playwright | CI pipeline (critical paths) |

## Coverage Requirements

| Service Type            | Minimum Coverage  | Notes                                             |
| ----------------------- | ----------------- | ------------------------------------------------- |
| NestJS services         | 70% line coverage | Focus on service layer and guards                 |
| Express service (GPS)   | 70% line coverage | Focus on route handlers and validators            |
| React admin dashboard   | 60% line coverage | Focus on hooks, state management, API calls       |
| React Native driver app | 60% line coverage | Focus on hooks and business logic                 |
| Shared utilities        | 80% line coverage | Pure functions should have near-complete coverage |

## Test Organization

```
services/<service-name>/
├── src/
│   ├── <feature>/
│   │   ├── <feature>.service.ts
│   │   ├── <feature>.service.spec.ts    ← Unit test (co-located)
│   │   └── <feature>.controller.spec.ts ← Unit test (co-located)
│   └── ...
├── test/
│   ├── <feature>.integration.spec.ts    ← Integration tests
│   └── setup.ts                          ← Test database setup
└── jest.config.js
```

Rules:

- Unit tests are co-located with the source file: `file.ts` → `file.spec.ts`.
- Integration tests go in the `test/` directory at the service root.
- Test files use the naming pattern: `*.spec.ts` (unit), `*.integration.spec.ts` (integration), `*.e2e.spec.ts` (end-to-end).

## Test Data Rules

- Use factory functions or builders to create test data — not raw object literals scattered across tests.
- Never use production data in tests.
- Test data for student entities must use obviously fake data (e.g., "Test Student Alpha", IDs starting with `test-`).
- Integration tests that touch the database must clean up after themselves (use transactions or truncation).

## What to Test

| Must Test                            | How                                                                  |
| ------------------------------------ | -------------------------------------------------------------------- |
| Tenant isolation (school_id scoping) | Integration test: verify Service A cannot read Service B tenant data |
| RBAC enforcement                     | Unit test: guards reject unauthorized roles                          |
| Input validation                     | Unit test: invalid DTOs are rejected                                 |
| Error handling                       | Unit test: service returns proper error for edge cases               |
| Queue processing                     | Integration test: enqueue job, verify consumer outcome               |
| WebSocket authentication             | Integration test: unauthenticated socket is rejected                 |

## Related Documents

- [security_testing.md](./05_testing/security_testing.md) — Security-specific test patterns
- [performance_testing.md](./05_testing/performance_testing.md) — Load and performance testing
- [../../Test/TestingGuide.md](../../Test/TestingGuide.md) — Project testing guide

---

## security_testing

_Source: `sdlc_guidelines/05_testing/security_testing.md`_

# Security Testing

- Document owner: Engineering and Security
- Last reviewed: 2026-03-24
- Primary use: Security test patterns for SBTM, including tenant isolation, auth, and PII leak detection

## Purpose

Define security-specific testing requirements that go beyond functional correctness. These tests verify that privacy controls, access restrictions, and data isolation work as designed.

## Tenant Isolation Tests

Every service that handles tenant-scoped data must include tests verifying that cross-tenant access is denied:

```typescript
describe('Tenant Isolation', () => {
  it('should not return students from another school', async () => {
    // Setup: create students in school A and school B
    const schoolAToken = generateJwt({ schoolId: 'school-a', role: 'school_admin' });

    const response = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${schoolAToken}`);

    // Verify: only school A students returned
    expect(response.body.every((s) => s.schoolId === 'school-a')).toBe(true);
  });
});
```

## Authentication Tests

| Scenario                                | Expected Outcome |
| --------------------------------------- | ---------------- |
| Request without Authorization header    | 401 Unauthorized |
| Request with expired JWT                | 401 Unauthorized |
| Request with malformed JWT              | 401 Unauthorized |
| Request with valid JWT but wrong role   | 403 Forbidden    |
| Request with valid JWT and correct role | 200 OK           |

## Authorization (RBAC) Tests

Test that each role can only access its permitted endpoints:

| Role           | Can Access                            | Cannot Access                                    |
| -------------- | ------------------------------------- | ------------------------------------------------ |
| `parent`       | Own child's location, presence events | Other parents' data, admin endpoints, compliance |
| `driver`       | Own route, presence management        | Student management, compliance, admin            |
| `school_admin` | All data within own school            | Other schools' data, OSTA admin endpoints        |
| `osta_admin`   | Cross-school data, compliance         | N/A (highest role)                               |

## PII Leak Detection

Automated tests should verify that API responses and logs do not leak PII:

```typescript
describe('PII Leak Prevention', () => {
  it('should not include student name in GPS location response', async () => {
    const response = await request(app)
      .get('/api/v1/locations/latest')
      .set('Authorization', `Bearer ${adminToken}`);

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('studentName');
    expect(body).not.toContain('guardianPhone');
    expect(body).not.toContain('guardianEmail');
  });
});
```

## Input Validation Tests

Test that malicious or malformed inputs are rejected:

| Input                         | Test                                                 |
| ----------------------------- | ---------------------------------------------------- |
| SQL injection in query params | `?search=' OR 1=1 --` returns 400, not data          |
| XSS in text fields            | `<script>alert(1)</script>` is sanitized or rejected |
| Oversized payloads            | Request body > 1MB returns 413                       |
| Invalid GPS coordinates       | `lat: 999, lng: -999` returns 400                    |
| Negative pagination values    | `?page=-1&limit=0` returns 400                       |

## Dependency Vulnerability Scanning

- Run `pnpm audit` as a CI step.
- Fail the build on `critical` or `high` severity findings.
- Review `moderate` findings monthly.
- Document accepted risks for `low` findings that cannot be resolved.

## Related Documents

- [testing_strategy.md](./05_testing/testing_strategy.md) — Test pyramid and coverage targets
- [performance_testing.md](./05_testing/performance_testing.md) — Load testing
- [../04_coding_standards/secure_coding.md](./04_coding_standards/secure_coding.md) — Secure coding rules
- [../01_security_compliance/data_classification.md](./01_security_compliance/data_classification.md) — PII tier rules

---

## performance_testing

_Source: `sdlc_guidelines/05_testing/performance_testing.md`_

# Performance Testing

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Load testing, performance budgets, and benchmarking for SBTM services

## Purpose

Define performance testing requirements for SBTM. School bus tracking is time-sensitive — GPS updates, emergency alerts, and presence notifications must arrive within acceptable latency bounds.

## Performance Budgets

| Operation                             | Target Latency (p95) | Throughput Target             |
| ------------------------------------- | -------------------- | ----------------------------- |
| GPS location POST                     | < 200ms              | 100 updates/second per school |
| Location query (latest by route)      | < 300ms              | N/A                           |
| Emergency alert creation              | < 500ms              | N/A                           |
| Student presence event (board/alight) | < 300ms              | 50 events/second per school   |
| Admin dashboard page load             | < 2s                 | N/A                           |
| WebSocket connection establishment    | < 1s                 | 200 concurrent connections    |
| Parent app notification delivery      | < 3s (end-to-end)    | N/A                           |

## Load Test Scenarios

### Scenario 1: Morning Route Simulation

Simulate a typical morning bus run with concurrent GPS and presence events:

- 20 buses per school, 5 schools
- Each bus: GPS update every 5 seconds, 15 boarding events over 20 minutes
- Expected: ~20 GPS updates/sec, ~12 presence events/sec sustained over 20 min
- Pass criteria: API p95 latency within budgets, zero 5xx errors

### Scenario 2: Emergency Alert Burst

Simulate simultaneous alerts from multiple buses:

- 10 buses trigger alerts within 30 seconds
- Each alert generates notifications to ~30 parents
- Pass criteria: All alerts created within 500ms, all notifications queued within 5 seconds

### Scenario 3: Dashboard Concurrent Users

Simulate school administrators monitoring active routes:

- 50 concurrent admin users on dashboard
- Each user has WebSocket subscriptions for 5 routes
- Pass criteria: WebSocket messages delivered within 2 seconds, dashboard API calls within 300ms p95

## Tools

| Purpose               | Tool                    | Notes                                   |
| --------------------- | ----------------------- | --------------------------------------- |
| HTTP load testing     | k6 or Artillery         | Script-based, can simulate GPS payloads |
| WebSocket testing     | k6 (websocket protocol) | Test Socket.IO connection scaling       |
| Database benchmarking | pgbench                 | PostGIS spatial query performance       |
| Frontend performance  | Lighthouse (CI)         | Admin dashboard performance scores      |

## When to Run Performance Tests

- Before a major release (Phase completion).
- After changing the database schema or adding indexes.
- After modifying the GPS ingest pipeline or WebSocket infrastructure.
- After changing the BullMQ queue configuration or consumer concurrency.

## Monitoring During Tests

Collect these metrics during load tests:

- API response latencies (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database connection pool utilization
- Redis memory usage and queue depths
- Container CPU and memory usage
- WebSocket connection count

## Related Documents

- [testing_strategy.md](./05_testing/testing_strategy.md) — Test pyramid and coverage
- [security_testing.md](./05_testing/security_testing.md) — Security test patterns
- [../07_deployment_operations/monitoring_observability.md](./07_deployment_operations/monitoring_observability.md) — Production monitoring

---

## branching_strategy

_Source: `sdlc_guidelines/06_integration_cicd/branching_strategy.md`_

# Branching Strategy

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Git branching model, merge rules, and release flow for SBTM monorepo

## Purpose

Define the branching model for the SBTM monorepo. The strategy balances rapid development with stability by using feature branches, a shared main branch, and optional release branches.

## Branch Model

```mermaid
gitGraph
    commit id: "main"
    branch feature/GPS-001
    commit id: "GPS logic"
    commit id: "GPS tests"
    checkout main
    merge feature/GPS-001 id: "PR merge"
    branch release/1.0
    commit id: "version bump"
    commit id: "hotfix"
    checkout main
    merge release/1.0 id: "release merge"
```

## Branch Types

| Branch  | Pattern                          | Lifetime   | Purpose                                          |
| ------- | -------------------------------- | ---------- | ------------------------------------------------ |
| `main`  | `main`                           | Permanent  | Integration branch; always deployable to staging |
| Feature | `feature/<ticket>-<description>` | Days       | New features and enhancements                    |
| Bugfix  | `fix/<ticket>-<description>`     | Days       | Bug fixes                                        |
| Release | `release/<version>`              | Days–weeks | Stabilization before production deploy           |
| Hotfix  | `hotfix/<ticket>-<description>`  | Hours–days | Critical production fixes                        |

## Branch Rules

- `main` is protected: no direct pushes. All changes enter via pull request.
- Feature branches are created from `main` and merged back to `main`.
- Release branches are created from `main` when a phase milestone is ready. Only bugfixes are cherry-picked into release branches.
- Hotfix branches are created from the release tag or `main` and merged to both `main` and the active release branch.
- Delete feature branches after merge.

## Pull Request Requirements

| Requirement      | Rule                                                         |
| ---------------- | ------------------------------------------------------------ |
| Reviewers        | Minimum 1 approval required                                  |
| Tests            | CI pipeline must pass (lint, build, test)                    |
| Merge method     | Squash merge for feature branches; merge commit for releases |
| Branch freshness | Branch must be up-to-date with `main` before merge           |
| Commit message   | Squash commit follows Conventional Commits format            |

## Naming Examples

```
feature/GPS-042-geofence-alerts
fix/ALERT-017-missing-school-id
release/1.0.0
hotfix/AUTH-003-token-expiry
```

## Related Documents

- [ci_cd_pipeline.md](./06_integration_cicd/ci_cd_pipeline.md) — CI/CD pipeline stages
- [artifact_management.md](./06_integration_cicd/artifact_management.md) — Build artifacts and images
- [../04_coding_standards/general_coding.md](./04_coding_standards/general_coding.md) — Commit message format

---

## ci_cd_pipeline

_Source: `sdlc_guidelines/06_integration_cicd/ci_cd_pipeline.md`_

# CI/CD Pipeline

- Document owner: Engineering and DevOps
- Last reviewed: 2026-03-24
- Primary use: Pipeline stages, quality gates, and automation for SBTM

## Purpose

Define the continuous integration and delivery pipeline for the SBTM monorepo. The pipeline ensures code quality, security compliance, and deployment readiness.

## Pipeline Stages

```mermaid
graph LR
    LINT[Lint<br/>ESLint + Prettier] --> BUILD[Build<br/>TypeScript compile]
    BUILD --> TEST[Test<br/>Unit + Integration]
    TEST --> SEC[Security Scan<br/>pnpm audit + SAST]
    SEC --> DOCKER[Docker Build<br/>Image creation]
    DOCKER --> PUSH[Push<br/>Registry]
    PUSH --> DEPLOY[Deploy<br/>Docker Compose]
```

## Stage Details

### 1. Lint

- Tool: ESLint + Prettier
- Scope: All TypeScript files in the changed packages
- Fail condition: Any lint error (warnings are allowed but tracked)

### 2. Build

- Tool: `tsc` via each package's build script
- Scope: All affected packages (monorepo-aware)
- Fail condition: Any TypeScript compilation error

### 3. Test

- Tool: Jest
- Scope: Unit tests for changed packages, integration tests for affected services
- Fail condition: Any test failure or coverage below minimum threshold
- Coverage thresholds: See testing_strategy.md

### 4. Security Scan

- Tool: `pnpm audit`, optionally a SAST scanner
- Scope: All dependencies and source code
- Fail condition: Any `critical` or `high` vulnerability in `pnpm audit`
- Monitoring: `moderate` findings are logged as warnings

### 5. Docker Build

- Tool: Docker (multi-stage builds)
- Scope: Services and apps that have changed
- Rule: Use specific base image tags (not `latest`). See supply_chain_security.md.
- Fail condition: Build failure or image exceeds size threshold

### 6. Push

- Tool: Docker registry (local or cloud)
- Scope: Successfully built images
- Tagging: `<service>:<branch>-<short-sha>` for branches, `<service>:<version>` for releases

### 7. Deploy

- Tool: Docker Compose (local/staging), orchestrator for production
- Scope: Updated services only
- Smoke test: Health check endpoints must pass within 60 seconds of deployment

## Quality Gates

| Gate                             | When        | Blocks Merge/Deploy? |
| -------------------------------- | ----------- | -------------------- |
| Lint pass                        | Every PR    | Yes                  |
| Build pass                       | Every PR    | Yes                  |
| Tests pass + coverage met        | Every PR    | Yes                  |
| No critical/high vulnerabilities | Every PR    | Yes                  |
| Docker image builds              | Pre-deploy  | Yes                  |
| Health checks pass               | Post-deploy | Triggers rollback    |

## Monorepo Considerations

- Use affected-package detection to avoid running all checks on every PR.
- If `tsconfig.base.json`, `docker-compose.yml`, or shared configuration changes, run all checks.
- Tag images per service so only changed services are redeployed.

## Configuration Files

| File                             | Purpose                       |
| -------------------------------- | ----------------------------- |
| `docker-compose.yml`             | Local development and staging |
| `docker-compose.ci.yml`          | CI pipeline overrides         |
| `eslint.config.js` (per package) | Lint configuration            |
| `jest.config.js` (per package)   | Test configuration            |
| `Dockerfile` (per service/app)   | Build configuration           |

## Related Documents

- [branching_strategy.md](./06_integration_cicd/branching_strategy.md) — Branch model and PR rules
- [artifact_management.md](./06_integration_cicd/artifact_management.md) — Image tagging and registry
- [../05_testing/testing_strategy.md](./05_testing/testing_strategy.md) — Coverage requirements
- [../01_security_compliance/supply_chain_security.md](./01_security_compliance/supply_chain_security.md) — Dependency and image security

---

## artifact_management

_Source: `sdlc_guidelines/06_integration_cicd/artifact_management.md`_

# Artifact Management

- Document owner: Engineering and DevOps
- Last reviewed: 2026-03-24
- Primary use: Docker image management, npm package conventions, and build output handling

## Purpose

Define how build artifacts (Docker images, npm packages, built assets) are managed across the SBTM development lifecycle.

## Docker Image Conventions

### Image Naming

```
<registry>/<project>/<service>:<tag>
```

Example: `registry.local/sbtm/api-gateway:main-a1b2c3d`

### Tagging Strategy

| Context        | Tag Format                       | Example                                       |
| -------------- | -------------------------------- | --------------------------------------------- |
| Feature branch | `<service>:<branch>-<short-sha>` | `api-gateway:feature-gps-042-a1b2c3d`         |
| Main branch    | `<service>:main-<short-sha>`     | `api-gateway:main-a1b2c3d`                    |
| Release        | `<service>:<semver>`             | `api-gateway:1.0.0`                           |
| Latest stable  | `<service>:latest`               | `api-gateway:latest` (alias for last release) |

### Image Rules

- Use multi-stage Docker builds to minimize image size.
- Base images must use specific version tags (e.g., `node:20-alpine`), not `latest`.
- Run containers as non-root users.
- Do not include `.env` files, test fixtures, or development dependencies in production images.
- Include a `HEALTHCHECK` instruction in Dockerfiles.

### Image Lifecycle

| Image Age                                  | Action                          |
| ------------------------------------------ | ------------------------------- |
| Feature branch images > 7 days after merge | Delete from registry            |
| Main branch images > 30 days               | Delete if not tagged as release |
| Release images                             | Retain indefinitely             |

## npm Package Conventions

SBTM uses a monorepo with workspaces. There are no published npm packages.

| Rule               | Detail                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Lock file          | `pnpm-lock.yaml` committed at root and per workspace                                      |
| Install command    | `pnpm install --frozen-lockfile` in CI (deterministic); `pnpm install` during development |
| Version pinning    | Exact versions in `package.json` (no `^` or `~` for production deps)                      |
| Workspace hoisting | Shared dependencies hoisted to root `node_modules`                                        |

## Build Outputs

| Application      | Build Tool | Output Directory    | Asset               |
| ---------------- | ---------- | ------------------- | ------------------- |
| Admin Dashboard  | Vite       | `dist/`             | Static HTML/JS/CSS  |
| Parent App (Web) | Vite       | `dist/`             | Static HTML/JS/CSS  |
| Driver App       | Expo       | `android/` / `ios/` | Native binaries     |
| Backend Services | tsc        | `dist/`             | Compiled JavaScript |

- Built assets are not committed. They are produced in CI and packaged into Docker images.
- Source maps are generated for development and staging but excluded from production images.

## Related Documents

- [ci_cd_pipeline.md](./06_integration_cicd/ci_cd_pipeline.md) — Pipeline stages
- [branching_strategy.md](./06_integration_cicd/branching_strategy.md) — Branch and tagging flow
- [../01_security_compliance/supply_chain_security.md](./01_security_compliance/supply_chain_security.md) — Dependency and image security

---

## deployment_guidelines

_Source: `sdlc_guidelines/07_deployment_operations/deployment_guidelines.md`_

# Deployment Guidelines

- Document owner: Engineering and DevOps
- Last reviewed: 2026-03-24
- Primary use: Deployment procedures, environment configuration, and rollback strategy

## Purpose

Define how SBTM services are deployed across environments. The current deployment model uses Docker Compose with a path toward orchestrated production deployments.

## Environments

| Environment    | Purpose                       | Deployment Method               | Data                                       |
| -------------- | ----------------------------- | ------------------------------- | ------------------------------------------ |
| **Local**      | Developer workstation         | `docker-compose up`             | Seed data from `scripts/init-db.sql`       |
| **CI**         | Automated testing             | `docker-compose.ci.yml`         | Ephemeral test data                        |
| **Staging**    | Pre-release validation, demos | Docker Compose on shared server | Demo data from `scripts/simulate-demo.ps1` |
| **Production** | Live service                  | Docker Compose or orchestrator  | Real operational data                      |

## Deployment Architecture

```mermaid
graph TD
    subgraph "Docker Compose Stack"
        GW[API Gateway<br/>:3000]
        GPS[GPS Tracking<br/>:3001]
        EA[Emergency Alerts<br/>:3002]
        SP[Student Presence<br/>:3003]
        VS[Video Service<br/>:3004]
        SM[Student Management<br/>:3005]
        CM[Compliance Management<br/>:3006]
        PG[(PostgreSQL<br/>:5432)]
        REDIS[(Redis<br/>:6379)]
        MINIO[(MinIO<br/>:9000)]
    end
    GW --> GPS & EA & SP & VS & SM & CM
    GPS & EA & SP & VS & SM & CM --> PG
    EA & SP --> REDIS
    VS --> MINIO
```

## Deployment Procedure

### Pre-Deployment Checklist

- [ ] All CI quality gates pass (lint, build, test, security scan).
- [ ] Docker images built and tagged correctly.
- [ ] Database migrations reviewed and tested on staging.
- [ ] Environment variables verified for target environment.
- [ ] Rollback plan documented.

### Deployment Steps

1. Pull latest images for updated services.
2. Run database migrations if any (TypeORM or Prisma migrate).
3. Stop affected services: `docker-compose stop <service>`.
4. Start updated services: `docker-compose up -d <service>`.
5. Verify health checks pass: `curl http://localhost:<port>/health`.
6. Run smoke tests against the deployed environment.
7. Monitor logs for errors in the first 15 minutes.

### Rollback Procedure

1. Stop the failing service.
2. Re-tag or pull the previous image version.
3. Start the previous version.
4. If database migrations were applied, run the down migration.
5. Verify health checks and smoke tests.
6. Document the incident.

## Environment Configuration

- All environment-specific configuration is in `.env` files (not committed) or environment variables set in the deployment environment.
- Configuration schema is validated at service startup. Unknown or missing required variables cause a startup failure.
- Sensitive values (database passwords, JWT secrets, API keys) must not be committed or logged.

## Health Checks

Every service must expose `GET /health` returning:

```json
{
  "status": "ok",
  "service": "<service-name>",
  "uptime": 12345,
  "dependencies": {
    "database": "ok",
    "redis": "ok"
  }
}
```

Docker Compose health checks should be configured to poll this endpoint.

## Related Documents

- [monitoring_observability.md](./07_deployment_operations/monitoring_observability.md) — Monitoring and alerting
- [incident_response.md](./07_deployment_operations/incident_response.md) — Incident management
- [../06_integration_cicd/ci_cd_pipeline.md](./06_integration_cicd/ci_cd_pipeline.md) — CI/CD pipeline
- [../../Operations/DeploymentGuide.md](../../Operations/DeploymentGuide.md) — Operations deployment guide

---

## monitoring_observability

_Source: `sdlc_guidelines/07_deployment_operations/monitoring_observability.md`_

# Monitoring and Observability

- Document owner: Engineering and DevOps
- Last reviewed: 2026-03-24
- Primary use: Metrics, logging, tracing, and alerting for SBTM services

## Purpose

Define the observability strategy for SBTM. Safety-critical operations (GPS tracking, emergency alerts, presence detection) require proactive monitoring to detect failures before they impact students and parents.

## Three Pillars

```mermaid
graph LR
    LOGS[Structured Logs<br/>JSON format] --> DASHBOARD[Dashboards<br/>& Queries]
    METRICS[Metrics<br/>Counters, gauges, histograms] --> ALERTING[Alerting<br/>Threshold & anomaly]
    TRACES[Request Traces<br/>Correlation IDs] --> DEBUGGING[Distributed<br/>Debugging]
```

## Logging

### Format

All services emit structured JSON logs:

```json
{
  "timestamp": "2026-03-24T08:15:42.123Z",
  "level": "info",
  "service": "gps-tracking",
  "requestId": "req-abc-123",
  "tenantId": "school-001",
  "action": "location.received",
  "message": "GPS location recorded",
  "vehicleId": "bus-042",
  "duration": 15
}
```

### Log Levels

| Level   | Use                                                                 |
| ------- | ------------------------------------------------------------------- |
| `error` | Unrecoverable failures, unhandled exceptions                        |
| `warn`  | Degraded operation, approaching limits                              |
| `info`  | Business events (location recorded, alert created, student boarded) |
| `debug` | Detailed internal state (development/staging only)                  |

### PII Rules

- Never log student names, guardian contact info, or home addresses.
- Log entity IDs only (studentId, guardianId, schoolId).
- See data classification guide for tier-specific rules.

## Metrics

### Key Metrics per Service

| Metric                          | Type                     | Alert Threshold         |
| ------------------------------- | ------------------------ | ----------------------- |
| `http_request_duration_seconds` | Histogram                | p95 > 500ms for 5 min   |
| `http_request_total`            | Counter (by status code) | 5xx rate > 1% for 5 min |
| `db_connection_pool_active`     | Gauge                    | > 80% pool capacity     |
| `redis_queue_depth`             | Gauge                    | > 1000 pending jobs     |
| `websocket_connections`         | Gauge                    | Sudden drop > 50%       |

### GPS-Specific Metrics

| Metric                   | Type    | Alert Threshold                   |
| ------------------------ | ------- | --------------------------------- |
| `gps_updates_per_second` | Counter | < expected rate for active routes |
| `gps_staleness_seconds`  | Gauge   | > 30s for any active bus          |

### Alert-Specific Metrics

| Metric                                   | Type      | Alert Threshold |
| ---------------------------------------- | --------- | --------------- |
| `alert_creation_to_notification_seconds` | Histogram | p95 > 5s        |
| `alert_delivery_failures`                | Counter   | Any failure     |

## Tracing

- Assign a `requestId` at the API Gateway for each incoming request.
- Propagate the `requestId` through all downstream service calls and queue jobs.
- Include `requestId` in all log entries for request correlation.
- Long-term: adopt OpenTelemetry for distributed tracing across services.

## Health Dashboard

Minimum dashboard panels:

- Service health status (up/down for each service)
- Request rate and latency per service
- Error rate per service
- Database and Redis health
- Active WebSocket connections
- Queue depth and processing rate
- GPS update rate vs. expected rate for active routes

## Related Documents

- [deployment_guidelines.md](./07_deployment_operations/deployment_guidelines.md) — Deployment procedures
- [incident_response.md](./07_deployment_operations/incident_response.md) — Incident management
- [../04_coding_standards/general_coding.md](./04_coding_standards/general_coding.md) — Logging conventions

---

## incident_response

_Source: `sdlc_guidelines/07_deployment_operations/incident_response.md`_

# Incident Response

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-24
- Primary use: Incident classification, response procedures, and post-incident review for SBTM

## Purpose

Define how incidents are classified, handled, and reviewed for SBTM. Given the safety-critical nature of school bus tracking, timely incident response is essential.

## Incident Severity Levels

| Severity            | Definition                           | Examples                                                                                              | Response Time             |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------- |
| **SEV-1: Critical** | Safety impact or total system outage | Emergency alerts not delivered; GPS tracking completely down during school hours; student data breach | Immediate (within 15 min) |
| **SEV-2: Major**    | Significant feature degradation      | GPS updates delayed > 2 min; admin dashboard inaccessible; presence detection failing                 | Within 1 hour             |
| **SEV-3: Minor**    | Limited impact, workaround available | Single service degraded but functional; performance below budget but operational                      | Within 4 hours            |
| **SEV-4: Low**      | Cosmetic or minor inconvenience      | UI display issue; non-critical log errors; documentation inaccuracy                                   | Next business day         |

## Response Procedure

### 1. Detect

- Automated: Monitoring alerts (see monitoring_observability.md)
- Manual: User reports, operator observation

### 2. Triage

- Assign severity level based on table above.
- Safety-related incidents are automatically SEV-1 if they affect active school routes.
- Identify affects scope: which schools, routes, or users are impacted.

### 3. Contain

- For SEV-1/SEV-2: Rally the on-call engineer and relevant service owners.
- Implement immediate mitigation (rollback, feature flag disable, traffic reroute).
- Communication: notify affected school administrators if student-facing features are impacted.

### 4. Resolve

- Identify root cause.
- Apply fix (hotfix branch → expedited review → deploy).
- Verify resolution with smoke tests and monitoring.

### 5. Review

- Post-incident review within 48 hours for SEV-1/SEV-2.
- Document: timeline, root cause, impact, mitigation, and preventive actions.
- Create follow-up tickets for systemic improvements.

## Safety Escalation

When an incident involves child safety:

```mermaid
graph TD
    DETECT[Incident Detected] --> SAFETY{Safety Impact?}
    SAFETY -->|Yes| SEV1[Classify SEV-1]
    SEV1 --> CONTAIN[Immediate Containment]
    CONTAIN --> NOTIFY[Notify School Admins]
    NOTIFY --> RESOLVE[Fix and Verify]
    RESOLVE --> PIR[Post-Incident Review]
    SAFETY -->|No| NORMAL[Normal Triage]
```

Safety-impacting incidents include:

- Emergency alert delivery failure during an active alert.
- GPS tracking outage during active school routes.
- False presence data (student shown as boarded when not).
- Unauthorized access to student PII.

## Communication Template

For SEV-1/SEV-2 incidents affecting schools:

```
Subject: [SBTM Incident] <Brief description>

Status: Investigating / Mitigated / Resolved
Severity: SEV-1 / SEV-2
Affected: <Schools, features, routes>
Impact: <What users are experiencing>
Next Update: <Time>

Actions Taken:
- <List of containment/fix steps>
```

## Post-Incident Review Template

```markdown
# PIR: <Incident Title>

- Date: YYYY-MM-DD
- Severity: SEV-X
- Duration: X hours Y minutes
- Impact: <Schools, users, features affected>

## Timeline

- HH:MM — <Event>

## Root Cause

<What caused the incident>

## What Went Well

- <Positive observations>

## What Could Be Improved

- <Areas for improvement>

## Action Items

| Action | Owner | Due Date |
| ------ | ----- | -------- |
```

## Related Documents

- [monitoring_observability.md](./07_deployment_operations/monitoring_observability.md) — Alerting and metrics
- [deployment_guidelines.md](./07_deployment_operations/deployment_guidelines.md) — Rollback procedures
- [../../Operations/DeploymentGuide.md](../../Operations/DeploymentGuide.md) — Operations guide

---

## postgresql_postgis

_Source: `sdlc_guidelines/08_tech_specific/postgresql_postgis.md`_

# PostgreSQL and PostGIS Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Database conventions, spatial data handling, and migration practices for SBTM

## Purpose

Define PostgreSQL and PostGIS standards for SBTM. All 7 backend services use PostgreSQL as the primary datastore. The GPS Tracking service relies on PostGIS for spatial queries.

## PostgreSQL Version and Configuration

| Setting            | Value                                                |
| ------------------ | ---------------------------------------------------- |
| Version            | PostgreSQL 15                                        |
| Extensions         | PostGIS, pgcrypto (UUID generation)                  |
| Connection pooling | Use pgBouncer or TypeORM/Prisma built-in pooling     |
| Pool size          | 10–20 connections per service (tune per environment) |

## Schema Conventions

| Rule          | Convention                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| Table names   | `snake_case`, singular (`student`, `alert`, `location`)                           |
| Column names  | `snake_case` (`school_id`, `created_at`)                                          |
| Primary keys  | UUID v4, column name `id`                                                         |
| Timestamps    | `created_at` and `updated_at` on every table, type `TIMESTAMPTZ`                  |
| Tenant column | `school_id UUID NOT NULL` on all tenant-scoped tables                             |
| Soft deletes  | `deleted_at TIMESTAMPTZ NULL` where business requires audit trail                 |
| Indexes       | Create indexes for foreign keys, frequently filtered columns, and spatial columns |

## Tenant Isolation

```sql
-- Every query for tenant-scoped data MUST include school_id
SELECT * FROM student WHERE school_id = $1 AND id = $2;

-- NEVER query tenant data without school_id
-- BAD: SELECT * FROM student WHERE id = $1;
```

Long-term: implement Row-Level Security (RLS) policies as a defense-in-depth measure:

```sql
CREATE POLICY tenant_isolation ON student
  USING (school_id = current_setting('app.current_school_id')::uuid);
```

## PostGIS Usage (GPS Tracking)

### Spatial Column

```sql
-- Location column for vehicle positions
ALTER TABLE location ADD COLUMN geom GEOMETRY(Point, 4326);

-- Spatial index
CREATE INDEX idx_location_geom ON location USING GIST(geom);
```

### Common Spatial Queries

```sql
-- Find all buses within a geofence (1km radius)
SELECT vehicle_id, ST_AsGeoJSON(geom) AS position
FROM location
WHERE school_id = $1
  AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint($2, $3), 4326), 1000);

-- Calculate distance between two points
SELECT ST_Distance(
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
  ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
) AS distance_meters;
```

### Coordinate Rules

- Always use SRID 4326 (WGS84) for geographic coordinates.
- Store coordinates as `GEOMETRY(Point, 4326)` not as separate `lat`, `lng` columns (for spatial indexing).
- Validate coordinate ranges on input: latitude [-90, 90], longitude [-180, 180].

## Migration Practices

| Rule            | Detail                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| Tool            | TypeORM migrations (most services) or Prisma Migrate (GPS Tracking)                          |
| Naming          | `YYYYMMDDHHMMSS-description` (e.g., `20260324120000-add-geofence-table`)                     |
| Up/Down         | Every migration must have both up and down migrations                                        |
| Data migrations | Separate from schema migrations. Run data migrations as scripts, not in the migration runner |
| Review          | All migrations reviewed in PR before merge                                                   |
| Testing         | Run migrations against a clean database in CI                                                |

## Performance Guidelines

- Use `EXPLAIN ANALYZE` to verify query plans for new queries.
- Add indexes for columns used in WHERE, JOIN, and ORDER BY clauses.
- Use pagination for list queries (OFFSET/LIMIT or cursor-based).
- Avoid N+1 queries — use JOINs or batch loading.
- Consider partitioning for high-volume tables (location data by time range).

## Related Documents

- [redis_bullmq.md](./08_tech_specific/redis_bullmq.md) — Redis and queue patterns
- [../03_architecture_design/design_guidelines.md](./03_architecture_design/design_guidelines.md) — Database design conventions
- [../01_security_compliance/data_classification.md](./01_security_compliance/data_classification.md) — Data tier handling rules

---

## redis_bullmq

_Source: `sdlc_guidelines/08_tech_specific/redis_bullmq.md`_

# Redis and BullMQ Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Redis caching, BullMQ queue patterns, and operational rules for SBTM

## Purpose

Define Redis and BullMQ conventions for SBTM. Redis 7 is used for caching and as the backing store for BullMQ job queues in the Emergency Alerts and Student Presence services.

## Redis Usage Patterns

| Pattern            | Service                            | Use Case                                               |
| ------------------ | ---------------------------------- | ------------------------------------------------------ |
| Job queue (BullMQ) | Emergency Alerts, Student Presence | Async notification delivery, presence event processing |
| Caching            | API Gateway                        | Session cache, rate limiting counters                  |
| Pub/Sub            | GPS Tracking                       | Real-time location broadcast to WebSocket subscribers  |

## Key Naming Convention

```
sbtm:<service>:<entity>:<id>[:<field>]
```

Examples:

- `sbtm:gateway:session:user-123` — User session cache
- `sbtm:alerts:queue:notifications` — BullMQ queue name
- `sbtm:gps:latest:vehicle-042` — Cached latest location for a vehicle

Rules:

- Always prefix with `sbtm:` to namespace within Redis.
- Use colons `:` as separators.
- Include the service name to prevent key collisions.
- Never store PII in Redis keys — use entity IDs only.

## BullMQ Queue Patterns

### Queue Configuration

```typescript
const alertQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400 }, // 24 hours
    removeOnFail: { age: 604800 }, // 7 days
  },
});
```

### Job Design Rules

- Jobs must be serializable (JSON-compatible payload).
- Include `tenantId` (school_id) in every job payload for traceability.
- Jobs must be idempotent — processing the same job twice produces the same outcome.
- Use named processors for clarity.

```typescript
// Producer
await alertQueue.add('send-notification', {
  alertId: alert.id,
  tenantId: schoolId,
  recipients: recipientIds, // IDs only, not contact info
  channel: 'push',
});

// Consumer
const worker = new Worker('notifications', async (job) => {
  const { alertId, tenantId, recipients, channel } = job.data;
  // Fetch contact info from DB at processing time
  await notificationService.send(alertId, tenantId, recipients, channel);
});
```

### Queue Monitoring

| Metric                     | Alert Threshold |
| -------------------------- | --------------- |
| Queue depth (waiting jobs) | > 1000          |
| Failed jobs in last hour   | > 10            |
| Job processing time (p95)  | > 5 seconds     |
| Stalled jobs               | Any             |

## Caching Rules

- Set TTL on all cached keys. No indefinite caches.
- Use cache-aside pattern: check cache → miss → query DB → populate cache.
- Cache invalidation: delete key on write (not update-in-place).
- Do not cache T3/T4 classified data (student PII). Cache only T1/T2 data (routes, schedules, locations).

| Data                    | Cacheable? | TTL        |
| ----------------------- | ---------- | ---------- |
| Latest vehicle location | Yes (T2)   | 30 seconds |
| Route definitions       | Yes (T1)   | 5 minutes  |
| Student records         | No (T3/T4) | —          |
| Guardian contact info   | No (T4)    | —          |

## Redis Operational Rules

- Redis must be configured with `maxmemory-policy allkeys-lru` to handle memory pressure gracefully.
- Persistence: use RDB snapshots for queue durability. AOF optional for production.
- Separate Redis instances for cache and queues if performance demands it.

## Related Documents

- [postgresql_postgis.md](./08_tech_specific/postgresql_postgis.md) — Database conventions
- [../03_architecture_design/design_guidelines.md](./03_architecture_design/design_guidelines.md) — Event-driven patterns
- [../01_security_compliance/data_classification.md](./01_security_compliance/data_classification.md) — Data tier caching rules

---

## docker_guidelines

_Source: `sdlc_guidelines/08_tech_specific/docker_guidelines.md`_

# Docker Guidelines

- Document owner: Engineering and DevOps
- Last reviewed: 2026-03-24
- Primary use: Dockerfile conventions, Docker Compose patterns, and container security for SBTM

## Purpose

Define Docker conventions for the SBTM monorepo. All backend services and the admin dashboard use Docker for development, CI, and deployment.

## Dockerfile Conventions

### Multi-Stage Build Template (NestJS Service)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install -g pnpm && pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### Multi-Stage Build Template (Vite App)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Serve
FROM nginx:1.25-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Dockerfile Rules

| Rule            | Detail                                                             |
| --------------- | ------------------------------------------------------------------ |
| Base images     | Use specific version tags (`node:20-alpine`, not `node:latest`)    |
| Non-root user   | Run production containers as a non-root user                       |
| Health checks   | Include `HEALTHCHECK` instructions                                 |
| `.dockerignore` | Exclude `node_modules`, `.env`, test files, docs                   |
| Layer caching   | Copy `package.json` and install dependencies before copying source |
| No secrets      | Never use `ENV` or `ARG` for secrets in Dockerfiles                |
| Image size      | Multi-stage builds to minimize final image size                    |

## Docker Compose Conventions

### Service Naming

```yaml
services:
  api-gateway: # Matches directory name in services/
  gps-tracking:
  emergency-alerts:
  student-presence:
  video-service:
  student-management:
  compliance-management:
  postgres: # Infrastructure services use technology name
  redis:
  minio:
```

### Network and Port Conventions

| Service               | Internal Port | External Port (dev) |
| --------------------- | ------------- | ------------------- |
| API Gateway           | 3000          | 3000                |
| GPS Tracking          | 3001          | 3001                |
| Emergency Alerts      | 3002          | 3002                |
| Student Presence      | 3003          | 3003                |
| Video Service         | 3004          | 3004                |
| Student Management    | 3005          | 3005                |
| Compliance Management | 3006          | 3006                |
| PostgreSQL            | 5432          | 5432                |
| Redis                 | 6379          | 6379                |
| MinIO                 | 9000          | 9000                |

### Dependency Management

```yaml
services:
  api-gateway:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

Use `condition: service_healthy` with health checks to ensure dependencies are ready.

## Container Security

- Scan images for vulnerabilities using `docker scout` or `trivy`.
- Do not mount the Docker socket into containers.
- Use read-only filesystem where possible: `read_only: true` in Compose.
- Limit container resources in production:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

## Related Documents

- [../06_integration_cicd/ci_cd_pipeline.md](./06_integration_cicd/ci_cd_pipeline.md) — Docker build in CI
- [../06_integration_cicd/artifact_management.md](./06_integration_cicd/artifact_management.md) — Image tagging and lifecycle
- [../07_deployment_operations/deployment_guidelines.md](./07_deployment_operations/deployment_guidelines.md) — Deployment procedures

---

## react_vite

_Source: `sdlc_guidelines/08_tech_specific/react_vite.md`_

# React and Vite Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: React 19 and Vite conventions for the admin dashboard and parent web app

## Purpose

Define frontend development standards for SBTM's React applications: the admin dashboard (`apps/admin-dashboard`) and the parent web app (`apps/parent-dashboard/web`). Both use React 19 with Vite as the build tool.

## Technology Stack

| Layer            | Technology                                            |
| ---------------- | ----------------------------------------------------- |
| Framework        | React 19                                              |
| Build tool       | Vite                                                  |
| Styling          | Tailwind CSS                                          |
| State management | React hooks + context (escalate to Zustand if needed) |
| HTTP client      | Fetch API or Axios                                    |
| Real-time        | Socket.IO client                                      |
| Type checking    | TypeScript (strict mode)                              |

## Project Structure

```
apps/admin-dashboard/src/
├── main.tsx              # Entry point
├── App.tsx               # Root component, router setup
├── components/           # Shared UI components
│   ├── ui/               # Primitives (Button, Input, Card)
│   └── layout/           # Layout components (Sidebar, Header)
├── features/             # Feature modules
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── hooks/
│   │   └── components/
│   ├── gps-tracking/
│   ├── emergency-alerts/
│   └── ...
├── hooks/                # Shared custom hooks
├── services/             # API client functions
├── types/                # Shared TypeScript types
├── utils/                # Utility functions
└── config/               # App configuration
```

## Component Conventions

- Use function components exclusively. No class components.
- Co-locate component-specific hooks, types, and styles within the feature directory.
- Prefer composition over prop drilling — use context or custom hooks for shared state.
- Keep components under 150 lines. Extract sub-components when a component grows beyond this.

```typescript
// Feature component
export function DashboardPage() {
  const { routes, isLoading } = useActiveRoutes();

  if (isLoading) return <LoadingSpinner />;
  return <RouteMap routes={routes} />;
}
```

## State Management

| State Type                     | Approach                                              |
| ------------------------------ | ----------------------------------------------------- |
| Server state (API data)        | Custom hooks with fetch + local state, or React Query |
| UI state (modals, tabs)        | Component-local `useState`                            |
| Shared app state (auth, theme) | React Context                                         |
| Complex shared state           | Zustand (only if Context becomes unwieldy)            |

## API Integration

```typescript
// services/gps-tracking.ts
const API_BASE = import.meta.env.VITE_API_URL;

export async function getActiveRoutes(schoolId: string): Promise<Route[]> {
  const response = await fetch(`${API_BASE}/api/v1/routes?schoolId=${schoolId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  return response.json();
}
```

Rules:

- Centralize API calls in `services/` — components never call `fetch` directly.
- Handle errors consistently (toast notifications for user-facing errors).
- Include the JWT token from the auth context in all API calls.

## Real-Time Updates (Socket.IO)

- Establish Socket.IO connection once at the app level (context provider).
- Authenticate the socket connection with the same JWT used for HTTP.
- Subscribe to events at the feature level using custom hooks.

```typescript
export function useGpsUpdates(routeId: string) {
  const socket = useSocket();
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    socket.on(`location:${routeId}`, setLocation);
    return () => {
      socket.off(`location:${routeId}`, setLocation);
    };
  }, [socket, routeId]);

  return location;
}
```

## Tailwind CSS Rules

- Use Tailwind utility classes directly in JSX. Avoid custom CSS files.
- Extract repeated patterns into reusable components, not CSS classes.
- Configure the design system (colors, spacing, fonts) in `tailwind.config.js`.

## Environment Variables

- Prefix all client-side env vars with `VITE_` (Vite requirement).
- Define env vars in `.env.example` with placeholder values.
- Access via `import.meta.env.VITE_*`.

## Related Documents

- [react_native_expo.md](./08_tech_specific/react_native_expo.md) — Mobile app conventions
- [socketio_sse.md](./08_tech_specific/socketio_sse.md) — Real-time patterns
- [../04_coding_standards/typescript_standards.md](./04_coding_standards/typescript_standards.md) — TypeScript rules

---

## react_native_expo

_Source: `sdlc_guidelines/08_tech_specific/react_native_expo.md`_

# React Native and Expo Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: React Native and Expo conventions for the SBTM driver app

## Purpose

Define mobile development standards for the SBTM driver app (`apps/driver-app`), which uses React Native with Expo.

## Technology Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | React Native                        |
| Toolchain        | Expo                                |
| Navigation       | React Navigation                    |
| State management | React hooks + context               |
| HTTP client      | Fetch API or Axios                  |
| Real-time        | Socket.IO client                    |
| Type checking    | TypeScript (strict mode)            |
| Testing          | Jest + React Native Testing Library |

## Project Structure

```
apps/driver-app/
├── App.tsx               # Entry point
├── app.json              # Expo configuration
├── src/
│   ├── navigation/       # Navigator setup (stack, tab)
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── RouteScreen.tsx
│   │   └── AlertScreen.tsx
│   ├── components/       # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API client functions
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   └── config/           # App configuration
├── assets/               # Images, fonts
└── jest.config.js
```

## Mobile-Specific Rules

### GPS and Location

- Use Expo Location API for foreground location tracking.
- Request location permissions explicitly with clear purpose messaging.
- Send GPS updates to the backend at the configured interval (default: 5 seconds).
- Handle permission denial gracefully — show an explanation and retry option.

```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  // Show permission explanation UI
  return;
}
```

### Offline Resilience

- Cache active route data locally for offline access.
- Queue GPS updates and presence events when offline; sync when reconnected.
- Show clear offline indicators in the UI.
- Retry failed API calls with exponential backoff.

### Battery Optimization

- Use foreground location only when the driver has an active route.
- Stop location updates when the driver ends the route.
- Minimize background processing to preserve battery.

## Component Conventions

- Use function components with hooks (no class components).
- Screen components go in `src/screens/`, reusable components in `src/components/`.
- Use React Navigation for screen transitions. Define navigator types centrally.

```typescript
// Type-safe navigation
type RootStackParamList = {
  Home: undefined;
  Route: { routeId: string };
  Alert: { alertId: string };
};
```

## API Integration

- Same patterns as the web app — centralize API calls in `src/services/`.
- Handle network errors explicitly (mobile networks are unreliable).
- Include device information headers for debugging:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'X-Device-Platform': Platform.OS,
  'X-App-Version': Constants.expoConfig?.version,
}
```

## Testing

- Unit tests for hooks and utilities using Jest.
- Component tests using React Native Testing Library.
- Manual testing on both iOS and Android devices.
- Use Expo Go for rapid development testing.

## Related Documents

- [react_vite.md](./08_tech_specific/react_vite.md) — Web frontend conventions
- [socketio_sse.md](./08_tech_specific/socketio_sse.md) — Real-time patterns
- [../04_coding_standards/typescript_standards.md](./04_coding_standards/typescript_standards.md) — TypeScript rules

---

## socketio_sse

_Source: `sdlc_guidelines/08_tech_specific/socketio_sse.md`_

# Socket.IO and SSE Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Real-time communication patterns for SBTM (WebSocket via Socket.IO, Server-Sent Events)

## Purpose

Define real-time communication standards for SBTM. Real-time updates are critical for GPS tracking, emergency alerts, and presence notifications.

## Technology Choice

| Protocol                     | Use Case                                                      | Service                    |
| ---------------------------- | ------------------------------------------------------------- | -------------------------- |
| **Socket.IO** (WebSocket)    | Bidirectional real-time: GPS location broadcast, alert pushes | API Gateway, GPS Tracking  |
| **SSE** (Server-Sent Events) | Server-to-client streaming (planned)                          | Future: notification feeds |

Socket.IO is the primary real-time transport in SBTM. SSE may be introduced for simple notification streaming.

## Socket.IO Architecture

```mermaid
graph LR
    subgraph "Clients"
        ADMIN[Admin Dashboard<br/>Socket.IO Client]
        PARENT[Parent App<br/>Socket.IO Client]
        DRIVER[Driver App<br/>Socket.IO Client]
    end
    subgraph "Backend"
        GW[API Gateway<br/>Socket.IO Server]
        GPS[GPS Tracking<br/>Publishes location events]
        EA[Emergency Alerts<br/>Publishes alert events]
    end
    ADMIN & PARENT & DRIVER -->|WebSocket| GW
    GPS -->|Internal event| GW
    EA -->|Internal event| GW
```

## Authentication

- Authenticate Socket.IO connections during the handshake using the JWT token:

```typescript
// Server (NestJS Gateway)
@WebSocketGateway({
  cors: { origin: allowedOrigins },
})
export class TrackingGateway implements OnGatewayConnection {
  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    try {
      const user = await this.authService.verifyToken(token);
      client.data.user = user;
      client.join(`school:${user.schoolId}`); // Tenant room
    } catch {
      client.disconnect();
    }
  }
}
```

- Reject unauthenticated connections immediately.
- Store user context on the socket instance for use in event handlers.

## Room Strategy (Tenant Isolation)

- Use rooms to isolate real-time events by tenant:

| Room Pattern        | Purpose                          |
| ------------------- | -------------------------------- |
| `school:<schoolId>` | All events for a school          |
| `route:<routeId>`   | GPS updates for a specific route |
| `alert:<schoolId>`  | Emergency alerts for a school    |

- Clients join rooms based on their JWT claims and subscriptions.
- Never broadcast to all connected clients — always emit to a specific room.

```typescript
// Emit GPS update to route subscribers only
this.server.to(`route:${routeId}`).emit('location:update', locationData);
```

## Event Naming Conventions

```
<domain>:<action>
```

| Event                | Direction       | Payload                                           |
| -------------------- | --------------- | ------------------------------------------------- |
| `location:update`    | Server → Client | `{ vehicleId, lat, lng, timestamp, routeId }`     |
| `alert:created`      | Server → Client | `{ alertId, type, schoolId, message, timestamp }` |
| `alert:acknowledged` | Server → Client | `{ alertId, acknowledgedBy, timestamp }`          |
| `presence:boarded`   | Server → Client | `{ studentId, vehicleId, routeId, timestamp }`    |
| `presence:alighted`  | Server → Client | `{ studentId, stopId, timestamp }`                |

## Client-Side Patterns

```typescript
// Custom hook for real-time GPS
export function useLocationUpdates(routeId: string) {
  const socket = useSocket();
  const [location, setLocation] = useState<LocationUpdate | null>(null);

  useEffect(() => {
    socket.emit('subscribe:route', { routeId });
    socket.on('location:update', (data: LocationUpdate) => {
      if (data.routeId === routeId) setLocation(data);
    });

    return () => {
      socket.emit('unsubscribe:route', { routeId });
      socket.off('location:update');
    };
  }, [socket, routeId]);

  return location;
}
```

## Reconnection and Reliability

- Enable Socket.IO auto-reconnect with exponential backoff.
- On reconnection, re-authenticate and re-subscribe to rooms.
- For critical events (emergency alerts), also deliver via push notification as a fallback.
- Log disconnection and reconnection events for monitoring.

## Performance

- Throttle high-frequency events (GPS) to avoid overwhelming clients. Emit at most once per second per route.
- Use binary payloads only if JSON serialization becomes a bottleneck.
- Monitor WebSocket connection count and message throughput.

## Related Documents

- [react_vite.md](./08_tech_specific/react_vite.md) — Web frontend Socket.IO integration
- [react_native_expo.md](./08_tech_specific/react_native_expo.md) — Mobile Socket.IO integration
- [../07_deployment_operations/monitoring_observability.md](./07_deployment_operations/monitoring_observability.md) — WebSocket monitoring

---

## agent_governance

_Source: `sdlc_guidelines/09_governance/agent_governance.md`_

# Agent Governance

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: Rules for AI coding agents working in the SBTM codebase

## Purpose

Define how AI coding agents (GitHub Copilot, Cursor, or similar tools) must behave when generating, modifying, or reviewing SBTM code. These rules ensure agent outputs comply with SBTM's privacy, security, and quality standards.

## Agent Context Loading Order

When an AI agent starts a task, it should load sdlc_guidelines in this order:

| Step | Document                            | Purpose                                                      |
| ---- | ----------------------------------- | ------------------------------------------------------------ |
| 1    | `00_master_policy.md`               | Universal rules, project identity, quality gates             |
| 2    | Task-relevant Tier 2                | `01_security_compliance/*` if touching data or auth          |
| 3    | Task-relevant Tier 3                | e.g., `04_coding_standards/*` for writing code               |
| 4    | Task-relevant Tier 4                | e.g., `08_tech_specific/nestjs_standards.md` for NestJS work |
| 5    | `09_governance/agent_governance.md` | This file — behavioral rules                                 |

## Mandatory Rules for Agents

### Privacy

- Never generate code that logs PII (student names, guardian contact info, addresses).
- Always include `school_id` scoping in database queries for tenant-scoped entities.
- Use entity IDs in log messages, not names or contact information.
- Do not generate mock/seed data using real names, phone numbers, or addresses.

### Security

- Never hardcode secrets, passwords, or API keys in source code.
- Always use parameterized queries — never string concatenation for SQL.
- Apply RBAC decorators (`@Roles()`) to all new controller routes.
- Validate all incoming data using DTOs with class-validator or Zod schemas.

### Code Quality

- Follow naming conventions from `04_coding_standards/general_coding.md`.
- Keep generated files under 300 lines.
- Include error handling at controller boundaries.
- Write code that passes ESLint without disabling rules.

### Testing

- Generate test files alongside new service or component files.
- Include at minimum: one happy-path test and one error-path test.
- Include a tenant isolation test for any new database query.

### Documentation

- When creating a new service feature, update the relevant Implementation module.
- When modifying API endpoints, update the corresponding DTO documentation.
- When adding a new dependency, verify it against supply chain security rules.

## Prohibited Agent Actions

| Action                                 | Why                              |
| -------------------------------------- | -------------------------------- |
| Pushing directly to `main`             | All changes go through PR review |
| Disabling ESLint rules without comment | Hides code quality issues        |
| Using `any` type without justification | Breaks type safety               |
| Generating production seed data        | Seed data for dev/test only      |
| Modifying `.env` files                 | Not committed; env-specific      |
| Skipping RBAC on new endpoints         | Security violation               |

## Agent Output Review Checklist

Before submitting agent-generated code for human review:

- [ ] No PII in logs, error messages, or mock data.
- [ ] All new queries include `school_id` scoping.
- [ ] All new routes have RBAC guards.
- [ ] Input validation via DTOs on all endpoints.
- [ ] Tests included and passing.
- [ ] No hardcoded secrets or configuration values.
- [ ] File length under 300 lines.

## Related Documents

- [review_checklists.md](./09_governance/review_checklists.md) — Human code review checklists
- [documentation_standards.md](./09_governance/documentation_standards.md) — Documentation format rules
- [../00_master_policy.md](./00_master_policy.md) — Universal policies

---

## review_checklists

_Source: `sdlc_guidelines/09_governance/review_checklists.md`_

# Code Review Checklists

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Structured review checklists for human and AI-assisted code reviews

## Purpose

Provide focused checklists for reviewing SBTM pull requests. Reviewers should select the relevant checklist(s) based on the type of change.

## General Review Checklist

Every PR:

- [ ] Follows Conventional Commits message format.
- [ ] No commented-out code.
- [ ] No secrets or credentials committed.
- [ ] No new ESLint rule disables without justification.
- [ ] CI pipeline passes (lint, build, test).

## Backend Service Checklist

PR touches NestJS or Express service code:

- [ ] **Tenant isolation**: Queries include `school_id` from JWT, not request body.
- [ ] **RBAC**: New routes have `@Roles()` decorator with appropriate role set.
- [ ] **Input validation**: DTOs use class-validator decorators with `whitelist: true`.
- [ ] **Error handling**: Proper HTTP exceptions thrown, no stack traces in responses.
- [ ] **Logging**: No PII logged. Uses structured JSON format with `requestId` and `tenantId`.
- [ ] **Tests**: Unit tests for service logic, integration tests for new DB queries.

## Database Migration Checklist

PR includes a schema migration:

- [ ] Has both UP and DOWN migration scripts.
- [ ] New tenant-scoped tables include `school_id` column.
- [ ] New tables include `id` (UUID), `created_at`, `updated_at` columns.
- [ ] Names follow `snake_case` convention.
- [ ] Indexes added for foreign keys and frequently queried columns.
- [ ] Migration tested on clean database in CI.

## Frontend Checklist

PR touches React (web) or React Native code:

- [ ] No direct `fetch` calls in components — uses `services/` layer.
- [ ] Handles loading and error states.
- [ ] No sensitive data stored in local storage.
- [ ] Reusable components are under 150 lines.
- [ ] Socket.IO subscriptions clean up on unmount.

## Emergency Alert / Safety-Critical Checklist

PR touches emergency alerts, presence detection, or GPS tracking:

- [ ] Event delivery is durable — persisted before notification attempt.
- [ ] Failure to deliver does not silently swallow the alert.
- [ ] Audit trail includes event origin and all lifecycle transitions.
- [ ] Notification routing uses verified parent-student linkages.
- [ ] GPS data validates coordinate ranges.

## Privacy Checklist

PR touches student data, guardian data, or consent flows:

- [ ] Complies with PIPEDA purpose limitation — data collected only for stated purpose.
- [ ] MFIPPA requirements met for Ontario public institution data.
- [ ] CASL consent rules followed for electronic notifications.
- [ ] T3/T4 data access is logged for audit.
- [ ] API responses return minimal PII (IDs over names where possible).

## Related Documents

- [agent_governance.md](./09_governance/agent_governance.md) — AI agent rules
- [documentation_standards.md](./09_governance/documentation_standards.md) — Documentation standards
- [../01_security_compliance/privacy_compliance.md](./01_security_compliance/privacy_compliance.md) — PIPEDA/MFIPPA requirements

---

## documentation_standards

_Source: `sdlc_guidelines/09_governance/documentation_standards.md`_

# Documentation Standards

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: Consistent document format, metadata, and structure across SBTM docs

## Purpose

Define formatting and organizational standards for all SBTM documentation in the `docs/` directory.

## Document Metadata

Every document should include a metadata header:

```markdown
# Document Title

- Document owner: <Team or role>
- Last reviewed: <YYYY-MM-DD>
- Primary use: <One-line purpose statement>
```

## Markdown Formatting

| Rule        | Convention                                          |
| ----------- | --------------------------------------------------- |
| Headings    | ATX style (`#`), one blank line before and after    |
| Lists       | Use `-` for unordered lists, `1.` for ordered lists |
| Code blocks | Use fenced code blocks with language identifier     |
| Tables      | Use pipe tables with header separator row           |
| Links       | Relative paths for cross-references within `docs/`  |
| Diagrams    | Mermaid fenced blocks — no external image files     |
| Line length | No hard wrap — use soft wrapping in editors         |

## Cross-Reference Rules

- Use relative paths from the current file to the target: `../../Design/Architecture.md` not `docs/Design/Architecture.md`.
- Link to specific sections using anchors: `[Tenant Isolation](../design_guidelines.md#multi-tenancy-pattern)`.
- When referencing a requirement, include its ID: "See [FR-GPS-001](../../Business/Requirements.md)".
- Verify links after moving or renaming files.

## Document Types

| Type                  | Location                | Purpose                               |
| --------------------- | ----------------------- | ------------------------------------- |
| Business requirements | `docs/Business/`        | What the system must do               |
| Design documents      | `docs/Design/`          | How the system is structured          |
| Implementation guides | `docs/Implementation/`  | Module-by-module build guides         |
| Product roadmap       | `docs/prd/`             | Gap analysis and phase plans          |
| SDLC guidelines       | `docs/sdlc_guidelines/` | Development process standards         |
| Operations guides     | `docs/Operations/`      | Deployment and operational procedures |
| User guides           | `docs/UserGuide/`       | Per-role user documentation           |
| Test documentation    | `docs/Test/`            | Testing guide and plans               |
| Demo materials        | `docs/Demo/`            | Setup and demo scripts                |

## Mermaid Diagram Standards

- Use consistent node naming and color coding (see architecture_guidelines.md).
- Keep diagrams readable — limit to 15–20 nodes maximum.
- If a diagram exceeds complexity, split into sub-diagrams with cross-references.
- Test diagram rendering in a Markdown preview before committing.

## Document Lifecycle

| Action  | Trigger                                                                      |
| ------- | ---------------------------------------------------------------------------- |
| Create  | New feature, service, or process                                             |
| Update  | Implementation changes that affect the documented behavior                   |
| Review  | At least once per phase milestone                                            |
| Archive | Document describes superseded functionality (mark as archived, don't delete) |

## Related Documents

- [review_checklists.md](./09_governance/review_checklists.md) — Code review checklists
- [agent_governance.md](./09_governance/agent_governance.md) — Agent documentation rules
- [../../Governance/DocumentationPolicy.md](../../Governance/DocumentationPolicy.md) — Project documentation policy

---

## docker_development

_Source: `sdlc_guidelines/development/docker_development.md`_

# Docker Development Environment

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Local development setup using Docker Compose

## Purpose

Guide for setting up and using the SBTM local development environment with Docker Compose.

## Prerequisites

| Tool           | Version | Purpose                                                   |
| -------------- | ------- | --------------------------------------------------------- |
| Docker Desktop | 24+     | Container runtime                                         |
| Docker Compose | 2.20+   | Multi-container orchestration                             |
| Node.js        | 20 LTS  | Local development (optional — services run in containers) |
| Git            | 2.40+   | Source control                                            |

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd SBTM

# Start all services
docker-compose up -d

# Initialize the database
bash scripts/init-db.sh

# Verify services are running
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # GPS Tracking
curl http://localhost:3002/health  # Emergency Alerts
```

## Service Endpoints

| Service               | URL                   | Notes                         |
| --------------------- | --------------------- | ----------------------------- |
| API Gateway           | http://localhost:3000 | Main entry point              |
| GPS Tracking          | http://localhost:3001 | Direct access for development |
| Emergency Alerts      | http://localhost:3002 | Direct access for development |
| Student Presence      | http://localhost:3003 | Direct access for development |
| Video Service         | http://localhost:3004 | Direct access for development |
| Student Management    | http://localhost:3005 | Direct access for development |
| Compliance Management | http://localhost:3006 | Direct access for development |
| Admin Dashboard       | http://localhost:5173 | Vite dev server (run locally) |
| MinIO Console         | http://localhost:9001 | Object storage management UI  |

## Development Workflow

### Backend Development

For iterating on a single backend service:

```bash
# Start infrastructure + other services
docker-compose up -d postgres redis minio

# Run the target service locally with hot reload
cd services/gps-tracking
pnpm install
pnpm run start:dev
```

### Frontend Development

```bash
# Start all backend services
docker-compose up -d

# Run the admin dashboard locally
cd apps/admin-dashboard
pnpm install
pnpm run dev
```

### Running the Full Stack

```bash
docker-compose up -d
```

## Demo Environment

Load demo data and simulate a school bus route:

```bash
# Reset and seed the demo database
./scripts/reset-demo-db.sh

# Simulate a GPS track
# (Use the demo GPS track data)
cat scripts/demo-gps-track.json
```

See `docs/Demo/DEMO_SETUP_GUIDE.md` for the full demo walkthrough.

## Troubleshooting

| Issue                       | Solution                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| Port conflict               | Check for other services using ports 3000-3006, 5432, 6379, 9000 |
| Database connection refused | Wait for PostgreSQL health check to pass: `docker-compose ps`    |
| Redis connection error      | Ensure Redis container is running: `docker-compose logs redis`   |
| Out of disk space           | Prune Docker: `docker system prune -a`                           |
| Stale containers            | Rebuild: `docker-compose down && docker-compose up -d --build`   |

## Environment Variables

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

Minimum required variables:

| Variable           | Default                                      | Description           |
| ------------------ | -------------------------------------------- | --------------------- |
| `DATABASE_URL`     | `postgresql://sbtm:sbtm@localhost:5432/sbtm` | PostgreSQL connection |
| `REDIS_URL`        | `redis://localhost:6379`                     | Redis connection      |
| `JWT_SECRET`       | (generate)                                   | JWT signing secret    |
| `MINIO_ENDPOINT`   | `localhost`                                  | MinIO host            |
| `MINIO_PORT`       | `9000`                                       | MinIO port            |
| `MINIO_ACCESS_KEY` | `minioadmin`                                 | MinIO access key      |
| `MINIO_SECRET_KEY` | (generate)                                   | MinIO secret key      |

## Related Documents

- [../08_tech_specific/docker_guidelines.md](./08_tech_specific/docker_guidelines.md) — Docker conventions
- [../07_deployment_operations/deployment_guidelines.md](./07_deployment_operations/deployment_guidelines.md) — Deployment procedures
- [../../Demo/DEMO_SETUP_GUIDE.md](../../Demo/DEMO_SETUP_GUIDE.md) — Demo setup guide
