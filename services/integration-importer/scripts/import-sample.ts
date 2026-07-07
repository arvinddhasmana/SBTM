#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * CLI seeder for the two-STA sample bundle.
 *
 * - Default: validates + drains canonical records into stage_* tables using
 *   an in-memory fake pg client (no DB required).
 * - With DATABASE_URL set + `--commit` flag: connects to real Postgres,
 *   stages, then promotes transport-layer entities into canonical v2 tables.
 *
 * Usage:
 *   npm run import:sample             # dry-run both OSTA + RCJTC (in-memory)
 *   npm run import:sample -- osta     # dry-run one bundle
 *   npm run import:sample -- --commit # validate + commit both (needs DATABASE_URL)
 *   npm run import:sample -- --commit --verify-shapes
 *                                     # fail non-zero if any committed route
 *                                     # ends up with zero shape rows (i.e. the
 *                                     # map would render blank for it).
 */
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import { Pool } from 'pg';
import { AesGcmPiiCrypto, piiCryptoFromEnv, type PiiCrypto } from '@sbtm/common';
import { StaCsvAdapter } from '../src/modules/adapter/sta-csv/sta-csv.adapter';
import { FILE_ORDER } from '../src/modules/adapter/sta-csv/csv-schemas';
import { ManifestSchema, SourceFiles } from '../src/modules/adapter/types/source-files';
import { CommitService } from '../src/modules/commit/commit.service';
import { DryRunService } from '../src/modules/importer/dry-run.service';
import { HttpOsrmClient } from '../src/modules/shape-fallback/http-osrm-client';
import { StubOsrmClient } from '../src/modules/shape-fallback/osrm-client';
import { PgQueryable } from '../src/modules/staging/pg-pool.provider';
import { StagingWriter } from '../src/modules/staging/staging-writer.service';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const BUNDLE_ROOT = path.join(REPO_ROOT, 'docs/Design/samples/two-sta-bundle');

class InMemoryPg implements PgQueryable {
  private next = 1;
  async query(text: string) {
    if (/INSERT INTO import_sessions/.test(text)) {
      return { rows: [{ id: `mem-${this.next++}` }] };
    }
    return { rows: [] };
  }
}

/** Adapts node-pg Pool to the minimal PgQueryable interface. */
class RealPg implements PgQueryable {
  constructor(private readonly pool: Pool) {}
  async query(text: string, params?: unknown[]) {
    const r = await this.pool.query(text, params as unknown[] | undefined);
    return { rows: r.rows as unknown[] };
  }
}

async function loadBundle(bundlePath: string): Promise<SourceFiles> {
  const manifest = ManifestSchema.parse(
    JSON.parse(await fs.readFile(path.join(bundlePath, 'manifest.json'), 'utf8')),
  );
  const files = new Map<string, Buffer>();
  for (const name of FILE_ORDER) {
    try {
      files.set(name, await fs.readFile(path.join(bundlePath, name)));
    } catch {
      /* validator will surface missing-file */
    }
  }
  return { manifest, files };
}

interface RunOpts {
  commit: boolean;
  verifyShapes: boolean;
  pg: PgQueryable;
  pii: PiiCrypto;
}

async function importOne(name: string, opts: RunOpts): Promise<boolean> {
  const bundlePath = path.join(BUNDLE_ROOT, name);
  console.log(`\n=== Importing ${name} from ${bundlePath} ===`);
  const adapter = new StaCsvAdapter();
  const writer = new StagingWriter(opts.pg);
  const svc = new DryRunService([adapter], writer);
  const input = await loadBundle(bundlePath);
  const result = await svc.run('sta-csv', input);

  if (!result.ok) {
    console.error(`FAIL: ${name} validation produced ${result.validation.errors.length} errors`);
    for (const e of result.validation.errors.slice(0, 20)) {
      console.error(
        `  - ${e.file}${e.row ? `:${e.row}` : ''}${e.column ? ` [${e.column}]` : ''}: ${e.message}`,
      );
    }
    return false;
  }
  console.log(`OK  session=${result.importSessionId}`);
  console.log(`    stage counts=${JSON.stringify(result.counts)}`);
  console.log(`    warnings=${result.validation.warnings.length}`);

  if (opts.commit && result.importSessionId) {
    const osrm = process.env.OSRM_BASE_URL
      ? new HttpOsrmClient(process.env.OSRM_BASE_URL)
      : new StubOsrmClient();
    const commitSvc = new CommitService(opts.pg, osrm, opts.pii);
    const counts = await commitSvc.commit({
      importSessionId: result.importSessionId,
      staShortCode: input.manifest.sta_short_code,
    });
    console.log(`    commit counts=${JSON.stringify(counts)}`);
    if (opts.verifyShapes && counts.zeroShapeRoutes > 0) {
      console.error(
        `FAIL: ${name} has ${counts.zeroShapeRoutes} route(s) with no shape after fallback — see commit log for route_ids`,
      );
      return false;
    }
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes('--commit');
  const verifyShapes = args.includes('--verify-shapes');
  const targets = args.filter((a) => !a.startsWith('--'));
  const list = targets.length > 0 ? targets : ['ocsb'];

  let pg: PgQueryable;
  let pool: Pool | undefined;
  let pii: PiiCrypto;
  if (commit) {
    if (!process.env.DATABASE_URL) {
      console.error('--commit requires DATABASE_URL');
      process.exit(2);
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pg = new RealPg(pool);
    // Use a real key from env when present; otherwise generate an ephemeral
    // one for dev-loop seeding so the writer doesn't crash. The ciphertext
    // becomes unreadable once the process exits — expected for sample data.
    pii = process.env.SBTM_PII_KEY
      ? piiCryptoFromEnv()
      : ((): PiiCrypto => {
          console.warn(
            'SBTM_PII_KEY not set — using ephemeral PII key (ciphertext NOT decryptable after this run)',
          );
          return new AesGcmPiiCrypto(randomBytes(32));
        })();
  } else {
    pg = new InMemoryPg();
    pii = new AesGcmPiiCrypto(randomBytes(32));
  }

  let allOk = true;
  try {
    for (const t of list) {
      const ok = await importOne(t, { commit, verifyShapes, pg, pii });
      allOk = allOk && ok;
    }
  } finally {
    await pool?.end();
  }
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
