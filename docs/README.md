# SBTM Documentation Map

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Starting point for humans and AI agents to find the right source of truth

Use this index to find the authoritative document for each kind of question.

## Folder Ownership

### Business
- [Business](Business) defines product goals, requirements, use cases, and user journeys.

### Design
- [Design v1](Design/v1) defines the target v1 architecture, event model, and technical baseline.
- [Design v0 status](Design/v0/README.md) records that older design drafts have been superseded.

### Implementation
- [Implementation](Implementation) describes the current code-verified implementation state for each module.

### PRD
- [GapAnalysis.md](prd/v1/UpgradePlan/GapAnalysis.md) is the authoritative gap inventory.
- [PhaseWiseImplementationPlan.md](prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md) is the authoritative delivery roadmap.
- [PRD v0 status](prd/v0/README.md) records that older greenfield planning documents have been superseded.

### Demo
- [Demo](Demo) covers demo environment setup, simulator usage, and live demo flow.

### Test
- [TestingGuide.md](Test/TestingGuide.md) covers operational verification and current smoke-test guidance.

## Recommended Reading Order

1. [Business requirements](Business/Requirements.md)
2. [v1 architecture](Design/v1/Architecture.md)
3. [gap analysis](prd/v1/UpgradePlan/GapAnalysis.md)
4. [phase plan](prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
5. [implementation module docs](Implementation)
6. [testing guide](Test/TestingGuide.md) or [demo setup guide](Demo/DEMO_SETUP_GUIDE.md), depending on the task

## Source-of-Truth Rules

- Do not use demo or test docs to infer product completeness.
- Do not use implementation docs as target-state design.
- Do not use v0 docs for active planning; they are retained only as redirect stubs where needed.

## Core References

- [Business requirements](Business/Requirements.md)
- [Business use cases](Business/UseCases.md)
- [Business feature matrix](Business/Features.md)
- [Business user journey](Business/UserJourney.md)
- [v1 architecture](Design/v1/Architecture.md)
- [v1 technical specifications](Design/v1/TechnicalSpecifications.md)
- [gap analysis](prd/v1/UpgradePlan/GapAnalysis.md)
- [phase plan](prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
- [testing guide](Test/TestingGuide.md)
- [demo setup guide](Demo/DEMO_SETUP_GUIDE.md)