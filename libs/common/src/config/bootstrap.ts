import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { TimeoutInterceptor } from '../interceptors/timeout.interceptor';

export interface BootstrapOptions {
  module: new (...args: unknown[]) => unknown;
  serviceName: string;
  defaultPort: number;
  globalPrefix?: string;
  timeoutMs?: number;
  cors?: boolean;
  beforeListen?: (app: INestApplication) => Promise<void> | void;
}

export async function bootstrapApp(options: BootstrapOptions): Promise<INestApplication> {
  const {
    module,
    serviceName,
    defaultPort,
    globalPrefix = 'api/v1',
    timeoutMs = 30000,
    cors = true,
    beforeListen,
  } = options;

  const app = await NestFactory.create(module);

  if (globalPrefix) {
    app.setGlobalPrefix(globalPrefix);
  }

  if (cors) {
    app.enableCors();
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor(timeoutMs));

  if (beforeListen) {
    await beforeListen(app);
  }

  const port = process.env.PORT || defaultPort;
  await app.listen(port);
  console.log(`${serviceName} is running on: http://localhost:${port}`);

  return app;
}
