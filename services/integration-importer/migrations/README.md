# integration-importer migrations

Slice 1 of Phase C ships raw SQL migrations applied by hand:

```sh
psql "$DATABASE_URL" -f migrations/20260601_create_stage_tables.sql
```

Slice 2 (diff + commit) will fold this into the monorepo's TypeORM migration
runner so the importer schema deploys alongside the canonical v2 tables in
`api-gateway`. Until then, the SQL here is the source of truth for the
`import_sessions` and `stage_*` shape used by the validate path.
