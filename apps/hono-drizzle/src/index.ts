import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDatabase } from './database/database.js';
import { createIdempotentProjectsService } from './idempotency/idempotent-projects.service.js';
import { createDrizzleProjectsRepository } from './projects/drizzle-projects.repository.js';
import { createProjectsService } from './projects/projects.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const { database } = createDatabase(databaseUrl);
const projectsRepository = createDrizzleProjectsRepository(database);
const projectsService = createProjectsService(projectsRepository);
const idempotentProjectsService = createIdempotentProjectsService(database);
const app = createApp({ projectsService, idempotentProjectsService });
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, ({ port: listeningPort }) => {
  console.log(`Hono API listening on http://localhost:${listeningPort}`);
});
