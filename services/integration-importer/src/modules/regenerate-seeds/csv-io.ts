import { promises as fs } from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

/**
 * Tiny papaparse wrapper used by the seed regenerator and any future "regen
 * against a live STA bundle" pipeline.
 *
 * The goal is *byte-stable round-trips*: column order is preserved, the same
 * header row is re-emitted, and unknown columns survive unmodified. The
 * regenerator only rewrites the columns it owns (lat/lon/time/etc.); any
 * future board adds extra columns and we won't silently drop them.
 */
export async function readCsv<T extends Record<string, string>>(
  filePath: string,
): Promise<{ headers: string[]; rows: T[] }> {
  const text = await fs.readFile(filePath, 'utf8');
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length > 0) {
    throw new Error(
      `CSV parse error in ${filePath}: ${parsed.errors.map((e) => e.message).join('; ')}`,
    );
  }
  const headers = parsed.meta.fields ?? [];
  return { headers, rows: parsed.data };
}

export async function writeCsv<T extends Record<string, string>>(
  filePath: string,
  headers: string[],
  rows: T[],
): Promise<void> {
  // papaparse's unparse handles quoting/escaping consistently with the
  // existing bundles (double-quoted JSON columns, etc.).
  const csv = Papa.unparse(
    { fields: headers, data: rows.map((r) => headers.map((h) => r[h] ?? '')) },
    { newline: '\n', quotes: false, header: true },
  );
  // Atomic write so a crash mid-regen never leaves a half-written CSV that
  // would later fail manifest sha256 verification.
  const tmp = `${filePath}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmp, csv + '\n', 'utf8');
  await fs.rename(tmp, filePath);
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, filePath);
}
