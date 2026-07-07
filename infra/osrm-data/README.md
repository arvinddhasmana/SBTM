# OSRM routing data

The `osrm` service in `docker-compose.yml` mounts this directory at `/data` and
serves road-snapped routing requests on port 5000. SBTM uses OSRM for two
purposes:

1. **Seed regeneration** — `pnpm --filter integration-importer run regenerate:seeds`
   uses OSRM `/nearest` to curb-snap each bus stop and `/route` to produce
   road-following polylines that are written into `sta-shapes.csv`.
2. **Importer shape fallback** — when a real STA bundle delivers trips with
   missing or empty `shape_id`, `CommitService.runShapeFallback` snaps the
   trip's stop sequence to roads via OSRM and persists the result.

## One-time setup

The `.osrm*` files and `.osm.pbf` source are **not** committed — they total
~2 GB. Build them with:

```bash
scripts/osrm/build-osrm-data.sh ontario
```

This downloads `ontario-latest.osm.pbf` (~700 MB) from Geofabrik, then runs
`osrm-extract` → `osrm-partition` → `osrm-customize` using the OSRM Docker
image (no host-side toolchain needed). Peak memory ~5 GB, runtime 5–15 min on
a typical laptop. Subsequent runs are no-ops unless `--force` is passed.

The Ontario extract covers Ottawa, Pembroke, Toronto, and every other
Ontario municipality SBTM is likely to serve — switching from the older
Ottawa-only extract was necessary because RCJTC (Renfrew County) sits ~150 km
NW of Ottawa and was outside the smaller PBF.

## Starting OSRM

```bash
docker compose up -d osrm
curl http://localhost:5000/nearest/v1/driving/-75.6932,45.4191   # smoke test
```

Set `OSRM_BASE_URL=http://localhost:5000` (host) or `http://osrm:5000`
(in-compose) so the importer picks up the live endpoint instead of falling
back to the straight-line `StubOsrmClient`.

## Rebuilding for a different region

```bash
scripts/osrm/build-osrm-data.sh quebec       # pulls north-america/canada/quebec-latest.osm.pbf
scripts/osrm/build-osrm-data.sh ontario --force
```

Then update the `command:` line in `docker-compose.yml` (and
`docker-compose.infra.yml` if used) to point at the new `<region>.osrm`.
