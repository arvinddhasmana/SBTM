import {
  Controller,
  Get,
  Param,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { FleetAssignment } from '../entities/fleet-assignment.entity';
import { School } from '../../auth/entities/school.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(
    private readonly pdfGenerator: PdfGeneratorService,
    @InjectRepository(FleetAssignment)
    private readonly assignmentRepository: Repository<FleetAssignment>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
  ) {}

  @Get('fleet-assignment/:id/pdf')
  @Roles(Role.OSTA_ADMIN, Role.SCHOOL_ADMIN)
  async getFleetAssignmentPdf(@Param('id') id: string, @Res() res: Response) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException('Fleet assignment not found');
    }

    const school = await this.schoolRepository.findOne({
      where: { id: assignment.schoolId },
    });

    const pdfBuffer = await this.pdfGenerator.generateFleetAssignmentPdf({
      schoolName: school?.name ?? 'Unknown School',
      routeName: assignment.routeId,
      vehicleId: assignment.vehicleId,
      driverId: assignment.driverId,
      effectiveDate: assignment.effectiveDate,
      proposedBy: assignment.proposedByUserId,
      reviewedBy: assignment.reviewedByUserId,
      status: assignment.status,
      createdAt: assignment.createdAt.toISOString(),
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="fleet-assignment-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
