# SBTM Documentation Policy

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Documentation governance, structure, traceability, and maintenance rules

This policy defines how documentation is written and maintained in SBTM_AntiGravity. It takes inspiration from the RTSA documentation discipline, but adapts it for a school transportation platform focused on privacy, safety operations, and multi-tenant SaaS delivery.

## Objectives

- Keep business, design, implementation, and operational guidance clearly separated.
- Make the current source of truth easy to find for both humans and AI agents.
- Ensure documentation stays aligned with the actual codebase and deployment model.
- Treat privacy, child safety, and tenant isolation as first-class documentation concerns.

## Audience Model

Use documentation domains rather than mixing all audiences into one file.

| Audience | Primary entry point | Expected content |
|----------|---------------------|------------------|
| Product, delivery, stakeholders | `docs/Business` | Goals, requirements, feature scope, journeys, and use cases |
| Architects and senior engineers | `docs/Design` | System context, service decomposition, event model, NFRs |
| Developers | `docs/Implementation`, service `README.md` files | Code-aligned implementation details, module ownership, runtime expectations |
| Operators, demo owners, QA | `docs/Demo`, `docs/Test` | Demo setup, verification steps, smoke tests, scenario validation |
| Future compliance and support owners | `docs/Governance`, future operations/security docs | Policy, ownership, privacy controls, operational standards |

## Required Document Metadata

Every maintained documentation file should start with these metadata lines near the top:

- `Document owner`
- `Last reviewed`
- `Primary use`

Recommended additions for major documents:

- `Status`: Draft, Active, Superseded, or Archived
- `Audience`: who should read it first
- `Depends on`: upstream source-of-truth documents

## Source-of-Truth Rules

- `docs/Business` defines product intent and expected capabilities.
- `docs/Design` defines target-state architecture and technical direction.
- `docs/Implementation` describes the currently verified implementation state by module.
- Service-level `README.md` files explain how a specific service works today.
- `docs/prd/GapAnalysis.md` is the authoritative gap inventory.
- `docs/prd/PhaseWiseImplementationPlan.md` is the authoritative delivery roadmap.
- Demo and test docs must not be treated as proof of full feature completion.
- Superseded docs must remain clearly marked and should redirect readers to the active replacement.

## Traceability Rules

Use stable identifiers when documents describe requirements or controls.

Recommended ID prefixes:

- `FR-*` for functional requirements
- `NFR-*` for non-functional requirements
- `PR-*` for privacy and data-handling requirements
- `SR-*` for security requirements
- `OPS-*` for operational requirements
- `UC-*` for use cases

Traceability expectations:

- Business requirements should link to use cases, features, and target implementation areas.
- Architecture documents should reference the business capability or requirement groups they support.
- Implementation docs should distinguish between current behavior and target behavior.
- Service READMEs should link back to business and architecture documents where practical.

## Privacy and Safety Rules

SBTM documentation must reflect the domain it serves.

- Prefer privacy-by-design language over generic security boilerplate.
- Explicitly call out student data handling, tenant boundaries, and audit expectations when relevant.
- Reference SBTM-relevant constraints such as PIPEDA, MFIPPA, consent, retention, and safe notification behavior.
- Avoid importing defence-specific classifications, acronyms, or compliance structures from the RTSA reference set.

## Writing Rules

- Write in plain language unless a technical detail requires precise implementation terminology.
- Separate current-state facts from target-state plans.
- Prefer concise tables and diagrams when they improve scanning.
- Use Mermaid where diagrams need to be easy to maintain in-repo.
- Do not document unverified behavior as implemented.
- Keep service READMEs focused on purpose, APIs, runtime, dependencies, and gaps.

## Naming and Structure Rules

- Use `README.md` for directory entry points.
- Keep business documents under `docs/Business`.
- Keep target-state architecture under `docs/Design`.
- Keep implementation-state module notes under `docs/Implementation`.
- Keep governance policies under `docs/Governance`.
- Prefer stable names over speculative version churn unless a document truly represents a versioned architecture or plan.

## Review and Freshness Rules

- Update `Last reviewed` whenever a document is materially changed.
- Review root entry points when services, apps, or major docs are added.
- Review service READMEs when controllers, dependencies, runtime ports, or data responsibilities change.
- Review business and design docs when scope or architectural direction changes.

## Initial Wave 1 Priorities

The first documentation implementation wave should maintain these priorities:

1. Canonical documentation entry points
2. Service documentation parity across all services
3. Accurate business and architecture source-of-truth links
4. Governance rules that prevent drift
5. Operational and security documentation expansion in later waves