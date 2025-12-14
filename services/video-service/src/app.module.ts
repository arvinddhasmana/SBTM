import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoEventsModule } from './modules/video-events/video-events.module';
import { UploadModule } from './modules/upload/upload.module';
import { StorageModule } from './modules/storage/storage.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST', 'localhost'),
                port: configService.get('DB_PORT', 5432),
                username: configService.get('DB_USERNAME', 'postgres'),
                password: configService.get('DB_PASSWORD', 'postgres'),
                database: configService.get('DB_DATABASE', 'video_service'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: configService.get('DB_SYNCHRONIZE', 'true') === 'true',
                logging: configService.get('DB_LOGGING', 'false') === 'true',
            }),
            inject: [ConfigService],
        }),
        VideoEventsModule,
        UploadModule,
        StorageModule,
        RealtimeModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
