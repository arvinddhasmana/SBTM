# General Coding Standards

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Universal rules that apply to all SBTM code regardless of language or framework

## Purpose

Establish baseline code quality rules enforced across the entire monorepo. Language-specific and framework-specific rules are in companion files.

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Variables, functions | camelCase | `getStudentById`, `routeConfig` |
| Classes, interfaces, types | PascalCase | `StudentService`, `LocationDto` |
| Constants, enums | UPPER_SNAKE_CASE | `MAX_GPS_INTERVAL`, `Role.SCHOOL_ADMIN` |
| Files (TypeScript) | kebab-case | `student-management.service.ts` |
| Database tables, columns | snake_case | `student_presence`, `school_id` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |

## Code Organization

- One class or primary export per file.
- Group by feature, not by technical layer (e.g., `students/` contains controller, service, dto, and entity for students).
- Keep files under 300 lines. Split when a file exceeds this threshold.
- Order imports: external packages first, then internal modules, then relative paths.

## Error Handling

- Use framework-provided error classes (`HttpException` in NestJS, standard `Error` in Express).
- Throw errors early; catch errors at the boundary (controller/middleware level).
- Never swallow errors silently — always log or re-throw.
- Use structured error responses: `{ statusCode, message, error }`.
- Do not expose stack traces or internal paths in production error responses.

## Logging

- Use structured JSON logging in backend services.
- Include correlation fields: `requestId`, `tenantId` (school_id), `userId`, `action`.
- Log levels: `error` (failures), `warn` (degraded), `info` (business events), `debug` (development).
- Never log PII (student names, guardian contact info). See data classification guide for tier rules.
- Log template: `{ level, timestamp, service, requestId, tenantId, message, ...context }`.

## Environment and Configuration

- All runtime configuration comes from environment variables.
- Use `.env.example` files as templates — never commit `.env` files.
- Validate environment variables at startup using a schema (e.g., Joi, class-validator, or Zod).
- Fail fast on missing required configuration.

## Comments

- Write comments that explain *why*, not *what*.
- Remove commented-out code before committing.
- Use JSDoc for public API functions and DTOs that are consumed by other services.

## Git Conventions

- Commit messages follow Conventional Commits: `type(scope): description`.
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.
- Scope: service or app name (e.g., `gps-tracking`, `admin-dashboard`).
- Keep commits atomic — one logical change per commit.

## Related Documents

- [typescript_standards.md](typescript_standards.md) — TypeScript-specific rules
- [nestjs_standards.md](nestjs_standards.md) — NestJS conventions
- [secure_coding.md](secure_coding.md) — Security-focused coding rules
