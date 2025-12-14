import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    });

    // Enable validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Set global prefix
    app.setGlobalPrefix('api/v1');

    const port = process.env.PORT || 3005;
    await app.listen(port);
    console.log(`🎥 Video Service is running on: http://localhost:${port}`);
}
bootstrap();
