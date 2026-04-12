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

- [general_coding.md](general_coding.md) — Universal coding rules
- [../01_security_compliance/data_classification.md](../01_security_compliance/data_classification.md) — Data tier rules
- [../01_security_compliance/privacy_compliance.md](../01_security_compliance/privacy_compliance.md) — PIPEDA/MFIPPA compliance
- [../03_architecture_design/threat_modeling.md](../03_architecture_design/threat_modeling.md) — Threat model
