import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { OptimizationService } from './optimization.service';
import { Route } from '../gtfs/entities/route.entity';
import { Trip } from '../gtfs/entities/trip.entity';
import { Shape } from '../gtfs/entities/shape.entity';
import { StopTime } from '../gtfs/entities/stop-time.entity';
import { Stop } from '../gtfs/entities/stop.entity';
import { CommonModule } from '../../common/common.module';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    TypeOrmModule.forFeature([Route, Trip, Shape, StopTime, Stop]),
  ],
  providers: [RouteService, OptimizationService, RouteChangeNotifierService],
  controllers: [RouteController],
  exports: [RouteService, TypeOrmModule],
})
export class RouteModule {}
