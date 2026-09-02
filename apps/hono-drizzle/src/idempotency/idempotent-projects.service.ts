import type { Database } from '../database/database.js';
import { createDrizzleProjectsRepository } from '../projects/drizzle-projects.repository.js';
import type { Project } from '../projects/projects.repository.js';
import { createProjectsService } from '../projects/projects.service.js';
import { createIdempotencyRepository } from './idempotency.repository.js';
import { hashIdempotencyRequest } from './request-hash.js';

const CREATE_PROJECT_OPERATION = 'projects.create';

export type IdempotentProjectResult =
  | { kind: 'created'; project: Project }
  | { kind: 'replay'; status: number; body: string }
  | { kind: 'conflict' }
  | { kind: 'in-progress' };

export interface IdempotentProjectsService {
  create(
    name: string,
    ownerId: number,
    idempotencyKey: string,
  ): Promise<IdempotentProjectResult>;
}

export function createIdempotentProjectsService(
  database: Database,
): IdempotentProjectsService {
  return {
    async create(name, ownerId, idempotencyKey) {
      const scope = {
        userId: ownerId,
        operation: CREATE_PROJECT_OPERATION,
        idempotencyKey,
      };
      const requestHash = hashIdempotencyRequest({ name });

      return database.transaction(async (transaction) => {
        const idempotencyRepository = createIdempotencyRepository(transaction);
        const projectsRepository = createDrizzleProjectsRepository(transaction);
        const projectsService = createProjectsService(projectsRepository);
        const reservation = await idempotencyRepository.reserve(
          scope,
          requestHash,
        );

        if (reservation.kind === 'replay') {
          if (
            reservation.record.responseStatus === null ||
            reservation.record.responseBody === null
          ) {
            throw new Error('Completed idempotency record has no response');
          }

          return {
            kind: 'replay',
            status: reservation.record.responseStatus,
            body: reservation.record.responseBody,
          };
        }

        if (reservation.kind === 'conflict') {
          return { kind: 'conflict' };
        }

        if (reservation.kind === 'in-progress') {
          return { kind: 'in-progress' };
        }

        const project = await projectsService.create(name, ownerId);
        await idempotencyRepository.complete(scope, requestHash, {
          status: 201,
          body: JSON.stringify(project),
        });

        return { kind: 'created', project };
      });
    },
  };
}
