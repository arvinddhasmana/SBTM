import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  TRANSPORT_DATA_ADAPTERS,
  TransportDataAdapter,
} from '../adapter/transport-data-adapter.interface';
import { ManifestSchema, SourceFiles } from '../adapter/types/source-files';
import { StageCounts, StagingWriter } from '../staging/staging-writer.service';
import { ValidationReport } from '../adapter/types/validation-report';

export interface DryRunResult {
  ok: boolean;
  importSessionId: string | null;
  validation: ValidationReport;
  counts: StageCounts | null;
}

@Injectable()
export class DryRunService {
  private readonly logger = new Logger(DryRunService.name);

  constructor(
    @Inject(TRANSPORT_DATA_ADAPTERS)
    private readonly adapters: TransportDataAdapter[],
    private readonly staging: StagingWriter,
  ) {}

  async run(adapterName: string, input: SourceFiles): Promise<DryRunResult> {
    const adapter = this.adapters.find((a) => a.source === adapterName);
    if (!adapter) {
      throw new BadRequestException(
        `Unknown adapter: ${adapterName}. Known: ${this.adapters.map((a) => a.source).join(',')}`,
      );
    }

    const validation = await adapter.validate(input);
    if (!validation.ok) {
      return { ok: false, importSessionId: null, validation, counts: null };
    }

    const manifest = ManifestSchema.parse(input.manifest);
    const sessionId = await this.staging.openSession({
      source: adapter.source,
      staShortCode: manifest.sta_short_code,
      exportId: manifest.export_id,
      exportAt: manifest.export_at,
      manifest,
    });

    try {
      const counts = await this.staging.drain(sessionId, adapter.toCanonical(input));
      await this.staging.markStatus(sessionId, 'validated', {
        errors: validation.errors.length,
        warnings: validation.warnings.length,
      });
      this.logger.log(
        `dry-run ${adapter.source} session=${sessionId} counts=${JSON.stringify(counts)}`,
      );
      return { ok: true, importSessionId: sessionId, validation, counts };
    } catch (err) {
      await this.staging.markStatus(sessionId, 'failed');
      throw err;
    }
  }
}
