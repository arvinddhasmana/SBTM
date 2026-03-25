# Agent Governance

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: Rules for AI coding agents working in the SBTM codebase

## Purpose

Define how AI coding agents (GitHub Copilot, Cursor, or similar tools) must behave when generating, modifying, or reviewing SBTM code. These rules ensure agent outputs comply with SBTM's privacy, security, and quality standards.

## Agent Context Loading Order

When an AI agent starts a task, it should load sdlc_guidelines in this order:

| Step | Document | Purpose |
|---|---|---|
| 1 | `00_master_policy.md` | Universal rules, project identity, quality gates |
| 2 | Task-relevant Tier 2 | `01_security_compliance/*` if touching data or auth |
| 3 | Task-relevant Tier 3 | e.g., `04_coding_standards/*` for writing code |
| 4 | Task-relevant Tier 4 | e.g., `08_tech_specific/nestjs_standards.md` for NestJS work |
| 5 | `09_governance/agent_governance.md` | This file — behavioral rules |

## Mandatory Rules for Agents

### Privacy

- Never generate code that logs PII (student names, guardian contact info, addresses).
- Always include `school_id` scoping in database queries for tenant-scoped entities.
- Use entity IDs in log messages, not names or contact information.
- Do not generate mock/seed data using real names, phone numbers, or addresses.

### Security

- Never hardcode secrets, passwords, or API keys in source code.
- Always use parameterized queries — never string concatenation for SQL.
- Apply RBAC decorators (`@Roles()`) to all new controller routes.
- Validate all incoming data using DTOs with class-validator or Zod schemas.

### Code Quality

- Follow naming conventions from `04_coding_standards/general_coding.md`.
- Keep generated files under 300 lines.
- Include error handling at controller boundaries.
- Write code that passes ESLint without disabling rules.

### Testing

- Generate test files alongside new service or component files.
- Include at minimum: one happy-path test and one error-path test.
- Include a tenant isolation test for any new database query.

### Documentation

- When creating a new service feature, update the relevant Implementation module.
- When modifying API endpoints, update the corresponding DTO documentation.
- When adding a new dependency, verify it against supply chain security rules.

## Prohibited Agent Actions

| Action | Why |
|---|---|
| Pushing directly to `main` | All changes go through PR review |
| Disabling ESLint rules without comment | Hides code quality issues |
| Using `any` type without justification | Breaks type safety |
| Generating production seed data | Seed data for dev/test only |
| Modifying `.env` files | Not committed; env-specific |
| Skipping RBAC on new endpoints | Security violation |

## Agent Output Review Checklist

Before submitting agent-generated code for human review:

- [ ] No PII in logs, error messages, or mock data.
- [ ] All new queries include `school_id` scoping.
- [ ] All new routes have RBAC guards.
- [ ] Input validation via DTOs on all endpoints.
- [ ] Tests included and passing.
- [ ] No hardcoded secrets or configuration values.
- [ ] File length under 300 lines.

## Related Documents

- [review_checklists.md](review_checklists.md) — Human code review checklists
- [documentation_standards.md](documentation_standards.md) — Documentation format rules
- [../00_master_policy.md](../00_master_policy.md) — Universal policies
