# STPMS RFP — SBTM Implementation Plan (Backlog)

- Document owner: Product and Engineering
- Last reviewed: 2026-05-03
- Companion to: [STPMS-RFP-Comparison.md](STPMS-RFP-Comparison.md)
- Scope: closes the RFP requirements identified in **Section 3 (Partially supported)** and **Section 4 (Not yet implemented)** of the comparison
- Estimation: T-shirt sizing only (S ≤ 1 sprint, M ≈ 1–2 sprints, L ≈ 3–6 sprints, XL > 6 sprints, single team)
- Wave model: independent of the existing v4 phases (A–F). Cross-links to v4 are noted where overlap exists, but waves do not block on v4 phase completion.

## Related Documents

- [STPMS-RFP-Comparison.md](STPMS-RFP-Comparison.md) — RFP-vs-SBTM comparison and bucket definitions
- [GapAnalysis.md](GapAnalysis.md) — internal post-Phase-5 gap analysis (overlaps with Wave 1 items)
- [UpgradePlan.md](UpgradePlan.md)
- [../v4/UpgradePlan.md](../v4/UpgradePlan.md)
- [../../Business/Features.md](../../Business/Features.md)
- [../../Business/Requirements.md](../../Business/Requirements.md)
- OECM RFP #2018-310 (external)

## Wave Strategy at a Glance

| Wave       | Theme                                                 | Closes RFP clauses                                                             | Why first/second/third                                                            |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Wave 1** | Compliance, Reporting, Operations Foundations         | 2.5, 2.6, 2.8, 2.10.1.x, 2.10.2.x, 2.11.x, 2.16, 2.17.x, 2.20–2.22, Appendix J | Required for any production-grade RFP submission; unblocks procurement evaluation |
| **Wave 2** | Planning Depth — GIS, Routing, Calendar, Student Data | 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.7-comparison                            | Largest cluster of "Partial" clauses; unlocks Ministry-grade reports in Wave 3    |
| **Wave 3** | New Surfaces, Financials, Optional Modules            | 2.4.2.3, 2.4.2.5, 2.2.8, 2.2.9.1–2.2.9.6, 2.10.1.4, 2.12–2.15                  | Depends on Wave 2 data depth or marked Optional in RFP                            |

---

## Wave 1 — Compliance & Reporting Foundations

| #     | Initiative                                                                                                                                                                                                        | Size | Depends on                                               | Closes                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- | ------------------------------------------------ |
| W1-1  | **Reporting engine + template store** — report definition schema (template, params, output format), report worker, on-demand + scheduled jobs, exports to CSV / PDF / Excel / XML; seed all 35 Appendix J reports | L    | Existing FEAT-REPORTING-001 plan                         | 2.6, Appendix J                                  |
| W1-2  | **Public OpenAPI 3.1 publication + multi-vendor GPS adapter** — generate spec from gateway, publish at `/docs/api/openapi.yaml`; adapter pattern in `services/gps-tracking` for ≥2 GPS hardware vendors           | M    | None                                                     | 2.5                                              |
| W1-3  | **Data retention, purge, and warehouse export jobs** — 7-year retention configuration, scheduled purge/archival per data class, "export to client warehouse" CSV/Parquet snapshots                                | M    | None — also closes [GapAnalysis.md §1.6](GapAnalysis.md) | 2.8                                              |
| W1-4  | **DR / BCP plan + secret management** — document RTO/RPO, run table-top exercise, integrate vault for secrets                                                                                                     | M    | Cloud target chosen                                      | 2.10.2.4 + [GapAnalysis.md §1.7](GapAnalysis.md) |
| W1-5  | **Help desk integration & ticket-status API** — minimal ticket service or Freshdesk/Zendesk integration; expose status query API                                                                                  | S    | Vendor choice                                            | 2.10.2.1                                         |
| W1-6  | **Hosting compliance pack** — Canadian-region deployment topology, CSAE 3416 readiness checklist, Uptime-Institute mapping                                                                                        | M    | Cloud target chosen                                      | 2.10.2.3                                         |
| W1-7  | **PII-on-mobile / removable-media policy** — encryption-at-rest enforcement on driver-app device storage; no-PII-cache policy                                                                                     | S    | None                                                     | 2.11.2 (full)                                    |
| W1-8  | **OECM commercial reporting pack** — monthly sales, QQ status, quarterly CSA / savings / performance reports auto-generated                                                                                       | M    | W1-1                                                     | 2.16, 2.17.2, 2.17.3                             |
| W1-9  | **Performance Management Scorecard tracking** — Appendix G metric capture, dashboard, monthly export                                                                                                              | M    | W1-1, W1-8                                               | 2.17.1                                           |
| W1-10 | **Rate management + CRF tracking** — 3-year firm rate table, annual rate-refresh request workflow, 2.5 % CRF aggregation, quarterly EFT-ready report, HST handling                                                | S    | W1-8                                                     | 2.20, 2.20.1, 2.21, 2.22                         |
| W1-11 | **Tenant-onboarding wizard productization** — map-area setup, user-group setup, hardware config, customization to Part 2 / Appendix I requirements                                                                | M    | None                                                     | 2.10.1.1                                         |
| W1-12 | **Data conversion toolkit** — 5 years of historical conversion (calendars, routes, stops, students) with validation reports                                                                                       | M    | W1-1, W1-11                                              | 2.10.1.2                                         |

**Wave 1 acceptance**: every Appendix J report renders against seed data and exports in 4 formats; OpenAPI passes a public-tooling round trip; retention & purge jobs run and prove they delete on schedule; DR drill report filed; CRF report reconciles to a sample invoice ledger.

---

## Wave 2 — GIS, Routing & Student Data Depth

| #     | Initiative                                                                                                                                                                                                                                          | Size | Depends on                       | Closes                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------- | ---------------------------------- |
| W2-1  | **GIS import & geocoder** — Esri Shapefile / GeoJSON / MapInfo importer; alias-aware geocoder (Pelias or Azure Maps); turn-restriction + time-of-day + uphill/downhill speed model; vehicle-level travel restrictions                               | L    | None                             | 2.2.1.1, 2.2.1.2                   |
| W2-2  | **Map editor UI** — admin-side ability to add roads, edit street names/house numbers, mark hazards, define turnaround locations                                                                                                                     | M    | W2-1                             | 2.2.1.1                            |
| W2-3  | **Boundary management module** — CRUD for school zones + walk zones, non-contiguous boundaries, link boundary↔school, scenario sandbox, propagation when boundaries move                                                                            | L    | W2-1                             | 2.2.2                              |
| W2-4  | **Calendar & bell-time module** — multi-calendar engine, statutory holidays, PD days, per-school bell times, integration into route times                                                                                                           | M    | None — extends FEAT-CALENDAR-001 | 2.2.3                              |
| W2-5  | **Student profile depth migration** — schema migration for ≥200 fields, OEN, multi-address (home/AM/PM/mailing/other), photo upload, AODA plan attachment + import; SIS exception report (compare-before-update)                                    | L    | None                             | 2.2.4.1, 2.2.4.3 (data side)       |
| W2-6  | **Custody / schedule variation engine** — per-weekday address pattern, future effective dates, driver auto-notification                                                                                                                             | M    | W2-5                             | 2.2.3.2                            |
| W2-7  | **Future route planning sandbox** — test environment cloning live data, grade advancement rule engine, scenario diff vs live                                                                                                                        | L    | W2-3, W2-4, W2-5                 | 2.2.3.3                            |
| W2-8  | **Routing engine v2** — OSRM fully wired; weighted-student logic (JK–6 = 1, 7–12 = 1.5, special = 2); right-side curb-stop assignment; hazardous-street avoidance; multi-school students; transfers/shuttles; sit-time at school; capacity flagging | XL   | W2-1, W2-3, W2-5                 | 2.2.5.1, 2.2.5.2, 2.2.5.3, 2.2.5.4 |
| W2-9  | **Optimization & what-if scenarios**                                                                                                                                                                                                                | L    | W2-7, W2-8                       | 2.2.5.6                            |
| W2-10 | **Bus seating chart & roster generator** — printable layout reflecting actual bus                                                                                                                                                                   | S    | W2-8                             | 2.2.5.5                            |
| W2-11 | **Tracking comparison reports** — "missed stops", on-time-performance, vehicles not started; wired to GPS event stream                                                                                                                              | M    | W1-1, W2-8                       | 2.2.7 (comparison)                 |
| W2-12 | **Special-requirements routing integration** — wheelchair/A-C/attendant/behavioural flags consumed by routing engine                                                                                                                                | M    | W2-5, W2-8                       | 2.2.4.3 (route side)               |

**Wave 2 acceptance**: import an Esri shapefile of a real DSB territory and route 10 000 weighted students to right-side stops within capacity; what-if scenario produces a diff report against live; missed-stop report produced from a recorded GPS run.

---

## Wave 3 — New Surfaces, Financials & Optional Modules

| #     | Initiative                                                                                                                                                                                                                                                                  | Size | Depends on                 | Closes                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------- | ------------------------------------------- |
| W3-1  | **School administrator portal** (new web surface) — print routes/manifests/maps, sort by eligibility/class, alert client of student updates, receive bus-delay alerts                                                                                                       | M    | Existing identity          | 2.4.2.3                                     |
| W3-2  | **Public route-lookup site** — read-only address/program/grade lookup; public delays/cancellations                                                                                                                                                                          | S    | W2-3, W2-8                 | 2.4.2.5                                     |
| W3-3  | **Per-client UAT environment provisioning** — IaC-driven tenant clone with seeded test data                                                                                                                                                                                 | M    | W1-6                       | 2.10.1.4                                    |
| W3-4  | **Parent self-service alert preferences** — opt-in per channel, multi-child single-login, inclement-weather/mechanical/construction alerts                                                                                                                                  | S    | FEAT-NOTIFY-001            | 2.4.2.2 (extended)                          |
| W3-5  | **Financial Management module** — operator rate tables, mileage validation (planned vs actual), cost-sharing formulas (weighted rider, weighted rider/distance), per-DSB breakdown, attendant cost, vehicle age tracking; powers Appendix J Ministry Route Financial report | L    | W2-8                       | 2.2.8 + Appendix J Ministry Route Financial |
| W3-6  | **Invoicing module** — itemized client invoices with HST, paper or electronic delivery                                                                                                                                                                                      | M    | W3-5                       | 2.12                                        |
| W3-7  | **Payment terms & EFT** — net-30, early-payment discount, EFT banking-info collection workflow                                                                                                                                                                              | S    | W3-6                       | 2.13, 2.14                                  |
| W3-8  | **Customer support / account exec workflows** — account-exec assignment, 1-business-day SLA tracking, knowledge-transfer event scheduling                                                                                                                                   | S    | W1-5                       | 2.15                                        |
| W3-9  | **Optional Module: Bus Driver Verification (2.2.9.1)** — hardware-integrated driver verification; extends FEAT-COMPLIANCE-001                                                                                                                                               | M    | None                       | 2.2.9.1                                     |
| W3-10 | **Optional Module: School-based Charter Trips (2.2.9.2)** — field-trip request/approve workflow, vehicle/driver assignment                                                                                                                                                  | L    | W2-8                       | 2.2.9.2                                     |
| W3-11 | **Optional Module: Bus Operator Management (2.2.9.3)** — operator contract lifecycle, document store, renewal alerts                                                                                                                                                        | M    | W3-5                       | 2.2.9.3                                     |
| W3-12 | **Optional Module: DSB Redistricting (2.2.9.4)** — boundary scenario impact analysis on DSBs                                                                                                                                                                                | L    | W2-3, W2-7                 | 2.2.9.4                                     |
| W3-13 | **Optional Module: Real-Time Student Ridership (2.2.9.5)** — confirm BLE coverage matches RFP description; package as optional module for clients without BLE tags by integrating with third-party ridership systems                                                        | M    | Existing FEAT-PRESENCE-001 | 2.2.9.5                                     |
| W3-14 | **Optional Module: Fleet Management (2.2.9.6)** — DSB-owned vehicle maintenance scheduling, service history, inspection cadence                                                                                                                                             | L    | None                       | 2.2.9.6                                     |
| W3-15 | **Appendix J residual reports** — vehicle (overloaded, fleet by type/operator, late-bus by reason, mileage with deadheads/checkpoints), ridership (actual-vs-eligible, bell-time, contract rate / base minutes), student (distance home-to-nearest-school)                  | M    | W1-1, W2-8, W3-5           | Appendix J residual                         |

**Wave 3 acceptance**: a school admin can print a sorted manifest from a fresh portal login; a parent receives a weather-cancellation push that they opted into; a sample invoice with HST flows from contract → invoice → CRF report; each enabled optional module passes a smoke test against a seeded tenant.

---

## Cross-cutting (parallel to all waves)

- Extend `docs/Business/Requirements.md` with FR-/NFR- IDs for each new RFP clause to keep the traceability matrix complete.
- Register new FEAT-\* IDs in `docs/Business/Features.md` with status, dependencies, and primary surfaces.
- Each new feature follows existing SBTM SDLC gates (privacy review, tenant-isolation tests, RBAC tests per `docs/sdlc_guidelines/`) and per-package test gates per existing CI rules.
- Keep [GapAnalysis.md](GapAnalysis.md) and this document in sync — when a Wave 1 item also closes a GapAnalysis row, update both.

## Verification approach (end-to-end)

1. **Per-initiative**: each row above must produce a PR plus updated test pyramid (UT/IT/SM) per `docs/Test/`.
2. **Per-wave**: run the wave acceptance scenario above against the demo environment; capture artifacts in `docs/Demo/`.
3. **Whole-RFP regression**: re-run the comparison in [STPMS-RFP-Comparison.md](STPMS-RFP-Comparison.md) at the end of each wave; the bucket counts in its scoreboard should monotonically shift toward "Fully supported".

## Open items / decisions still required

- **Cloud target** — required for W1-4, W1-6, W3-3 (Azure / AWS / GCP Canadian regions all qualify under 2.10.2.3).
- **Geocoder choice** — Pelias (self-hosted, no per-call cost) vs Azure Maps (managed, OECM-friendly billing) — affects W2-1.
- **Help-desk vendor** — build vs Freshdesk/Zendesk integration — affects W1-5, W3-8.
- **Reporting engine library** — JasperReports vs internal templating + Puppeteer for PDF — affects W1-1.
- **Optional modules priority** — RFP frames 2.2.9.x as Optional; Wave 3 sequencing of W3-9 through W3-14 should be re-prioritized once we know which clients require which modules.
