# TypeScript Standards

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: TypeScript-specific conventions for SBTM monorepo

## Purpose

Define TypeScript coding standards enforced across all SBTM applications and services. These extend the general coding standards with TypeScript-specific rules.

## TypeScript Configuration

All packages share `tsconfig.base.json` at the monorepo root:

| Setting | Value | Reason |
|---|---|---|
| `strict` | `true` | Catch type errors at compile time |
| `noUncheckedIndexedAccess` | `true` | Undefined-safe array/object access |
| `esModuleInterop` | `true` | Clean CJS/ESM interop |
| `skipLibCheck` | `true` | Faster builds |

Each package extends the base config and adds its own paths, includes, and module settings.

## Type Safety Rules

- Use `unknown` over `any`. If `any` is unavoidable, add an inline `// eslint-disable` comment with justification.
- Prefer type inference where the type is obvious from the right-hand side. Add explicit types for function parameters and return types.
- Use discriminated unions for state modeling:

```typescript
type AlertState =
  | { status: 'pending'; createdAt: Date }
  | { status: 'acknowledged'; acknowledgedBy: string; acknowledgedAt: Date }
  | { status: 'resolved'; resolvedBy: string; resolvedAt: Date };
```

- Use `readonly` for objects and arrays that should not be mutated after creation.
- Define DTOs as classes with class-validator decorators (NestJS) or as Zod schemas (Express services).

## Null Handling

- Use `null` for intentional absence (e.g., database nullable fields).
- Use `undefined` for optional values not yet set.
- Never use `!` (non-null assertion) except in test files. Use narrowing or early returns instead.

## Async/Await

- Always use `async/await` over raw Promises.
- Avoid `Promise.all` with side effects — if one fails, others may have already executed.
- Ensure all Promises are awaited or explicitly marked `void` (e.g., fire-and-forget queue pushes).

## Enums and Constants

- Prefer `const` objects with `as const` over `enum` for simple value sets:

```typescript
export const Role = {
  SCHOOL_ADMIN: 'school_admin',
  DRIVER: 'driver',
  PARENT: 'parent',
  OSTA_ADMIN: 'osta_admin',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
```

- Use TypeScript `enum` only when you need reverse mapping or integration with class-validator.

## Module and Import Rules

- Use path aliases defined in `tsconfig.json` for cross-module imports within a package.
- Avoid barrel files (`index.ts` re-exports) except at the package root.
- Import types with `import type` to avoid runtime overhead.

## Related Documents

- [general_coding.md](general_coding.md) — Universal coding rules
- [nestjs_standards.md](nestjs_standards.md) — NestJS-specific conventions
- [secure_coding.md](secure_coding.md) — Security-focused coding rules
