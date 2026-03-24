# Documentation and SDLC Guide

- Document owner: Engineering and Product
- Last reviewed: 2026-03-24
- Primary use: Rules for keeping SBTM requirements, design, implementation, and roadmap documents aligned

This guide explains how SBTM documentation should evolve with the product. It focuses on documentation governance, source-of-truth boundaries, and review expectations for changes that affect business scope, architecture, delivery plans, and implementation status.

## 1. Documentation Principles

- Keep one authoritative source for each topic.
- Separate **current implementation** from **target-state design** and from **future delivery plans**.
- Update the smallest authoritative set of documents necessary for a change.
- Prefer links between documents over duplicated content.
- Do not use demo documentation as proof of implementation completeness.

## 2. Source-of-Truth Map

| Topic | Authoritative location |
|---|---|
| Business problem, outcomes, scope | `docs/Business/*` |
| Target-state architecture and quality attributes | `docs/Design/v1/*` |
| Current code-verified module status | `docs/Implementation/*` |
| Gaps and phased delivery sequencing | `docs/prd/v1/UpgradePlan/*` |
| Demo setup and scripted walkthroughs | `docs/Demo/*` |
| Verification guidance and smoke testing | `docs/Test/*` |

## 3. When Documentation Updates Are Required

Update documentation in the same change set when any of the following happen:

- Business scope changes or new personas are introduced
- Public APIs or event contracts change
- A service or app changes its architectural role or dependencies
- A roadmap item moves from planned to implemented
- A module's code-verified status changes materially
- Security, privacy, or tenant-isolation controls change
- Demo or test instructions change because of product behavior changes

## 4. Required Update Patterns

### Business or product scope changes
Update:
- `docs/Business/Requirements.md`
- `docs/Business/Features.md`
- `docs/Business/UseCases.md` or `UserJourney.md` if user behavior changes

### Architecture or quality-attribute changes
Update:
- `docs/Design/v1/Architecture.md`
- `docs/Design/v1/TechnicalSpecifications.md`
- `docs/Design/v1/NonFunctionalRequirements.md`
- `docs/Design/v1/EventCatalog.md` if events or contracts changed

### Current implementation changes
Update:
- The affected file in `docs/Implementation/`
- `docs/README.md` only if discoverability or source-of-truth rules change

### Roadmap or delivery-sequencing changes
Update:
- `docs/prd/v1/UpgradePlan/GapAnalysis.md`
- `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md`

## 5. Review Expectations

| Change type | Minimum reviewers |
|---|---|
| Business scope | Product owner plus engineering lead |
| Architecture or security design | Architecture or engineering lead |
| Implementation status | Maintainer of the affected module |
| Roadmap sequencing | Product or delivery owner |
| Demo/test procedure | Maintainer plus QA/demo owner |

If a change crosses multiple categories, reviewers should cover each affected authority area.

## 6. Versioning and Lifecycle Rules

- Use `v1` for the active target-state design set unless a new active design baseline is formally created.
- Older baselines may remain as redirect or status stubs, but they must say they are superseded.
- Avoid creating parallel documents that redefine the same source of truth without an explicit replacement plan.
- When a new version becomes active, update `docs/README.md` first so navigation stays accurate.

## 7. Implementation Documentation Standard

Each `docs/Implementation/Module-*.md` file should describe, at minimum:

1. module purpose,
2. code location,
3. current implemented capabilities,
4. key integrations and dependencies,
5. known gaps or placeholder behavior,
6. any important environment or operational notes.

Implementation docs should describe **what the code currently does**, not what the target design intends to do later.

## 8. Change Acceptance Checklist

Before merging a documentation-affecting change, confirm:

- The authoritative document was updated
- Cross-links still point to valid files
- Any changed implementation status is reflected in the relevant module doc
- Roadmap or gap docs still match the new reality
- Root and docs-level indexes remain accurate for discovery

## 9. Anti-Patterns to Avoid

- Copying roadmap promises into implementation docs as if they are already delivered
- Treating demo scripts as proof of production readiness
- Leaving architecture docs unchanged after contract or dependency shifts
- Splitting the same topic across multiple files without naming one source of truth
- Using historical v0 content for active planning without an explicit note
