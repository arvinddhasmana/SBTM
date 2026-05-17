import { Module } from '@nestjs/common';
import { osrmClientProvider } from '../shape-fallback/osrm.provider';
import { StagingModule } from '../staging/staging.module';
import { CommitService } from './commit.service';
import { piiCryptoProvider } from './pii-crypto.provider';

@Module({
  imports: [StagingModule],
  providers: [CommitService, osrmClientProvider, piiCryptoProvider],
  exports: [CommitService],
})
export class CommitModule {}
