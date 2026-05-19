import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { InternalServiceAuthGuard } from '@sbtm/common';
import { HttpClientService } from './utils/http-client.service';
import { ServiceTokenService } from './utils/service-token.service';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';
import { RequestContextService } from './services/request-context.service';
import { RlsContextService } from './services/rls-context.service';

@Global()
@Module({
  imports: [
    // JwtModule used by ServiceTokenService for signing/verifying internal service tokens.
    // The secret is overridden at call time (INTERNAL_SERVICE_SECRET), so the module default is unused.
    JwtModule.register({}),
  ],
  providers: [
    HttpClientService,
    ServiceTokenService,
    RequestContextService,
    RlsContextService,
    InternalServiceAuthGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
  exports: [
    JwtModule,
    HttpClientService,
    ServiceTokenService,
    RequestContextService,
    RlsContextService,
    InternalServiceAuthGuard,
  ],
})
export class CommonModule {}
