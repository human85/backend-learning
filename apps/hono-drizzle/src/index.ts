import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createInMemoryProjectsRepository } from './projects/projects.repository.js';
import { createProjectsService } from './projects/projects.service.js';

const projectsRepository = createInMemoryProjectsRepository();
const projectsService = createProjectsService(projectsRepository);
const app = createApp({ projectsService });
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, ({ port: listeningPort }) => {
  console.log(`Hono API listening on http://localhost:${listeningPort}`);
});
