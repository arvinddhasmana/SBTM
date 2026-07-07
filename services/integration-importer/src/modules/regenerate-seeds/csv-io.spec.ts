import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readCsv, readJson, writeCsv, writeJson } from './csv-io';

describe('csv-io', () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-io-'));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('round-trips rows preserving column order', async () => {
    const file = path.join(tmpDir, 'sample.csv');
    await writeCsv(
      file,
      ['id', 'name', 'value'],
      [
        { id: '1', name: 'a', value: '10' },
        { id: '2', name: 'b', value: '20' },
      ],
    );
    const text = await fs.readFile(file, 'utf8');
    expect(text.split('\n')[0]).toBe('id,name,value');
    const back = await readCsv<{ id: string; name: string; value: string }>(file);
    expect(back.headers).toEqual(['id', 'name', 'value']);
    expect(back.rows).toHaveLength(2);
    expect(back.rows[1]).toEqual({ id: '2', name: 'b', value: '20' });
  });

  it('writes atomically (no .tmp left behind on success)', async () => {
    const file = path.join(tmpDir, 'atomic.csv');
    await writeCsv(file, ['x'], [{ x: '1' }]);
    const entries = await fs.readdir(tmpDir);
    expect(entries).toEqual(['atomic.csv']);
  });

  it('round-trips JSON manifest data', async () => {
    const file = path.join(tmpDir, 'manifest.json');
    const payload = { files: { 'a.csv': { sha256: '<computed-at-export>', row_count: 3 } } };
    await writeJson(file, payload);
    const back = await readJson<typeof payload>(file);
    expect(back).toEqual(payload);
  });
});
