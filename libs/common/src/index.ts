// Guards
export { InternalServiceAuthGuard } from './guards/internal-service-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Decorators
export { Roles, Role, ROLES_KEY } from './decorators/roles.decorator';

// Filters
export { HttpExceptionFilter } from './filters/http-exception.filter';

// Interceptors
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export { TimeoutInterceptor } from './interceptors/timeout.interceptor';

// Middleware
export {
  CorrelationIdMiddleware,
  CORRELATION_ID_HEADER,
} from './middleware/correlation-id.middleware';

// Config
export { bootstrapApp, type BootstrapOptions } from './config/bootstrap';
export { initTracing, shutdownTracing } from './config/tracing';
export { createRedisConnectionOptions } from './config/redis.config';

// Crypto
export {
  AesGcmPiiCrypto,
  ciphertextEquals,
  piiCryptoFromEnv,
  type PiiCrypto,
} from './crypto/pii-crypto';
