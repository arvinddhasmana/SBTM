import { apiClient } from './api-client';

export interface ImportValidationError {
  file: string;
  row?: number;
  column?: string;
  message: string;
}

export interface ImportValidationWarning {
  file: string;
  row?: number;
  message: string;
}

export interface ImportDryRunResult {
  ok: boolean;
  importSessionId: string | null;
  counts: Record<string, number> | null;
  validation: {
    ok: boolean;
    errors: ImportValidationError[];
    warnings: ImportValidationWarning[];
  };
}

export interface ImportCommitCounts {
  sta: number;
  boards: number;
  schools: number;
  routes: number;
  stops: number;
  students: number;
  guardians: number;
}

export const importerApi = {
  async dryRun(files: File[], adapter: string = 'sta-csv'): Promise<ImportDryRunResult> {
    const form = new FormData();
    form.append('adapter', adapter);
    for (const f of files) {
      form.append('files', f, f.name);
    }
    const res = await apiClient.post<ImportDryRunResult>('/api/v1/imports/dry-run', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async commit(
    importSessionId: string,
    staShortCode: string,
    staName?: string,
  ): Promise<ImportCommitCounts> {
    const res = await apiClient.post<ImportCommitCounts>('/api/v1/imports/commit', {
      importSessionId,
      staShortCode,
      staName,
    });
    return res.data;
  },
};

export const mockImporterApi: typeof importerApi = {
  async dryRun(files) {
    await new Promise((r) => setTimeout(r, 800));
    const fileNames = files.map((f) => f.name);
    const hasManifest = fileNames.includes('manifest.json');
    if (!hasManifest) {
      return {
        ok: false,
        importSessionId: null,
        counts: null,
        validation: {
          ok: false,
          errors: [{ file: 'manifest.json', message: 'manifest.json is required' }],
          warnings: [],
        },
      };
    }
    return {
      ok: true,
      importSessionId: 'mock-session-' + Date.now(),
      counts: {
        sta_routes: 2,
        sta_stops: 6,
        sta_stop_times: 12,
        sta_trips: 2,
        sta_shapes: 5,
        stx_students: 6,
        stx_guardians: 4,
        stx_ridership: 6,
      },
      validation: {
        ok: true,
        errors: [],
        warnings: [
          {
            file: 'sta-shapes.csv',
            message: 'R-OCDSB-101 has no shape rows — OSRM fallback will generate a path',
          },
        ],
      },
    };
  },

  async commit(_sessionId: string, _staShortCode: string, _staName?: string) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      sta: 1,
      boards: 2,
      schools: 2,
      routes: 2,
      stops: 6,
      students: 6,
      guardians: 4,
    };
  },
};
