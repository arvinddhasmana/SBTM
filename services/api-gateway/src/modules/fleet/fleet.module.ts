import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';
import { Vehicle } from '../auth/entities/vehicle.entity';
import { Route } from '../auth/entities/route.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Vehicle, Route])],
    providers: [FleetService],
    controllers: [FleetController],
    exports: [FleetService],
})
export class FleetModule { }
