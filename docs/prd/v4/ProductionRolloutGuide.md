# SBTM Production Implementation and Rollout Guide

- Document owner: Product, Architecture, and Operations
- Last reviewed: 2026-04-02
- Scope: Complete guide for first-time production deployment and feature/version upgrades
- Audience: AI Agents, DevOps Engineers, Project Managers, OSTA Operations Team

## Related Documents

- [Production Integration Checklist](./ProductionIntegrationChecklist.md)
- [Upgrade Plan](./UpgradePlan.md)
- [Integration and Migration](./IntegrationAndMigration.md)
- [Deployment Architecture](../../Design/DeploymentArchitecture.md)
- [Deployment Guide](../../Operations/DeploymentGuide.md)
- [Runbooks](../../Operations/Runbooks.md)

---

## Part 1: First-Time Production Deployment

### 1.1 Pre-Deployment Planning

#### Stakeholder Coordination

| Stakeholder                   | Required Actions Before Go-Live                                                    | Lead Time |
| ----------------------------- | ---------------------------------------------------------------------------------- | --------- |
| OSTA Operations               | Approve deployment plan, identify OSTA Admin user(s), provide fleet data access    | 4 weeks   |
| School Boards (OCSB, OCDSB)   | Identify Board Admin user(s), confirm SIS export capability, agree on data sharing | 4 weeks   |
| Participating Schools (pilot) | Identify School Admin user(s), collect route data, identify pilot drivers          | 3 weeks   |
| Pilot Drivers                 | Available for training, have compatible mobile device                              | 2 weeks   |
| IT Infrastructure             | Provision production environment, DNS, SSL certificates, network access            | 3 weeks   |
| Privacy Officer               | Review privacy impact assessment, approve data handling procedures                 | 4 weeks   |

#### Environment Requirements

| Component                        | Specification                                  | Notes                                     |
| -------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Application Hosting              | Kubernetes cluster or VM-based deployment      | Canadian hosting region required (PIPEDA) |
| PostgreSQL 15 + PostGIS          | 50 GB initial storage, daily automated backups | Dedicated instance, not shared            |
| Redis 7                          | 2 GB memory minimum                            | For BullMQ queues and caching             |
| OSRM                             | Self-hosted with Ontario road network data     | Ottawa region minimum, Ontario preferred  |
| Nominatim (optional)             | Self-hosted with Canada data extract           | For privacy-safe geocoding                |
| Jaeger / OpenTelemetry Collector | Distributed tracing backend                    | Production observability                  |
| Object Storage                   | MinIO or S3-compatible                         | For video storage                         |
| DNS                              | sbtm.osta.ca (or similar)                      | SSL/TLS certificate required              |
| Email Service                    | AWS SES or SMTP relay                          | Verified sender domain                    |
| Push Notifications               | Firebase Cloud Messaging account               | FCM project with server key               |
| SMS Gateway                      | Twilio or AWS SNS                              | Canadian phone number, CASL compliance    |

### 1.2 Deployment Sequence

#### Stage 1: Infrastructure Provisioning (Week 1)

| Step | Activity                                               | Owner  | Verification                                                                 |
| ---- | ------------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| 1.1  | Provision application hosting environment (K8s or VMs) | DevOps | SSH/kubectl access confirmed                                                 |
| 1.2  | Deploy PostgreSQL 15 + PostGIS                         | DevOps | `psql` connection test, PostGIS extension verified                           |
| 1.3  | Deploy Redis 7                                         | DevOps | `redis-cli ping` returns PONG                                                |
| 1.4  | Deploy OSRM with Ontario road data                     | DevOps | `curl http://osrm:5000/route/v1/driving/-75.7,45.4;-75.6,45.3` returns route |
| 1.5  | Configure DNS and SSL certificate                      | DevOps | HTTPS access to domain confirmed                                             |
| 1.6  | Configure email service (SES/SMTP)                     | DevOps | Test email sent and received                                                 |
| 1.7  | Configure Firebase Cloud Messaging project             | DevOps | FCM test message delivered                                                   |
| 1.8  | Configure SMS gateway (Twilio/SNS)                     | DevOps | Test SMS sent and received                                                   |
| 1.9  | Set up monitoring stack (Jaeger, health checks)        | DevOps | Jaeger UI accessible, health endpoints responding                            |
| 1.10 | Configure automated database backup schedule           | DevOps | Backup runs, restore tested on staging                                       |

What needs to be automated: Database backup scheduling, SSL certificate renewal, health check monitoring, infrastructure provisioning scripts (Terraform/Ansible).

#### Stage 2: Application Deployment (Week 2)

| Step | Activity                                                      | Owner  | Verification                                  |
| ---- | ------------------------------------------------------------- | ------ | --------------------------------------------- |
| 2.1  | Build and deploy API Gateway (port 3001)                      | DevOps | Health check: `GET /health` returns 200       |
| 2.2  | Run database migration (schema creation)                      | DevOps | All tables created, RLS policies applied      |
| 2.3  | Deploy GPS Tracking service (port 3002)                       | DevOps | Health check passing                          |
| 2.4  | Deploy Emergency Alerts service (port 3003)                   | DevOps | Health check + WebSocket handshake test       |
| 2.5  | Deploy Student Presence service (port 3004)                   | DevOps | Health check passing                          |
| 2.6  | Deploy Video Service (port 3005)                              | DevOps | Health check + storage write test             |
| 2.7  | Deploy Student Management service (port 3006)                 | DevOps | Health check passing                          |
| 2.8  | Deploy Compliance Management service (port 3007)              | DevOps | Health check passing                          |
| 2.9  | Deploy Notification Router (new service)                      | DevOps | Health check + FCM connectivity test          |
| 2.10 | Deploy Admin Dashboard frontend                               | DevOps | Login page loads at production URL            |
| 2.11 | Deploy Parent Portal frontend                                 | DevOps | Login page loads at parent URL                |
| 2.12 | Publish Driver App to testing track (Play Store / TestFlight) | DevOps | App installs and connects to production API   |
| 2.13 | Configure environment variables for all services              | DevOps | All services start without errors             |
| 2.14 | Verify inter-service communication                            | DevOps | API Gateway can reach all downstream services |
| 2.15 | Run smoke test suite against production                       | QA     | All smoke tests pass                          |

What needs to be automated: CI/CD pipeline for build and deploy, database migration execution, smoke test suite, service health monitoring.

#### Stage 3: System Bootstrap (Week 2-3)

| Step | Activity                                                                       | Owner        | Verification                             |
| ---- | ------------------------------------------------------------------------------ | ------------ | ---------------------------------------- |
| 3.1  | Run first-time setup wizard (or manual bootstrap)                              | Super Admin  | OSTA Admin account created and can login |
| 3.2  | Configure system settings (timezone: America/Toronto, region: Ontario)         | Super Admin  | Settings persisted                       |
| 3.3  | Create school boards (OCSB, OCDSB)                                             | OSTA Admin   | Boards visible in admin dashboard        |
| 3.4  | Create Board Admin accounts and send invitations                               | OSTA Admin   | Board Admins receive email, can login    |
| 3.5  | Board Admins create pilot schools                                              | Board Admins | Schools visible under correct boards     |
| 3.6  | Board Admins create School Admin accounts for pilot schools                    | Board Admins | School Admins receive email, can login   |
| 3.7  | Configure notification settings (alert escalation timing, default preferences) | OSTA Admin   | Settings persisted and verified          |

#### Stage 4: Data Migration (Week 3-4)

| Step | Activity                                                   | Owner              | Verification                                  |
| ---- | ---------------------------------------------------------- | ------------------ | --------------------------------------------- |
| 4.1  | Import fleet data from OSTA (sync or manual entry)         | OSTA Admin         | Vehicle count matches source, details correct |
| 4.2  | Assign vehicles to pilot schools                           | OSTA Admin         | School Admins see assigned vehicles           |
| 4.3  | Import routes for pilot schools (Excel/CSV import wizard)  | School Admins      | Route count matches, polylines render on map  |
| 4.4  | Verify route stops on map                                  | School Admins      | Stop locations are accurate                   |
| 4.5  | Import students from SIS (batch file import)               | School Admins      | Student count matches SIS, data correct       |
| 4.6  | Assign students to routes and stops                        | School Admins      | Students appear on route rosters              |
| 4.7  | Create driver accounts for pilot routes                    | School Admins      | Drivers receive email, can login to app       |
| 4.8  | Assign drivers to routes                                   | School Admins      | Drivers see assigned routes in app            |
| 4.9  | Generate parent invitation emails                          | System             | Parent invitation emails sent                 |
| 4.10 | Monitor parent activation rate                             | School Admins      | Track: % of parents activated                 |
| 4.11 | Enter driver compliance data (licenses, background checks) | School Admins      | Compliance status shows correctly             |
| 4.12 | Cross-check all data against source systems                | School Admins + QA | Data reconciliation report clean              |

#### Stage 5: Pilot Testing (Week 4-6)

| Step | Activity                                                    | Owner                 | Verification                                       |
| ---- | ----------------------------------------------------------- | --------------------- | -------------------------------------------------- |
| 5.1  | Conduct driver training (app usage, pre-trip, panic button) | School Admins         | Drivers can operate app independently              |
| 5.2  | Conduct admin training (dashboard, alerts, compliance)      | SBTM Team             | Admins can use dashboard independently             |
| 5.3  | Day 1 pilot: 1-2 buses, controlled conditions               | All                   | GPS tracks appear, presence events captured        |
| 5.4  | Verify parent receives boarding notification                | QA + Parents          | Push received within 10 seconds                    |
| 5.5  | Test emergency alert workflow (simulated panic)             | School Admin + Driver | Alert -> confirmation -> parent notification works |
| 5.6  | Test absence reporting workflow                             | Parent + School Admin | Absence shows on driver roster                     |
| 5.7  | Week 1 pilot: Full day of operations for pilot routes       | All                   | End-of-day: all routes completed, no data loss     |
| 5.8  | Review pilot feedback from all roles                        | Project Manager       | Issues documented, fixes prioritized               |
| 5.9  | Fix critical issues found during pilot                      | Development Team      | All critical issues resolved                       |
| 5.10 | Week 2 pilot: Expanded to all pilot school routes           | All                   | Stable operations for 5 consecutive days           |

#### Stage 6: Full Rollout (Week 6-8)

| Step | Activity                                          | Owner                  | Verification                                  |
| ---- | ------------------------------------------------- | ---------------------- | --------------------------------------------- |
| 6.1  | Rollout decision: go/no-go based on pilot results | Project Manager + OSTA | Formal sign-off                               |
| 6.2  | Complete data migration for all remaining schools | School Admins          | All schools migrated                          |
| 6.3  | Complete onboarding for all remaining drivers     | School Admins          | All drivers trained and active                |
| 6.4  | Scale parent onboarding                           | School Admins          | Parent invitation rate tracked                |
| 6.5  | Monitor system performance under full load        | DevOps                 | No performance degradation                    |
| 6.6  | Establish operational support procedures          | Operations             | Support contacts, escalation paths documented |
| 6.7  | Transition to steady-state operations             | Operations             | Daily monitoring routine established          |

---

## Part 2: Feature/Version Upgrade Procedure

### 2.1 Upgrade Planning

#### Pre-Upgrade Checklist

| Check                            | Description                                                          | Owner            |
| -------------------------------- | -------------------------------------------------------------------- | ---------------- |
| Release notes reviewed           | All changes, new features, and breaking changes documented           | Development Lead |
| Database migrations identified   | List of schema changes with rollback scripts                         | Development Lead |
| Configuration changes identified | New environment variables, setting changes                           | DevOps           |
| Stakeholder communication        | Admins notified of upcoming changes, schedule, and expected downtime | Project Manager  |
| Rollback plan prepared           | Step-by-step procedure to revert to previous version                 | DevOps           |
| Staging validation complete      | All changes tested on staging environment                            | QA               |
| Backup completed                 | Fresh database backup taken immediately before upgrade               | DevOps           |

#### Stakeholder Communication Template

```
Subject: SBTM System Upgrade - [Version X.Y] - [Date]

Dear [Role] team,

The SBTM system will be upgraded on [Date] at [Time] (Eastern).

Expected downtime: [X] minutes

What's changing:
- [Feature 1]: [Brief description of what this means for your role]
- [Feature 2]: [Brief description]

What you need to do:
- [Any action required from the user, e.g., "Update your mobile app"]
- [Or "No action required from you"]

If you experience any issues after the upgrade, contact [support contact].

Thank you.
```

### 2.2 Upgrade Execution Procedure

#### Standard Upgrade (No Breaking Changes)

| Step | Activity                                     | Owner           | Duration   |
| ---- | -------------------------------------------- | --------------- | ---------- |
| 1    | Notify stakeholders of maintenance window    | Project Manager | 24h before |
| 2    | Take database backup                         | DevOps          | 5 min      |
| 3    | Deploy new backend services (rolling update) | DevOps          | 10 min     |
| 4    | Run database migrations                      | DevOps          | 5 min      |
| 5    | Deploy new frontend applications             | DevOps          | 5 min      |
| 6    | Run smoke test suite                         | QA/Automated    | 5 min      |
| 7    | Verify health checks for all services        | DevOps          | 2 min      |
| 8    | Monitor error rates for 30 minutes           | DevOps          | 30 min     |
| 9    | Notify stakeholders: upgrade complete        | Project Manager | Immediate  |

What needs to be automated: Rolling deployment, database migration execution, smoke tests, health checks, error rate monitoring, stakeholder notification.

#### Breaking Change Upgrade (Schema or API Changes)

| Step | Activity                                               | Owner           | Duration   |
| ---- | ------------------------------------------------------ | --------------- | ---------- |
| 1    | Notify stakeholders of extended maintenance window     | Project Manager | 48h before |
| 2    | Take full database backup (data + schema)              | DevOps          | 10 min     |
| 3    | Enable maintenance mode (show "System upgrading" page) | DevOps          | 1 min      |
| 4    | Stop all backend services                              | DevOps          | 2 min      |
| 5    | Run schema migration                                   | DevOps          | 5-15 min   |
| 6    | Deploy new backend services                            | DevOps          | 10 min     |
| 7    | Run data migration scripts (if any)                    | DevOps          | Variable   |
| 8    | Deploy new frontend applications                       | DevOps          | 5 min      |
| 9    | Run full test suite (smoke + integration)              | QA              | 15 min     |
| 10   | Disable maintenance mode                               | DevOps          | 1 min      |
| 11   | Monitor for 1 hour                                     | DevOps          | 60 min     |
| 12   | Notify stakeholders: upgrade complete                  | Project Manager | Immediate  |

#### Mobile App Upgrade

| Step | Activity                                                 | Owner         | Notes                             |
| ---- | -------------------------------------------------------- | ------------- | --------------------------------- |
| 1    | Submit driver app update to Play Store / App Store       | DevOps        | Allow 1-3 days for review         |
| 2    | Backend API ensures backward compatibility for 2 weeks   | Development   | Old app version continues to work |
| 3    | Notify drivers to update app (push notification + email) | School Admins | Include update instructions       |
| 4    | Monitor: % of drivers on new version                     | DevOps        | Track via API user-agent          |
| 5    | After 2 weeks: deprecate old API version if warranted    | Development   | Log warnings for old clients      |

### 2.3 Rollback Procedure

| Step | Activity                                                                  | Owner                    | Duration   |
| ---- | ------------------------------------------------------------------------- | ------------------------ | ---------- |
| 1    | Decision to rollback (based on error rate, critical bug, data corruption) | Project Manager + DevOps | Immediate  |
| 2    | Enable maintenance mode                                                   | DevOps                   | 1 min      |
| 3    | Stop all backend services                                                 | DevOps                   | 2 min      |
| 4    | Restore database from pre-upgrade backup                                  | DevOps                   | 10-30 min  |
| 5    | Deploy previous version of all backend services                           | DevOps                   | 10 min     |
| 6    | Deploy previous version of frontend applications                          | DevOps                   | 5 min      |
| 7    | Run smoke tests against restored environment                              | QA                       | 5 min      |
| 8    | Disable maintenance mode                                                  | DevOps                   | 1 min      |
| 9    | Notify stakeholders: system restored to previous version                  | Project Manager          | Immediate  |
| 10   | Post-mortem: analyze what went wrong, prevent recurrence                  | Development + DevOps     | Within 24h |

Important: Data entered between the upgrade and the rollback will be lost. If the upgrade has been live for more than a few hours, a rollback decision must weigh data loss against the severity of the issue.

---

## Part 3: Operational Procedures

### 3.1 Daily Operations Checklist (School Admin)

| Time               | Activity                             | How                                    |
| ------------------ | ------------------------------------ | -------------------------------------- |
| Before first route | Review driver roster and absences    | Dashboard -> Absences page             |
| Before first route | Check pre-trip inspection completion | Dashboard -> Compliance -> Inspections |
| During operations  | Monitor fleet on dashboard           | Dashboard -> main map view             |
| During operations  | Respond to alerts within 2 minutes   | Alert modal or Alerts page             |
| After last route   | Review daily operations summary      | Email or Dashboard -> Summary (future) |
| After last route   | Review any unresolved alerts         | Alerts page -> filter: Active          |
| End of day         | Check compliance expiry warnings     | Compliance page -> Drivers tab         |

### 3.2 Weekly Operations Checklist (Board Admin)

| Day       | Activity                                       | How                                     |
| --------- | ---------------------------------------------- | --------------------------------------- |
| Monday    | Review weekly compliance summary report        | Email report or Compliance dashboard    |
| Monday    | Check for unresolved alerts from previous week | Alerts page -> filter: Active           |
| Wednesday | Review fleet utilization across schools        | Tenant Dashboard                        |
| Friday    | Review incident reports from the week          | Alerts -> filter: Resolved this week    |
| As needed | Approve route changes from schools             | Route change requests (future workflow) |

### 3.3 Monthly Operations Checklist (OSTA Admin)

| Activity                                                          | How                                      |
| ----------------------------------------------------------------- | ---------------------------------------- |
| Review system-wide compliance status                              | Tenant Dashboard -> Compliance overview  |
| Review fleet utilization and maintenance frequency                | Fleet dashboard                          |
| Review alert statistics (volume, response time, false alarm rate) | Alert analytics (future dashboard)       |
| Review parent adoption metrics (registered vs. active)            | User Management -> filter: PARENT        |
| Review and approve fleet reassignment requests                    | Fleet assignment workflow                |
| Generate monthly report for regulatory submission                 | Export -> Monthly Safety Report (future) |

### 3.4 Annual Operations

| Activity                                           | When                           | Who                        |
| -------------------------------------------------- | ------------------------------ | -------------------------- |
| Prepare routes for new school year                 | 6-8 weeks before school starts | School Admins              |
| Clone and adjust previous year routes              | 6-8 weeks before               | School Admins              |
| Refresh student data from SIS                      | 2-4 weeks before               | School Admins + Board IT   |
| Update driver compliance records                   | Before school year starts      | School Admins + Drivers    |
| Verify fleet readiness (inspections, status)       | 2 weeks before                 | OSTA Admin + School Admins |
| Generate parent invitations for new students       | 1-2 weeks before               | System + School Admins     |
| Conduct driver refresher training                  | 1 week before                  | School Admins              |
| Verify system readiness (test routes, test alerts) | 3 days before                  | All Admins + QA            |

---

## Part 4: Support and Escalation

### Support Tiers

| Tier   | Scope                                                   | Response Time | Who                                |
| ------ | ------------------------------------------------------- | ------------- | ---------------------------------- |
| Tier 1 | User questions, password resets, app navigation         | Same day      | School Admin (for parents/drivers) |
| Tier 2 | Data issues, configuration problems, integration errors | 4 hours       | Board Admin / SBTM Support         |
| Tier 3 | System outages, data corruption, security incidents     | 1 hour        | SBTM Development / DevOps          |

### Escalation Path

```
Parent/Driver issue
  -> School Admin (Tier 1)
    -> Board Admin / SBTM Support (Tier 2)
      -> SBTM Development Team (Tier 3)

System outage
  -> DevOps monitoring detects (automated)
    -> SBTM Development Team (Tier 3, immediate)
      -> OSTA Admin notified (stakeholder communication)
```

### Incident Severity Levels

| Severity      | Definition                                            | Response                           | Communication                                |
| ------------- | ----------------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| P1 - Critical | System down, no workaround. Safety features affected. | Response within 15 min. All hands. | Notify OSTA Admin, Board Admins immediately. |
| P2 - High     | Major feature broken, workaround available.           | Response within 1 hour.            | Notify affected School Admins.               |
| P3 - Medium   | Minor feature broken, limited impact.                 | Response within 4 hours.           | Track in issue tracker.                      |
| P4 - Low      | Cosmetic issue, enhancement request.                  | Response within 1 business day.    | Acknowledge and schedule.                    |
