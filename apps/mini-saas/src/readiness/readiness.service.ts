import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient } from 'pg';

export function createReadinessPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    application_name: 'mini_saas_readiness',
    max: 1,
    connectionTimeoutMillis: 1000,
    statement_timeout: 500,
    query_timeout: 750,
    idleTimeoutMillis: 1000,
  });
  // pg removes failed idle clients. Never emit raw connection errors/secrets.
  pool.on('error', () => undefined);
  return pool;
}

@Injectable()
export class ReadinessService implements OnModuleDestroy {
  private readonly pool: Pool;
  private inFlight: Promise<boolean> | undefined;

  constructor(config: ConfigService) {
    this.pool = createReadinessPool(config.getOrThrow<string>('DATABASE_URL'));
  }

  check(): Promise<boolean> {
    // Concurrent HTTP checks share one probe instead of growing the pool queue.
    this.inFlight ??= this.probe().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async probe(): Promise<boolean> {
    let client: PoolClient | undefined;
    let succeeded = false;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1');
      succeeded = true;
      return true;
    } catch {
      return false;
    } finally {
      // A client-side timeout alone does not cancel SQL. Discard failed sockets;
      // statement_timeout also bounds execution on the PostgreSQL server.
      client?.release(!succeeded);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
