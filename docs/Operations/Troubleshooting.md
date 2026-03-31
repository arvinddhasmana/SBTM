# SBTM Troubleshooting Guide

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Diagnose common platform failures and degraded workflow states

## Triage Order

1. Confirm whether the issue is localized to one UI or affects multiple clients.
2. Check API Gateway availability.
3. Check PostgreSQL and Redis health.
4. Identify which domain workflow is failing: tracking, alerting, presence, compliance, or video.
5. Review recent deploys, config changes, or dependency outages.

## Common Symptoms

### Parent app shows stale or missing live location

Possible causes:

- GPS service ingest or query failure
- gateway proxy issue for route tracking endpoints
- route assignment mismatch between student and route

Checks:

- verify GPS service is reachable
- verify recent location points exist for the route
- verify parent-child-route linkage is correct

### Emergency alert created but not visible to admins or parents

Possible causes:

- alert persistence failure
- gateway routing issue
- Redis or queue processing issue
- parent delivery pipeline incomplete or degraded

Checks:

- confirm alert record creation
- confirm alert queue publish behavior
- confirm admin real-time channel health
- confirm whether parent workflow is polling or event-driven in the environment

### Driver presence actions do not persist

Possible causes:

- mobile app fell back to local-only behavior
- student presence endpoint unavailable
- offline queue not flushing after reconnect

Checks:

- inspect app connectivity state
- confirm presence service health
- inspect offline queue flush logs or metrics

### Compliance records missing or inconsistent

Possible causes:

- incorrect tenant query scope
- service-local audit behavior not reflected elsewhere
- database write failure

Checks:

- verify `schoolId` filters and record ownership
- confirm DB connectivity
- review recent create or update requests

## Dependency Failures

| Dependency          | Expected Impact                                                           |
| ------------------- | ------------------------------------------------------------------------- |
| PostgreSQL down     | Most platform workflows fail or degrade severely                          |
| Redis down          | Alert and presence queue-backed behavior degrades; state caching affected |
| Object storage down | Video upload and retrieval fail                                           |
| Gateway down        | Apps lose primary backend access                                          |

## Escalation Guidance

- Escalate immediately if tracking, alerts, or presence failures affect active routes.
- Treat parent communication failures during an active incident as high priority.
- Treat audit or compliance inconsistencies as operationally important even if route execution continues.

## Related Documents

- [Observability.md](Observability.md)
- [Runbooks.md](Runbooks.md)
