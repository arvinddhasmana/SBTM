# NestJS Standards

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: NestJS-specific conventions for SBTM backend services

## Purpose

Define NestJS-specific patterns used across the 6 NestJS services in SBTM. The GPS Tracking service uses Express directly and follows only the general and TypeScript standards.

## Module Structure

Each NestJS service follows this structure:

```
services/<service-name>/src/
├── main.ts                  # Bootstrap, CORS, Swagger, validation pipe
├── app.module.ts            # Root module
├── config/                  # Configuration module, env validation
├── <feature>/
│   ├── <feature>.module.ts
│   ├── <feature>.controller.ts
│   ├── <feature>.service.ts
│   ├── dto/
│   │   ├── create-<feature>.dto.ts
│   │   └── update-<feature>.dto.ts
│   ├── entities/
│   │   └── <feature>.entity.ts
│   └── <feature>.controller.spec.ts
├── auth/                    # Guards, decorators, strategies
├── common/                  # Shared pipes, filters, interceptors
└── database/                # TypeORM/Prisma setup, migrations
```

## Dependency Injection

- Register all providers in their feature module, not in the root module.
- Use constructor injection (avoid property injection).
- Use `@Injectable()` with explicit scope only when needed (`Scope.REQUEST` for tenant-scoped services).
- Prefer interfaces for service contracts and inject using `@Inject('TOKEN')` when working with abstractions.

## Controllers

- Controllers handle HTTP concerns only: extract params, call service, return response.
- Use DTOs with `class-validator` decorators for all request bodies.
- Apply `@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` globally or per controller.
- Return consistent response shapes using interceptors or manual wrapping.

```typescript
@Post()
async create(@Body() dto: CreateStudentDto, @Req() req: Request) {
  const schoolId = req.user.schoolId; // from JWT
  return this.studentService.create(dto, schoolId);
}
```

## Guards and Decorators

- JWT authentication is enforced globally via `AuthGuard`.
- RBAC is enforced per route using a `@Roles()` decorator and `RolesGuard`.
- Tenant context (school_id) is extracted from the JWT by a custom decorator or guard.

```typescript
@Roles(Role.SCHOOL_ADMIN)
@Get()
async findAll(@TenantId() schoolId: string) {
  return this.service.findAll(schoolId);
}
```

## Exception Handling

- Use NestJS built-in exceptions: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`.
- Register a global `AllExceptionsFilter` that formats errors consistently and logs them.
- Never expose stack traces in production responses.

## Database Access

- Use repository pattern via TypeORM repositories or Prisma client.
- Services interact with the database through repositories — controllers never access repositories directly.
- Always include `school_id` in queries for tenant-scoped entities.
- Use database transactions for multi-step operations that must be atomic.

## WebSocket / Socket.IO

- Socket.IO gateways follow the same auth pattern — validate JWT on connection handshake.
- Emit events with tenant context: `{ schoolId, eventType, payload }`.
- Define event names as constants in a shared location.

## Related Documents

- [general_coding.md](general_coding.md) — Universal coding rules
- [typescript_standards.md](typescript_standards.md) — TypeScript-specific rules
- [secure_coding.md](secure_coding.md) — Security patterns
- [../03_architecture_design/design_guidelines.md](../03_architecture_design/design_guidelines.md) — Multi-tenancy and event patterns
