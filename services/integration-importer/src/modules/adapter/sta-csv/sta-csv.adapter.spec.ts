import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StaCsvAdapter } from './sta-csv.adapter';
import { ManifestSchema, SourceFiles } from '../types/source-files';
import { FILE_ORDER } from './csv-schemas';
import { CanonicalRecord, CanonicalRecordKind } from '../types/canonical-record';

const BUNDLE_ROOT = path.resolve(__dirname, '../../../../../../docs/Design/samples/two-sta-bundle');

async function loadBundle(name: 'osta' | 'rcjtc'): Promise<SourceFiles> {
  const dir = path.join(BUNDLE_ROOT, name);
  const manifest = ManifestSchema.parse(
    JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')),
  );
  const files = new Map<string, Buffer>();
  for (const f of FILE_ORDER) {
    files.set(f, await fs.readFile(path.join(dir, f)));
  }
  return { manifest, files };
}

async function collect(iter: AsyncIterable<CanonicalRecord>): Promise<CanonicalRecord[]> {
  const out: CanonicalRecord[] = [];
  for await (const r of iter) out.push(r);
  return out;
}

function countBy(records: CanonicalRecord[]): Record<CanonicalRecordKind, number> {
  const out: Partial<Record<CanonicalRecordKind, number>> = {};
  for (const r of records) {
    out[r.kind] = (out[r.kind] ?? 0) + 1;
  }
  return out as Record<CanonicalRecordKind, number>;
}

describe('StaCsvAdapter', () => {
  const adapter = new StaCsvAdapter();

  describe('validate() — happy path', () => {
    it('accepts the OSTA sample bundle', async () => {
      const input = await loadBundle('osta');
      const report = await adapter.validate(input);
      if (!report.ok) {
        // Surface the first few errors so failures are debuggable in CI logs.
        console.error('OSTA validation errors', report.errors.slice(0, 5));
      }
      expect(report.ok).toBe(true);
      expect(report.errors).toEqual([]);
      // Each file has a placeholder sha256, so we expect 12 placeholder warnings.
      expect(report.warnings.length).toBe(FILE_ORDER.length);
    });

    it('accepts the RCJTC sample bundle', async () => {
      const input = await loadBundle('rcjtc');
      const report = await adapter.validate(input);
      if (!report.ok) {
        console.error('RCJTC validation errors', report.errors.slice(0, 5));
      }
      expect(report.ok).toBe(true);
    });
  });

  describe('toCanonical() — OSTA counts', () => {
    it('yields records in dependency order with manifest-matching counts', async () => {
      const input = await loadBundle('osta');
      const records = await collect(adapter.toCanonical(input));
      const counts = countBy(records);

      expect(counts.board).toBe(2);
      expect(counts.school).toBe(2);
      expect(counts.operator).toBe(1);
      expect(counts.vehicle).toBe(2);
      expect(counts.route).toBe(2);
      expect(counts.stop).toBe(6);
      expect(counts.shape).toBe(5);
      expect(counts.trip).toBe(2);
      expect(counts.stopTime).toBe(6);
      expect(counts.student).toBe(6);
      expect(counts.guardian).toBe(4);
      expect(counts.studentGuardian).toBe(6);
      expect(counts.ridership).toBe(6);

      // Dependency order: every school must follow its board's first appearance.
      const kindOrder = records.map((r) => r.kind);
      expect(kindOrder.indexOf('board')).toBeLessThan(kindOrder.indexOf('school'));
      expect(kindOrder.indexOf('route')).toBeLessThan(kindOrder.indexOf('trip'));
      expect(kindOrder.indexOf('trip')).toBeLessThan(kindOrder.indexOf('stopTime'));
      expect(kindOrder.indexOf('student')).toBeLessThan(kindOrder.indexOf('studentGuardian'));
      expect(kindOrder.indexOf('guardian')).toBeLessThan(kindOrder.indexOf('studentGuardian'));
    });
  });

  describe('toCanonical() — RCJTC counts', () => {
    it('matches the RCJTC manifest', async () => {
      const input = await loadBundle('rcjtc');
      const records = await collect(adapter.toCanonical(input));
      const counts = countBy(records);
      expect(counts.board).toBe(2);
      expect(counts.school).toBe(2);
      expect(counts.operator).toBe(1);
      expect(counts.route).toBe(2);
      expect(counts.student).toBe(6);
      expect(counts.ridership).toBe(6);
    });
  });

  describe('validate() — negative paths', () => {
    it('reports missing column with file + column metadata', async () => {
      const input = await loadBundle('osta');
      const buf = input.files.get('students.csv')!;
      // Drop the `grade` column entirely from header AND every row.
      const text = buf.toString('utf8');
      const lines = text.split(/\r?\n/);
      const header = lines[0].split(',');
      const gradeIdx = header.indexOf('grade');
      expect(gradeIdx).toBeGreaterThan(-1);
      const drop = (cols: string[]) => cols.filter((_, i) => i !== gradeIdx).join(',');
      const mangled = [
        drop(header),
        ...lines.slice(1).map((l) => (l ? drop(l.split(',')) : l)),
      ].join('\n');
      input.files.set('students.csv', Buffer.from(mangled, 'utf8'));

      const report = await adapter.validate(input);
      expect(report.ok).toBe(false);
      const studentErrors = report.errors.filter((e) => e.file === 'students.csv');
      expect(studentErrors.length).toBeGreaterThan(0);
      expect(studentErrors.some((e) => e.column === 'grade')).toBe(true);
    });

    it('reports row_count mismatch when a row is removed', async () => {
      const input = await loadBundle('osta');
      const buf = input.files.get('guardians.csv')!;
      const lines = buf.toString('utf8').split(/\r?\n/);
      // Keep header + 3 rows (manifest expects 4).
      const truncated = [lines[0], lines[1], lines[2], lines[3]].join('\n');
      input.files.set('guardians.csv', Buffer.from(truncated, 'utf8'));

      const report = await adapter.validate(input);
      expect(report.ok).toBe(false);
      expect(
        report.errors.some(
          (e) => e.file === 'guardians.csv' && /row_count mismatch/.test(e.message),
        ),
      ).toBe(true);
    });
  });
});
