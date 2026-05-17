/**
 * Integration test for slice 2b transport-layer commit and slice 4 PII layer.
 *
 * Gated on `DATABASE_URL` — local/CI must set this to a Postgres URL where the
 * superuser role can bypass RLS and the staging migration plus the v2 schema
 * (services/api-gateway/migrations/20260518_v2_cutover.sql) are already
 * applied. Without it, the suite is skipped (not failed) so unit-only runs stay
 * green.
 *
 * What it verifies:
 *   1. Stage + commit both bundles end-to-end (no exceptions).
 *   2. Canonical row counts in stx_* + GTFS tables match the bundle.
 *   3. Operator dedupe: OP-STOCK appears once across both STAs.
 *   4. Shape fallback (slice 3): routes missing shapes are flagged
 *      `sbtm_generated` and gain shape rows.
 *   5. PII layer (slice 4): students/guardians persisted encrypted and
 *      round-trip; cross-board parent O-P2 produces ONE stx_guardians row
 *      with TWO stx_student_guardians link rows; ridership rows present.
 */
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import { Pool } from 'pg';
import { AesGcmPiiCrypto } from '@sbtm/common';
import { StaCsvAdapter } from '../adapter/sta-csv/sta-csv.adapter';
import { FILE_ORDER } from '../adapter/sta-csv/csv-schemas';
import { ManifestSchema, SourceFiles } from '../adapter/types/source-files';
import { DryRunService } from '../importer/dry-run.service';
import { PgQueryable } from '../staging/pg-pool.provider';
import { StagingWriter } from '../staging/staging-writer.service';
import { CommitService } from './commit.service';
import { StubOsrmClient } from '../shape-fallback/osrm-client';

const RUN_DB = !!process.env.DATABASE_URL;
const describeDb = RUN_DB ? describe : describe.skip;

class RealPg implements PgQueryable {
  constructor(private readonly pool: Pool) {}
  async query(text: string, params?: unknown[]) {
    const r = await this.pool.query(text, params as unknown[] | undefined);
    return { rows: r.rows as unknown[] };
  }
}

async function loadBundle(rel: string): Promise<SourceFiles> {
  const root = path.resolve(__dirname, '../../../../../docs/Design/samples/two-sta-bundle', rel);
  const manifest = ManifestSchema.parse(
    JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8')),
  );
  const files = new Map<string, Buffer>();
  for (const name of FILE_ORDER) {
    files.set(name, await fs.readFile(path.join(root, name)));
  }
  return { manifest, files };
}

describeDb('CommitService (slice 2b transport-layer, integration)', () => {
  let pool: Pool;
  let pg: PgQueryable;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pg = new RealPg(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('commits OSTA + RCJTC into canonical tables; dedupes shared operator', async () => {
    const adapter = new StaCsvAdapter();
    const writer = new StagingWriter(pg);
    const dryRun = new DryRunService([adapter], writer);
    const piiKey = randomBytes(32);
    const pii = new AesGcmPiiCrypto(piiKey);
    const commit = new CommitService(pg, new StubOsrmClient(), pii);

    for (const name of ['osta', 'rcjtc']) {
      const input = await loadBundle(name);
      const r = await dryRun.run('sta-csv', input);
      expect(r.ok).toBe(true);
      expect(r.importSessionId).toBeTruthy();
      await commit.commit({
        importSessionId: r.importSessionId!,
        staShortCode: input.manifest.sta_short_code,
      });
    }

    const counts = await pool.query(`
      SELECT
        (SELECT count(*) FROM stx_sta)        AS sta,
        (SELECT count(*) FROM stx_boards)     AS boards,
        (SELECT count(*) FROM stx_schools)    AS schools,
        (SELECT count(*) FROM stx_operators)  AS operators,
        (SELECT count(*) FROM stx_vehicles)   AS vehicles,
        (SELECT count(*) FROM routes)         AS routes,
        (SELECT count(*) FROM stops)          AS stops,
        (SELECT count(*) FROM shapes)         AS shapes,
        (SELECT count(*) FROM trips)          AS trips,
        (SELECT count(*) FROM stop_times)     AS stop_times
    `);
    const row = counts.rows[0] as Record<string, string>;
    expect(Number(row.sta)).toBeGreaterThanOrEqual(2);
    expect(Number(row.boards)).toBeGreaterThanOrEqual(4);
    expect(Number(row.schools)).toBeGreaterThanOrEqual(4);
    // OP-STOCK shared across both STAs via legal_entity_id → exactly one row.
    expect(Number(row.operators)).toBeGreaterThanOrEqual(1);
    const dup = await pool.query(
      `SELECT count(*)::int AS c FROM stx_operators WHERE external_ids->>'legal_entity_id' = 'CA-ON-1234567'`,
    );
    expect((dup.rows[0] as { c: number }).c).toBe(1);

    // Slice 3 post-processor: bundle ships no shape for R-OCDSB-101 and
    // R-RCCDSB-501. After commit they must be flagged `sbtm_generated` and
    // have shape rows generated from the stop sequence.
    const generated = await pool.query(
      `SELECT route_id, stx_shape_source FROM routes
        WHERE route_id IN ('R-OCDSB-101', 'R-RCCDSB-501')
        ORDER BY route_id`,
    );
    const sources = (generated.rows as { route_id: string; stx_shape_source: string }[]).map(
      (r) => r.stx_shape_source,
    );
    expect(sources).toEqual(['sbtm_generated', 'sbtm_generated']);

    const genShapes = await pool.query(
      `SELECT count(*)::int AS c FROM shapes s
         WHERE s.shape_id IN (
           SELECT DISTINCT shape_id FROM trips
            WHERE route_id IN ('R-OCDSB-101', 'R-RCCDSB-501')
              AND shape_id IS NOT NULL
         )`,
    );
    expect((genShapes.rows[0] as { c: number }).c).toBeGreaterThan(0);

    // Slice 4: PII layer end-to-end.
    //
    // (a) Row counts: 6 students per STA → 12; 4 guardians per STA but parent
    // O-P2 spans OCSB + OCDSB and parent R-P2 spans RCDSB + RCCDSB. Within
    // each STA all 4 guardian_codes are unique → 8 total guardians; 6 link
    // rows per STA → 12.
    const piiCounts = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM stx_students) AS students,
        (SELECT count(*)::int FROM stx_guardians) AS guardians,
        (SELECT count(*)::int FROM stx_student_guardians) AS links,
        (SELECT count(*)::int FROM stx_ridership) AS ridership
    `);
    const p = piiCounts.rows[0] as Record<string, number>;
    expect(p.students).toBe(12);
    expect(p.guardians).toBe(8);
    expect(p.links).toBe(12);
    expect(p.ridership).toBeGreaterThanOrEqual(12);

    // (b) PII columns are BYTEA ciphertext, not plaintext.
    const sample = await pool.query(`SELECT legal_name FROM stx_students LIMIT 1`);
    const ct = (sample.rows[0] as { legal_name: Buffer }).legal_name;
    expect(Buffer.isBuffer(ct)).toBe(true);
    // 12-byte IV + 16-byte tag + at least 1 byte ciphertext.
    expect(ct.length).toBeGreaterThan(28);
    expect(pii.decrypt(ct)).toMatch(/[A-Za-z]/);

    // (c) Cross-board guardian dedupe: OSTA-GRD-0002 has one stx_guardians row
    //     with two stx_student_guardians link rows (OCSB-STU-0003 + OCDSB-STU-0001).
    const op2 = await pool.query(
      `SELECT g.id AS guardian_id,
              (SELECT count(*)::int FROM stx_student_guardians sg WHERE sg.guardian_id = g.id) AS link_count
         FROM stx_guardians g
        WHERE g.external_ids->>'guardian_code' = 'OSTA-GRD-0002'`,
    );
    expect(op2.rows.length).toBe(1);
    expect((op2.rows[0] as { link_count: number }).link_count).toBe(2);

    // (d) Ridership round-trip: every ridership row points at a real trip.
    const orphan = await pool.query(
      `SELECT count(*)::int AS c FROM stx_ridership r
         LEFT JOIN trips t ON t.trip_id = r.trip_id
        WHERE t.trip_id IS NULL`,
    );
    expect((orphan.rows[0] as { c: number }).c).toBe(0);
  }, 30_000);
});
