#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * CLI for the seed-regen pipeline.
 *
 * Walks `docs/Design/samples/two-sta-bundle/{osta,rcjtc}` and rewrites the
 * geometry / time columns of the bundled CSVs using real OSRM road snapping.
 * Operator / vehicle / guardian / cross-bundle linkage rows are preserved.
 *
 * Usage:
 *   pnpm --filter integration-importer regenerate:seeds
 *   pnpm --filter integration-importer regenerate:seeds -- --sta=OSTA --seed=42
 *
 * Requires a running OSRM instance — defaults to http://localhost:5000
 * (the docker-compose `osrm` service). Override with OSRM_BASE_URL.
 */
import * as path from 'node:path';
import { OsrmPlanningClient } from '../src/modules/regenerate-seeds/osrm-planning-client';
import { regenerateSeedBundle } from '../src/modules/regenerate-seeds/seed-regenerator';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const BUNDLE_ROOT = path.join(REPO_ROOT, 'docs/Design/samples/two-sta-bundle');

function parseArgs(argv: string[]): { sta?: ('OSTA' | 'RCJTC' | 'OCSB')[]; seed: number } {
  const out: { sta?: ('OSTA' | 'RCJTC' | 'OCSB')[]; seed: number } = { seed: 20260522 };
  for (const a of argv) {
    if (a.startsWith('--seed=')) out.seed = Number(a.slice('--seed='.length));
    else if (a.startsWith('--sta=')) {
      const list = a
        .slice('--sta='.length)
        .split(',')
        .map((s) => s.trim().toUpperCase()) as ('OSTA' | 'RCJTC' | 'OCSB')[];
      out.sta = list;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = process.env.OSRM_BASE_URL ?? 'http://localhost:5000';
  console.log(`Regenerating seeds against OSRM at ${baseUrl} (seed=${args.seed})`);
  const osrm = new OsrmPlanningClient(baseUrl);
  await regenerateSeedBundle({
    bundleRoot: BUNDLE_ROOT,
    seed: args.seed,
    osrm,
    staFilter: args.sta,
  });
  console.log('Seed regeneration complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
