# SBTM v1 Data Retention and Lifecycle

- Document owner: Engineering and Product
- Last reviewed: 2026-03-30
- Primary use: Retention, archival, deletion, and privacy-oriented lifecycle guidance for operational data

## Purpose

This document defines the target retention posture for major data classes in SBTM_AntiGravity. It exists to support privacy-by-design planning and operational governance. It does not claim that automated retention enforcement is fully implemented today.

## Lifecycle Principles

- Minimize retained student-linked operational data to what is necessary for safety, support, and compliance.
- Keep retention rules explicit by data class rather than relying on indefinite default storage.
- Preserve auditability for regulated and safety-relevant actions while still planning for lawful deletion and archival.
- Align hosting and operational procedures with Canadian data residency expectations where required.

## Retention Matrix

| Data Class                  | Examples                                               | Operational Need                                                | Target Retention                                                                                   | Intended Action After Retention                          |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| User identity records       | user accounts, role assignments, school or board links | Active platform access                                          | Keep while account is active and for a bounded post-deactivation support window                    | Archive or purge after policy-defined offboarding period |
| Route and fleet master data | routes, stops, vehicles                                | Operational baseline                                            | Keep while active and for historical reporting window                                              | Archive superseded records if needed                     |
| Student roster records      | student identity, route assignments, parent linkage    | Daily operations and support                                    | Keep while student is actively served and for a limited operational support window after departure | Archive or purge according to tenant policy              |
| GPS telemetry               | live and historical location points                    | Live operations, incident review, limited analytics             | Shorter retention than master data; avoid indefinite storage                                       | Aggregate, archive, or purge                             |
| Presence events             | boarding and alighting records                         | Parent communication, operational traceability, incident review | Medium retention with explicit limit                                                               | Archive summary or purge detailed event history          |
| Emergency alerts            | incident records and status                            | Safety follow-up and audit                                      | Retain through investigation and reporting window                                                  | Archive and eventually purge under policy                |
| Compliance records          | driver compliance, inspections                         | Safety and regulatory support                                   | Retain according to school-board or regulatory obligations                                         | Archive with controlled access                           |
| Audit logs                  | critical mutations, access traces                      | Accountability and investigation                                | Retain longer than routine operational data                                                        | Archive with restricted access                           |
| Video metadata and assets   | video events, recordings, thumbnails                   | Incident handling and evidence review                           | Highly policy-sensitive and should be minimized                                                    | Secure deletion or archival under strict controls        |

## Recommended Policy Direction

| Data Class          | Recommended Direction                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| GPS telemetry       | Prefer short default retention with optional aggregation for reporting            |
| Presence events     | Retain long enough for operational disputes and support, but not indefinitely     |
| Student roster data | Retain based on active service relationship and defined offboarding workflow      |
| Audit logs          | Retain longer than operational telemetry because they support accountability      |
| Video               | Require explicit retention rule tied to incident severity and privacy obligations |

## Deletion and Archival Events

The following events should trigger lifecycle review:

- student leaves the service or school
- parent withdraws from service where policy allows data minimization or deletion
- route season or school year ends
- incident investigation closes
- compliance window or audit retention window expires

## Implementation Gaps

- No fully documented or automated purge jobs are currently represented across services.
- No centralized archival workflow exists yet.
- Data retention policy enforcement is still below the level implied by privacy-oriented business requirements.

## Operational Controls Needed

- scheduled purge or archival jobs by data class
- tenant-aware backup retention rules
- documented legal hold or incident hold behavior for alerts, audits, and video
- deletion audit trail so lifecycle actions are themselves traceable

## Related Documents

- [DataArchitecture.md](DataArchitecture.md)
- [DatabaseSchema.md](DatabaseSchema.md)
- [SecurityPrivacyArchitecture.md](SecurityPrivacyArchitecture.md)
- [../../Operations/Runbooks.md](../../Operations/Runbooks.md)
