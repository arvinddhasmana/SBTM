# Docker Development Environment

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Local development setup using Docker Compose

## Purpose

Guide for setting up and using the SBTM local development environment with Docker Compose.

## Prerequisites

| Tool           | Version | Purpose                                                   |
| -------------- | ------- | --------------------------------------------------------- |
| Docker Desktop | 24+     | Container runtime                                         |
| Docker Compose | 2.20+   | Multi-container orchestration                             |
| Node.js        | 20 LTS  | Local development (optional — services run in containers) |
| Git            | 2.40+   | Source control                                            |

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd SBTM

# Start all services
docker-compose up -d

# Initialize the database
bash scripts/init-db.sh

# Verify services are running
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # GPS Tracking
curl http://localhost:3002/health  # Emergency Alerts
```

## Service Endpoints

| Service               | URL                   | Notes                         |
| --------------------- | --------------------- | ----------------------------- |
| API Gateway           | http://localhost:3000 | Main entry point              |
| GPS Tracking          | http://localhost:3001 | Direct access for development |
| Emergency Alerts      | http://localhost:3002 | Direct access for development |
| Student Presence      | http://localhost:3003 | Direct access for development |
| Video Service         | http://localhost:3004 | Direct access for development |
| Student Management    | http://localhost:3005 | Direct access for development |
| Compliance Management | http://localhost:3006 | Direct access for development |
| Admin Dashboard       | http://localhost:5173 | Vite dev server (run locally) |
| MinIO Console         | http://localhost:9001 | Object storage management UI  |

## Development Workflow

### Backend Development

For iterating on a single backend service:

```bash
# Start infrastructure + other services
docker-compose up -d postgres redis minio

# Run the target service locally with hot reload
cd services/gps-tracking
pnpm install
pnpm run start:dev
```

### Frontend Development

```bash
# Start all backend services
docker-compose up -d

# Run the admin dashboard locally
cd apps/admin-dashboard
pnpm install
pnpm run dev
```

### Running the Full Stack

```bash
docker-compose up -d
```

## Demo Environment

Load demo data and simulate a school bus route:

```bash
# Reset and seed the demo database
./scripts/reset-demo-db.sh

# Simulate a GPS track
# (Use the demo GPS track data)
cat scripts/demo-gps-track.json
```

See `docs/Demo/DEMO_SETUP_GUIDE.md` for the full demo walkthrough.

## Troubleshooting

| Issue                       | Solution                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| Port conflict               | Check for other services using ports 3000-3006, 5432, 6379, 9000 |
| Database connection refused | Wait for PostgreSQL health check to pass: `docker-compose ps`    |
| Redis connection error      | Ensure Redis container is running: `docker-compose logs redis`   |
| Out of disk space           | Prune Docker: `docker system prune -a`                           |
| Stale containers            | Rebuild: `docker-compose down && docker-compose up -d --build`   |

## Environment Variables

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

Minimum required variables:

| Variable           | Default                                      | Description           |
| ------------------ | -------------------------------------------- | --------------------- |
| `DATABASE_URL`     | `postgresql://sbtm:sbtm@localhost:5432/sbtm` | PostgreSQL connection |
| `REDIS_URL`        | `redis://localhost:6379`                     | Redis connection      |
| `JWT_SECRET`       | (generate)                                   | JWT signing secret    |
| `MINIO_ENDPOINT`   | `localhost`                                  | MinIO host            |
| `MINIO_PORT`       | `9000`                                       | MinIO port            |
| `MINIO_ACCESS_KEY` | `minioadmin`                                 | MinIO access key      |
| `MINIO_SECRET_KEY` | (generate)                                   | MinIO secret key      |

## Related Documents

- [../08_tech_specific/docker_guidelines.md](../08_tech_specific/docker_guidelines.md) — Docker conventions
- [../07_deployment_operations/deployment_guidelines.md](../07_deployment_operations/deployment_guidelines.md) — Deployment procedures
- [../../Demo/DEMO_SETUP_GUIDE.md](../../Demo/DEMO_SETUP_GUIDE.md) — Demo setup guide
