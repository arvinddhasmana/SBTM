import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { InspectionService } from './inspection.service';

@Controller('inspections')
export class InspectionController {
    constructor(private readonly inspectionService: InspectionService) { }

    @Post()
    async create(@Body() createDto: any) {
        return this.inspectionService.create(createDto);
    }

    @Get()
    async findAll(@Query('schoolId') schoolId: string) {
        return this.inspectionService.findAll(schoolId);
    }

    @Get('vehicle/:id')
    async findByVehicle(@Query('id') vehicleId: string) {
        return this.inspectionService.findByVehicle(vehicleId);
    }

    @Get('latest')
    async getLatest(@Query('vehicleId') vehicleId: string) {
        return this.inspectionService.getLatestForVehicle(vehicleId);
    }
}
