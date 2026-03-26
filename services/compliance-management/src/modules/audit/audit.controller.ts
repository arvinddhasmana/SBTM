import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { InternalServiceAuthGuard } from '../../common/guards/internal-service-auth.guard';

@Controller('audit')
@UseGuards(InternalServiceAuthGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Post()
    async create(@Body() logDto: any) {
        return this.auditService.log(logDto);
    }

    @Get()
    async findAll(@Query('schoolId') schoolId: string) {
        return this.auditService.findAll(schoolId);
    }

    @Get('resource')
    async findByResource(
        @Query('resource') resource: string,
        @Query('resourceId') resourceId: string
    ) {
        return this.auditService.findByResource(resource, resourceId);
    }
}
