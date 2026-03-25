# Shared User Guide Notes

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Shared terminology, access model, and current-state caveats across user roles

## Shared Concepts

- The API Gateway is the main backend entry point for apps.
- Access is role-scoped and often tenant-scoped.
- Live operational features depend on GPS, alerting, and presence services working together.
- Some current workflows are partially implemented and are marked clearly in the role guides.

## Roles in the Current Platform

| Role | Primary Surface |
| --- | --- |
| Parent | Parent web app |
| Driver | Driver mobile app |
| Admin | Admin dashboard |
| School Operator | Admin dashboard with school-level operational focus |
| Compliance or Support | Admin dashboard and support tooling |

## Current-State Caveats

- Parent notifications are still incomplete and largely polling-based.
- Driver roster interactions are not yet fully authoritative presence capture.
- Route optimization is currently placeholder quality.
- Board and school onboarding workflows remain incomplete.

## Safety and Privacy Reminders

- Student-linked operational data should only be accessed for legitimate service, support, or safety reasons.
- Incident review should stay within the user’s role and tenant scope.