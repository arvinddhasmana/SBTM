import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MultiTenancyGuard } from '../../../common/guards/multi-tenancy.guard';
import { ComplianceGatewayService } from '../services/compliance.gateway.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class ComplianceController {
    constructor(private readonly complianceGateway: ComplianceGatewayService) { }

    @Get('inspections')
    async findAllInspections(@Query() query: any, @Req() req: any) {
        const schoolId = req.user?.schoolId;
        const params = schoolId ? { ...query, schoolId } : query;
        return this.complianceGateway.forward('GET', '/inspections', null, params);
    }

    @Post('inspections')
    async createInspection(@Body() body: any, @Req() req: any) {
        const schoolId = req.user?.schoolId;
        const payload = schoolId ? { ...body, school_id: schoolId } : body;
        return this.complianceGateway.forward('POST', '/inspections', payload);
    }

    @Get('compliance/driver/:driverId')
    async findDriverCompliance(@Param('driverId') driverId: string) {
        return this.complianceGateway.forward('GET', `/compliance/driver/${driverId}`);
    }

    @Get('compliance')
    async findAllCompliance(@Query() query: any, @Req() req: any) {
        const schoolId = req.user?.schoolId;
        const params = schoolId ? { ...query, schoolId } : query;
        return this.complianceGateway.forward('GET', '/compliance', null, params);
    }

    @Get('audit')
    async findAllAuditLogs(@Query() query: any, @Req() req: any) {
        const schoolId = req.user?.schoolId;
        const params = schoolId ? { ...query, schoolId } : query;
        return this.complianceGateway.forward('GET', '/audit', null, params);
    }
}
