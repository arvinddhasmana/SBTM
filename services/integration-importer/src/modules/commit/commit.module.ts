import { Module } from '@nestjs/common';
import { StagingModule } from '../staging/staging.module';
import { CommitService } from './commit.service';

@Module({
  imports: [StagingModule],
  providers: [CommitService],
  exports: [CommitService],
})
export class CommitModule {}
