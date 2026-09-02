import type { ExtractTablesWithRelations } from 'drizzle-orm';
import {
  drizzle,
  type NodePgDatabase,
  type NodePgTransaction,
} from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;
export type DatabaseTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export type DatabaseExecutor = Database | DatabaseTransaction;

export function createDatabase(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle({ client: pool, schema });

  return {
    database,
    close: () => pool.end(),
  };
}
