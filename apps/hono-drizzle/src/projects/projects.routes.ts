import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppEnv } from '../app-env.js';
import { requireDemoSession } from '../auth/demo-session.middleware.js';
import type {
  IdempotentProjectsService,
  IdempotentProjectResult,
} from '../idempotency/idempotent-projects.service.js';
import { createProjectSchema } from './project.schema.js';
import type { ProjectCreationService } from './project-creation.service.js';
import type { ProjectsService } from './projects.service.js';

function replayResponse(
  result: Extract<IdempotentProjectResult, { kind: 'replay' }>,
) {
  return new Response(result.body, {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createProjectsRoutes(
  projectsService: ProjectsService,
  projectCreationService: ProjectCreationService,
  idempotentProjectsService: IdempotentProjectsService,
) {
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
      const rawIdempotencyKey = context.req.header('Idempotency-Key');
      const idempotencyKey = rawIdempotencyKey?.trim();

      if (
        rawIdempotencyKey !== undefined &&
        (!idempotencyKey || idempotencyKey.length > 255)
      ) {
        return context.json({ message: 'Invalid Idempotency-Key' }, 400);
      }

      if (idempotencyKey !== undefined) {
        const result = await idempotentProjectsService.create(
          input.name,
          context.get('userId'),
          idempotencyKey,
        );

        if (result.kind === 'replay') {
          return replayResponse(result);
        }

        if (result.kind === 'conflict') {
          return context.json(
            { message: 'Idempotency-Key was already used for another request' },
            409,
          );
        }

        if (result.kind === 'in-progress') {
          return context.json(
            { message: 'The request with this Idempotency-Key is in progress' },
            409,
          );
        }

        return context.json(result.project, 201);
      }

      const project = await projectCreationService.create(
        input.name,
        context.get('userId'),
      );

      return context.json(project, 201);
    },
  );

  return projects;
}
