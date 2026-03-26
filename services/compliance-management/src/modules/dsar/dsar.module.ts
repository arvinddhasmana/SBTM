import { Module } from '@nestjs/common';
import { DsarService } from './dsar.service';
import { DsarController } from './dsar.controller';

@Module({
    controllers: [DsarController],
    providers: [DsarService],
    exports: [DsarService],
})
export class DsarModule {}
