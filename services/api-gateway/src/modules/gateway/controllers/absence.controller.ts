import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AbsenceGatewayService } from '../services/absence.gateway.service';
import { ReportAbsenceDto } from '../dto/report-absence.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

type AuthenticatedRequest = { user: AuthenticatedUser };

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceGatewayService) {}

  /**
   * Parent reports an absence for their child. FR-ABS-001
   */
  @Post()
  @Roles(Role.PARENT)
  async reportAbsence(
    @Body() dto: ReportAbsenceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.absenceService.reportAbsence(dto, req.user);
  }

  /**
   * Get absences for a given date (driver & admin view). FR-ABS-002
   * Query param: date (YYYY-MM-DD), schoolId (optional, required for board/STA admins)
   */
  @Get()
  @Roles(
    Role.DRIVER,
    Role.SCHOOL_ADMIN,
    Role.BOARD_ADMIN,
    Role.STA_ADMIN,
    Role.SUPER_ADMIN,
  )
  async listAbsences(
    @Query('date') date: string,
    @Query('schoolId') schoolId: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.absenceService.listAbsencesForAdmin(req.user, date, schoolId);
  }

  /**
   * Admin dashboard overview of all absences (optional date filter).
   */
  @Get('admin')
  @Roles(Role.SCHOOL_ADMIN, Role.BOARD_ADMIN, Role.STA_ADMIN, Role.SUPER_ADMIN)
  async adminAbsences(
    @Query('date') date: string | undefined,
    @Query('schoolId') schoolId: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.absenceService.listAbsencesForAdmin(req.user, date, schoolId);
  }

  /**
   * School admin confirms a pending absence. FR-ABS-003
   */
  @Patch(':id/confirm')
  @Roles(Role.SCHOOL_ADMIN)
  async confirmAbsence(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.absenceService.confirmAbsence(id, req.user);
  }

  /**
   * School admin rejects a pending absence. FR-ABS-004
   */
  @Patch(':id/reject')
  @Roles(Role.SCHOOL_ADMIN)
  async rejectAbsence(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.absenceService.rejectAbsence(id, req.user, body.notes);
  }

  /**
   * Cancel / delete an absence report (parent cancels their own; admins can remove any in scope).
   */
  @Delete(':id')
  @Roles(Role.PARENT, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN, Role.STA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelAbsence(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.absenceService.deleteAbsence(id, req.user);
  }
}
