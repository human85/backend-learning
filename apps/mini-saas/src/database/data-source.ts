import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database-options';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export default new DataSource(createDatabaseOptions(databaseUrl));
