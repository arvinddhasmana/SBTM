import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefixes and versioning could be added here
    // app.setGlobalPrefix('api');

    // Security headers
    app.use(helmet());

    // CORS
    app.enableCors({
        origin: '*', // Customize this for production
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    // Global Validation Pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
    }));

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`API Gateway is running on: ${await app.getUrl()}`);
}
bootstrap();
