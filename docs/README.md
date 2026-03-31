# SBTM Documentation Map

- Document owner: Product and Engineering
- Last reviewed: 2026-03-30
- Primary use: Starting point for humans and AI agents to find the right source of truth

Use this index to find the authoritative document for each kind of question.

## Folder Ownership

### Business

- [Business](Business) defines product goals, requirements, use cases, and user journeys.

### Governance

- [DocumentationPolicy.md](Governance/DocumentationPolicy.md) defines documentation structure, metadata, traceability, and maintenance rules.

### Design

- [Design](Design) defines the target v1 architecture, event model, and technical baseline.

### Operations

- [Operations](Operations) defines deployment, observability, troubleshooting, and runbook guidance.

### Reference

- [Reference](Reference) defines formal API and service contract reference material.

### User Guide

- [UserGuide](UserGuide) defines role-based usage guidance for Parent, Driver, Admin, School Operator, and Compliance or Support users.

### Implementation

- [Implementation](Implementation) describes the current code-verified implementation state for each module.

### PRD

- [GapAnalysis.md](prd/GapAnalysis.md) is the authoritative gap inventory.
- [PhaseWiseImplementationPlan.md](prd/PhaseWiseImplementationPlan.md) is the authoritative delivery roadmap.
- [UpgradePlan/](prd/UpgradePlan/) contains self-contained phase plans (Phase 1–5) with scope, acceptance criteria, and module cross-references.

### SDLC Guidelines

- [sdlc_guidelines](sdlc_guidelines) defines development process standards: security compliance, requirements engineering, architecture, coding standards, testing, CI/CD, deployment, tech-specific conventions, and governance.
- [00_master_policy.md](sdlc_guidelines/00_master_policy.md) is the universal policy loaded first by all agents and humans.

### Demo

- [Demo](Demo) covers demo environment setup, simulator usage, and live demo flow.

### Test

- [TestingGuide.md](Test/TestingGuide.md) covers operational verification and current smoke-test guidance.

## Audience-Based Entry Points

- Product and delivery: [Business requirements](Business/Requirements.md), [feature matrix](Business/Features.md), [phase plan](prd/PhaseWiseImplementationPlan.md), and [detailed phase plans](prd/UpgradePlan/)
- Architects and senior engineers: [v1 architecture](Design/Architecture.md), [system architecture](Design/SystemArchitecture.md), [integration architecture](Design/IntegrationArchitecture.md), and [technical specifications](Design/TechnicalSpecifications.md)
- Developers: [Implementation](Implementation), [reference docs](Reference/README.md), service `README.md` files, [gap analysis](prd/GapAnalysis.md), and [SDLC guidelines](sdlc_guidelines/)
- Demo owners and QA: [demo setup guide](Demo/DEMO_SETUP_GUIDE.md), [live demo script](Demo/LiveDemoScript.md), [testing guide](Test/TestingGuide.md), and [operations docs](Operations/README.md)
- Documentation maintainers: [documentation policy](Governance/DocumentationPolicy.md)
- End users and operators: [user guide index](UserGuide/README.md)

## Recommended Reading Order

1. [Business requirements](Business/Requirements.md)
2. [business use cases](Business/UseCases.md)
3. [v1 architecture](Design/Architecture.md)
4. [gap analysis](prd/GapAnalysis.md)
5. [phase plan](prd/PhaseWiseImplementationPlan.md)
6. [implementation module docs](Implementation)
7. [operations docs](Operations/README.md) or [testing guide](Test/TestingGuide.md), depending on the task

## Source-of-Truth Rules

- Do not use demo or test docs to infer product completeness.
- Do not use implementation docs as target-state design.

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
- [v1 architecture](Design/Architecture.md)
- [system architecture](Design/SystemArchitecture.md)
- [data architecture](Design/DataArchitecture.md)
- [database schema](Design/DatabaseSchema.md)
- [data retention](Design/DataRetention.md)
- [integration architecture](Design/IntegrationArchitecture.md)
- [deployment architecture](Design/DeploymentArchitecture.md)
- [security and privacy architecture](Design/SecurityPrivacyArchitecture.md)
- [v1 technical specifications](Design/TechnicalSpecifications.md)
- [reference index](Reference/README.md)
- [user guide index](UserGuide/README.md)
- [operations index](Operations/README.md)
- [gap analysis](prd/GapAnalysis.md)
- [phase plan](prd/PhaseWiseImplementationPlan.md)
- [testing guide](Test/TestingGuide.md)
- [demo setup guide](Demo/DEMO_SETUP_GUIDE.md)
