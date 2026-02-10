import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentModule } from './modules/student/student.module';
import { Student } from './modules/student/entities/student.entity';

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
                port: configService.get<number>('DB_PORT', 5433),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'mysecretpassword'),
                database: configService.get<string>('DB_DATABASE', 'sbms'),
                entities: [Student],
                synchronize: true, // For development
                autoLoadEntities: true,
            }),
            inject: [ConfigService],
        }),
        StudentModule,
    ],
})
export class AppModule { }
