import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionModule } from './modules/inspection/inspection.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
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
                synchronize: true, // For development
            }),
            inject: [ConfigService],
        }),
        InspectionModule,
        ComplianceModule,
        AuditModule,
    ],
})
export class AppModule { }
