# Redis and BullMQ Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Redis caching, BullMQ queue patterns, and operational rules for SBTM

## Purpose

Define Redis and BullMQ conventions for SBTM. Redis 7 is used for caching and as the backing store for BullMQ job queues in the Emergency Alerts and Student Presence services.

## Redis Usage Patterns

| Pattern | Service | Use Case |
|---|---|---|
| Job queue (BullMQ) | Emergency Alerts, Student Presence | Async notification delivery, presence event processing |
| Caching | API Gateway | Session cache, rate limiting counters |
| Pub/Sub | GPS Tracking | Real-time location broadcast to WebSocket subscribers |

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
    removeOnFail: { age: 604800 },    // 7 days
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

| Metric | Alert Threshold |
|---|---|
| Queue depth (waiting jobs) | > 1000 |
| Failed jobs in last hour | > 10 |
| Job processing time (p95) | > 5 seconds |
| Stalled jobs | Any |

## Caching Rules

- Set TTL on all cached keys. No indefinite caches.
- Use cache-aside pattern: check cache → miss → query DB → populate cache.
- Cache invalidation: delete key on write (not update-in-place).
- Do not cache T3/T4 classified data (student PII). Cache only T1/T2 data (routes, schedules, locations).

| Data | Cacheable? | TTL |
|---|---|---|
| Latest vehicle location | Yes (T2) | 30 seconds |
| Route definitions | Yes (T1) | 5 minutes |
| Student records | No (T3/T4) | — |
| Guardian contact info | No (T4) | — |

## Redis Operational Rules

- Redis must be configured with `maxmemory-policy allkeys-lru` to handle memory pressure gracefully.
- Persistence: use RDB snapshots for queue durability. AOF optional for production.
- Separate Redis instances for cache and queues if performance demands it.

## Related Documents

- [postgresql_postgis.md](postgresql_postgis.md) — Database conventions
- [../03_architecture_design/design_guidelines.md](../03_architecture_design/design_guidelines.md) — Event-driven patterns
- [../01_security_compliance/data_classification.md](../01_security_compliance/data_classification.md) — Data tier caching rules
