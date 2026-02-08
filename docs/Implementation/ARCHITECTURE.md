# 🏗️ **SBTM Architecture Guide (V2)**

## 1. Overview
The School Bus Transport Management (SBTM) system has evolved into a **Multi-Tenant SaaS Platform**. This document serves as the central reference for the V2 architecture, design, and implementation standards.

## 2. V2 Design Specifications
> [!IMPORTANT]
> **Refer to these detailed documents for implementation:**

- **[System Architecture V2](../Design/SYSTEM_ARCHITECTURE_V2.md)**: High-level diagrams, microservices, and stack.
- **[Database Schema V2](../Design/DATABASE_SCHEMA_V2.md)**: Multi-tenant data models (Schools, Boards, Vehicles).
- **[API Design V2](../Design/API_DESIGN_V2.md)**: REST contracts for OSTA, Schools, and Parents.
- **[UI Wireframes V2](../Design/UI_WIREFRAMES_V2.md)**: New screens for Admin and Mobile apps.
- **[Multi-Tenant Feature List](../MultiTenant_Features.md)**: Detailed functional requirements.

---

## 3. Industry Best Practices & Standards

### 3.1 Security & Privacy (PIPEDA / MFIPPA)
- **Data Residency**: All data MUST be stored in **Canada** (e.g., AWS ca-central-1).
- **Encryption**:
  - **In Transit**: TLS 1.3 for all internal and external communication.
  - **At Rest**: AES-256 for Database volumes and Object Storage.
- **Access Control**:
  - **Least Privilege**: Services use distinct DB credentials. Users have minimum required roles.
  - **Audit Trails**: All access to PII (Student data) must be logged in an immutable audit log.

### 3.2 Reliability & Scalability
- **Stateless Services**: All backend services must be stateless to allow horizontal scaling (Auto Scaling Groups).
- **Circuit Breakers**: Use patterns (e.g., Opossum/Polly) to handle external API failures (Maps, SMS).
- **Multi-AZ**: Deploy across at least 3 Availability Zones for high availability.

### 3.3 Code Quality & Operations
- **Infrastructure as Code (IaC)**: Use Terraform/CDK for all infra changes.
- **CI/CD**: Automated pipelines for Build -> Test -> Deploy.
- **Observability**: Centralized logging (ELK/CloudWatch) and Tracing (OpenTelemetry).

---

## 4. Legal Guidelines (Ontario/Canada)

### 4.1 Student Data Protection
- **Consent**: Systems must track parental consent for data collection (e.g., Video, Location).
- **Retention**:
  - **Video**: Hard delete after 30 days unless flagged for incident.
  - **GPS History**: Retain for 1 year for audit/dispute resolution.

### 4.2 Accessibility (AODA)
- All public-facing web interfaces (Parent App, Admin Dashboard) **MUST** comply with **WCAG 2.1 Level AA** standards.

---

## 5. Legacy Documentation (Reference)
- [Original Architecture (V1)](./ARCHITECTURE_OLD.md) - For reference only.
