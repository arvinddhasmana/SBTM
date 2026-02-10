import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionService } from './inspection.service';
import { InspectionController } from './inspection.controller';
import { VehicleInspection } from './entities/vehicle-inspection.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VehicleInspection])],
    controllers: [InspectionController],
    providers: [InspectionService],
    exports: [InspectionService],
})
export class InspectionModule { }
