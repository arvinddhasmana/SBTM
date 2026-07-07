import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StaCsvAdapter } from '../adapter/sta-csv/sta-csv.adapter';
import { ManifestSchema, SourceFiles } from '../adapter/types/source-files';
import { FILE_ORDER } from '../adapter/sta-csv/csv-schemas';
import { PgQueryable } from './pg-pool.provider';
import { StagingWriter } from './staging-writer.service';

interface QueryCall {
  text: string;
  params?: unknown[];
}

class FakePg implements PgQueryable {
  readonly calls: QueryCall[] = [];
  private nextId = 1;

  async query(text: string, params?: unknown[]) {
    this.calls.push({ text, params });
    if (/INSERT INTO import_sessions/.test(text)) {
      return { rows: [{ id: `session-${this.nextId++}` }] };
    }
    return { rows: [] };
  }
}

async function loadOsta(): Promise<SourceFiles> {
  const root = path.resolve(__dirname, '../../../../../docs/Design/samples/two-sta-bundle/osta');
  const manifest = ManifestSchema.parse(
    JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8')),
  );
  const files = new Map<string, Buffer>();
  for (const name of FILE_ORDER) {
    files.set(name, await fs.readFile(path.join(root, name)));
  }
  return { manifest, files };
}

describe('StagingWriter (slice 2a)', () => {
  it('opens a session and drains canonical records into the right stage tables', async () => {
    const pg = new FakePg();
    const writer = new StagingWriter(pg);
    const adapter = new StaCsvAdapter();
    const input = await loadOsta();

    const sessionId = await writer.openSession({
      source: adapter.source,
      staShortCode: input.manifest.sta_short_code,
      exportId: input.manifest.export_id,
      exportAt: input.manifest.export_at,
      manifest: input.manifest,
    });
    expect(sessionId).toMatch(/^session-/);

    const counts = await writer.drain(sessionId, adapter.toCanonical(input));
    expect(counts).toEqual({
      board: 2,
      school: 2,
      operator: 1,
      vehicle: 6,
      route: 12,
      stop: 38,
      shape: 1460,
      trip: 12,
      stopTime: 84,
      student: 24,
      guardian: 10,
      studentGuardian: 24,
      ridership: 48,
    });

    const tableHits = (re: RegExp) => pg.calls.filter((c) => re.test(c.text)).length;
    expect(tableHits(/INSERT INTO stage_board_school/)).toBe(4); // 2 boards + 2 schools
    expect(tableHits(/INSERT INTO stage_operators/)).toBe(1);
    expect(tableHits(/INSERT INTO stage_ridership/)).toBe(48);

    await writer.markStatus(sessionId, 'validated', { errors: 0, warnings: 12 });
    expect(
      pg.calls.some((c) => /UPDATE import_sessions/.test(c.text) && c.params?.[1] === 'validated'),
    ).toBe(true);
  });
});
