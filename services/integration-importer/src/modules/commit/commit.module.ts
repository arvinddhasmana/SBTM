import { Module } from '@nestjs/common';
import { osrmClientProvider } from '../shape-fallback/osrm.provider';
import { StagingModule } from '../staging/staging.module';
import { CommitService } from './commit.service';

@Module({
  imports: [StagingModule],
  providers: [CommitService, osrmClientProvider],
  exports: [CommitService],
})
export class CommitModule {}
