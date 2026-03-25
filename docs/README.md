# SBTM Documentation Map

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Starting point for humans and AI agents to find the right source of truth

Use this index to find the authoritative document for each kind of question.

## Folder Ownership

### Business
- [Business](Business) defines product goals, requirements, use cases, and user journeys.

### Governance
- [DocumentationPolicy.md](Governance/DocumentationPolicy.md) defines documentation structure, metadata, traceability, and maintenance rules.
- [SDLCGuidelines.md](Governance/SDLCGuidelines.md) defines the software development lifecycle, coding standards, testing requirements, CI/CD pipeline, and release process.

### Design
- [Design v1](Design/v1) defines the target v1 architecture, event model, and technical baseline.
- [Design v0 status](Design/v0/README.md) records that older design drafts have been superseded.

### Operations
- [Operations](Operations) defines deployment, observability, troubleshooting, and runbook guidance.

### Reference
- [Reference](Reference) defines formal API and service contract reference material.

### User Guide
- [UserGuide](UserGuide) defines role-based usage guidance for Parent, Driver, Admin, School Operator, and Compliance or Support users.

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

## Audience-Based Entry Points

- Product and delivery: [Business requirements](Business/Requirements.md), [feature matrix](Business/Features.md), and [phase plan](prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
- Architects and senior engineers: [v1 architecture](Design/v1/Architecture.md), [system architecture](Design/v1/SystemArchitecture.md), [integration architecture](Design/v1/IntegrationArchitecture.md), and [technical specifications](Design/v1/TechnicalSpecifications.md)
- Developers: [SDLC guidelines](Governance/SDLCGuidelines.md), [Implementation](Implementation), [reference docs](Reference/README.md), service `README.md` files, and [gap analysis](prd/v1/UpgradePlan/GapAnalysis.md)
- Demo owners and QA: [demo setup guide](Demo/DEMO_SETUP_GUIDE.md), [live demo script](Demo/LiveDemoScript.md), [testing guide](Test/TestingGuide.md), and [operations docs](Operations/README.md)
- Documentation maintainers: [documentation policy](Governance/DocumentationPolicy.md), [SDLC guidelines](Governance/SDLCGuidelines.md)
- End users and operators: [user guide index](UserGuide/README.md)

## Recommended Reading Order

1. [Business requirements](Business/Requirements.md)
2. [business use cases](Business/UseCases.md)
3. [v1 architecture](Design/v1/Architecture.md)
4. [gap analysis](prd/v1/UpgradePlan/GapAnalysis.md)
5. [phase plan](prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
6. [implementation module docs](Implementation)
7. [operations docs](Operations/README.md) or [testing guide](Test/TestingGuide.md), depending on the task

## Source-of-Truth Rules

- Do not use demo or test docs to infer product completeness.
- Do not use implementation docs as target-state design.
- Do not use v0 docs for active planning; they are retained only as redirect stubs where needed.

## Current Coverage Notes

- The root repository README should always point back to this map for authoritative document discovery.
- Each backend service should have its own `README.md` covering purpose, runtime, endpoints, dependencies, and current gaps.
- When product scope changes, update `docs/Business` first, then adjust design and implementation references.

## Core References

- [Business requirements](Business/Requirements.md)
- [Business use cases](Business/UseCases.md)
- [Business feature matrix](Business/Features.md)
- [Business user journey](Business/UserJourney.md)
- [documentation policy](Governance/DocumentationPolicy.md)
- [SDLC guidelines](Governance/SDLCGuidelines.md)
- [v1 architecture](Design/v1/Architecture.md)
- [system architecture](Design/v1/SystemArchitecture.md)
- [data architecture](Design/v1/DataArchitecture.md)
- [database schema](Design/v1/DatabaseSchema.md)
- [data retention](Design/v1/DataRetention.md)
- [integration architecture](Design/v1/IntegrationArchitecture.md)
- [deployment architecture](Design/v1/DeploymentArchitecture.md)
- [security and privacy architecture](Design/v1/SecurityPrivacyArchitecture.md)
- [v1 technical specifications](Design/v1/TechnicalSpecifications.md)
- [reference index](Reference/README.md)
- [user guide index](UserGuide/README.md)
- [operations index](Operations/README.md)
- [gap analysis](prd/v1/UpgradePlan/GapAnalysis.md)
- [phase plan](prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
- [testing guide](Test/TestingGuide.md)
- [demo setup guide](Demo/DEMO_SETUP_GUIDE.md)