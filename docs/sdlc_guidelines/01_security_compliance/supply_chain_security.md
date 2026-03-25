# Supply Chain Security

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Dependency vetting and supply chain security for npm, Docker, and CI dependencies

## Purpose

SBTM depends on open-source packages via npm and Docker images. This document defines rules for vetting, monitoring, and managing third-party dependencies to prevent supply chain attacks.

## npm Dependency Rules

- Run `npm audit` in CI for every PR. Block merges on critical or high severity vulnerabilities.
- Pin major versions in `package.json`. Use exact versions in lockfiles (`package-lock.json`).
- Review new dependencies before adding. Prefer packages with: active maintenance, known maintainers, >1000 weekly downloads, no known CVEs.
- Do not use packages that are deprecated, unmaintained (>1 year without update), or from unknown publishers.
- Audit `postinstall` scripts. Disable automatic script execution in CI (`--ignore-scripts`) and run scripts explicitly for trusted packages only.

## Docker Image Rules

- Use official or verified publisher images only (e.g., `node:20-alpine`, `postgres:15`, `redis:7-alpine`).
- Pin image tags to specific digests or semantic versions. Never use `:latest` in production Dockerfiles.
- Scan images with a vulnerability scanner (e.g., Trivy, Snyk) in CI. Block images with critical vulnerabilities.
- Use multi-stage builds to minimize the final image surface area. Do not include build tools, dev dependencies, or test fixtures in production images.
- Run containers as non-root users. Set `USER node` in Node.js Dockerfiles.

## CI Pipeline Security

- Protect CI secrets (database credentials, API keys, tokens) using the CI platform's secret management. Never echo secrets in logs.
- Pin CI action versions to specific commits or tags. Do not use `@latest` or `@main` for third-party GitHub Actions.
- Limit CI permissions to the minimum required (read for PRs, write only for deploy steps).
- Review and approve CI workflow changes in PRs like any other code change.

## Monitoring

- Enable GitHub Dependabot or equivalent for automated vulnerability alerts on npm and Docker dependencies.
- Review dependency audit reports weekly. Patch critical and high vulnerabilities within 7 days.
- Track dependency licenses. Avoid copyleft licenses (GPL) in runtime dependencies unless approved by the project lead.

## Related Documents

- [data_classification.md](data_classification.md) — Data handling tiers
- [privacy_compliance.md](privacy_compliance.md) — Compliance frameworks
- [../06_integration_cicd/ci_cd_pipeline.md](../06_integration_cicd/ci_cd_pipeline.md) — CI pipeline definition
- [../08_tech_specific/docker_guidelines.md](../08_tech_specific/docker_guidelines.md) — Docker standards
