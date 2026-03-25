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

| Scenario | Expected Outcome |
|---|---|
| Request without Authorization header | 401 Unauthorized |
| Request with expired JWT | 401 Unauthorized |
| Request with malformed JWT | 401 Unauthorized |
| Request with valid JWT but wrong role | 403 Forbidden |
| Request with valid JWT and correct role | 200 OK |

## Authorization (RBAC) Tests

Test that each role can only access its permitted endpoints:

| Role | Can Access | Cannot Access |
|---|---|---|
| `parent` | Own child's location, presence events | Other parents' data, admin endpoints, compliance |
| `driver` | Own route, presence management | Student management, compliance, admin |
| `school_admin` | All data within own school | Other schools' data, OSTA admin endpoints |
| `osta_admin` | Cross-school data, compliance | N/A (highest role) |

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

| Input | Test |
|---|---|
| SQL injection in query params | `?search=' OR 1=1 --` returns 400, not data |
| XSS in text fields | `<script>alert(1)</script>` is sanitized or rejected |
| Oversized payloads | Request body > 1MB returns 413 |
| Invalid GPS coordinates | `lat: 999, lng: -999` returns 400 |
| Negative pagination values | `?page=-1&limit=0` returns 400 |

## Dependency Vulnerability Scanning

- Run `npm audit` as a CI step.
- Fail the build on `critical` or `high` severity findings.
- Review `moderate` findings monthly.
- Document accepted risks for `low` findings that cannot be resolved.

## Related Documents

- [testing_strategy.md](testing_strategy.md) — Test pyramid and coverage targets
- [performance_testing.md](performance_testing.md) — Load testing
- [../04_coding_standards/secure_coding.md](../04_coding_standards/secure_coding.md) — Secure coding rules
- [../01_security_compliance/data_classification.md](../01_security_compliance/data_classification.md) — PII tier rules
