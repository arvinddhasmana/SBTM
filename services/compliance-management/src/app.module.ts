import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { InspectionModule } from './modules/inspection/inspection.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AuditModule } from './modules/audit/audit.module';
import { RetentionModule } from './modules/retention/data-retention.module';
import { DsarModule } from './modules/dsar/dsar.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        // JwtModule for InternalServiceAuthGuard — validates service-to-service tokens.
        JwtModule.register({ global: true }),
        // ScheduleModule enables @Cron() decorators in DataRetentionService.
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'mysecretpassword'),
                database: configService.get<string>('DB_DATABASE', 'sbms'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: configService.get<string>('NODE_ENV', 'development') !== 'production',
            }),
            inject: [ConfigService],
        }),
        InspectionModule,
        ComplianceModule,
        AuditModule,
        RetentionModule,
        DsarModule,
    ],
})
export class AppModule {}
