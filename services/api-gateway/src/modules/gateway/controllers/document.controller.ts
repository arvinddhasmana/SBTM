import {
  Controller,
  Get,
  Param,
  UseGuards,
  Res,
  NotImplementedException,
} from '@nestjs/common';
import { Response } from 'express';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';

/**
 * v2 stub: the `fleet_assignments` table is gone; vehicle/driver assignment now lives on
 * `stx_runs`. The PDF render path here needs a Run + Route + Vehicle + Driver lookup that
 * we haven't wired yet. Returning 501 keeps a clean URL surface for the client.
 *
 * TODO(phase-B): replace with `/documents/run/:id/pdf` once the run-proposal lifecycle is
 * designed; remove the legacy fleet-assignment path entirely.
 */
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private readonly pdfGenerator: PdfGeneratorService) {}

  @Get('fleet-assignment/:id/pdf')
  @Roles(Role.STA_ADMIN, Role.SCHOOL_ADMIN)
  async getFleetAssignmentPdf(
    @Param('id') _id: string,
    @Res() _res: Response,
  ): Promise<void> {
    void this.pdfGenerator;
    throw new NotImplementedException(
      'Fleet-assignment PDF rendering is not yet wired to the v2 Run model',
    );
  }
}
