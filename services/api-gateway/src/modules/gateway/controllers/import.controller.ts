import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HttpClientService } from '../../../common/utils/http-client.service';
import * as tmp from 'os';
import * as path from 'path';
import * as fs from 'fs';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

interface DryRunResponse {
  ok: boolean;
  importSessionId: string | null;
  counts: Record<string, number> | null;
  validation: {
    ok: boolean;
    errors: Array<{
      file: string;
      row?: number;
      column?: string;
      message: string;
    }>;
    warnings: Array<{ file: string; row?: number; message: string }>;
  };
}

interface CommitResponse {
  sta: number;
  boards: number;
  schools: number;
  routes: number;
  stops: number;
  students: number;
  guardians: number;
}

interface CommitRequest {
  importSessionId: string;
  staShortCode: string;
  staName?: string;
}

@Controller('api/v1/imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportController {
  private readonly logger = new Logger(ImportController.name);
  private readonly importerUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.importerUrl = this.configService.get<string>(
      'IMPORTER_SERVICE_URL',
      'http://integration-importer:3007',
    );
  }

  /**
   * POST /api/v1/imports/dry-run
   * Accepts multipart upload of a bundle directory's files.
   * Saves to a temp dir, forwards bundlePath to the importer, returns result.
   * RBAC: STA_ADMIN and SUPER_ADMIN only for transport-layer uploads.
   */
  @Post('dry-run')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN, Role.BOARD_ADMIN)
  @UseInterceptors(
    FilesInterceptor('files', 20, { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async dryRun(
    @UploadedFiles() files: UploadedFile[],
    @Body('adapter') adapter: string = 'sta-csv',
  ): Promise<DryRunResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const bundleDir = fs.mkdtempSync(path.join(tmp.tmpdir(), 'sbtm-import-'));
    try {
      for (const f of files) {
        fs.writeFileSync(path.join(bundleDir, f.originalname), f.buffer);
      }
      const result = await this.httpClient.post<DryRunResponse>(
        `${this.importerUrl}/imports/dry-run`,
        { adapter, bundlePath: bundleDir },
      );
      this.logger.log(
        `import dry-run adapter=${adapter} ok=${result.ok} session=${result.importSessionId ?? '-'}`,
      );
      return result;
    } finally {
      fs.rmSync(bundleDir, { recursive: true, force: true });
    }
  }

  /**
   * POST /api/v1/imports/commit
   * Commits a previously validated import session.
   * Requires importSessionId from a dry-run that returned ok=true.
   */
  @Post('commit')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN)
  async commit(@Body() body: CommitRequest): Promise<CommitResponse> {
    if (!body?.importSessionId || !body?.staShortCode) {
      throw new BadRequestException(
        'importSessionId and staShortCode are required',
      );
    }
    const result = await this.httpClient.post<CommitResponse>(
      `${this.importerUrl}/imports/commit`,
      body,
    );
    this.logger.log(
      `import commit session=${body.importSessionId} sta=${body.staShortCode} counts=${JSON.stringify(result)}`,
    );
    return result;
  }
}
