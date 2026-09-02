import type { Database, DatabaseExecutor } from '../database/database.js';
import { createDrizzleOutboxRepository } from '../outbox/drizzle-outbox.repository.js';
import { createDrizzleProjectsRepository } from './drizzle-projects.repository.js';
import type { Project } from './projects.repository.js';
import { createProjectsService } from './projects.service.js';

export interface ProjectCreationService {
  create(name: string, ownerId: number): Promise<Project>;
}

export async function createProjectWithOutbox(
  database: DatabaseExecutor,
  name: string,
  ownerId: number,
): Promise<Project> {
  const projectsService = createProjectsService(
    createDrizzleProjectsRepository(database),
  );
  const outboxRepository = createDrizzleOutboxRepository(database);
  const project = await projectsService.create(name, ownerId);

  await outboxRepository.enqueue({
    eventType: 'project.created',
    aggregateType: 'project',
    aggregateId: project.id,
    payload: JSON.stringify(project),
  });

  return project;
}

export function createProjectCreationService(
  database: Database,
): ProjectCreationService {
  return {
    create(name, ownerId) {
      return database.transaction((transaction) =>
        createProjectWithOutbox(transaction, name, ownerId),
      );
    },
  };
}
