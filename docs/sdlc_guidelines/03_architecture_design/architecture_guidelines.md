# Architecture Guidelines

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: C4 modeling conventions, Mermaid diagram standards, and ADR format

## Purpose

Define how architectural decisions and system structure are documented in SBTM using the C4 model, Mermaid diagrams, and Architecture Decision Records (ADRs).

## C4 Model Adoption

SBTM architecture documentation uses the C4 model at three levels:

| Level | What It Shows | Where Used |
|---|---|---|
| **Context** | System boundary, actors, external dependencies | Architecture.md, DEMO_SETUP_GUIDE.md |
| **Container** | Applications, services, databases, and their interactions | SystemArchitecture.md |
| **Component** | Internal structure of a service (modules, controllers, providers) | Per-service design when needed |

Code-level diagrams (C4 Level 4) are not maintained as documentation — the source code serves that purpose.

## Mermaid Conventions

All architecture diagrams use Mermaid for in-repo maintainability.

### Color Coding

| Element | Fill Color | Meaning |
|---|---|---|
| API Gateway / entry point | `#1565c0` (blue) | Central orchestration |
| Database | `#2e7d32` (green) | Persistent storage |
| Message queue / cache | `#d32f2f` (red) | Infrastructure |
| Frontend apps | `#6a1b9a` (purple) | User-facing |
| External systems | `#f57c00` (orange) | Outside SBTM boundary |

### Naming
- Use short, descriptive labels in diagram nodes: `GPS Tracking` not `services/gps-tracking NestJS application`.
- Include technology in parenthetical when helpful: `Container(gw, "API Gateway", "NestJS", "Auth, RBAC, proxies")`.

### Placement
- Embed diagrams inline in the markdown file where they are discussed.
- Do not store diagrams as external image files (SVG, PNG). Use Mermaid fenced code blocks.

## Architecture Decision Records (ADRs)

Record significant architectural decisions using this template:

```markdown
# ADR-NNN: Title

- Status: Proposed | Accepted | Superseded | Deprecated
- Date: YYYY-MM-DD
- Deciders: Names or roles

## Context
What is the issue or question that needs a decision?

## Decision
What was decided, and why?

## Consequences
What are the positive and negative outcomes of this decision?

## Alternatives Considered
What other options were evaluated?
```

### When to Write an ADR
- Adding or removing a service from the architecture.
- Changing the authentication or authorization model.
- Adopting a new database, queue, or infrastructure component.
- Changing tenant isolation strategy.
- Modifying the event-driven architecture pattern.

## Related Documents

- [design_guidelines.md](design_guidelines.md) — Microservice design patterns
- [threat_modeling.md](threat_modeling.md) — Threat modeling methodology
- [../../Design/Architecture.md](../../Design/Architecture.md) — v1 architecture overview
- [../../Design/SystemArchitecture.md](../../Design/SystemArchitecture.md) — System context and containers
