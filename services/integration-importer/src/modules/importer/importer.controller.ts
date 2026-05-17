import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { InternalServiceGuard } from '../../common/guards/internal-service.guard';
import { CommitCounts, CommitService } from '../commit/commit.service';
import {
  TRANSPORT_DATA_ADAPTERS,
  TransportDataAdapter,
} from '../adapter/transport-data-adapter.interface';
import { FILE_ORDER } from '../adapter/sta-csv/csv-schemas';
import { ManifestSchema, SourceFiles } from '../adapter/types/source-files';
import { ValidationReport } from '../adapter/types/validation-report';
import { DryRunResult, DryRunService } from './dry-run.service';

interface ValidateRequest {
  adapter: string;
  bundlePath: string;
}

interface CommitRequest {
  importSessionId: string;
  staShortCode: string;
  staName?: string;
}

@Controller('imports')
@UseGuards(InternalServiceGuard)
export class ImporterController {
  private readonly logger = new Logger(ImporterController.name);

  constructor(
    @Inject(TRANSPORT_DATA_ADAPTERS)
    private readonly adapters: TransportDataAdapter[],
    private readonly dryRun: DryRunService,
    private readonly commitSvc: CommitService,
  ) {}

  @Post('validate')
  @HttpCode(200)
  async validate(@Body() body: ValidateRequest): Promise<ValidationReport> {
    const adapter = this.requireAdapter(body);
    const input = await loadBundleFromDisk(body.bundlePath);
    const report = await adapter.validate(input);
    this.logger.log(
      `validate ${body.adapter} ${body.bundlePath}: ok=${report.ok} errors=${report.errors.length} warnings=${report.warnings.length}`,
    );
    return report;
  }

  @Post('dry-run')
  @HttpCode(200)
  async dryRunEndpoint(@Body() body: ValidateRequest): Promise<DryRunResult> {
    this.requireAdapter(body);
    const input = await loadBundleFromDisk(body.bundlePath);
    const result = await this.dryRun.run(body.adapter, input);
    this.logger.log(
      `dry-run ${body.adapter} session=${result.importSessionId ?? '-'} ok=${result.ok}`,
    );
    return result;
  }

  @Post('commit')
  @HttpCode(200)
  async commitEndpoint(@Body() body: CommitRequest): Promise<CommitCounts> {
    if (!body?.importSessionId || !body?.staShortCode) {
      throw new BadRequestException('importSessionId and staShortCode are required');
    }
    const counts = await this.commitSvc.commit({
      importSessionId: body.importSessionId,
      staShortCode: body.staShortCode,
      staName: body.staName,
    });
    this.logger.log(`commit session=${body.importSessionId} counts=${JSON.stringify(counts)}`);
    return counts;
  }

  private requireAdapter(body: ValidateRequest): TransportDataAdapter {
    const adapter = this.adapters.find((a) => a.source === body?.adapter);
    if (!adapter) {
      throw new BadRequestException(
        `Unknown adapter: ${body?.adapter}. Known: ${this.adapters.map((a) => a.source).join(',')}`,
      );
    }
    if (!body?.bundlePath || typeof body.bundlePath !== 'string') {
      throw new BadRequestException('bundlePath is required');
    }
    return adapter;
  }
}

export async function loadBundleFromDisk(bundlePath: string): Promise<SourceFiles> {
  const manifestPath = path.join(bundlePath, 'manifest.json');
  const manifestRaw = await fs.readFile(manifestPath, 'utf8');
  const manifest = ManifestSchema.parse(JSON.parse(manifestRaw));

  const files = new Map<string, Buffer>();
  for (const name of FILE_ORDER) {
    const p = path.join(bundlePath, name);
    try {
      files.set(name, await fs.readFile(p));
    } catch {
      // Leave absent — validate() will surface the missing-file error.
    }
  }
  return { manifest, files };
}
