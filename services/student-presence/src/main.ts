import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger as PinoLogger } from 'nestjs-pino';
import { initTracing } from '@sbtm/common';

initTracing('student-presence');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const logger = new Logger('Bootstrap');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors();
  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`Student Presence Service listening on port ${port}`);
}
bootstrap();
