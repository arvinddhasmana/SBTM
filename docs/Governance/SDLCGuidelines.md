# SDLC Guidelines — SBTM AntiGravity

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: Governing the software development lifecycle for the SBTM platform

## Purpose

These guidelines define the development process, quality expectations, and delivery discipline for the School Bus Transport Management (SBTM) platform. They are designed for a cloud-native, microservices-based product that handles child safety data, multi-tenant operational workflows, and near-real-time event processing.

All contributors — engineers, product managers, and QA — should read this document before contributing to the codebase or product planning.

## Related Documents

- [DocumentationPolicy.md](DocumentationPolicy.md)
- [../Business/Requirements.md](../Business/Requirements.md)
- [../Design/v1/Architecture.md](../Design/v1/Architecture.md)
- [../Design/v1/TechnicalSpecifications.md](../Design/v1/TechnicalSpecifications.md)
- [../prd/v1/UpgradePlan/GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md)
- [../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md](../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
- [../Test/TestingGuide.md](../Test/TestingGuide.md)
- [../Operations/DeploymentGuide.md](../Operations/DeploymentGuide.md)

---

## 1. Development Workflow

### 1.1 Branching Strategy

- Use **trunk-based development** with short-lived feature branches.
- Branch naming convention: `feature/<short-description>`, `fix/<short-description>`, `chore/<short-description>`.
- Branches should be merged within 2 days of creation. Long-lived branches require explicit justification.
- Do not commit directly to `main`. All changes go through pull requests.

### 1.2 Commit Discipline

- Write concise, imperative commit messages: `Add BullMQ consumer for alert notifications`, not `changes`.
- One logical change per commit. Avoid mixing unrelated fixes in a single commit.
- Reference issue or ticket IDs where applicable: `Fix presence sync race condition (#42)`.

### 1.3 Pull Requests

- Every pull request must have a description explaining what changed and why.
- Minimum one reviewer approval required before merge.
- The author is responsible for resolving review comments before merging.
- CI must pass before merge. Do not merge failing builds.
- Keep pull requests focused. Large PRs that mix features, refactors, and bug fixes are discouraged.

### 1.4 Code Review Standards

- Reviewers should check for correctness, security implications, test coverage, and documentation accuracy.
- Flag tenant isolation violations, unsafe data handling, and missing auth guards immediately.
- Prefer constructive comments with suggested alternatives over blocking comments without guidance.
- Aim to complete reviews within one business day.

---

## 2. Planning and Prioritization

### 2.1 Phase-Driven Delivery

Work is organized into phases as defined in the [Phase-Wise Implementation Plan](../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md). Each phase:

- Has a clear goal aligned to a user-facing or operational outcome.
- Produces independently demonstrable results.
- Has explicit acceptance criteria that define done.

Do not start phase N+1 scope while phase N acceptance criteria remain unmet for critical items.

### 2.2 Gap Tracking

Active gaps are tracked in [GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md). When a gap is resolved:

1. Update the gap status in `GapAnalysis.md`.
2. Update the relevant `docs/Implementation/Module-*.md` file to reflect the new state.
3. Update the phase plan acceptance criteria if it was a phase milestone.

### 2.3 Definition of Done

A feature or fix is considered done when:

- Code is merged to `main` and CI passes.
- At least one automated test covers the new behavior.
- The relevant implementation doc (`docs/Implementation/Module-*.md`) reflects the current state.
- Any affected API reference or service contract documentation is updated.
- The change does not introduce new lint, type, or build errors.

---

## 3. Architecture and Design

### 3.1 Architecture Decision Records

For significant architectural decisions:

- Write a brief decision note capturing the context, options considered, the chosen direction, and trade-offs.
- Store decision notes in `docs/Design/v1/` or as inline sections in the relevant architecture document.
- Reference ADRs from implementation docs when a decision affects how a module works.

### 3.2 Event-Driven Design

SBTM uses a BullMQ-based event backbone for asynchronous workflows. When adding event-driven features:

- Define the event schema in [EventCatalog.md](../Design/v1/EventCatalog.md) before implementation.
- Separate producer and consumer responsibilities clearly.
- Ensure consumers are idempotent where repeat delivery is possible.
- Persist event delivery outcomes for audit and debug.

### 3.3 Multi-Tenancy

All features that touch operational data must respect tenant boundaries:

- Use `school_id` scoping in every database query that touches tenant-sensitive data.
- Gate all API endpoints with the appropriate role guard and tenant context check at the gateway.
- Do not trust tenant context from request bodies — derive it from the authenticated JWT.
- Document any new tenant-sensitive entity in [DatabaseSchema.md](../Design/v1/DatabaseSchema.md).

### 3.4 Privacy and Child Safety

SBTM processes student data subject to PIPEDA and MFIPPA. When implementing features:

- Minimize data collection to what is operationally necessary.
- Do not expose student PII in logs, error messages, or public API error responses.
- Apply data retention rules from [DataRetention.md](../Design/v1/DataRetention.md) to all new data stores.
- Get explicit review for any new data type that involves student identity, location, or health.

---

## 4. Coding Standards

### 4.1 Language and Framework

| Layer | Language | Framework |
|-------|----------|-----------|
| Backend services | TypeScript | NestJS (primary), Express (GPS service) |
| Frontend web apps | TypeScript | React, Vite, Tailwind CSS |
| Mobile app | TypeScript | React Native, Expo |
| Database ORM | TypeScript | Prisma (GPS), TypeORM (other services) |
| Queue | TypeScript | BullMQ, Redis |

### 4.2 TypeScript

- Enable strict mode in `tsconfig`. Do not disable strict flags to work around type errors.
- Use explicit types for function parameters and return values. Avoid `any`.
- Use readonly where mutation is not intended.
- Export interfaces from a shared `types` module when more than one service or app needs the same contract.

### 4.3 NestJS Services

- Organize code into modules with clear dependency injection boundaries.
- Do not instantiate services manually outside of the module context.
- Use DTOs with class-validator for all incoming request bodies.
- Use interceptors or guards for cross-cutting concerns such as auth, tenant scoping, and logging.
- Keep controllers thin: route handling and DTO validation only.

### 4.4 Error Handling

- Use NestJS exception filters for consistent HTTP error responses.
- Do not leak implementation details or stack traces in production API error responses.
- Log errors at the service layer with enough context to diagnose without exposing PII.
- Return meaningful HTTP status codes: `400` for validation, `401` for auth, `403` for authorization, `404` for not found, `409` for conflict, `500` for unexpected server errors.

### 4.5 Database

- Use migrations for all schema changes. Do not apply schema changes directly in production.
- Name migrations descriptively: `add_notification_delivery_status_table`, not `migration_001`.
- Index columns used in tenant-scoped or frequently-filtered queries.
- Avoid N+1 query patterns. Use eager loading or joins where appropriate.

---

## 5. Testing

Refer to [TestingGuide.md](../Test/TestingGuide.md) for full testing guidance. The following rules apply to all features:

### 5.1 Required Test Coverage

| Feature type | Minimum test requirement |
|---|---|
| New API endpoint | At least one integration test covering the happy path and one error case |
| New BullMQ consumer | Integration test for queue producer-to-consumer flow |
| New business rule or validation | Unit test per rule |
| Auth or RBAC change | Integration test verifying unauthorized access is rejected |
| New database migration | Smoke test confirming the migration applies cleanly |

### 5.2 Testing Principles

- Test behavior, not implementation. Tests should not break when internal refactoring leaves the behavior unchanged.
- Prefer integration tests over mocking deep into the stack for event-driven flows.
- Use realistic seeded data in tests. Avoid trivial placeholder values that hide edge cases.
- Tests must be deterministic. Avoid time-dependent or order-dependent assertions.

### 5.3 Running Tests

```bash
# Run tests for a specific service
cd services/<service-name>
npm run test

# Run tests with coverage
npm run test:cov
```

---

## 6. Documentation

Refer to [DocumentationPolicy.md](DocumentationPolicy.md) for full documentation rules. Key rules for SDLC:

- Update `docs/Implementation/Module-*.md` when a module's behavior changes.
- Update service `README.md` when endpoints, runtime ports, dependencies, or gaps change.
- Add or update the [EventCatalog.md](../Design/v1/EventCatalog.md) when new events are introduced.
- Mark superseded documentation with a redirect note rather than deleting it.

---

## 7. CI/CD Pipeline

### 7.1 CI Checks

Every pull request runs:

- TypeScript compilation (`tsc --noEmit`)
- Lint (`eslint`)
- Unit and integration tests
- Docker build validation

All checks must pass before merge.

### 7.2 CD Pipeline

- Merges to `main` trigger a build and push to the container registry.
- Staging deployments are automated on successful `main` builds.
- Production deployments require a manual promotion step and a pre-deployment checklist review.

### 7.3 Environment Management

- Use environment variables for all secrets, credentials, and environment-specific configuration.
- Never commit `.env` files or secrets to the repository.
- Use `.env.example` files to document required variables without values.
- Secrets in production are managed through the agreed secret store — not hardcoded or injected as plain environment variables in Kubernetes manifests without sealing.

---

## 8. Security

### 8.1 Auth and Authorization

- All API requests to backend services must pass through the API gateway.
- The gateway validates JWTs and attaches role and tenant context to forwarded requests.
- Downstream services must not implement their own auth — they trust the gateway-forwarded context.
- Apply role guards using NestJS `@Roles()` decorators or equivalent for every endpoint.

### 8.2 Input Validation

- Validate all incoming data at the controller layer using class-validator DTOs.
- Reject requests with unexpected or out-of-range values before they reach service logic.
- Sanitize any data that is reflected back in responses or stored for display.

### 8.3 Dependency Management

- Pin direct dependency versions. Use lock files (`package-lock.json`).
- Run `npm audit` before releasing. Resolve high and critical vulnerabilities.
- Do not introduce new dependencies without reviewing their license and security posture.

### 8.4 Secret Handling

- Never log JWT tokens, passwords, or private keys.
- Rotate secrets when a team member with access departs.
- Use short-lived tokens where possible.

---

## 9. Observability

### 9.1 Logging

- Use structured JSON logging in all services.
- Include `requestId`, `userId` (if available), `tenantId`, and `service` in every log entry.
- Log at `info` for normal operations, `warn` for recoverable issues, and `error` for failures.
- Do not log PII such as student names, phone numbers, or location coordinates.

### 9.2 Metrics and Tracing

- Emit health check endpoints (`/health`) from all services.
- Add distributed trace context headers on all inter-service calls.
- Use correlation IDs that propagate from the gateway through to downstream services.

### 9.3 Alerting

- Define runbooks for all alerts before enabling them in production. See [Runbooks.md](../Operations/Runbooks.md).
- Alert on queue depth, service error rates, and auth failure spikes as a minimum.

---

## 10. Release and Deployment

Refer to [DeploymentGuide.md](../Operations/DeploymentGuide.md) for detailed deployment procedures.

### 10.1 Release Checklist

Before a release:

- [ ] All phase acceptance criteria for the release scope are met.
- [ ] CI is green on `main`.
- [ ] Migration scripts have been reviewed and tested.
- [ ] `Last reviewed` dates are updated on affected documentation.
- [ ] Runbooks are updated to reflect any new operational behavior.
- [ ] Demo guide is validated against the new build.

### 10.2 Rollback

- Every deployment must have a defined rollback path before it is promoted to production.
- Database migrations that cannot be rolled back require explicit sign-off before execution.
- Keep the previous Docker image tagged and available for at least 48 hours post-deployment.
