import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger as PinoLogger } from 'nestjs-pino';
import { initTracing } from '@sbtm/common';

initTracing('emergency-alerts');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Emergency Alerts Service is running on port ${port}`);
}
bootstrap();
