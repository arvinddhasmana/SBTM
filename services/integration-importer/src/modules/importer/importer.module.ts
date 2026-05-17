import { Module } from '@nestjs/common';
import { StaCsvAdapter } from '../adapter/sta-csv/sta-csv.adapter';
import { TRANSPORT_DATA_ADAPTERS } from '../adapter/transport-data-adapter.interface';
import { ImporterController } from './importer.controller';

@Module({
  controllers: [ImporterController],
  providers: [
    StaCsvAdapter,
    {
      provide: TRANSPORT_DATA_ADAPTERS,
      useFactory: (sta: StaCsvAdapter) => [sta],
      inject: [StaCsvAdapter],
    },
  ],
  exports: [TRANSPORT_DATA_ADAPTERS],
})
export class ImporterModule {}
