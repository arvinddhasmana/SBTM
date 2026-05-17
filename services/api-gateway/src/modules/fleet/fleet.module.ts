import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';
import { Vehicle } from './entities/vehicle.entity';
import { Run } from './entities/run.entity';
import { Driver } from './entities/driver.entity';
import { Operator } from './entities/operator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Run, Driver, Operator])],
  providers: [FleetService],
  controllers: [FleetController],
  exports: [FleetService, TypeOrmModule],
})
export class FleetModule {}
