import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MultiTenancyGuard } from '../../../common/guards/multi-tenancy.guard';
import { ComplianceGatewayService } from '../services/compliance.gateway.service';

@Controller('compliance-gateway')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class ComplianceController {
    constructor(private readonly complianceGateway: ComplianceGatewayService) { }

    @Get('inspections')
    async findAllInspections(@Query() query: any) {
        return this.complianceGateway.forward('GET', '/inspections', null, query);
    }

    @Post('inspections')
    async createInspection(@Body() body: any) {
        return this.complianceGateway.forward('POST', '/inspections', body);
    }

    @Get('driver/:driverId')
    async findDriverCompliance(@Param('driverId') driverId: string) {
        return this.complianceGateway.forward('GET', `/compliance/driver/${driverId}`);
    }

    @Get('audit')
    async findAllAuditLogs(@Query() query: any) {
        return this.complianceGateway.forward('GET', '/audit', null, query);
    }
}
