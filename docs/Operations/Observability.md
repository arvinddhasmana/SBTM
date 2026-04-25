# SBTM Observability Guide

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Operational monitoring expectations for health, metrics, logs, and traces

> **Hands-on debugging recipes** (Application Insights KQL queries, distributed
> trace walking, `kubectl logs` / `describe` / `exec`, port-forward, mirrord) are
> in [`docs/dev/cloud_debugging_guide.md`](../dev/cloud_debugging_guide.md).
> This document defines _what_ to monitor; the cloud debugging guide defines
> _how_ to investigate when a signal goes red.

## Goals

- Detect broken safety-critical workflows quickly.
- Diagnose cross-service failures without relying on ad hoc log inspection.
- Preserve enough context to investigate incidents while avoiding unnecessary exposure of sensitive data.

## Health Signals

| Signal                             | Why It Matters                                            |
| ---------------------------------- | --------------------------------------------------------- |
| API Gateway availability           | Applications depend on it as the main backend surface     |
| PostgreSQL connectivity            | All core transactional flows depend on it                 |
| Redis health and queue depth       | Alerts and presence event processing rely on it           |
| GPS ingest success rate            | Route visibility and downstream intelligence depend on it |
| Alert creation latency             | Incidents are time-sensitive                              |
| Presence event persistence latency | Boarding and alighting workflows need confidence          |
| Parent delivery pipeline status    | A core safety communication expectation                   |
| OSRM routing availability          | Route optimization and geometry calculations depend on it |

## Recommended Metrics

| Metric                         | Type      | Scope                                  |
| ------------------------------ | --------- | -------------------------------------- |
| request latency                | histogram | gateway and all HTTP services          |
| error rate                     | counter   | per service and per endpoint group     |
| queue depth                    | gauge     | alerts and presence queues             |
| queue retry count              | counter   | event consumers                        |
| location ingest rate           | counter   | GPS service                            |
| active alerts                  | gauge     | alerts service                         |
| presence event throughput      | counter   | student presence service               |
| failed notification deliveries | counter   | notification workflow when implemented |

## Logging Guidance

- Use structured logs with service name, environment, request or correlation ID, tenant context, and event type where relevant.
- Avoid logging raw student PII or full route histories unless strictly required for diagnosis.
- Redact credentials, tokens, and sensitive payload fields.
- Make it possible to trace a single incident across gateway, alerts, presence, and parent-delivery flows.

## Tracing Guidance

- Propagate a correlation ID from the gateway into downstream services.
- Include queue-published event IDs in structured logs.
- Make queue consumer retries visible in telemetry rather than burying them in silent loops.

## Alerting Priorities

1. Gateway unavailable
2. Database unavailable
3. Redis unavailable for alert or presence paths
4. Alert creation failures or sustained latency spike
5. Presence persistence failures
6. Notification delivery failures once implemented

## Privacy Notes

- Logs and dashboards should prefer identifiers and scoped metadata over broad student-detail dumps.
- Investigative access to audit or incident detail should remain role-limited.

## Related Documents

- [DeploymentGuide.md](DeploymentGuide.md)
- [Troubleshooting.md](Troubleshooting.md)
- [Runbooks.md](Runbooks.md)
