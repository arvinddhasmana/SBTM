# SBTM Operations Runbooks

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-24
- Primary use: Repeatable procedures for incident response, restart, recovery, and safety-critical operational handling

## RB-INC-001 Incident Response for Active Route Emergency

**When to use**
- A driver panic or critical route incident has been reported.

**Procedure**
1. Confirm alert creation in the alerting workflow.
2. Verify the affected route, vehicle, tenant, and driver context.
3. Confirm admin dashboard visibility of the incident.
4. Determine whether parent communication has been sent, simulated, or failed.
5. Preserve relevant audit and incident evidence.
6. Track the incident through resolution and post-incident review.

## RB-OPS-001 Restart a Degraded Service

**When to use**
- One backend service is unhealthy while dependencies remain available.

**Procedure**
1. Confirm the problem is isolated to a single service.
2. Check dependent services before restart to avoid repeated failure loops.
3. Restart the service through the platform’s orchestration mechanism.
4. Validate health and a representative user-facing workflow.
5. Record the restart and suspected cause.

## RB-DATA-001 Backup and Restore Readiness

**When to use**
- Preparing for production, validating disaster recovery, or responding to corruption.

**Procedure**
1. Verify scheduled backups exist for PostgreSQL and relevant object storage.
2. Validate restore instructions in a non-production environment.
3. Confirm tenant-sensitive data is protected during backup handling.
4. Document restore time, data loss window, and outstanding risks.

## RB-QUEUE-001 Redis or Queue Degradation

**When to use**
- Alert or presence workflows show queue build-up, missing consumers, or retry storms.

**Procedure**
1. Check Redis health and connectivity.
2. Inspect queue depth and failure counts.
3. Identify whether producers, consumers, or both are degraded.
4. Restore queue processing before replaying or draining workload.
5. Confirm downstream effects on admin and parent workflows.

## RB-PRIV-001 Privacy-Aware Incident Review

**When to use**
- An operational incident requires detailed investigation involving student-linked data.

**Procedure**
1. Limit data access to authorized roles.
2. Use identifiers and incident scope rather than broad data extraction where possible.
3. Preserve auditability of who accessed what and why.
4. Record any follow-up retention, deletion, or disclosure obligations.

## Related Documents

- [DeploymentGuide.md](DeploymentGuide.md)
- [Observability.md](Observability.md)
- [Troubleshooting.md](Troubleshooting.md)