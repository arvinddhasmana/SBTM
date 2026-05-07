import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { OptimizationService } from './optimization.service';
import { Route } from '../auth/entities/route.entity';
import { RouteStop } from '../auth/entities/route-stop.entity';
import { Vehicle } from '../auth/entities/vehicle.entity';
import { CommonModule } from '../../common/common.module';
import { RouteChangeNotifierService } from '../gateway/services/route-change-notifier.service';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    TypeOrmModule.forFeature([Route, RouteStop, Vehicle]),
  ],
  providers: [RouteService, OptimizationService, RouteChangeNotifierService],
  controllers: [RouteController],
  exports: [RouteService],
})
export class RouteModule {}
