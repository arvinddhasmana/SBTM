import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpClientService } from './utils/http-client.service';
import { ServiceTokenService } from './utils/service-token.service';
import { RlsContextService } from './services/rls-context.service';

@Global()
@Module({
  imports: [
    // JwtModule used by ServiceTokenService for signing/verifying internal service tokens.
    // The secret is overridden at call time (INTERNAL_SERVICE_SECRET), so the module default is unused.
    JwtModule.register({}),
  ],
  providers: [HttpClientService, ServiceTokenService, RlsContextService],
  exports: [HttpClientService, ServiceTokenService, RlsContextService],
})
export class CommonModule {}
