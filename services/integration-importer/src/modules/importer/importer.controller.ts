import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Logger,
  Post,
} from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  TRANSPORT_DATA_ADAPTERS,
  TransportDataAdapter,
} from '../adapter/transport-data-adapter.interface';
import { FILE_ORDER } from '../adapter/sta-csv/csv-schemas';
import { ManifestSchema, SourceFiles } from '../adapter/types/source-files';
import { ValidationReport } from '../adapter/types/validation-report';

interface ValidateRequest {
  adapter: string;
  bundlePath: string;
}

@Controller('imports')
export class ImporterController {
  private readonly logger = new Logger(ImporterController.name);

  constructor(
    @Inject(TRANSPORT_DATA_ADAPTERS)
    private readonly adapters: TransportDataAdapter[],
  ) {}

  // TODO(phase-C/slice-2): require an STA-Admin or internal-service auth guard.
  // Slice 1 leaves this endpoint unguarded for the dry-run path only.
  @Post('validate')
  @HttpCode(200)
  async validate(@Body() body: ValidateRequest): Promise<ValidationReport> {
    const adapter = this.adapters.find((a) => a.source === body?.adapter);
    if (!adapter) {
      throw new BadRequestException(
        `Unknown adapter: ${body?.adapter}. Known: ${this.adapters.map((a) => a.source).join(',')}`,
      );
    }
    if (!body?.bundlePath || typeof body.bundlePath !== 'string') {
      throw new BadRequestException('bundlePath is required');
    }

    const input = await loadBundleFromDisk(body.bundlePath);
    const report = await adapter.validate(input);
    this.logger.log(
      `validate ${body.adapter} ${body.bundlePath}: ok=${report.ok} errors=${report.errors.length} warnings=${report.warnings.length}`,
    );
    return report;
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
