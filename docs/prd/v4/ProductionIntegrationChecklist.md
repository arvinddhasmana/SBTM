# SBTM Production Integration Checklist

- Document owner: Product, Architecture, and Operations
- Last reviewed: 2026-04-02
- Scope: Comprehensive checklist of all activities for production rollout and version upgrades
- Audience: AI Agents, Project Managers, DevOps Engineers, QA Team

## Related Documents

- [Production Rollout Guide](./ProductionRolloutGuide.md)
- [Upgrade Plan](./UpgradePlan.md)
- [Integration and Migration](./IntegrationAndMigration.md)

---

## Checklist Usage

- Each item has an **Automation Status**: `Manual`, `To Automate`, or `Automated`
- `To Automate` items are candidates for automation scripts, CI/CD pipelines, or monitoring tools. This document describes what needs to be automated but does not provide the scripts.
- Check off items as they are completed. Record the completion date and responsible person.

---

## Section 1: First-Time Deployment Checklist

### 1.1 Infrastructure Setup

| #      | Activity                                                              | Owner  | Automation Status | Completed | Date | Notes                                     |
| ------ | --------------------------------------------------------------------- | ------ | :---------------: | :-------: | ---- | ----------------------------------------- |
| 1.1.1  | Provision application hosting (K8s cluster or VMs) in Canadian region | DevOps |    To Automate    |    [ ]    |      | Terraform/Ansible playbook needed         |
| 1.1.2  | Deploy PostgreSQL 15 + PostGIS with encryption at rest                | DevOps |    To Automate    |    [ ]    |      | Managed DB service or containerized       |
| 1.1.3  | Configure PostgreSQL automated daily backups (30-day retention)       | DevOps |    To Automate    |    [ ]    |      | Backup schedule and retention script      |
| 1.1.4  | Test database restore from backup on staging                          | DevOps |      Manual       |    [ ]    |      | Restore test must succeed                 |
| 1.1.5  | Deploy Redis 7 with persistence                                       | DevOps |    To Automate    |    [ ]    |      | AOF or RDB persistence                    |
| 1.1.6  | Deploy OSRM with Ontario road network data                            | DevOps |    To Automate    |    [ ]    |      | Download and process OSM extract          |
| 1.1.7  | Deploy Nominatim with Canada data (if self-hosting geocoder)          | DevOps |    To Automate    |    [ ]    |      | Optional; alternative is external API     |
| 1.1.8  | Configure DNS records for production domain                           | DevOps |      Manual       |    [ ]    |      | A record or CNAME for sbtm.osta.ca        |
| 1.1.9  | Provision and install SSL/TLS certificate                             | DevOps |    To Automate    |    [ ]    |      | Let's Encrypt or managed cert             |
| 1.1.10 | Configure SSL certificate auto-renewal                                | DevOps |    To Automate    |    [ ]    |      | Certbot or equivalent                     |
| 1.1.11 | Set up email service (SES or SMTP)                                    | DevOps |      Manual       |    [ ]    |      | Verify sender domain                      |
| 1.1.12 | Send test email through configured service                            | QA     |      Manual       |    [ ]    |      | Verify delivery to real inbox             |
| 1.1.13 | Create Firebase Cloud Messaging project                               | DevOps |      Manual       |    [ ]    |      | FCM project for push notifications        |
| 1.1.14 | Configure FCM server key in environment                               | DevOps |      Manual       |    [ ]    |      | Store in secret manager                   |
| 1.1.15 | Send test push notification through FCM                               | QA     |      Manual       |    [ ]    |      | Verify receipt on test device             |
| 1.1.16 | Set up SMS gateway (Twilio or SNS)                                    | DevOps |      Manual       |    [ ]    |      | Canadian phone number, CASL registration  |
| 1.1.17 | Send test SMS through configured gateway                              | QA     |      Manual       |    [ ]    |      | Verify receipt on test phone              |
| 1.1.18 | Deploy monitoring stack (Jaeger, Prometheus/Grafana or equivalent)    | DevOps |    To Automate    |    [ ]    |      | Containerized monitoring                  |
| 1.1.19 | Configure uptime monitoring for all service endpoints                 | DevOps |    To Automate    |    [ ]    |      | External monitoring service or script     |
| 1.1.20 | Set up alerting for service downtime (email/PagerDuty/Slack)          | DevOps |    To Automate    |    [ ]    |      | Alert when health check fails             |
| 1.1.21 | Configure secret manager (Vault, AWS Secrets Manager, or similar)     | DevOps |    To Automate    |    [ ]    |      | All secrets stored here, not in env files |
| 1.1.22 | Configure network security (firewall rules, VPC, security groups)     | DevOps |    To Automate    |    [ ]    |      | Only necessary ports exposed              |
| 1.1.23 | Set up log aggregation (ELK, CloudWatch, or similar)                  | DevOps |    To Automate    |    [ ]    |      | Centralized logging for all services      |

### 1.2 Application Deployment

| #      | Activity                                                          | Owner  | Automation Status | Completed | Date | Notes                                             |
| ------ | ----------------------------------------------------------------- | ------ | :---------------: | :-------: | ---- | ------------------------------------------------- |
| 1.2.1  | Build production Docker images for all 7 backend services         | DevOps |    To Automate    |    [ ]    |      | CI/CD pipeline                                    |
| 1.2.2  | Build production bundles for Admin Dashboard and Parent Portal    | DevOps |    To Automate    |    [ ]    |      | CI/CD pipeline                                    |
| 1.2.3  | Build production APK/IPA for Driver App                           | DevOps |    To Automate    |    [ ]    |      | EAS Build or equivalent                           |
| 1.2.4  | Configure all environment variables for each service              | DevOps |    To Automate    |    [ ]    |      | Template-based env config from secrets            |
| 1.2.5  | Deploy API Gateway service                                        | DevOps |    To Automate    |    [ ]    |      | Rolling deploy                                    |
| 1.2.6  | Run database schema migration                                     | DevOps |    To Automate    |    [ ]    |      | TypeORM + Prisma migrations                       |
| 1.2.7  | Apply RLS policies to PostgreSQL                                  | DevOps |    To Automate    |    [ ]    |      | Run rls-policies.sql                              |
| 1.2.8  | Deploy GPS Tracking service                                       | DevOps |    To Automate    |    [ ]    |      |                                                   |
| 1.2.9  | Deploy Emergency Alerts service                                   | DevOps |    To Automate    |    [ ]    |      |                                                   |
| 1.2.10 | Deploy Student Presence service                                   | DevOps |    To Automate    |    [ ]    |      |                                                   |
| 1.2.11 | Deploy Video Service                                              | DevOps |    To Automate    |    [ ]    |      |                                                   |
| 1.2.12 | Deploy Student Management service                                 | DevOps |    To Automate    |    [ ]    |      |                                                   |
| 1.2.13 | Deploy Compliance Management service                              | DevOps |    To Automate    |    [ ]    |      |                                                   |
| 1.2.14 | Deploy Notification Router service (new)                          | DevOps |    To Automate    |    [ ]    |      |                                                   |
| 1.2.15 | Deploy Admin Dashboard frontend                                   | DevOps |    To Automate    |    [ ]    |      | Static files + nginx or CDN                       |
| 1.2.16 | Deploy Parent Portal frontend                                     | DevOps |    To Automate    |    [ ]    |      | Static files + nginx or CDN                       |
| 1.2.17 | Submit Driver App to Play Store (internal test track)             | DevOps |      Manual       |    [ ]    |      | Allow 1-3 days for review                         |
| 1.2.18 | Submit Driver App to App Store (TestFlight)                       | DevOps |      Manual       |    [ ]    |      | Allow 1-3 days for review                         |
| 1.2.19 | Verify all service health endpoints return 200                    | QA     |    To Automate    |    [ ]    |      | Automated health check script                     |
| 1.2.20 | Verify inter-service communication (Gateway -> all downstream)    | QA     |    To Automate    |    [ ]    |      | Integration test suite                            |
| 1.2.21 | Verify WebSocket connectivity (admin dashboard -> alerts service) | QA     |      Manual       |    [ ]    |      | Open dashboard, verify connection                 |
| 1.2.22 | Verify SSE connectivity (parent app -> alerts stream)             | QA     |      Manual       |    [ ]    |      | Open parent app, verify stream                    |
| 1.2.23 | Run smoke test suite                                              | QA     |    To Automate    |    [ ]    |      | Automated smoke tests                             |
| 1.2.24 | Verify rate limiting is active on public endpoints                | QA     |      Manual       |    [ ]    |      | Send >100 requests, verify 429 response           |
| 1.2.25 | Verify service-to-service JWT authentication is enforced          | QA     |      Manual       |    [ ]    |      | Direct call to downstream without JWT returns 401 |

### 1.3 System Bootstrap

| #      | Activity                                                            | Owner         | Automation Status | Completed | Date | Notes                          |
| ------ | ------------------------------------------------------------------- | ------------- | :---------------: | :-------: | ---- | ------------------------------ |
| 1.3.1  | Create Super Admin account (first-time setup wizard or manual)      | Super Admin   |      Manual       |    [ ]    |      | Secure password generated      |
| 1.3.2  | Login as Super Admin and verify access                              | Super Admin   |      Manual       |    [ ]    |      |                                |
| 1.3.3  | Configure system settings (timezone, region, notification defaults) | Super Admin   |      Manual       |    [ ]    |      |                                |
| 1.3.4  | Create OSTA Admin account                                           | Super Admin   |      Manual       |    [ ]    |      |                                |
| 1.3.5  | OSTA Admin logs in and verifies access                              | OSTA Admin    |      Manual       |    [ ]    |      |                                |
| 1.3.6  | Create Board: Ottawa Catholic School Board (OCSB)                   | OSTA Admin    |      Manual       |    [ ]    |      |                                |
| 1.3.7  | Create Board: Ottawa-Carleton District School Board (OCDSB)         | OSTA Admin    |      Manual       |    [ ]    |      |                                |
| 1.3.8  | Create Board Admin accounts for OCSB and OCDSB                      | OSTA Admin    |      Manual       |    [ ]    |      |                                |
| 1.3.9  | Board Admins receive invitation email and activate accounts         | Board Admins  |      Manual       |    [ ]    |      |                                |
| 1.3.10 | Board Admins create pilot schools                                   | Board Admins  |      Manual       |    [ ]    |      |                                |
| 1.3.11 | Board Admins create School Admin accounts for pilot schools         | Board Admins  |      Manual       |    [ ]    |      |                                |
| 1.3.12 | School Admins receive invitation email and activate accounts        | School Admins |      Manual       |    [ ]    |      |                                |
| 1.3.13 | Verify tenant isolation: School Admin A cannot see School B data    | QA            |      Manual       |    [ ]    |      | Critical security verification |
| 1.3.14 | Verify tenant isolation: Board Admin cannot see other board's data  | QA            |      Manual       |    [ ]    |      | Critical security verification |

### 1.4 Data Migration

| #      | Activity                                                            | Owner              | Automation Status | Completed | Date | Notes                                |
| ------ | ------------------------------------------------------------------- | ------------------ | :---------------: | :-------: | ---- | ------------------------------------ |
| 1.4.1  | Obtain fleet data export from OSTA                                  | OSTA Admin         |      Manual       |    [ ]    |      | CSV or database export               |
| 1.4.2  | Configure fleet field mapping                                       | DevOps             |      Manual       |    [ ]    |      | Match OSTA fields to SBTM fields     |
| 1.4.3  | Run fleet data import                                               | OSTA Admin         |      Manual       |    [ ]    |      | Via sync adapter or bulk import      |
| 1.4.4  | Verify fleet data: count, details, status                           | OSTA Admin         |      Manual       |    [ ]    |      | Spot-check 20% of vehicles           |
| 1.4.5  | Assign vehicles to pilot schools                                    | OSTA Admin         |      Manual       |    [ ]    |      | Via fleet assignment workflow        |
| 1.4.6  | School Admin accepts vehicle assignments                            | School Admin       |      Manual       |    [ ]    |      |                                      |
| 1.4.7  | Collect route data files from pilot schools                         | School Admins      |      Manual       |    [ ]    |      | Excel/CSV files                      |
| 1.4.8  | Standardize route data into import template                         | School Admins      |      Manual       |    [ ]    |      | Use provided template                |
| 1.4.9  | Upload route data to import wizard                                  | School Admins      |      Manual       |    [ ]    |      | Admin Dashboard -> Routes -> Import  |
| 1.4.10 | Review validation report and fix errors                             | School Admins      |      Manual       |    [ ]    |      | Address any geocoding failures       |
| 1.4.11 | Preview routes on map and verify accuracy                           | School Admins      |      Manual       |    [ ]    |      | Visual verification                  |
| 1.4.12 | Commit route import                                                 | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.13 | Verify route count matches expected                                 | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.14 | Obtain student data from SIS                                        | Board IT           |      Manual       |    [ ]    |      | CSV export from SIS                  |
| 1.4.15 | Configure SIS field mapping per board                               | DevOps             |      Manual       |    [ ]    |      | Match SIS fields to SBTM fields      |
| 1.4.16 | Run student data import                                             | School Admins      |      Manual       |    [ ]    |      | Via bulk import or SIS sync          |
| 1.4.17 | Review import results: created, updated, errors                     | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.18 | Verify student count matches SIS                                    | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.19 | Assign students to routes and stops                                 | School Admins      |      Manual       |    [ ]    |      | Individual or bulk assignment        |
| 1.4.20 | Verify student-route assignments (spot check 10%)                   | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.21 | Generate parent invitation emails                                   | System             |    To Automate    |    [ ]    |      | Automated from student parent data   |
| 1.4.22 | Monitor parent activation rate                                      | School Admins      |      Manual       |    [ ]    |      | Track % activated over 1 week        |
| 1.4.23 | Follow up with unactivated parents (email reminder)                 | School Admins      |    To Automate    |    [ ]    |      | Reminder email after 3 days          |
| 1.4.24 | Create driver accounts                                              | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.25 | Assign drivers to routes                                            | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.26 | Enter driver compliance data (licenses, background checks, medical) | School Admins      |      Manual       |    [ ]    |      |                                      |
| 1.4.27 | Perform end-to-end data reconciliation                              | QA + School Admins |      Manual       |    [ ]    |      | Compare SBTM totals with source data |

### 1.5 Pilot Testing

| #      | Activity                                                    | Owner                 | Automation Status | Completed | Date | Notes                                     |
| ------ | ----------------------------------------------------------- | --------------------- | :---------------: | :-------: | ---- | ----------------------------------------- |
| 1.5.1  | Conduct driver training session (in-person or video)        | School Admins         |      Manual       |    [ ]    |      | Cover: login, route select, roster, panic |
| 1.5.2  | Conduct admin training session                              | SBTM Team             |      Manual       |    [ ]    |      | Cover: dashboard, alerts, compliance      |
| 1.5.3  | Drivers install app and login successfully                  | Drivers               |      Manual       |    [ ]    |      |                                           |
| 1.5.4  | Drivers see assigned routes in app                          | Drivers               |      Manual       |    [ ]    |      |                                           |
| 1.5.5  | Pilot Day 1: Driver starts route, GPS tracks on dashboard   | All                   |      Manual       |    [ ]    |      | Verify: map shows bus location            |
| 1.5.6  | Pilot Day 1: Driver marks students as boarded               | Drivers               |      Manual       |    [ ]    |      |                                           |
| 1.5.7  | Pilot Day 1: Parent receives boarding push notification     | QA                    |      Manual       |    [ ]    |      |                                           |
| 1.5.8  | Pilot Day 1: Driver marks students as alighted              | Drivers               |      Manual       |    [ ]    |      |                                           |
| 1.5.9  | Pilot Day 1: Parent receives alighting push notification    | QA                    |      Manual       |    [ ]    |      |                                           |
| 1.5.10 | Pilot Day 1: Simulate emergency (driver triggers panic)     | Driver + School Admin |      Manual       |    [ ]    |      | Coordinated test                          |
| 1.5.11 | Pilot Day 1: School Admin receives and confirms alert       | School Admin          |      Manual       |    [ ]    |      | Within 2 minutes                          |
| 1.5.12 | Pilot Day 1: Parents receive emergency notification         | QA                    |      Manual       |    [ ]    |      | Push + SMS                                |
| 1.5.13 | Pilot Day 1: School Admin resolves alert                    | School Admin          |      Manual       |    [ ]    |      |                                           |
| 1.5.14 | Pilot Day 1: Parent receives resolution notification        | QA                    |      Manual       |    [ ]    |      |                                           |
| 1.5.15 | Pilot Day 1: Parent reports absence for next day            | Parent                |      Manual       |    [ ]    |      |                                           |
| 1.5.16 | Pilot Day 2: Driver sees absent student on roster           | Driver                |      Manual       |    [ ]    |      |                                           |
| 1.5.17 | Pilot Week 1: Test pre-trip inspection flow                 | Driver                |      Manual       |    [ ]    |      |                                           |
| 1.5.18 | Pilot Week 1: Test compliance expiry alert                  | School Admin          |      Manual       |    [ ]    |      | Set a test expiry date                    |
| 1.5.19 | Pilot Week 1: Review alert response times                   | School Admin          |      Manual       |    [ ]    |      | All alerts confirmed within target        |
| 1.5.20 | Pilot Week 1: Collect feedback from all roles               | Project Manager       |      Manual       |    [ ]    |      | Survey or interview                       |
| 1.5.21 | Address critical issues found in pilot                      | Dev Team              |      Manual       |    [ ]    |      |                                           |
| 1.5.22 | Pilot Week 2: Extended operation (all pilot routes, 5 days) | All                   |      Manual       |    [ ]    |      |                                           |
| 1.5.23 | Pilot Week 2: Zero critical issues for 3 consecutive days   | QA                    |      Manual       |    [ ]    |      | Go/no-go criterion                        |
| 1.5.24 | Pilot sign-off: all stakeholders approve full rollout       | Project Manager       |      Manual       |    [ ]    |      | Formal sign-off document                  |

### 1.6 Full Rollout

| #     | Activity                                           | Owner                  | Automation Status | Completed | Date | Notes                               |
| ----- | -------------------------------------------------- | ---------------------- | :---------------: | :-------: | ---- | ----------------------------------- |
| 1.6.1 | Complete data migration for all remaining schools  | School Admins          |      Manual       |    [ ]    |      | Repeat section 1.4 per school       |
| 1.6.2 | Complete driver onboarding for all routes          | School Admins          |      Manual       |    [ ]    |      |                                     |
| 1.6.3 | Complete parent onboarding for all students        | System + School Admins |      Manual       |    [ ]    |      |                                     |
| 1.6.4 | Verify system performance under full load          | DevOps                 |    To Automate    |    [ ]    |      | Load test or monitor first few days |
| 1.6.5 | Establish daily monitoring routine                 | DevOps                 |      Manual       |    [ ]    |      |                                     |
| 1.6.6 | Confirm support contacts and escalation procedures | Operations             |      Manual       |    [ ]    |      |                                     |
| 1.6.7 | Full rollout sign-off                              | OSTA Admin             |      Manual       |    [ ]    |      |                                     |

---

## Section 2: Feature/Version Upgrade Checklist

### 2.1 Pre-Upgrade

| #     | Activity                                     | Owner           | Automation Status | Completed | Date | Notes                         |
| ----- | -------------------------------------------- | --------------- | :---------------: | :-------: | ---- | ----------------------------- |
| 2.1.1 | Release notes prepared and reviewed          | Dev Lead        |      Manual       |    [ ]    |      |                               |
| 2.1.2 | Database migration scripts tested on staging | Dev Lead        |    To Automate    |    [ ]    |      | CI runs migration on staging  |
| 2.1.3 | Rollback scripts prepared and tested         | Dev Lead        |      Manual       |    [ ]    |      |                               |
| 2.1.4 | Full test suite passes on staging            | QA              |    To Automate    |    [ ]    |      | CI/CD gate                    |
| 2.1.5 | Configuration changes documented             | DevOps          |      Manual       |    [ ]    |      | New env vars, setting changes |
| 2.1.6 | Stakeholders notified of maintenance window  | Project Manager |      Manual       |    [ ]    |      | 24-48h advance notice         |
| 2.1.7 | Fresh database backup taken                  | DevOps          |    To Automate    |    [ ]    |      | Immediately before upgrade    |
| 2.1.8 | Verify backup integrity (checksum)           | DevOps          |    To Automate    |    [ ]    |      |                               |
| 2.1.9 | Maintenance mode ready (if breaking changes) | DevOps          |    To Automate    |    [ ]    |      | Static "upgrading" page       |

### 2.2 Upgrade Execution

| #     | Activity                                        | Owner           | Automation Status | Completed | Date | Notes                        |
| ----- | ----------------------------------------------- | --------------- | :---------------: | :-------: | ---- | ---------------------------- |
| 2.2.1 | Enable maintenance mode (breaking changes only) | DevOps          |    To Automate    |    [ ]    |      |                              |
| 2.2.2 | Run database migration                          | DevOps          |    To Automate    |    [ ]    |      |                              |
| 2.2.3 | Deploy updated backend services                 | DevOps          |    To Automate    |    [ ]    |      | Rolling or blue-green deploy |
| 2.2.4 | Deploy updated frontend applications            | DevOps          |    To Automate    |    [ ]    |      |                              |
| 2.2.5 | Disable maintenance mode                        | DevOps          |    To Automate    |    [ ]    |      |                              |
| 2.2.6 | Verify all health endpoints return 200          | QA              |    To Automate    |    [ ]    |      |                              |
| 2.2.7 | Run smoke test suite                            | QA              |    To Automate    |    [ ]    |      |                              |
| 2.2.8 | Verify no error spike in logs/monitoring        | DevOps          |    To Automate    |    [ ]    |      | 30-minute monitoring         |
| 2.2.9 | Notify stakeholders: upgrade complete           | Project Manager |      Manual       |    [ ]    |      |                              |

### 2.3 Post-Upgrade Verification

| #     | Activity                                       | Owner         | Automation Status | Completed | Date | Notes                               |
| ----- | ---------------------------------------------- | ------------- | :---------------: | :-------: | ---- | ----------------------------------- |
| 2.3.1 | Login as each role and verify access           | QA            |      Manual       |    [ ]    |      | OSTA, Board, School, Driver, Parent |
| 2.3.2 | Verify GPS tracking is operational             | QA            |      Manual       |    [ ]    |      |                                     |
| 2.3.3 | Verify alert creation and delivery             | QA            |      Manual       |    [ ]    |      |                                     |
| 2.3.4 | Verify presence capture and notification       | QA            |      Manual       |    [ ]    |      |                                     |
| 2.3.5 | Verify new features work as documented         | QA            |      Manual       |    [ ]    |      | Per release notes                   |
| 2.3.6 | Monitor error rates for 24 hours               | DevOps        |    To Automate    |    [ ]    |      |                                     |
| 2.3.7 | Collect user feedback (any issues with update) | School Admins |      Manual       |    [ ]    |      |                                     |
| 2.3.8 | Update documentation to reflect changes        | Dev Lead      |      Manual       |    [ ]    |      |                                     |

### 2.4 Mobile App Upgrade

| #     | Activity                                                    | Owner         | Automation Status | Completed | Date | Notes              |
| ----- | ----------------------------------------------------------- | ------------- | :---------------: | :-------: | ---- | ------------------ |
| 2.4.1 | Build new driver app version                                | DevOps        |    To Automate    |    [ ]    |      | EAS Build          |
| 2.4.2 | Test new app version against production API                 | QA            |      Manual       |    [ ]    |      |                    |
| 2.4.3 | Verify old app version still works (backward compatibility) | QA            |      Manual       |    [ ]    |      |                    |
| 2.4.4 | Submit to Play Store                                        | DevOps        |      Manual       |    [ ]    |      |                    |
| 2.4.5 | Submit to App Store                                         | DevOps        |      Manual       |    [ ]    |      |                    |
| 2.4.6 | Notify drivers to update (push + email)                     | School Admins |      Manual       |    [ ]    |      |                    |
| 2.4.7 | Monitor adoption rate (% on new version)                    | DevOps        |    To Automate    |    [ ]    |      | Track via API logs |
| 2.4.8 | After 2 weeks: decide on deprecating old version            | Dev Lead      |      Manual       |    [ ]    |      |                    |

---

## Section 3: Automation Summary

The following items are marked "To Automate" and should be implemented as part of the DevOps and CI/CD setup:

### CI/CD Pipeline Automation

| What                                  | Why                             | Tool Suggestions                  |
| ------------------------------------- | ------------------------------- | --------------------------------- |
| Build Docker images on git push       | Consistent, reproducible builds | GitHub Actions, GitLab CI         |
| Run test suite on pull request        | Catch regressions before merge  | CI pipeline with Jest/Vitest      |
| Deploy to staging on merge to develop | Continuous integration testing  | CD pipeline                       |
| Deploy to production on release tag   | Controlled production releases  | CD pipeline with approval gate    |
| Database migration execution          | Consistent schema updates       | Run as part of deploy pipeline    |
| Smoke test execution post-deploy      | Immediate deploy verification   | Automated test runner in pipeline |

### Infrastructure Automation

| What                         | Why                                    | Tool Suggestions                          |
| ---------------------------- | -------------------------------------- | ----------------------------------------- |
| Infrastructure provisioning  | Reproducible, version-controlled infra | Terraform, Pulumi, AWS CDK                |
| SSL certificate renewal      | Prevent certificate expiry             | Certbot with cron, or managed certs       |
| Database backup scheduling   | Data protection                        | pg_dump cron job or managed DB feature    |
| Log rotation and cleanup     | Prevent disk fill                      | logrotate, cloudwatch                     |
| OSRM data update (quarterly) | Keep road network current              | Cron job to download and process OSM data |

### Monitoring Automation

| What                             | Why                               | Tool Suggestions                        |
| -------------------------------- | --------------------------------- | --------------------------------------- |
| Health check endpoints monitored | Detect outages immediately        | Uptime Robot, Pingdom, custom script    |
| Error rate alerting              | Detect issues before users report | Prometheus + Alertmanager, Datadog      |
| Queue depth monitoring           | Detect processing backlogs        | Redis monitoring + alerts               |
| Disk/CPU/memory alerts           | Prevent resource exhaustion       | Cloud provider monitoring               |
| Slow query logging               | Performance degradation detection | PostgreSQL pg_stat_statements           |
| Notification delivery monitoring | Ensure parents receive alerts     | FCM delivery reports, Twilio dashboards |

### Operational Automation

| What                                              | Why                            | Tool Suggestions                                 |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------ |
| Daily operations summary email                    | Reduce manual reporting burden | Scheduled job in Compliance service              |
| Compliance expiry check and alert                 | Prevent compliance gaps        | Existing scheduled job, add email notification   |
| Parent invitation reminder (3 days after initial) | Improve activation rate        | Scheduled job checking unactivated accounts      |
| Data retention enforcement                        | Privacy compliance             | Existing retention service (already implemented) |
| Stale device token cleanup                        | Keep push delivery reliable    | Periodic job removing invalid FCM tokens         |
