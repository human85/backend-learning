import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';

export function createDatabaseOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [ProjectEntity],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
  };
}
