import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

export interface PgQueryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export const pgPoolProvider = {
  provide: PG_POOL,
  useFactory: (config: ConfigService): Pool => {
    const url = config.get<string>('DATABASE_URL');
    if (!url) {
      // Lazy: tests may not require a real pool. The first query will throw.
      return new Pool({ host: '127.0.0.1', port: 1, database: '__unset__' });
    }
    return new Pool({ connectionString: url });
  },
  inject: [ConfigService],
};
