import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { School } from './entities/school.entity';
import { Sta } from './entities/sta.entity';
import { SchoolBoardService } from './school-board.service';
import { SchoolBoardController } from './school-board.controller';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Board, School, Sta])],
  providers: [SchoolBoardService, SchoolService],
  controllers: [SchoolBoardController, SchoolController],
  exports: [SchoolBoardService, SchoolService, TypeOrmModule],
})
export class OrganizationModule {}
