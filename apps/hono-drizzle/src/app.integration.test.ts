import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createDatabase } from './database/database.js';
import { projectsTable } from './database/schema.js';
import { createDrizzleProjectsRepository } from './projects/drizzle-projects.repository.js';
import { createProjectsService } from './projects/projects.service.js';

const authorizationHeaders = {
  Authorization: 'Bearer learning-session',
  'Content-Type': 'application/json',
};

describe('Hono and Drizzle integration', () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for integration tests');
  }

  const databaseConnection = createDatabase(databaseUrl);
  const projectsRepository = createDrizzleProjectsRepository(
    databaseConnection.database,
  );
  const projectsService = createProjectsService(projectsRepository);
  const app = createApp({ projectsService });

  beforeAll(async () => {
    await databaseConnection.database.execute(sql`select 1`);
  });

  beforeEach(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${projectsTable} restart identity`,
    );
  });

  afterAll(async () => {
    await databaseConnection.database.execute(
      sql`truncate table ${projectsTable} restart identity`,
    );
    await databaseConnection.close();
  });

  it('persists a project and reads it through the complete HTTP pipeline', async () => {
    const createResponse = await app.request('/projects', {
      method: 'POST',
      headers: authorizationHeaders,
      body: JSON.stringify({ name: 'Persistent project' }),
    });

    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toEqual({
      id: 1,
      name: 'Persistent project',
      ownerId: 1,
    });

    const listResponse = await app.request('/projects', {
      headers: authorizationHeaders,
    });

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toEqual([
      {
        id: 1,
        name: 'Persistent project',
        ownerId: 1,
      },
    ]);
  });

  it('returns only projects owned by the authenticated user', async () => {
    await projectsRepository.insert({ name: 'My project', ownerId: 1 });
    await projectsRepository.insert({
      name: 'Another user project',
      ownerId: 2,
    });

    const response = await app.request('/projects', {
      headers: authorizationHeaders,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 1,
        name: 'My project',
        ownerId: 1,
      },
    ]);
  });
});
