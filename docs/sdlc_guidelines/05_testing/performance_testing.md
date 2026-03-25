# Performance Testing

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Load testing, performance budgets, and benchmarking for SBTM services

## Purpose

Define performance testing requirements for SBTM. School bus tracking is time-sensitive — GPS updates, emergency alerts, and presence notifications must arrive within acceptable latency bounds.

## Performance Budgets

| Operation | Target Latency (p95) | Throughput Target |
|---|---|---|
| GPS location POST | < 200ms | 100 updates/second per school |
| Location query (latest by route) | < 300ms | N/A |
| Emergency alert creation | < 500ms | N/A |
| Student presence event (board/alight) | < 300ms | 50 events/second per school |
| Admin dashboard page load | < 2s | N/A |
| WebSocket connection establishment | < 1s | 200 concurrent connections |
| Parent app notification delivery | < 3s (end-to-end) | N/A |

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

| Purpose | Tool | Notes |
|---|---|---|
| HTTP load testing | k6 or Artillery | Script-based, can simulate GPS payloads |
| WebSocket testing | k6 (websocket protocol) | Test Socket.IO connection scaling |
| Database benchmarking | pgbench | PostGIS spatial query performance |
| Frontend performance | Lighthouse (CI) | Admin dashboard performance scores |

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

- [testing_strategy.md](testing_strategy.md) — Test pyramid and coverage
- [security_testing.md](security_testing.md) — Security test patterns
- [../07_deployment_operations/monitoring_observability.md](../07_deployment_operations/monitoring_observability.md) — Production monitoring
