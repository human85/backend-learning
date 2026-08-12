import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppEnv } from '../app-env.js';
import { requireDemoSession } from '../auth/demo-session.middleware.js';
import { createProjectSchema } from './project.schema.js';
import type { ProjectsService } from './projects.service.js';

export function createProjectsRoutes(projectsService: ProjectsService) {
  const projects = new Hono<AppEnv>();

  projects.get('/', requireDemoSession, async (context) => {
    const result = await projectsService.findAll(context.get('userId'));
    return context.json(result);
  });

  projects.post(
    '/',
    requireDemoSession,
    zValidator('json', createProjectSchema, (result, context) => {
      if (!result.success) {
        return context.json({ message: 'Invalid project input' }, 400);
      }
    }),
    async (context) => {
      const input = context.req.valid('json');
      const project = await projectsService.create(
        input.name,
        context.get('userId'),
      );

      return context.json(project, 201);
    },
  );

  return projects;
}
