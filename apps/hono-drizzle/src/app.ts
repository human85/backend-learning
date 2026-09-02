import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';
import type { IdempotentProjectsService } from './idempotency/idempotent-projects.service.js';
import type { ProjectCreationService } from './projects/project-creation.service.js';
import { createProjectsRoutes } from './projects/projects.routes.js';
import type { ProjectsService } from './projects/projects.service.js';

export type AppDependencies = {
  projectsService: ProjectsService;
  projectCreationService: ProjectCreationService;
  idempotentProjectsService: IdempotentProjectsService;
};

export function createApp({
  projectsService,
  projectCreationService,
  idempotentProjectsService,
}: AppDependencies) {
  const app = new Hono<AppEnv>();

  app.get('/health', (context) => context.json({ status: 'ok' }));
  app.route(
    '/projects',
    createProjectsRoutes(
      projectsService,
      projectCreationService,
      idempotentProjectsService,
    ),
  );

  return app;
}
