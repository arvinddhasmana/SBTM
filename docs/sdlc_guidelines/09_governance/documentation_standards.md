# Documentation Standards

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: Consistent document format, metadata, and structure across SBTM docs

## Purpose

Define formatting and organizational standards for all SBTM documentation in the `docs/` directory.

## Document Metadata

Every document should include a metadata header:

```markdown
# Document Title

- Document owner: <Team or role>
- Last reviewed: <YYYY-MM-DD>
- Primary use: <One-line purpose statement>
```

## Markdown Formatting

| Rule | Convention |
|---|---|
| Headings | ATX style (`#`), one blank line before and after |
| Lists | Use `-` for unordered lists, `1.` for ordered lists |
| Code blocks | Use fenced code blocks with language identifier |
| Tables | Use pipe tables with header separator row |
| Links | Relative paths for cross-references within `docs/` |
| Diagrams | Mermaid fenced blocks — no external image files |
| Line length | No hard wrap — use soft wrapping in editors |

## Cross-Reference Rules

- Use relative paths from the current file to the target: `../../Design/Architecture.md` not `docs/Design/Architecture.md`.
- Link to specific sections using anchors: `[Tenant Isolation](../design_guidelines.md#multi-tenancy-pattern)`.
- When referencing a requirement, include its ID: "See [FR-GPS-001](../../Business/Requirements.md)".
- Verify links after moving or renaming files.

## Document Types

| Type | Location | Purpose |
|---|---|---|
| Business requirements | `docs/Business/` | What the system must do |
| Design documents | `docs/Design/` | How the system is structured |
| Implementation guides | `docs/Implementation/` | Module-by-module build guides |
| Product roadmap | `docs/prd/` | Gap analysis and phase plans |
| SDLC guidelines | `docs/sdlc_guidelines/` | Development process standards |
| Operations guides | `docs/Operations/` | Deployment and operational procedures |
| User guides | `docs/UserGuide/` | Per-role user documentation |
| Test documentation | `docs/Test/` | Testing guide and plans |
| Demo materials | `docs/Demo/` | Setup and demo scripts |

## Mermaid Diagram Standards

- Use consistent node naming and color coding (see architecture_guidelines.md).
- Keep diagrams readable — limit to 15–20 nodes maximum.
- If a diagram exceeds complexity, split into sub-diagrams with cross-references.
- Test diagram rendering in a Markdown preview before committing.

## Document Lifecycle

| Action | Trigger |
|---|---|
| Create | New feature, service, or process |
| Update | Implementation changes that affect the documented behavior |
| Review | At least once per phase milestone |
| Archive | Document describes superseded functionality (mark as archived, don't delete) |

## Related Documents

- [review_checklists.md](review_checklists.md) — Code review checklists
- [agent_governance.md](agent_governance.md) — Agent documentation rules
- [../../Governance/DocumentationPolicy.md](../../Governance/DocumentationPolicy.md) — Project documentation policy
