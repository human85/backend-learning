import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';
import { UserEntity } from '../users/user.entity';

export function createDatabaseOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [ProjectEntity, UserEntity],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
  };
}
