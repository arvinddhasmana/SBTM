import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { RouteModule } from './modules/route/route.module';
import { CommonModule } from './common/common.module';
import { CorrelationIdMiddleware } from '@sbtm/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import configuration from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5433),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'mysecretpassword'),
        database: configService.get<string>('DB_DATABASE', 'sbms'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL', 60000),
          limit: configService.get<number>('RATE_LIMIT_MAX', 100),
        },
      ],
      inject: [ConfigService],
    }),
    CommonModule,
    AuthModule,
    GatewayModule,
    OrganizationModule,
    FleetModule,
    RouteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
