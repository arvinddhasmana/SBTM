import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StudentModule } from './modules/student/student.module';
import { Student } from './modules/student/entities/student.entity';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        // JwtModule for InternalServiceAuthGuard — validates service-to-service tokens.
        JwtModule.register({ global: true }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5433),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'mysecretpassword'),
                database: configService.get<string>('DB_DATABASE', 'sbms'),
                entities: [Student],
                synchronize: configService.get<string>('NODE_ENV', 'development') !== 'production',
                autoLoadEntities: true,
            }),
            inject: [ConfigService],
        }),
        StudentModule,
    ],
})
export class AppModule { }
