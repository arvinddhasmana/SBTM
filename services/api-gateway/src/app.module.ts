import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { User } from './modules/auth/user.entity';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: 'postgres', // docker-compose service name
                port: 5432,
                username: configService.get<string>('DB_USER') || 'postgres',
                password: configService.get<string>('DB_PASSWORD') || 'mysecretpassword',
                database: configService.get<string>('DB_NAME') || 'sbms',
                entities: [User],
                synchronize: true, // Only for dev/MVP
            }),
            inject: [ConfigService],
        }),
        ThrottlerModule.forRoot([{
            ttl: 60,
            limit: 10,
        }]),
        AuthModule,
        GatewayModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        }
    ],
})
export class AppModule { }
