import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger as PinoLogger } from 'nestjs-pino';
import { initTracing } from '@sbtm/common';

initTracing('notification-service');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  logger.log(`Notification Service is running on port ${port}`);
}
bootstrap();
