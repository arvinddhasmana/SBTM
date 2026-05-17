import { Module } from '@nestjs/common';
import { pgPoolProvider } from './pg-pool.provider';
import { StagingWriter } from './staging-writer.service';

@Module({
  providers: [pgPoolProvider, StagingWriter],
  exports: [StagingWriter, pgPoolProvider],
})
export class StagingModule {}
