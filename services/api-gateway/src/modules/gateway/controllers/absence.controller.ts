import {
    Controller,
    Get,
    Post,
    Delete,
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
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';

interface AuthenticatedRequest {
    user: {
        id: string;
        role: Role;
        schoolId?: string;
        boardId?: string;
    };
}

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsenceController {
    constructor(private readonly absenceService: AbsenceGatewayService) { }

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
     * Query param: date (YYYY-MM-DD), schoolId (optional, required for board/OSTA admins)
     */
    @Get()
    @Roles(Role.DRIVER, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN, Role.OSTA_ADMIN)
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
    @Roles(Role.SCHOOL_ADMIN, Role.BOARD_ADMIN, Role.OSTA_ADMIN)
    async adminAbsences(
        @Query('date') date: string | undefined,
        @Query('schoolId') schoolId: string | undefined,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.absenceService.listAbsencesForAdmin(req.user, date, schoolId);
    }

    /**
     * Cancel / delete an absence report (parent cancels their own; admins can remove any in scope).
     */
    @Delete(':id')
    @Roles(Role.PARENT, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN, Role.OSTA_ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    async cancelAbsence(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        await this.absenceService.deleteAbsence(id, req.user);
    }
}
