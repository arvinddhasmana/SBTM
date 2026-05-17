import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StaCsvAdapter } from '../adapter/sta-csv/sta-csv.adapter';
import { ManifestSchema, SourceFiles } from '../adapter/types/source-files';
import { FILE_ORDER } from '../adapter/sta-csv/csv-schemas';
import { PgQueryable } from '../staging/pg-pool.provider';
import { StagingWriter } from '../staging/staging-writer.service';
import { DryRunService } from './dry-run.service';

class FakePg implements PgQueryable {
  private id = 1;
  async query(text: string) {
    if (/INSERT INTO import_sessions/.test(text)) {
      return { rows: [{ id: `s-${this.id++}` }] };
    }
    return { rows: [] };
  }
}

async function loadBundle(which: 'osta' | 'rcjtc'): Promise<SourceFiles> {
  const root = path.resolve(
    __dirname,
    `../../../../../docs/Design/samples/two-sta-bundle/${which}`,
  );
  const manifest = ManifestSchema.parse(
    JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8')),
  );
  const files = new Map<string, Buffer>();
  for (const name of FILE_ORDER) {
    files.set(name, await fs.readFile(path.join(root, name)));
  }
  return { manifest, files };
}

describe('DryRunService (slice 2a)', () => {
  const build = () => {
    const adapter = new StaCsvAdapter();
    const writer = new StagingWriter(new FakePg());
    const svc = new DryRunService([adapter], writer);
    return { adapter, svc };
  };

  it('runs validate + stage end-to-end on OSTA', async () => {
    const { svc } = build();
    const input = await loadBundle('osta');
    const result = await svc.run('sta-csv', input);
    expect(result.ok).toBe(true);
    expect(result.importSessionId).toMatch(/^s-/);
    expect(result.validation.errors).toEqual([]);
    expect(result.counts?.student).toBe(6);
    expect(result.counts?.ridership).toBe(6);
  });

  it('short-circuits when validation fails (no session opened)', async () => {
    const { svc } = build();
    const input = await loadBundle('rcjtc');
    // Force a validation failure by truncating guardians.csv to header only.
    input.files.set(
      'guardians.csv',
      Buffer.from('guardian_code,legal_name,email,phone,preferred_language\n'),
    );
    const result = await svc.run('sta-csv', input);
    expect(result.ok).toBe(false);
    expect(result.importSessionId).toBeNull();
    expect(result.counts).toBeNull();
  });

  it('rejects unknown adapter', async () => {
    const { svc } = build();
    const input = await loadBundle('osta');
    await expect(svc.run('does-not-exist', input)).rejects.toThrow(/Unknown adapter/);
  });
});
