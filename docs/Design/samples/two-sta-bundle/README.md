# Two-STA Sample Bundle

Fully synthetic sample data for verifying the import pipeline, audience-resolver dedupe, cross-board RBAC, and the OSRM shape-fallback worker. No real PII.

## Shape (per bundle)

Each bundle exercises **2 boards × 2 schools × 6 students × 4 guardians** with a deliberate guardian topology:

| Guardian slot | Children                                              | Shape                                                      |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| P1            | 2 students at the **same school**                     | Same-school multi-child (dedupe on school-scope alerts)    |
| P2            | 2 students at **different schools, different boards** | Cross-board multi-child (RBAC + audience-resolver fan-out) |
| P3            | 1 student                                             | Single-child baseline                                      |
| P4            | 1 student                                             | Single-child baseline                                      |

Total `student-guardians.csv` rows per bundle = **6** (2 + 2 + 1 + 1).

## Bundles

### `osta/` — Ottawa Student Transportation Authority

| Board                                             | School                                                 | Students | Bell        |
| ------------------------------------------------- | ------------------------------------------------------ | -------- | ----------- |
| **OCSB** (Ottawa Catholic School Board)           | **St. Bernadette School** (elementary, OCSB-S200)      | 3        | `BELL-0820` |
| **OCDSB** (Ottawa-Carleton District School Board) | **Maplewood Secondary School** (secondary, OCDSB-S100) | 3        | `BELL-0905` |

- **Route `R-OCSB-201`** (St. Bernadette AM) — ships with `sta-shapes.csv` rows → `stx_shape_source = 'sta_import'`.
- **Route `R-OCDSB-101`** (Maplewood Secondary AM) — **no shape** in bundle → SBTM auto-generates via OSRM road-snap → `stx_shape_source = 'sbtm_generated'`.
- All OSTA schools have `alerts_enabled = true` (SBTM is the primary parent alert channel).

Guardian map (OSTA):

| Guardian        | Children                                                       | Shape          |
| --------------- | -------------------------------------------------------------- | -------------- |
| `OSTA-GRD-0001` | `OCSB-STU-0001`, `OCSB-STU-0002` (both St. Bernadette)         | P1 same-school |
| `OSTA-GRD-0002` | `OCSB-STU-0003` (St. Bernadette), `OCDSB-STU-0001` (Maplewood) | P2 cross-board |
| `OSTA-GRD-0003` | `OCDSB-STU-0002` (Maplewood)                                   | P3 single      |
| `OSTA-GRD-0004` | `OCDSB-STU-0003` (Maplewood)                                   | P4 single      |

### `rcjtc/` — Renfrew County Joint Transportation Consortium

| Board                                                      | School                                                  | Students | Bell                               |
| ---------------------------------------------------------- | ------------------------------------------------------- | -------- | ---------------------------------- |
| **RCDSB** (Renfrew County District School Board)           | **Pinecrest Public School** (elementary, RCDSB-S400)    | 3        | `BELL-0820` (alerts_enabled=true)  |
| **RCCDSB** (Renfrew County Catholic District School Board) | **Cathedral Catholic School** (elementary, RCCDSB-S500) | 3        | `BELL-0820` (alerts_enabled=false) |

- **Route `R-RCDSB-401`** (Pinecrest AM) — ships with `sta-shapes.csv` → `stx_shape_source = 'sta_import'`.
- **Route `R-RCCDSB-501`** (Cathedral AM) — **no shape** → OSRM fallback → `stx_shape_source = 'sbtm_generated'`.
- **`alerts_enabled = false` on Cathedral Catholic School** — SBTM ingests data but does not send parent alerts; the STA app remains the parent channel for that school.
- Operator `OP-STOCK` shares `external_ids.legal_entity_id = CA-ON-1234567` with the OSTA bundle; importer de-dupes to a single `stx_operators` row across both STAs.

Guardian map (RCJTC) mirrors OSTA:

| Guardian         | Children                                                    | Shape          |
| ---------------- | ----------------------------------------------------------- | -------------- |
| `RCJTC-GRD-0001` | `RCDSB-STU-0001`, `RCDSB-STU-0002` (both Pinecrest)         | P1 same-school |
| `RCJTC-GRD-0002` | `RCDSB-STU-0003` (Pinecrest), `RCCDSB-STU-0001` (Cathedral) | P2 cross-board |
| `RCJTC-GRD-0003` | `RCCDSB-STU-0002` (Cathedral)                               | P3 single      |
| `RCJTC-GRD-0004` | `RCCDSB-STU-0003` (Cathedral)                               | P4 single      |

## File layout (per bundle)

```
{sta-short}/
  manifest.json
  sta-routes.csv
  sta-stops.csv
  sta-stop-times.csv
  sta-trips.csv
  sta-shapes.csv          # one shape provided per bundle; the other route's shape omitted on purpose
  sta-operators.csv
  sta-vehicles.csv
  board-school.csv
  students.csv
  guardians.csv
  student-guardians.csv
  ridership.csv
```

`manifest.json` `sha256` values are placeholders (`<computed-at-export>`); the real importer rejects bundles whose hashes don't match.

## Verification scenarios this bundle enables

1. **Cross-board parent app login (RBAC)** — P2 sees both children's routes/alerts; an admin scoped to OCDSB (or RCCDSB) sees only the OCDSB (or RCCDSB) child, not the cross-board sibling.
2. **Single alert, multi-student dedupe** — a school-scope alert at St. Bernadette delivers once each to `OSTA-GRD-0001` and `OSTA-GRD-0002` (not twice for P1's two children) — exercises the audience-resolver dedup on `(alert_id, user_id, channel)`.
3. **STA-scope cascade** — an OSTA weather closure cascades to all 6 OSTA students' guardians, including the cross-board P2 once.
4. **OSRM shape fallback** — Maplewood (OSTA) and Cathedral (RCJTC) routes import without `sta-shapes.csv` rows and gain an `sbtm_generated` shape from the fallback worker.
5. **Operator de-dupe across STAs** — `OP-STOCK` with `legal_entity_id = CA-ON-1234567` appears in both bundles; importer collapses to a single `stx_operators` row.
6. **Alerts-disabled school** — Cathedral Catholic School (`alerts_enabled = false`) is fully ingested but never produces parent alert deliveries; an integration test asserts `stx_alert_deliveries` count = 0 for any alert scoped to that school.
7. **Mixed grade ranges / bell schedules** — OSTA exercises elementary (`BELL-0820`, St. Bernadette JK–6) and secondary (`BELL-0905`, Maplewood 9–12) on the same STA; the bell-schedule plausibility check should pass for both.

## What this bundle is not

- Not a load test — 24 students, 12 ridership rows total.
- Not a security canary — emails are `*.test`, phones use the `+1-613-555-*` reserved testing prefix.
- Not authoritative — column names track `ImportMappings.md` and the templates under `docs/Design/templates/` at the time of authorship; reconcile against those docs before using as a fixture in CI.
