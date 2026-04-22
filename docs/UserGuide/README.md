# SBTM User Guide — Master Index

- Document owner: Product and Operations
- Last reviewed: 2026-03-24
- Primary use: Role-based entry point for end-user and operator guidance

---

## Welcome to SBTM

The **School Bus Transport Management (SBTM)** platform gives Ontario school transport administrators, operators, drivers, and parents a unified system for managing school bus routes, tracking live GPS positions, monitoring student boarding, handling emergencies, and maintaining compliance records.

This guide helps you understand and use the system effectively, regardless of your role.

---

## How to Use This Guide

This guide is organized in two ways:

1. **Shared Content** — Foundational knowledge every SBTM user needs, regardless of role.
2. **Role-Specific Guides** — Tailored walkthroughs for your specific job function.

Start with the shared content if you are new to SBTM, then go to your role-specific guide.

---

## Shared Content (Start Here)

All users should read these sections first.

| Document                                       | Description                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [System Overview & Concepts](shared/README.md) | What SBTM does, how the pieces fit together, roles, and terminology |

---

## Role-Specific Guides

Find your role and go to the guide that matches your job function.

### Parent

**You are responsible for**: Monitoring your child's bus location, receiving safety alerts, and confirming transport status.

| Document                         | Description                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| [Parent Guide](parent/README.md) | Your portal, live tracking, alert visibility, and troubleshooting |

### Driver

**You are responsible for**: Executing assigned routes, transmitting GPS position, recording student boarding/alighting, and triggering emergency alerts.

| Document                         | Description                                                               |
| -------------------------------- | ------------------------------------------------------------------------- |
| [Driver Guide](driver/README.md) | Route execution, GPS tracking, roster interaction, and emergency workflow |

### Admin (OSTA / Board Admin)

**You are responsible for**: Platform-wide oversight, fleet management, route configuration, and multi-school monitoring.

| Document                       | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| [Admin Guide](admin/README.md) | Dashboard usage, tenant oversight, incident visibility, and data management |

### School Operator

**You are responsible for**: School-level daily dispatch, route setup, student roster management, and immediate incident response.

| Document                                           | Description                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| [School Operator Guide](school-operator/README.md) | Daily operations, route setup, fleet readiness, and incident response |

### Compliance & Support

**You are responsible for**: Compliance reviews, audit trail inspection, investigation support, and regulatory readiness.

| Document                                                   | Description                                               |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| [Compliance & Support Guide](compliance-support/README.md) | Audit review, compliance checks, investigation procedures |

---

## Business Use Case Reference Map

The table below maps key platform capabilities to the guide sections that cover them.

| Capability             | Description                                           | Guide Section                                                                  |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Authentication & Login | Sign in and receive role-appropriate access           | [System Overview](shared/README.md)                                            |
| Live GPS Tracking      | Real-time bus position on map                         | [Parent Guide](parent/README.md), [Driver Guide](driver/README.md)             |
| Student Presence       | Boarding and alighting tracking                       | [Driver Guide](driver/README.md), [School Operator](school-operator/README.md) |
| Emergency Alerts       | Panic button and incident workflow                    | [Driver Guide](driver/README.md), [Admin Guide](admin/README.md)               |
| Route Management       | Create, edit, assign routes and stops                 | [School Operator](school-operator/README.md), [Admin Guide](admin/README.md)   |
| Fleet Management       | Vehicle and driver assignment                         | [Admin Guide](admin/README.md), [School Operator](school-operator/README.md)   |
| Compliance & Audit     | Inspection records, driver certifications, audit logs | [Compliance & Support](compliance-support/README.md)                           |
| Parent Notifications   | Alert and status updates to parents                   | [Parent Guide](parent/README.md)                                               |
| Tenant Isolation       | Board/school-scoped data access                       | [System Overview](shared/README.md)                                            |

---

## Portal URLs (Default)

| Portal          | URL                   | Users                                 |
| --------------- | --------------------- | ------------------------------------- |
| Admin Dashboard | http://localhost:5173 | Admin, School Operator, Compliance    |
| Parent Portal   | http://localhost:5174 | Parents                               |
| Driver App      | Expo mobile app       | Drivers                               |
| API Gateway     | http://localhost:3001 | Backend entry point (not user-facing) |

---

## Quick Reference — Troubleshooting

| Issue                              | Action                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Cannot log in                      | Verify credentials from demo setup guide; re-run `./scripts/reset-demo-db.sh` |
| Map shows no bus movement          | Check browser console (F12) for 403 errors; verify simulator is running       |
| Alerts not appearing               | Verify emergency-alerts service is running; check API Gateway logs            |
| Child not showing in parent portal | Verify student-to-parent linking in database; re-run seed script              |
| Driver app cannot connect          | Check `EXPO_PUBLIC_API_URL` is set to `http://<host-ip>:3001/api/v1`          |

---

## Current-State Note

These guides describe the current system and call out partial or planned workflows explicitly. They should not be used to infer full production readiness. For implementation status, see [Gap Analysis](../prd/v1/GapAnalysis.md) and [Upgrade Plan](../prd/v1/UpgradePlan/README.md).
