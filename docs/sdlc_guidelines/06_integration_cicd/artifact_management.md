# Artifact Management

- Document owner: Engineering and DevOps
- Last reviewed: 2026-03-24
- Primary use: Docker image management, npm package conventions, and build output handling

## Purpose

Define how build artifacts (Docker images, npm packages, built assets) are managed across the SBTM development lifecycle.

## Docker Image Conventions

### Image Naming

```
<registry>/<project>/<service>:<tag>
```

Example: `registry.local/sbtm/api-gateway:main-a1b2c3d`

### Tagging Strategy

| Context | Tag Format | Example |
|---|---|---|
| Feature branch | `<service>:<branch>-<short-sha>` | `api-gateway:feature-gps-042-a1b2c3d` |
| Main branch | `<service>:main-<short-sha>` | `api-gateway:main-a1b2c3d` |
| Release | `<service>:<semver>` | `api-gateway:1.0.0` |
| Latest stable | `<service>:latest` | `api-gateway:latest` (alias for last release) |

### Image Rules

- Use multi-stage Docker builds to minimize image size.
- Base images must use specific version tags (e.g., `node:20-alpine`), not `latest`.
- Run containers as non-root users.
- Do not include `.env` files, test fixtures, or development dependencies in production images.
- Include a `HEALTHCHECK` instruction in Dockerfiles.

### Image Lifecycle

| Image Age | Action |
|---|---|
| Feature branch images > 7 days after merge | Delete from registry |
| Main branch images > 30 days | Delete if not tagged as release |
| Release images | Retain indefinitely |

## npm Package Conventions

SBTM uses a monorepo with workspaces. There are no published npm packages.

| Rule | Detail |
|---|---|
| Lock file | `package-lock.json` committed at root and per workspace |
| Install command | `npm ci` in CI (deterministic); `npm install` during development |
| Version pinning | Exact versions in `package.json` (no `^` or `~` for production deps) |
| Workspace hoisting | Shared dependencies hoisted to root `node_modules` |

## Build Outputs

| Application | Build Tool | Output Directory | Asset |
|---|---|---|---|
| Admin Dashboard | Vite | `dist/` | Static HTML/JS/CSS |
| Parent App (Web) | Vite | `dist/` | Static HTML/JS/CSS |
| Driver App | Expo | `android/` / `ios/` | Native binaries |
| Backend Services | tsc | `dist/` | Compiled JavaScript |

- Built assets are not committed. They are produced in CI and packaged into Docker images.
- Source maps are generated for development and staging but excluded from production images.

## Related Documents

- [ci_cd_pipeline.md](ci_cd_pipeline.md) — Pipeline stages
- [branching_strategy.md](branching_strategy.md) — Branch and tagging flow
- [../01_security_compliance/supply_chain_security.md](../01_security_compliance/supply_chain_security.md) — Dependency and image security
