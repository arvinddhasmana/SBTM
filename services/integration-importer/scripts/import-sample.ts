#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * CLI seeder for the two-STA sample bundle. Runs entirely against the local
 * adapter + StagingWriter; when `DATABASE_URL` is unset it uses an in-memory
 * fake pg client so the dry-run still prints expected counts. Slice 2b will
 * extend this to also promote staged rows into the canonical v2 tables.
 *
 * Usage:
 *   npm run import:sample             # both OSTA + RCJTC
 *   npm run import:sample -- osta     # one bundle
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StaCsvAdapter } from '../src/modules/adapter/sta-csv/sta-csv.adapter';
import { FILE_ORDER } from '../src/modules/adapter/sta-csv/csv-schemas';
import { ManifestSchema, SourceFiles } from '../src/modules/adapter/types/source-files';
import { DryRunService } from '../src/modules/importer/dry-run.service';
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

async function importOne(name: string): Promise<boolean> {
  const bundlePath = path.join(BUNDLE_ROOT, name);
  console.log(`\n=== Importing ${name} from ${bundlePath} ===`);
  const adapter = new StaCsvAdapter();
  const writer = new StagingWriter(new InMemoryPg());
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
  console.log(`    counts=${JSON.stringify(result.counts)}`);
  console.log(`    warnings=${result.validation.warnings.length} (sha256 placeholders skipped)`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : ['osta', 'rcjtc'];
  let allOk = true;
  for (const t of targets) {
    const ok = await importOne(t);
    allOk = allOk && ok;
  }
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
