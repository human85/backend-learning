import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';
import { createProjectsRoutes } from './projects/projects.routes.js';
import type { ProjectsService } from './projects/projects.service.js';

export type AppDependencies = {
  projectsService: ProjectsService;
};

export function createApp({ projectsService }: AppDependencies) {
  const app = new Hono<AppEnv>();

  app.get('/health', (context) => context.json({ status: 'ok' }));
  app.route('/projects', createProjectsRoutes(projectsService));

  return app;
}
