import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { OptimizationService } from './optimization.service';
import { Route } from '../auth/entities/route.entity';
import { RouteStop } from '../auth/entities/route-stop.entity';
import { Vehicle } from '../auth/entities/vehicle.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Route, RouteStop, Vehicle])],
    providers: [RouteService, OptimizationService],
    controllers: [RouteController],
    exports: [RouteService],
})
export class RouteModule { }
