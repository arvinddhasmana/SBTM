# SBTM Deployment Guide

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-24
- Primary use: Local deployment baseline and production-oriented deployment guidance

## Scope

This guide covers how SBTM_AntiGravity is deployed locally today and what should be true before claiming readiness for a production-like deployment.

## Local Baseline

The current local deployment baseline is Docker Compose.

### Core Services and Ports

| Component | Port | Notes |
| --- | --- | --- |
| PostgreSQL | 5433 exposed locally | Container uses PostgreSQL 15 with PostGIS |
| Redis | 6379 | Queue broker and cache |
| API Gateway | 3001 | Main backend entry point |
| GPS Tracking | 3002 | Location ingest and history |
| Emergency Alerts | 3003 | Alerts and queue producer |
| Student Presence | 3004 | Presence persistence and cache usage |
| Video Service | 3005 | Video metadata |
| Student Management | 3006 | Enrollment and assignments |
| Compliance Management | 3007 | Compliance and audit |
| Parent App | 3000 | Web app |
| Admin Dashboard | 5173 | Web UI served through containerized frontend |

### Startup Sequence

1. Ensure Docker and Docker Compose are available.
2. Start PostgreSQL and Redis dependencies.
3. Start backend services.
4. Start frontend applications.
5. Verify health through gateway and key UI flows.

### Command

```bash
docker compose up --build
```

## Environment Configuration

Key environment categories:

- database connectivity
- Redis connectivity for queue and cache paths
- JWT and auth secrets
- downstream service URLs used by the gateway
- storage configuration for video workflows
- CORS and client base URL settings

## Production-Oriented Requirements

Before production rollout, the deployment model should include:

- TLS termination and certificate management
- managed secret storage and rotation
- resilient PostgreSQL backup and restore capability
- Redis durability and failover strategy matched to queue needs
- object storage encryption and lifecycle rules
- centralized logs, metrics, and alerting
- documented incident response and rollback procedures

## Deployment Readiness Checklist

- All required environment variables are externally managed.
- Service health checks are defined and monitored.
- Database backup and restore have been tested.
- Queue behavior under dependency failure is understood.
- Tenant-sensitive logs are reviewed for privacy exposure.
- Parent and driver critical workflows have been smoke tested after deployment.

## Related Documents

- [../Design/DeploymentArchitecture.md](../Design/DeploymentArchitecture.md)
- [Observability.md](Observability.md)
- [Runbooks.md](Runbooks.md)