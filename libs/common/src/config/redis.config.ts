import { ConfigService } from '@nestjs/config';

/** BullMQ / IORedis connection factory — returns host/port from environment variables. */
export function createRedisConnectionOptions(configService: ConfigService): {
  host: string;
  port: number;
} {
  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
  };
}
