import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';
import type { IdempotentProjectsService } from './idempotency/idempotent-projects.service.js';
import { createProjectsRoutes } from './projects/projects.routes.js';
import type { ProjectsService } from './projects/projects.service.js';

export type AppDependencies = {
  projectsService: ProjectsService;
  idempotentProjectsService?: IdempotentProjectsService;
};

export function createApp({
  projectsService,
  idempotentProjectsService,
}: AppDependencies) {
  const app = new Hono<AppEnv>();

  app.get('/health', (context) => context.json({ status: 'ok' }));
  app.route(
    '/projects',
    createProjectsRoutes(projectsService, idempotentProjectsService),
  );

  return app;
}
