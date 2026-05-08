# SBTM Troubleshooting Guide

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Diagnose common platform failures and degraded workflow states

> **For Azure-deployed environments** (`demo` / `production`), pair this guide
> with [`docs/dev/cloud_debugging_guide.md`](../dev/cloud_debugging_guide.md),
> which documents the seven-layer stack (DNS → TLS → ingress → pod → App
> Insights → DB), `kubectl` / `mirrord` / `kubectl port-forward` workflows, and
> ready-made playbooks for cloud-only failures such as
> `ERR_CERT_COMMON_NAME_INVALID`, ingress 502/504, CORS preflight, and KV/secret
> rotation drift.

## Triage Order

1. Confirm whether the issue is localized to one UI or affects multiple clients.
2. Check API Gateway availability.
3. Check PostgreSQL and Redis health.
4. Identify which domain workflow is failing: tracking, alerting, presence, compliance, or video.
5. Review recent deploys, config changes, or dependency outages.

## Common Symptoms

### Admin Portal: 502 Bad Gateway on Alert Config Endpoints

**Symptom:**
```
GET http://localhost:3001/api/v1/alert-config/escalation-timing/TIER_2 502 (Bad Gateway)
```

**Root Cause:** API Gateway cannot reach the `emergency-alerts` service.

**Resolution Steps:**

1. **Verify service is running:**
   ```bash
   docker ps | grep emergency-alerts
   docker logs emergency-alerts --tail=50
   ```

2. **Check service health:**
   ```bash
   curl http://localhost:3003/api/v1/alert-config/escalation-timing
   ```

3. **Restart service if needed:**
   ```bash
   docker-compose restart emergency-alerts
   # Or full restart:
   ./scripts/schema-seed/reset-demo-db.sh
   ```

4. **Verify environment configuration:**
   - Confirm `ALERTS_SERVICE_URL=http://emergency-alerts:3003` in api-gateway
   - Check database credentials are correct
   - Verify Redis is accessible

5. **Test network connectivity:**
   ```bash
   docker exec api-gateway curl http://emergency-alerts:3003/health
   ```

### Parent Portal: Student Cards Show "Status Unknown"

**Symptom:** All student cards display "Status Unknown" instead of "On the Bus", "At School", or "At Home".

**Root Cause:** No presence events exist in the `presence_event` table for the students.

**Resolution Steps:**

1. **Check if presence events exist:**
   ```bash
   docker exec -it postgres psql -U postgres -d sbms -c "SELECT COUNT(*) FROM presence_event;"
   docker exec -it postgres psql -U postgres -d sbms -c "SELECT * FROM presence_event LIMIT 10;"
   ```

2. **Start GPS simulation to generate events:**
   ```bash
   ./scripts/simulation/SimulationOnlyOnSeededDB.sh
   ```

3. **Check API gateway logs for errors:**
   ```bash
   docker logs api-gateway | grep -i "presence\|status"
   ```

4. **Time-based fallback (as of latest update):**
   - If no presence events exist, the system defaults to:
     - **School hours (8 AM - 3 PM)**: "At School"
     - **After hours**: "At Home"
   - Check `parent.gateway.service.ts:getStudentStatuses()` for implementation

5. **Manually create test presence events:**
   ```sql
   INSERT INTO presence_event (
     id, "schoolId", "studentId", "vehicleId", "routeId",
     "eventType", "timestamp", "source"
   ) VALUES (
     gen_random_uuid(),
     'your-school-id',
     'your-student-id',
     'your-vehicle-id',
     'your-route-id',
     'BOARD',
     NOW(),
     'SMARTTAG'
   );
   ```

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
