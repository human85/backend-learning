import { asc, eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../database/database.js';
import { projectsTable } from '../database/schema.js';
import type {
  CreateProjectRecord,
  ProjectsRepository,
} from './projects.repository.js';

export function createDrizzleProjectsRepository(
  database: DatabaseExecutor,
): ProjectsRepository {
  return {
    async insert(project: CreateProjectRecord) {
      const [savedProject] = await database
        .insert(projectsTable)
        .values(project)
        .returning();

      if (!savedProject) {
        throw new Error('PostgreSQL did not return the inserted project');
      }

      return savedProject;
    },

    findByOwner(ownerId: number) {
      return database
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.ownerId, ownerId))
        .orderBy(asc(projectsTable.id));
    },
  };
}
