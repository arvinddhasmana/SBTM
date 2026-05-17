import { z } from 'zod';

/**
 * `manifest.json` schema as produced by STA exports. The placeholder
 * `<computed-at-export>` is permitted for synthetic sample bundles and skipped
 * during sha256 verification; real STA manifests carry real hex hashes.
 */
export const ManifestFileSchema = z.object({
  sha256: z.string(),
  row_count: z.number().int().nonnegative(),
});

export const ManifestSchema = z.object({
  sta_short_code: z.string().min(2),
  export_id: z.string().min(1),
  export_at: z.string(),
  files: z.record(z.string(), ManifestFileSchema),
  notes: z.string().optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export interface SourceFiles {
  manifest: Manifest;
  files: Map<string, Buffer>;
}
