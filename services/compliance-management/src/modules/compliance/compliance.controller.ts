import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { InternalServiceAuthGuard } from '../../common/guards/internal-service-auth.guard';

@Controller('compliance')
@UseGuards(InternalServiceAuthGuard)
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) { }

    @Get('driver/:driverId')
    async findOne(@Param('driverId') driverId: string) {
        return this.complianceService.findOneByDriver(driverId);
    }

    @Post('driver/:driverId')
    async update(@Param('driverId') driverId: string, @Body() updateDto: any) {
        return this.complianceService.update(driverId, updateDto);
    }

    @Get()
    async findAll(@Query('schoolId') schoolId: string) {
        return this.complianceService.findAll(schoolId);
    }

    @Get('expiring')
    async getExpiring(@Query('schoolId') schoolId: string) {
        return this.complianceService.getExpiringSoon(schoolId);
    }
}
