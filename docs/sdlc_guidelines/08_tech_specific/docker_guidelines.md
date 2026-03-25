# Docker Guidelines

- Document owner: Engineering and DevOps
- Last reviewed: 2026-03-24
- Primary use: Dockerfile conventions, Docker Compose patterns, and container security for SBTM

## Purpose

Define Docker conventions for the SBTM monorepo. All backend services and the admin dashboard use Docker for development, CI, and deployment.

## Dockerfile Conventions

### Multi-Stage Build Template (NestJS Service)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### Multi-Stage Build Template (Vite App)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:1.25-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Dockerfile Rules

| Rule | Detail |
|---|---|
| Base images | Use specific version tags (`node:20-alpine`, not `node:latest`) |
| Non-root user | Run production containers as a non-root user |
| Health checks | Include `HEALTHCHECK` instructions |
| `.dockerignore` | Exclude `node_modules`, `.env`, test files, docs |
| Layer caching | Copy `package.json` and install dependencies before copying source |
| No secrets | Never use `ENV` or `ARG` for secrets in Dockerfiles |
| Image size | Multi-stage builds to minimize final image size |

## Docker Compose Conventions

### Service Naming

```yaml
services:
  api-gateway:      # Matches directory name in services/
  gps-tracking:
  emergency-alerts:
  student-presence:
  video-service:
  student-management:
  compliance-management:
  postgres:          # Infrastructure services use technology name
  redis:
  minio:
```

### Network and Port Conventions

| Service | Internal Port | External Port (dev) |
|---|---|---|
| API Gateway | 3000 | 3000 |
| GPS Tracking | 3001 | 3001 |
| Emergency Alerts | 3002 | 3002 |
| Student Presence | 3003 | 3003 |
| Video Service | 3004 | 3004 |
| Student Management | 3005 | 3005 |
| Compliance Management | 3006 | 3006 |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| MinIO | 9000 | 9000 |

### Dependency Management

```yaml
services:
  api-gateway:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

Use `condition: service_healthy` with health checks to ensure dependencies are ready.

## Container Security

- Scan images for vulnerabilities using `docker scout` or `trivy`.
- Do not mount the Docker socket into containers.
- Use read-only filesystem where possible: `read_only: true` in Compose.
- Limit container resources in production:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

## Related Documents

- [../06_integration_cicd/ci_cd_pipeline.md](../06_integration_cicd/ci_cd_pipeline.md) — Docker build in CI
- [../06_integration_cicd/artifact_management.md](../06_integration_cicd/artifact_management.md) — Image tagging and lifecycle
- [../07_deployment_operations/deployment_guidelines.md](../07_deployment_operations/deployment_guidelines.md) — Deployment procedures
