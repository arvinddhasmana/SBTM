import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InternalServiceGuard } from '../../common/guards/internal-service.guard';
import { StaCsvAdapter } from '../adapter/sta-csv/sta-csv.adapter';
import { TRANSPORT_DATA_ADAPTERS } from '../adapter/transport-data-adapter.interface';
import { CommitModule } from '../commit/commit.module';
import { StagingModule } from '../staging/staging.module';
import { DryRunService } from './dry-run.service';
import { ImporterController } from './importer.controller';

@Module({
  imports: [ConfigModule, StagingModule, CommitModule],
  controllers: [ImporterController],
  providers: [
    StaCsvAdapter,
    {
      provide: TRANSPORT_DATA_ADAPTERS,
      useFactory: (sta: StaCsvAdapter) => [sta],
      inject: [StaCsvAdapter],
    },
    DryRunService,
    InternalServiceGuard,
  ],
  exports: [TRANSPORT_DATA_ADAPTERS, DryRunService],
})
export class ImporterModule {}
