import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolBoard } from '../auth/entities/school-board.entity';
import { School } from '../auth/entities/school.entity';
import { SchoolBoardService } from './school-board.service';
import { SchoolBoardController } from './school-board.controller';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';

@Module({
    imports: [TypeOrmModule.forFeature([SchoolBoard, School])],
    providers: [SchoolBoardService, SchoolService],
    controllers: [SchoolBoardController, SchoolController],
    exports: [SchoolBoardService, SchoolService],
})
export class OrganizationModule { }
