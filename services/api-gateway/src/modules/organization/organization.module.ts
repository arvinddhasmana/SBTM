import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { School } from './entities/school.entity';
import { Sta } from './entities/sta.entity';
import { BoardService } from './school-board.service';
import { BoardController } from './school-board.controller';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Board, School, Sta])],
  providers: [BoardService, SchoolService],
  controllers: [BoardController, SchoolController],
  exports: [BoardService, SchoolService, TypeOrmModule],
})
export class OrganizationModule {}
